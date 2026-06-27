# Deploy LaunchMate AI to Vercel

## 1. Push the project to GitHub

Create a new repository and push this folder.

Do not commit `.env` or your OpenAI key.

## 2. Import the repository in Vercel

- Framework preset: Other
- Install command: `pnpm install`
- Build command: leave empty
- Output directory: leave empty

The app uses `src/server.js` as an Express server and `vercel.json` routes all requests to it.

## 3. Add Environment Variables

In Vercel Project Settings → Environment Variables add:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
AI_ADVISOR_ENABLED=true
AI_ADVISOR_AUTO=true
AI_ADVISOR_TIMEOUT_MS=30000
```

`PUBLIC_BASE_URL` is optional on Vercel. The app can use Vercel deployment URL automatically.

## 4. Deploy and test

Open:

```text
https://your-project.vercel.app/health
```

Then run the main flow:

```text
Fill sample data → Run readiness audit → AI advisor → Public report → Export Markdown
```

## Vercel storage note

Vercel Functions are serverless. Audit reports are saved in temporary runtime storage and also cached in browser `localStorage` so the public report opened from the same browser still works even if the function instance resets.

For production, connect a database such as Vercel KV, Postgres, Supabase or Neon.
