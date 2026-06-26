const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_TIMEOUT_MS = 14_000;
const MIN_COEFFICIENT = 0.85;
const MAX_COEFFICIENT = 1.12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function safeString(value = '', maxLength = 1000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function maturityLevel(score) {
  if (score >= 80) return 'Pro / Marketplace Ready';
  if (score >= 55) return 'Advanced';
  return 'Starter';
}

function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
}

function aiEnabled() {
  return process.env.AI_ADVISOR_ENABLED !== 'false' && hasApiKey();
}

function buildAuditSnapshot(report) {
  const failedChecks = [];
  const passedChecks = [];

  for (const group of report.score.groups || []) {
    for (const item of group.items || []) {
      const target = item.ok ? passedChecks : failedChecks;
      target.push({
        group: group.label,
        label: item.label,
        points: item.points
      });
    }
  }

  return {
    project: {
      name: report.input.name,
      demoUrl: report.input.demoUrl,
      repoUrl: report.input.repoUrl || 'not provided',
      description: safeString(report.input.description, 700),
      targetAudience: safeString(report.input.targetAudience, 500),
      monetization: safeString(report.input.monetization, 500)
    },
    baseScore: report.score.total,
    baseLevel: report.level.name,
    categoryScores: Object.fromEntries((report.score.groups || []).map((group) => [
      group.key,
      `${group.score}/${group.max}`
    ])),
    pageSnapshot: {
      status: report.page.status,
      responseTimeMs: report.page.responseTimeMs,
      finalUrl: report.page.finalUrl,
      title: safeString(report.page.title, 120),
      description: safeString(report.page.description, 220),
      h1: safeString(report.page.h1, 120),
      usesHttps: report.page.isHttps,
      hasViewport: Boolean(report.page.viewport),
      linkCount: report.page.linkCount,
      buttonCount: report.page.buttonCount,
      formCount: report.page.formCount,
      imageCount: report.page.imageCount,
      altCoverage: report.page.altCoverage,
      hasPricingSignal: report.page.hasPricingSignal,
      hasContactSignal: report.page.hasContactSignal,
      hasDemoSignal: report.page.hasDemoSignal,
      hasAnalytics: report.page.hasAnalytics
    },
    readme: {
      available: report.readme.available,
      summary: report.readme.summary,
      hasInstall: report.readme.hasInstall,
      hasRun: report.readme.hasRun,
      hasDemo: report.readme.hasDemo,
      hasStack: report.readme.hasStack,
      hasRoadmap: report.readme.hasRoadmap
    },
    strongestPassedChecks: passedChecks.slice(0, 10),
    highestImpactFailedChecks: failedChecks.sort((a, b) => b.points - a.points).slice(0, 12),
    deterministicRecommendations: (report.recommendations || []).slice(0, 8).map((item) => ({
      title: item.title,
      impact: item.impact,
      points: item.points,
      action: item.action
    }))
  };
}

function advisorSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      coefficient: {
        type: 'number',
        description: 'Multiplier for the deterministic score. Use 0.85-1.12. Use values below 1 when the project looks weaker than checks suggest; above 1 when it is clearer/more marketable than checks suggest.'
      },
      confidence: {
        type: 'string',
        enum: ['low', 'medium', 'high']
      },
      verdict: {
        type: 'string',
        description: 'One concise verdict, max 2 short sentences.'
      },
      strongestSignals: {
        type: 'array',
        items: { type: 'string' }
      },
      riskSignals: {
        type: 'array',
        items: { type: 'string' }
      },
      priorityActions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            action: { type: 'string' },
            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            effort: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['title', 'action', 'impact', 'effort']
        }
      },
      marketplacePitch: {
        type: 'string',
        description: 'Submission-ready pitch, short and concrete.'
      },
      judgeQuestions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' }
          },
          required: ['question', 'answer']
        }
      }
    },
    required: [
      'coefficient',
      'confidence',
      'verdict',
      'strongestSignals',
      'riskSignals',
      'priorityActions',
      'marketplacePitch',
      'judgeQuestions'
    ]
  };
}

