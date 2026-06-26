import test from 'node:test';
import assert from 'node:assert/strict';
import { reportToMarkdown } from '../src/auditEngine.js';

test('reportToMarkdown renders score and recommendations', () => {
  const report = {
    id: 'demo',
    generatedAt: '2026-06-26T00:00:00.000Z',
    input: {
      name: 'Demo Project',
      demoUrl: 'https://example.com',
      repoUrl: ''
    },
    score: {
      total: 72,
      groups: [
        {
          label: 'Technical readiness',
          score: 20,
          max: 30,
          items: [
            { ok: true, label: 'Demo URL opens successfully', points: 8 },
            { ok: false, label: 'Demo uses HTTPS', points: 4 }
          ]
        }
      ]
    },
    level: { name: 'Advanced' },
    executiveSummary: 'A useful MVP with a clear next step.',
    recommendations: [
      { title: 'Demo uses HTTPS', action: 'Deploy behind HTTPS.' }
    ],
    page: {
      status: 200,
      responseTimeMs: 120,
      title: 'Demo',
      description: 'Description',
      h1: 'Heading',
      imagesWithAlt: 0,
      imageCount: 0
    },
    readme: {
      summary: 'README not provided'
    }
  };

  const markdown = reportToMarkdown(report);
  assert.match(markdown, /Demo Project/);
  assert.match(markdown, /72\/100/);
  assert.match(markdown, /Deploy behind HTTPS/);
});
