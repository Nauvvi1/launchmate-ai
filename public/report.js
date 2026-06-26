import { renderReport } from './app.js';

const mount = document.querySelector('#publicReport');
const id = window.location.pathname.split('/').filter(Boolean).pop();

async function load() {
  try {
    const response = await fetch(`/api/audits/${id}`);
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Report not found');
    await renderReport(report, mount);
  } catch (error) {
    mount.innerHTML = `<div class="error-box"><strong>Could not load report:</strong><br>${escapeHtml(error.message)}</div>`;
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
