# LaunchMate AI — submission draft

## One-line pitch

LaunchMate AI audits MVPs before launch and tells developers whether their project is Starter, Advanced or Pro / Marketplace Ready.

## Short description

LaunchMate AI is a developer productivity tool for hackathon teams, indie makers and early-stage SaaS builders. The user enters a demo URL, repository URL and product description. The system checks demo availability, page quality, launch metadata, README completeness, target audience and monetization story. Then it generates a Marketplace Readiness Score, maturity level, prioritized fixes and an optional OpenAI-powered review.

## Problem

Many hackathon teams finish code but fail at launch packaging. Their demo may work, but the landing page is unclear, README is incomplete, mobile metadata is missing, monetization is not explained and judges have no quick way to understand the product. As a result, useful MVPs look weaker than they are.

## Solution

LaunchMate AI provides a fast automated pre-submission audit. It helps teams fix high-impact issues before they publish, pitch or submit their product to a marketplace.

The platform combines two layers:

1. **Deterministic audit engine** — real checks for demo URL, HTML metadata, README and launch signals.
2. **OpenAI Advisor** — compact interpretation of the facts: score coefficient, verdict, upgrade plan, marketplace pitch and judge-prep questions.

If OpenAI is unavailable, the app falls back to the mechanical score and remains fully usable.

## Target audience

- Hackathon participants.
- Solo developers.
- Indie SaaS founders.
- Small product teams.
- Marketplace authors preparing a project for review.

## Track recommendation

Primary track: **Dev Productivity**.

Secondary fit: **AI + Automation**, **Micro SaaS**, **Business Apps**.

## Prize nomination fit

- Best developer tool.
- Best use of AI / automation.
- Kodik choice.
- Project with commercial potential.
- Marketplace Ready project.

## Current MVP functionality

- Landing page.
- Audit form.
- Demo URL health check.
- Landing-page metadata checks.
- README scan for public GitHub repositories.
- Marketplace Readiness Score.
- Starter / Advanced / Pro maturity mapping.
- OpenAI coefficient and compact AI verdict.
- OpenAI upgrade plan.
- OpenAI marketplace pitch.
- OpenAI judge questions.
- Prioritized deterministic recommendations.
- Public report page.
- Markdown report export.
- Local audit history.

## Demo script

1. Open the LaunchMate AI landing page.
2. Click “Fill sample data”.
3. Click “Run readiness audit”.
4. Show the final score and AI coefficient.
5. Open the “AI advisor” tab to show verdict, upgrade plan, pitch and judge prep.
6. Open the “Checks” tab to show that the score is backed by real checks.
7. Open the public report link.
8. Export the report as Markdown.

## Monetization

LaunchMate AI can use a freemium model:

- Free basic audit.
- Paid deep audit.
- PDF export.
- Team workspaces.
- GitHub and CI integration.
- Marketplace preparation templates.
- Private launch consulting packages.

## Why it can win

The project is directly connected to the hackathon theme: it helps other participants turn rough MVPs into polished, launch-ready products. It is not only a demo; it is a tool that improves the quality of demos, marketplace submissions and developer workflows.

The OpenAI layer is not a generic wrapper. It interprets real audit facts and returns a conservative score coefficient plus short, actionable launch advice.
