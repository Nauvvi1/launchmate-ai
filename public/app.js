const LOCAL_AUDITS_KEY = 'launchmate-ai-audits-v1';

function readLocalAudits() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_AUDITS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalAudit(report) {
  try {
    const audits = readLocalAudits();
    audits[report.id] = report;
    const entries = Object.entries(audits).slice(-25);
    localStorage.setItem(LOCAL_AUDITS_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Browser storage can be disabled; server-side storage is still used.
  }
}

export function loadLocalAudit(id) {
  return readLocalAudits()[id] || null;
}

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
      saveLocalAudit(payload);
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
        <p>Checking demo URL, landing page, README signals, business clarity and AI readiness.</p>
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

function displayScore(report) {
  return report.ai?.status === 'completed' ? report.ai.adjustedScore : report.score.total;
}

function displayLevel(report) {
  return report.ai?.status === 'completed' ? report.ai.adjustedLevel : report.level.name;
}

function displaySummary(report) {
  return report.ai?.status === 'completed' && report.ai.verdict ? report.ai.verdict : report.executiveSummary;
}

async function fetchMarkdown(id) {
  const response = await fetch(`/api/audits/${id}/markdown`);
  if (!response.ok) throw new Error('Markdown endpoint is not available');
  return response.text();
}

function clientMarkdown(report) {
  const ai = report.ai?.status === 'completed' ? report.ai : null;
  const score = ai ? ai.adjustedScore : report.score.total;
  const level = ai ? ai.adjustedLevel : report.level.name;
  const lines = [
    `# ${report.input.name} — LaunchMate AI Report`,
    '',
    `Final score: ${score}/100`,
    `Level: ${level}`,
    `Demo URL: ${report.input.demoUrl}`,
    '',
    '## Summary',
    ai?.verdict || report.executiveSummary,
    '',
    '## Score groups',
    ...report.score.groups.map((group) => `- ${group.label}: ${group.score}/${group.max}`),
    '',
    '## Key checks',
    ...report.score.groups.flatMap((group) => group.items.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} — ${item.label}`)),
    '',
    '## Next steps',
    ...(report.recommendations.length ? report.recommendations.map((item) => `- ${item.title}: ${item.action}`) : ['- No critical gaps found.']),
    ''
  ];

  if (ai) {
    lines.push('## AI Advisor', `Coefficient: ${ai.coefficient}`, '', '### Upgrade plan');
    lines.push(...ai.priorityActions.map((item) => `- ${item.title}: ${item.action}`));
    lines.push('', '### Marketplace pitch', ai.marketplacePitch, '');
  }

  return lines.join('\n');
}

async function getReportMarkdown(report) {
  try {
    return await fetchMarkdown(report.id);
  } catch {
    return clientMarkdown(report);
  }
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function renderReport(report, mount) {
  saveLocalAudit(report);
  const markdown = await getReportMarkdown(report);
  const shownScore = displayScore(report);
  const scorePercent = `${shownScore}%`;
  mount.innerHTML = `
    <div class="report-header">
      <div class="report-score" style="--score-percent:${scorePercent};--score-color:${scoreColor(shownScore)}">${shownScore}</div>
      <div>
        <span class="badge ${badgeClass(shownScore)}">${escapeHtml(displayLevel(report))}</span>
        <h2>${escapeHtml(report.input.name)}</h2>
        <p class="muted">${escapeHtml(displaySummary(report))}</p>
        ${renderAiMini(report)}
        <div class="report-actions">
          <a class="button secondary" href="${report.publicUrl}" target="_blank" rel="noreferrer">Public report</a>
          <button class="button ghost" type="button" id="downloadMarkdown">Export Markdown</button>
          ${report.ai?.status !== 'completed' ? '<button class="button ghost" type="button" id="runAi">Run AI analysis</button>' : ''}
        </div>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <button class="tab active" type="button" data-tab="overview">Overview</button>
      <button class="tab" type="button" data-tab="checks">Checks</button>
      <button class="tab" type="button" data-tab="next">Next steps</button>
      <button class="tab" type="button" data-tab="ai">AI advisor</button>
      <button class="tab" type="button" data-tab="markdown">Markdown</button>
    </div>

    <section class="tab-panel active" data-panel="overview">
      ${renderScoreExplanation(report)}
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

    <section class="tab-panel" data-panel="ai">
      ${renderAiPanel(report)}
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

  const downloadButton = mount.querySelector('#downloadMarkdown');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => downloadTextFile(`launchmate-report-${report.id}.md`, markdown));
  }

  const runAiButton = mount.querySelector('#runAi');
  if (runAiButton) {
    runAiButton.addEventListener('click', () => rerunAiAnalysis(report.id, mount));
  }
}

