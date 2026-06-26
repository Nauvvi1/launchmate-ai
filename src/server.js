import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import { loadLocalEnv } from './env.js';
import { runAiAdvisor } from './aiAdvisor.js';
import { runAudit, reportToMarkdown } from './auditEngine.js';
import { getAudit, listAudits, saveAudit } from './storage.js';

loadLocalEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const app = express();
const port = Number(process.env.PORT || 3000);
const autoRunAiAdvisor = process.env.AI_ADVISOR_AUTO !== 'false';

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR, {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

function publicBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function validateAuditPayload(body) {
  const required = ['name', 'demoUrl', 'description', 'targetAudience', 'monetization'];
  const missing = required.filter((key) => !String(body[key] || '').trim());
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'LaunchMate AI', version: '1.1.0' });
});

app.get('/api/audits', async (_req, res, next) => {
  try {
    const audits = await listAudits();
    res.json({
      audits: audits.map((audit) => ({
        id: audit.id,
        name: audit.input.name,
        generatedAt: audit.generatedAt,
        score: audit.ai?.status === 'completed' ? audit.ai.adjustedScore : audit.score.total,
        level: audit.ai?.status === 'completed' ? audit.ai.adjustedLevel : audit.level.name,
        demoUrl: audit.input.demoUrl,
        aiStatus: audit.ai?.status || 'not_run'
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/audits', async (req, res, next) => {
  try {
    validateAuditPayload(req.body || {});
    const report = await runAudit(req.body);
    const id = nanoid(10);
    const audit = {
      id,
      publicUrl: `${publicBaseUrl(req)}/report/${id}`,
      ...report
    };

    if (autoRunAiAdvisor) {
      audit.ai = await runAiAdvisor(audit);
    }

    await saveAudit(audit);
    res.status(201).json(audit);
  } catch (error) {
    next(error);
  }
});

app.get('/api/audits/:id', async (req, res, next) => {
  try {
    const audit = await getAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    res.json(audit);
  } catch (error) {
    next(error);
  }
});

app.post('/api/audits/:id/ai', async (req, res, next) => {
  try {
    const audit = await getAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found' });
    audit.ai = await runAiAdvisor(audit);
    await saveAudit(audit);
    res.json(audit);
  } catch (error) {
    next(error);
  }
});

app.get('/api/audits/:id/markdown', async (req, res, next) => {
  try {
    const audit = await getAudit(req.params.id);
    if (!audit) return res.status(404).send('Audit not found');
    const markdown = reportToMarkdown(audit);
    res.setHeader('content-type', 'text/markdown; charset=utf-8');
    res.setHeader('content-disposition', `attachment; filename="launchmate-report-${audit.id}.md"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
});

app.get('/report/:id', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'report.html'));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || 'Unexpected error',
    status
  });
});

app.listen(port, () => {
  console.log(`LaunchMate AI is running on http://localhost:${port}`);
});
