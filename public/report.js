import { loadLocalAudit, renderReport } from './app.js';

const mount = document.querySelector('#publicReport');
const id = window.location.pathname.split('/').filter(Boolean).pop();

async function load() {
  try {
    const response = await fetch(`/api/audits/${id}`);
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Report not found');
    await renderReport(report, mount);
  } catch (error) {
    const localReport = loadLocalAudit(id);
    if (localReport) {
      await renderReport(localReport, mount);
      return;
    }

    mount.innerHTML = `<div class="error-box"><strong>Could not load report:</strong><br>${escapeHtml(error.message)}<br><br>This can happen on serverless hosting if temporary storage resets. Run the audit again from the same browser.</div>`;
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

load();
