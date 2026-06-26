import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'audits.json');

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ audits: [] }, null, 2));
  }
}

export async function listAudits() {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{"audits":[]}');
  return Array.isArray(parsed.audits) ? parsed.audits : [];
}

export async function saveAudit(audit) {
  await ensureDb();
  const audits = await listAudits();
  const next = [audit, ...audits].slice(0, 100);
  await fs.writeFile(DB_PATH, JSON.stringify({ audits: next }, null, 2));
  return audit;
}

export async function getAudit(id) {
  const audits = await listAudits();
  return audits.find((audit) => audit.id === id) || null;
}
