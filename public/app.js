const form = document.querySelector('#auditForm');
const fillSample = document.querySelector('#fillSample');
const resultPanel = document.querySelector('#resultPanel');

function sampleData() {
  return {
    name: 'LaunchMate AI',
    demoUrl: `${window.location.origin}/sample-project.html`,
    repoUrl: '',
    description: 'LaunchMate AI helps indie developers and hackathon teams understand whether their MVP is ready for a public demo or marketplace submission. It audits demo URL, landing page quality, README completeness, business clarity and launch assets.',
    targetAudience: 'Solo developers, small hackathon teams, indie hackers and early-stage SaaS makers who need a fast pre-launch checklist before showing their project to judges, users or marketplace reviewers.',
    monetization: 'Free basic report plus paid deep audit, PDF export, team workspaces, GitHub checks, CI integration and marketplace preparation templates.'
  };
}

function setFormValues(values) {
  for (const [key, value] of Object.entries(values)) {
    const field = form.elements[key];
    if (field) field.value = value;
  }
}

if (fillSample && form) {
  fillSample.addEventListener('click', () => setFormValues(sampleData()));
  setFormValues(sampleData());
}

if (form) {
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  renderLoading();

  try {
    const response = await fetch('/api/audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Audit failed');
    renderReport(payload, resultPanel);
  } catch (error) {
    resultPanel.innerHTML = `<div class="error-box"><strong>Audit failed:</strong><br>${escapeHtml(error.message)}</div>`;
  }
});
}

function renderLoading() {
  resultPanel.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>
        <h2>Auditing the project...</h2>
        <p>Checking demo URL, landing page, README signals, business clarity and launch readiness.</p>
      </div>
    </div>
  `;
}

function scoreColor(score) {
  if (score >= 80) return 'var(--good)';
  if (score >= 55) return 'var(--warn)';
  return 'var(--bad)';
}

function badgeClass(score) {
  if (score >= 80) return '';
  if (score >= 55) return 'warn';
  return 'bad';
}

async function fetchMarkdown(id) {
  const response = await fetch(`/api/audits/${id}/markdown`);
  return response.text();
}

export async function renderReport(report, mount) {
  const markdown = await fetchMarkdown(report.id);
  const scorePercent = `${report.score.total}%`;
  mount.innerHTML = `
    <div class="report-header">
      <div class="report-score" style="--score-percent:${scorePercent};--score-color:${scoreColor(report.score.total)}">${report.score.total}</div>
      <div>
        <span class="badge ${badgeClass(report.score.total)}">${escapeHtml(report.level.name)}</span>
        <h2>${escapeHtml(report.input.name)}</h2>
        <p class="muted">${escapeHtml(report.executiveSummary)}</p>
        <div class="report-actions">
          <a class="button secondary" href="${report.publicUrl}" target="_blank" rel="noreferrer">Public report</a>
          <a class="button ghost" href="/api/audits/${report.id}/markdown">Export Markdown</a>
        </div>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab active" type="button" data-tab="overview">Overview</button>
      <button class="tab" type="button" data-tab="checks">Checks</button>
      <button class="tab" type="button" data-tab="next">Next steps</button>
      <button class="tab" type="button" data-tab="markdown">Markdown</button>
    </div>

    <section class="tab-panel active" data-panel="overview">
      ${renderGroups(report.score.groups, false)}
      <div class="group-card" style="margin-top:16px">
        <div class="group-top"><strong>Page snapshot</strong><span>${escapeHtml(String(report.page.status))} · ${escapeHtml(String(report.page.responseTimeMs))} ms</span></div>
        <div class="checks">
          <div class="check">Title: ${escapeHtml(report.page.title || 'missing')}</div>
          <div class="check">Description: ${escapeHtml(report.page.description || 'missing')}</div>
          <div class="check">README: ${escapeHtml(report.readme.summary || 'not checked')}</div>
        </div>
      </div>
    </section>

    <section class="tab-panel" data-panel="checks">
      ${renderGroups(report.score.groups, true)}
    </section>

    <section class="tab-panel" data-panel="next">
      <div class="recommendations">
        ${renderRecommendations(report.recommendations)}
      </div>
    </section>

    <section class="tab-panel" data-panel="markdown">
      <pre class="markdown-preview">${escapeHtml(markdown)}</pre>
    </section>
  `;

  mount.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      mount.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
      mount.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === name));
    });
  });
}

function renderGroups(groups, showChecks) {
  return `
    <div class="group-list">
      ${groups.map((group) => {
        const width = Math.round((group.score / group.max) * 100);
        return `
          <article class="group-card">
            <div class="group-top">
              <strong>${escapeHtml(group.label)}</strong>
              <span>${group.score}/${group.max}</span>
            </div>
            <div class="progress" aria-hidden="true"><span style="--w:${width}%"></span></div>
            ${showChecks ? `<div class="checks">${group.items.map(renderCheck).join('')}</div>` : ''}
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function renderCheck(item) {
  return `<div class="check ${item.ok ? 'ok' : 'fail'}"><span>${item.ok ? '✅' : '❌'}</span><span>${escapeHtml(item.label)} (${item.ok ? '+' : '0'}/${item.points})</span></div>`;
}

function renderRecommendations(recommendations) {
  if (!recommendations.length) {
    return '<div class="rec"><h3>No critical gaps found</h3><p>Prepare a short demo video and submit the project with confidence.</p></div>';
  }

  return recommendations.map((item) => `
    <article class="rec">
      <span class="impact">${escapeHtml(item.impact)} impact · +${item.points}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.action)}</p>
    </article>
  `).join('');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
