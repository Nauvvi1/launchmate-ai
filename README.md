# LaunchMate AI

**LaunchMate AI** is an MVP readiness auditor for hackathon teams, indie developers and small SaaS projects.

It checks whether a project is ready to be shown to judges, users or a marketplace reviewer. The app audits a public demo URL, scans landing-page signals, optionally reads a public GitHub README, calculates a **Marketplace Readiness Score**, maps the project to a maturity level and generates a prioritized action plan.

Version 1.2 is prepared for Vercel deployment and adds an optional **OpenAI Advisor** layer. The deterministic audit still works as the source of truth. If `OPENAI_API_KEY` is configured, OpenAI reviews the collected audit facts and returns a compact coefficient, verdict, upgrade plan, marketplace pitch and judge-prep questions.

## Why this project exists

Hackathon teams often build a working MVP but fail to package it properly: broken demo link, weak README, no clear CTA, no monetization story, missing mobile metadata, no public report and no structured launch checklist.

LaunchMate AI gives a fast pre-submission audit:

- Does the demo open?
- Is the landing page understandable?
- Is mobile viewport configured?
- Is there a useful title and description?
- Is there a README?
- Is installation/run documentation present?
- Is the target audience clear?
- Is monetization explained?
- What should be fixed first?
- What would an AI reviewer change in the final score?

## Features

- Public landing page with a ready-to-run demo.
- Audit form for project name, demo URL, repository URL, description, audience and monetization.
- URL availability check with status and response time.
- Landing-page checks: title, meta description, H1, viewport, HTTPS, Open Graph, canonical, favicon, manifest, CTA signals, content volume, image alt coverage.
- GitHub README scan for public repositories on `main` or `master`.
- Score breakdown by categories:
  - Technical readiness — 30 points
  - UX & presentation — 25 points
  - Documentation — 20 points
  - Business clarity — 15 points
  - Launch assets — 10 points
- Optional OpenAI Advisor:
  - AI coefficient for the final score
  - short verdict
  - strongest signals
  - main risks
  - compact upgrade plan
  - marketplace pitch
  - judge questions and short answers
- Public report page.
- Markdown report export.
- Local JSON storage for recent audits.
- Vercel-ready Express export with serverless-safe temporary storage and browser report fallback.

## Tech stack

- Node.js 18+
- Express
- Vanilla JavaScript frontend
- OpenAI Responses API via native `fetch` when configured
- Local JSON file storage locally
- Temporary `/tmp` storage on Vercel plus browser `localStorage` report fallback
- No database required for MVP

## Quick start

```bash
pnpm install
pnpm start
```

Open:

```text
http://localhost:3000
```

Run in development mode:

```bash
pnpm dev
```

Run tests:

```bash
pnpm test
```

## Enable OpenAI Advisor

Create `.env` in the project root:

```env
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
AI_ADVISOR_ENABLED=true
AI_ADVISOR_AUTO=true
```

If the key is missing or OpenAI does not respond, the app falls back to the mechanical score and still generates the report.

## Demo scenario

1. Open `http://localhost:3000`.
2. Press **Fill sample data**.
3. Press **Run readiness audit**.
4. Show the score and maturity level.
5. Open **AI advisor** to show coefficient, verdict, upgrade plan, pitch and judge prep.
6. Open **Checks** to show real deterministic scoring.
7. Open the public report link.
8. Export the report as Markdown.

The app also includes a sample landing page at:

```text
http://localhost:3000/sample-project.html
```


## Deploy to Vercel

This version includes `vercel.json` and exports the Express app from `src/server.js`, so Vercel can run it as a serverless Node.js app.

Recommended Vercel settings:

```text
Framework Preset: Other
Install Command: pnpm install
Build Command: leave empty
Output Directory: leave empty
```

Add environment variables in Vercel Project Settings:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
AI_ADVISOR_ENABLED=true
AI_ADVISOR_AUTO=true
AI_ADVISOR_TIMEOUT_MS=30000
```

`PUBLIC_BASE_URL` is optional on Vercel. The app uses Vercel deployment environment variables automatically when it builds report links.

After deployment, test:

```text
https://your-project.vercel.app/health
```

Then run:

```text
Fill sample data → Run readiness audit → AI advisor → Public report → Export Markdown
```

### Storage note for Vercel

Vercel Functions are serverless, so this MVP stores reports in temporary runtime storage on Vercel. The frontend also saves the latest reports in browser `localStorage`, so opening **Public report** from the same browser still works even if the serverless function resets.

For a production version, connect persistent storage such as Vercel KV, Postgres, Supabase or Neon.

## API

### Health check

```http
GET /health
```

### Create audit

```http
POST /api/audits
Content-Type: application/json

{
  "name": "LaunchMate AI",
  "demoUrl": "https://example.com",
  "repoUrl": "https://github.com/user/project",
  "description": "Project description...",
  "targetAudience": "Target users...",
  "monetization": "Monetization model..."
}
```

### Get audit

```http
GET /api/audits/:id
```

### Re-run AI Advisor

```http
POST /api/audits/:id/ai
```

### Export Markdown

```http
GET /api/audits/:id/markdown
```

## Scoring model

LaunchMate AI uses deterministic checks first. This keeps the product explainable and useful without external AI keys.

When OpenAI Advisor is enabled, the flow is:

```text
real checks → base score → OpenAI reviews facts → coefficient → final score
```

The AI coefficient is conservative. If OpenAI fails, coefficient is treated as `1.00` and the report uses the deterministic score.

## Roadmap

- Add Playwright screenshot audit for desktop and mobile.
- Add console error collection.
- Add PDF export.
- Add deeper GitHub scan: package scripts, tests, env example, Dockerfile.
- Add GitHub OAuth and private repository scans.
- Add team workspaces.
- Add CI check mode for pull requests.
- Add marketplace-specific templates.

## Monetization

LaunchMate AI can be monetized through:

- Free basic score.
- Paid deep audit.
- PDF report export.
- Team workspaces.
- GitHub/CI integration.
- Marketplace readiness templates.
- Private launch consulting.

## Hackathon progress story

The project is designed as a developer productivity tool for hackathon teams and indie makers. During the hackathon, measurable progress can be shown through:

- Working MVP with public UI.
- Backend audit engine.
- Scoring model.
- OpenAI Advisor layer.
- Report generation.
- Markdown export.
- README and submission materials.
- Demo landing page.

## License

MIT
