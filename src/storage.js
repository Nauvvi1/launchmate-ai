import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function dataDirectory() {
  if (process.env.LAUNCHMATE_DATA_DIR) return process.env.LAUNCHMATE_DATA_DIR;
  if (process.env.VERCEL) return path.join(os.tmpdir(), 'launchmate-ai');
  return path.resolve(__dirname, '..', 'data');
}

function dbPath() {
  return path.join(dataDirectory(), 'audits.json');
}

async function ensureDb() {
  const dir = dataDirectory();
  const file = dbPath();
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify({ audits: [] }, null, 2));
  }
}

export async function listAudits() {
  await ensureDb();
  const raw = await fs.readFile(dbPath(), 'utf8');
  const parsed = JSON.parse(raw || '{"audits":[]}');
  return Array.isArray(parsed.audits) ? parsed.audits : [];
}

export async function saveAudit(audit) {
  await ensureDb();
  const audits = await listAudits();
  const next = [audit, ...audits.filter((item) => item.id !== audit.id)].slice(0, 100);
  await fs.writeFile(dbPath(), JSON.stringify({ audits: next }, null, 2));
  return audit;
}

export async function getAudit(id) {
  const audits = await listAudits();
  return audits.find((audit) => audit.id === id) || null;
}
