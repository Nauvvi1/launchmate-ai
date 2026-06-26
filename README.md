# LaunchMate AI

**LaunchMate AI** is an AI-style MVP readiness auditor for hackathon teams, indie developers and small SaaS projects.

It checks whether a project is ready to be shown to judges, users or a marketplace reviewer. The app audits a public demo URL, scans basic landing-page signals, optionally reads a public GitHub README, calculates a **Marketplace Readiness Score**, maps the project to a maturity level and generates a prioritized action plan.

## Why this project exists

Hackathon teams often build a working MVP but fail to package it properly: broken demo link, weak README, no clear CTA, no monetization story, missing mobile metadata, no public report and no structured launch checklist.

LaunchMate AI solves this by giving a fast pre-submission audit:

- Does the demo open?
- Is the landing page understandable?
- Is mobile viewport configured?
- Is there a useful title and description?
- Is there a README?
- Is installation/run documentation present?
- Is the target audience clear?
- Is monetization explained?
- What should be fixed first?

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
- Maturity level:
  - Starter
  - Advanced
  - Pro / Marketplace Ready
- Prioritized recommendations by impact.
- Public report page.
- Markdown report export.
- Local JSON storage for recent audits.

## Tech stack

- Node.js 18+
- Express
- Vanilla JavaScript frontend
- Local JSON file storage
- No database required for MVP

## Quick start

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Run in development mode:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## Demo scenario

1. Open `http://localhost:3000`.
2. Press **Fill sample data**.
3. Press **Run readiness audit**.
4. Open the generated report.
5. Export the report as Markdown.

The app also includes a sample landing page at:

```text
http://localhost:3000/sample-project.html
```

## Environment variables

Create `.env` manually if needed. The MVP works without it.

```env
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
```

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

### Export Markdown

```http
GET /api/audits/:id/markdown
```

## Scoring model

LaunchMate AI uses deterministic checks and a rule-based recommendation engine. This is intentional for the MVP: the product is useful even without external AI keys or paid APIs.

Future versions can add LLM-based analysis for:

- README rewriting.
- Landing-page copy improvement.
- Pitch generation.
- Demo video script generation.
- GitHub issue generation.
- CI integration.

## Roadmap

- Add Playwright screenshot audit for desktop and mobile.
- Add console error collection.
- Add PDF export.
- Add GitHub OAuth and private repository scans.
- Add OpenAI-compatible LLM analysis as an optional plugin.
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

The project is designed as a developer productivity tool for hackathon teams and indie makers. During the hackathon, the measurable progress can be shown through:

- Working MVP with public UI.
- Backend audit engine.
- Scoring model.
- Report generation.
- Markdown export.
- README and submission materials.
- Demo landing page.

## License

MIT