async function rerunAiAnalysis(id, mount) {
  const button = mount.querySelector('#runAi');
  if (button) {
    button.disabled = true;
    button.textContent = 'Running AI...';
  }

  try {
    const response = await fetch(`/api/audits/${id}/ai`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'AI analysis failed');
    saveLocalAudit(payload);
    await renderReport(payload, mount);
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = 'Run AI analysis';
    }
    alert(`AI analysis failed: ${error.message}`);
  }
}

function renderAiMini(report) {
  if (report.ai?.status === 'completed') {
    return `
      <div class="ai-mini ok">
        <strong>AI coefficient ×${escapeHtml(String(report.ai.coefficient))}</strong>
        <span>Base ${report.ai.baseScore}/100 → final ${report.ai.adjustedScore}/100 · ${escapeHtml(report.ai.confidence)} confidence</span>
      </div>
    `;
  }

  if (report.ai?.status === 'failed') {
    return `
      <div class="ai-mini warn">
        <strong>AI fallback</strong>
        <span>${escapeHtml(report.ai.message || 'Mechanical score is used.')}</span>
      </div>
    `;
  }

  return `
    <div class="ai-mini">
      <strong>AI disabled</strong>
      <span>${escapeHtml(report.ai?.message || 'Add OPENAI_API_KEY to enable AI coefficient and compact advice.')}</span>
    </div>
  `;
}

function renderScoreExplanation(report) {
  if (report.ai?.status !== 'completed') {
    return `
      <div class="ai-score-line">
        <strong>Final score:</strong> ${report.score.total}/100 · mechanical audit only
      </div>
    `;
  }

  return `
    <div class="ai-score-line">
      <strong>Final score:</strong> ${report.ai.adjustedScore}/100 · base ${report.ai.baseScore}/100 × AI coefficient ${report.ai.coefficient}
    </div>
  `;
}

function renderAiPanel(report) {
  const ai = report.ai;
  if (!ai || ai.status === 'disabled') {
    return `
      <div class="ai-card">
        <h3>AI Advisor is disabled</h3>
        <p class="muted">${escapeHtml(ai?.message || 'Create .env and add OPENAI_API_KEY to enable the OpenAI-powered coefficient, verdict, pitch and judge prep.')}</p>
        <pre class="markdown-preview">OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini</pre>
      </div>
    `;
  }

  if (ai.status === 'failed') {
    return `
      <div class="ai-card">
        <h3>AI fallback is active</h3>
        <p class="muted">${escapeHtml(ai.message)}</p>
        <p class="muted">${escapeHtml(ai.error || '')}</p>
      </div>
    `;
  }

  return `
    <div class="ai-grid">
      <article class="ai-card hero-ai">
        <span class="impact">AI coefficient ×${escapeHtml(String(ai.coefficient))}</span>
        <h3>${ai.adjustedScore}/100 · ${escapeHtml(ai.adjustedLevel)}</h3>
        <p>${escapeHtml(ai.verdict)}</p>
      </article>
      <article class="ai-card">
        <h3>Strongest signals</h3>
        ${renderShortList(ai.strongestSignals)}
      </article>
      <article class="ai-card">
        <h3>Main risks</h3>
        ${renderShortList(ai.riskSignals)}
      </article>
      <article class="ai-card full">
        <h3>Upgrade plan</h3>
        <div class="ai-actions">${(ai.priorityActions || []).map(renderAiAction).join('')}</div>
      </article>
      <article class="ai-card full">
        <h3>Marketplace pitch</h3>
        <p>${escapeHtml(ai.marketplacePitch)}</p>
      </article>
      <article class="ai-card full">
        <h3>Judge prep</h3>
        <div class="qa-list">${(ai.judgeQuestions || []).map(renderJudgeQuestion).join('')}</div>
      </article>
    </div>
  `;
}

function renderShortList(items = []) {
  if (!items.length) return '<p class="muted">No clear signals found.</p>';
  return `<ul class="compact-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderAiAction(item) {
  return `
    <div class="ai-action">
      <span class="impact">${escapeHtml(item.impact)} impact · ${escapeHtml(item.effort)} effort</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.action)}</p>
    </div>
  `;
}

function renderJudgeQuestion(item) {
  return `
    <div class="qa-item">
      <strong>Q: ${escapeHtml(item.question)}</strong>
      <p>A: ${escapeHtml(item.answer)}</p>
    </div>
  `;
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