function buildPrompt(snapshot) {
  return [
    {
      role: 'system',
      content: [
        'You are LaunchMate AI Advisor, a strict pre-launch reviewer for hackathon MVPs and marketplace submissions.',
        'Use the deterministic audit facts. Do not invent unavailable checks, revenue, users, integrations, or screenshots.',
        'Be short, specific and useful. No motivational filler.',
        'Return only structured data that matches the schema.',
        'Limits: verdict <= 2 short sentences; strongestSignals <= 3; riskSignals <= 3; priorityActions <= 4; judgeQuestions <= 3.',
        'The coefficient must be conservative: usually 0.95-1.06, extreme range 0.85-1.12.'
      ].join(' ')
    },
    {
      role: 'user',
      content: `Audit facts:\n${JSON.stringify(snapshot, null, 2)}`
    }
  ];
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === 'string') return responseJson.output_text;

  const chunks = [];
  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') chunks.push(content.text);
      if (typeof content.output_text === 'string') chunks.push(content.output_text);
    }
  }
  return chunks.join('\n').trim();
}

function normalizeAiAdvice(rawAdvice, baseScore) {
  const coefficient = clamp(Number(rawAdvice.coefficient) || 1, MIN_COEFFICIENT, MAX_COEFFICIENT);
  const adjustedScore = clamp(Math.round(baseScore * coefficient), 0, 100);

  return {
    enabled: true,
    status: 'completed',
    generatedAt: new Date().toISOString(),
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    coefficient: Number(coefficient.toFixed(2)),
    baseScore,
    adjustedScore,
    adjustedLevel: maturityLevel(adjustedScore),
    confidence: ['low', 'medium', 'high'].includes(rawAdvice.confidence) ? rawAdvice.confidence : 'medium',
    verdict: safeString(rawAdvice.verdict, 420),
    strongestSignals: Array.isArray(rawAdvice.strongestSignals) ? rawAdvice.strongestSignals.slice(0, 3).map((item) => safeString(item, 120)) : [],
    riskSignals: Array.isArray(rawAdvice.riskSignals) ? rawAdvice.riskSignals.slice(0, 3).map((item) => safeString(item, 120)) : [],
    priorityActions: Array.isArray(rawAdvice.priorityActions)
      ? rawAdvice.priorityActions.slice(0, 4).map((item) => ({
          title: safeString(item.title, 90),
          action: safeString(item.action, 180),
          impact: ['high', 'medium', 'low'].includes(item.impact) ? item.impact : 'medium',
          effort: ['low', 'medium', 'high'].includes(item.effort) ? item.effort : 'medium'
        }))
      : [],
    marketplacePitch: safeString(rawAdvice.marketplacePitch, 650),
    judgeQuestions: Array.isArray(rawAdvice.judgeQuestions)
      ? rawAdvice.judgeQuestions.slice(0, 3).map((item) => ({
          question: safeString(item.question, 140),
          answer: safeString(item.answer, 220)
        }))
      : []
  };
}

export function disabledAiAdvice(reason = 'Set OPENAI_API_KEY to enable AI Advisor.') {
  return {
    enabled: false,
    status: 'disabled',
    coefficient: 1,
    adjustedScore: null,
    adjustedLevel: null,
    message: reason
  };
}

export function failedAiAdvice(error) {
  return {
    enabled: true,
    status: 'failed',
    coefficient: 1,
    adjustedScore: null,
    adjustedLevel: null,
    message: 'AI Advisor did not respond. The deterministic score is used.',
    error: safeString(error?.message || error, 220)
  };
}

export async function runAiAdvisor(report) {
  if (process.env.AI_ADVISOR_ENABLED === 'false') {
    return disabledAiAdvice('AI Advisor is disabled by AI_ADVISOR_ENABLED=false.');
  }

  if (!hasApiKey()) {
    return disabledAiAdvice('Set OPENAI_API_KEY to enable AI Advisor.');
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_ADVISOR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
    const snapshot = buildAuditSnapshot(report);
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: buildPrompt(snapshot),
        temperature: 0.2,
        max_output_tokens: 1200,
        text: {
          format: {
            type: 'json_schema',
            name: 'launchmate_ai_advice',
            strict: true,
            schema: advisorSchema()
          }
        }
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMessage = payload?.error?.message || `OpenAI request failed with ${response.status}`;
      throw new Error(apiMessage);
    }

    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error('OpenAI returned an empty response.');

    const parsed = JSON.parse(outputText);
    return normalizeAiAdvice(parsed, report.score.total);
  } catch (error) {
    return failedAiAdvice(error.name === 'AbortError' ? new Error('OpenAI request timed out.') : error);
  } finally {
    clearTimeout(timeout);
  }
}
