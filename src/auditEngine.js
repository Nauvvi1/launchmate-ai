const DEFAULT_TIMEOUT_MS = 8000;

const STARTER_THRESHOLD = 55;
const PRO_THRESHOLD = 80;

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function normalizeWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function safeLower(value = '') {
  return String(value).toLowerCase();
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https URLs are supported');
  }
  return parsed.toString();
}

async function fetchWithTiming(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'LaunchMateAI/1.0 MVP readiness auditor',
        accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8'
      }
    });

    const elapsedMs = Date.now() - startedAt;
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      elapsedMs,
      contentType,
      text: text.slice(0, 1_500_000)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractTag(html, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = html.match(re);
  return normalizeWhitespace(stripTags(match?.[1] || ''));
}

function extractAttribute(fragment = '', attrName) {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`, 'i');
  return normalizeWhitespace(fragment.match(re)?.[1] || '');
}

function findMeta(html, name) {
  const lowerName = name.toLowerCase();
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const meta of metas) {
    const metaName = safeLower(extractAttribute(meta, 'name'));
    const metaProp = safeLower(extractAttribute(meta, 'property'));
    if (metaName === lowerName || metaProp === lowerName) {
      return extractAttribute(meta, 'content');
    }
  }
  return '';
}

function countMatches(html, re) {
  return (html.match(re) || []).length;
}

function stripTags(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function analyzeHtml(html, url) {
  const title = extractTag(html, 'title');
  const h1 = extractTag(html, 'h1');
  const description = findMeta(html, 'description');
  const viewport = findMeta(html, 'viewport');
  const ogTitle = findMeta(html, 'og:title');
  const ogDescription = findMeta(html, 'og:description');
  const lang = extractAttribute(html.match(/<html\b[^>]*>/i)?.[0] || '', 'lang');
  const text = normalizeWhitespace(stripTags(html));
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const imagesWithAlt = imageTags.filter((tag) => extractAttribute(tag, 'alt')).length;
  const linkCount = countMatches(html, /<a\b/gi);
  const buttonCount = countMatches(html, /<button\b/gi);
  const formCount = countMatches(html, /<form\b/gi);
  const hasCanonical = /<link\b[^>]*rel\s*=\s*["']canonical["']/i.test(html);
  const hasFavicon = /<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(html);
  const hasManifest = /<link\b[^>]*rel\s*=\s*["']manifest["']/i.test(html);
  const hasAnalytics = /(gtag\(|googletagmanager|ym\(|yandex\.metrika|plausible|posthog|mixpanel|amplitude)/i.test(html);
  const hasPricingSignal = /(pricing|price|тариф|оплат|подписк|premium|pro plan|монетизац)/i.test(text);
  const hasContactSignal = /(contact|telegram|email|support|связаться|почта|поддержка)/i.test(text);
  const hasDemoSignal = /(demo|try|start|запустить|попробовать|демо|начать)/i.test(text);
  const isHttps = safeLower(url).startsWith('https://');

  const altCoverage = imageTags.length === 0 ? 100 : Math.round((imagesWithAlt / imageTags.length) * 100);

  return {
    title,
    h1,
    description,
    viewport,
    ogTitle,
    ogDescription,
    lang,
    textLength: text.length,
    linkCount,
    buttonCount,
    formCount,
    imageCount: imageTags.length,
    imagesWithAlt,
    altCoverage,
    hasCanonical,
    hasFavicon,
    hasManifest,
    hasAnalytics,
    hasPricingSignal,
    hasContactSignal,
    hasDemoSignal,
    isHttps
  };
}

function parseGithubRepo(repoUrl = '') {
  try {
    const url = new URL(normalizeUrl(repoUrl));
    if (!/github\.com$/i.test(url.hostname.replace(/^www\./, ''))) return null;
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/i, '') };
  } catch {
    return null;
  }
}

async function fetchReadme(repoUrl) {
  const repo = parseGithubRepo(repoUrl);
  if (!repo) {
    return {
      available: false,
      reason: repoUrl ? 'Only public GitHub repository URLs are supported in this MVP.' : 'Repository URL was not provided.',
      text: ''
    };
  }

  const branches = ['main', 'master'];
  for (const branch of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/README.md`;
    try {
      const response = await fetchWithTiming(rawUrl, 6000);
      if (response.ok && response.text.trim()) {
        return {
          available: true,
          url: rawUrl,
          branch,
          text: response.text.slice(0, 120_000)
        };
      }
    } catch {
      // Try the next branch.
    }
  }

  return {
    available: false,
    reason: 'README.md was not found on main/master branches or repository is private.',
    text: ''
  };
}

function analyzeReadme(readme) {
  const text = readme.text || '';
  const lower = safeLower(text);
  const hasInstall = /(install|установ|npm install|pnpm install|yarn|docker compose|pip install)/i.test(text);
  const hasRun = /(run|start|запуск|npm run|docker compose up|localhost)/i.test(text);
  const hasDemo = /(demo|демо|live|preview|screenshot|скриншот|video|видео)/i.test(text);
  const hasEnv = /(\.env|environment|переменн|config|configuration)/i.test(text);
  const hasStack = /(stack|tech|технолог|node|react|vue|python|postgres|mongodb|sqlite|express|next)/i.test(text);
  const hasRoadmap = /(roadmap|план|todo|next steps|дальше)/i.test(text);
  const hasLicense = /(license|лиценз)/i.test(text);
  const hasContribution = /(contribut|pull request|issue|вклад)/i.test(text);
  const headingCount = (text.match(/^#{1,3}\s+/gm) || []).length;

  return {
    available: readme.available,
    length: text.length,
    headingCount,
    hasInstall,
    hasRun,
    hasDemo,
    hasEnv,
    hasStack,
    hasRoadmap,
    hasLicense,
    hasContribution,
    summary: readme.available
      ? `README found (${Math.round(text.length / 100) / 10}k chars, ${headingCount} headings).`
      : readme.reason
  };
}

function scoreFromChecks(input, page, readmeResult, fetchResult) {
  const technicalItems = [
    { key: 'demoAvailable', label: 'Demo URL opens successfully', ok: fetchResult.ok && fetchResult.status < 400, points: 8 },
    { key: 'fastEnough', label: 'Demo responds fast enough', ok: fetchResult.elapsedMs <= 2500, points: 5 },
    { key: 'usesHttps', label: 'Demo uses HTTPS', ok: page.isHttps, points: 4 },
    { key: 'htmlContent', label: 'Demo returns HTML content', ok: /html/i.test(fetchResult.contentType) || /<!doctype|<html/i.test(fetchResult.text), points: 4 },
    { key: 'hasViewport', label: 'Mobile viewport is configured', ok: Boolean(page.viewport), points: 5 },
    { key: 'hasFavicon', label: 'Favicon is present', ok: page.hasFavicon, points: 2 },
    { key: 'hasManifest', label: 'Web app manifest is present', ok: page.hasManifest, points: 2 }
  ];

  const uxItems = [
    { key: 'hasTitle', label: 'Clear page title', ok: page.title.length >= 8 && page.title.length <= 70, points: 4 },
    { key: 'hasDescription', label: 'Meta description is useful', ok: page.description.length >= 50 && page.description.length <= 180, points: 5 },
    { key: 'hasH1', label: 'Main heading exists', ok: page.h1.length >= 6, points: 3 },
    { key: 'hasCTA', label: 'CTA button or action exists', ok: page.buttonCount > 0 || page.hasDemoSignal, points: 4 },
    { key: 'enoughContent', label: 'Landing has enough explanatory content', ok: page.textLength >= 700, points: 4 },
    { key: 'imageAltCoverage', label: 'Images have alt text', ok: page.altCoverage >= 70, points: 3 },
    { key: 'hasOpenGraph', label: 'Open Graph preview is configured', ok: Boolean(page.ogTitle && page.ogDescription), points: 2 }
  ];

  const docsItems = [
    { key: 'readmeAvailable', label: 'README exists', ok: readmeResult.available, points: 5 },
    { key: 'readmeInstall', label: 'README explains installation', ok: readmeResult.hasInstall, points: 4 },
    { key: 'readmeRun', label: 'README explains launch command', ok: readmeResult.hasRun, points: 4 },
    { key: 'readmeDemo', label: 'README includes demo/screenshots/video', ok: readmeResult.hasDemo, points: 3 },
    { key: 'readmeStack', label: 'README names tech stack', ok: readmeResult.hasStack, points: 2 },
    { key: 'readmeRoadmap', label: 'README includes roadmap/next steps', ok: readmeResult.hasRoadmap, points: 2 }
  ];

  const businessItems = [
    { key: 'targetAudience', label: 'Target audience is defined', ok: normalizeWhitespace(input.targetAudience).length >= 20, points: 4 },
    { key: 'problemDescription', label: 'Product description explains the problem', ok: normalizeWhitespace(input.description).length >= 80, points: 4 },
    { key: 'monetization', label: 'Monetization idea is defined', ok: normalizeWhitespace(input.monetization).length >= 25 || page.hasPricingSignal, points: 4 },
    { key: 'contactSignal', label: 'Project has contact/support signal', ok: page.hasContactSignal, points: 2 },
    { key: 'analyticsSignal', label: 'Analytics signal detected', ok: page.hasAnalytics, points: 1 }
  ];

  const launchItems = [
    { key: 'demoSignal', label: 'Demo/start signal is visible', ok: page.hasDemoSignal, points: 3 },
    { key: 'canonical', label: 'Canonical URL is configured', ok: page.hasCanonical, points: 2 },
    { key: 'language', label: 'HTML language is configured', ok: Boolean(page.lang), points: 2 },
    { key: 'externalLinks', label: 'Landing has navigation or external links', ok: page.linkCount >= 2, points: 2 },
    { key: 'forms', label: 'Landing has lead/signup/contact form', ok: page.formCount > 0, points: 1 }
  ];

  const groups = [
    { key: 'technical', label: 'Technical readiness', max: 30, items: technicalItems },
    { key: 'ux', label: 'UX & presentation', max: 25, items: uxItems },
    { key: 'documentation', label: 'Documentation', max: 20, items: docsItems },
    { key: 'business', label: 'Business clarity', max: 15, items: businessItems },
    { key: 'launch', label: 'Launch assets', max: 10, items: launchItems }
  ];

  const scoredGroups = groups.map((group) => {
    const score = group.items.reduce((sum, item) => sum + (item.ok ? item.points : 0), 0);
    return { ...group, score };
  });

  const total = scoredGroups.reduce((sum, group) => sum + group.score, 0);
  return { total: clamp(total), groups: scoredGroups };
}

function maturityLevel(score) {
  if (score >= PRO_THRESHOLD) {
    return {
      name: 'Pro / Marketplace Ready',
      description: 'Looks ready for a serious public demo and marketplace-style review.'
    };
  }

  if (score >= STARTER_THRESHOLD) {
    return {
      name: 'Advanced',
      description: 'A working MVP with visible value, but still needs launch polish.'
    };
  }

  return {
    name: 'Starter',
    description: 'The project has a base, but needs stronger demo, docs, and launch assets.'
  };
}

function buildRecommendations(score) {
  const recommendations = [];

  for (const group of score.groups) {
    for (const item of group.items) {
      if (!item.ok) {
        recommendations.push({
          group: group.label,
          title: item.label,
          impact: item.points >= 5 ? 'high' : item.points >= 3 ? 'medium' : 'low',
          points: item.points,
          action: actionForItem(item.key)
        });
      }
    }
  }

  return recommendations.sort((a, b) => b.points - a.points).slice(0, 12);
}

function actionForItem(key) {
  const actions = {
    demoAvailable: 'Fix the demo URL first. Judges should be able to open the product without asking for help.',
    fastEnough: 'Optimize the first response or move the demo to a faster deployment target.',
    usesHttps: 'Deploy behind HTTPS. This is expected for any public MVP.',
    htmlContent: 'Make sure the demo URL opens a human-readable landing or application page.',
    hasViewport: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile readiness.',
    hasFavicon: 'Add a favicon to make the product feel complete.',
    hasManifest: 'Add a web app manifest if this product should feel installable or PWA-like.',
    hasTitle: 'Write a clear title with the product name and one-line value proposition.',
    hasDescription: 'Add a 50–180 character meta description explaining the product benefit.',
    hasH1: 'Add a strong H1 that immediately explains what the product does.',
    hasCTA: 'Add one visible primary action such as “Try demo”, “Run audit”, or “Get report”.',
    enoughContent: 'Explain the problem, audience, workflow, and result with enough landing-page copy.',
    imageAltCoverage: 'Add useful alt text to key images and screenshots.',
    hasOpenGraph: 'Add og:title and og:description so the project looks good when shared.',
    readmeAvailable: 'Create README.md with product overview, setup, demo, stack, and roadmap.',
    readmeInstall: 'Add exact installation commands to README.md.',
    readmeRun: 'Add exact local launch commands and required environment variables.',
    readmeDemo: 'Add demo link, screenshots, or video link to README.md.',
    readmeStack: 'Name the tech stack and architecture in README.md.',
    readmeRoadmap: 'Add roadmap and what changed during the hackathon.',
    targetAudience: 'State who the product is for and why this audience needs it now.',
    problemDescription: 'Rewrite the description around a concrete pain, not only around features.',
    monetization: 'Add a credible monetization model: paid reports, team workspace, CI checks, or consulting export.',
    contactSignal: 'Add contact/support information for users, judges, or marketplace reviewers.',
    analyticsSignal: 'Add privacy-friendly analytics to understand product usage.',
    demoSignal: 'Make the demo/start action visible in the hero section.',
    canonical: 'Add a canonical link for a more polished launch page.',
    language: 'Set the lang attribute on the html tag.',
    externalLinks: 'Add links to demo, GitHub, docs, or contact.',
    forms: 'Add a lead, signup, waitlist, or feedback form.'
  };

  return actions[key] || 'Improve this item to increase launch readiness.';
}

function buildExecutiveSummary(input, score, level, recommendations) {
  const name = input.name || 'This project';
  const top = recommendations.slice(0, 3).map((item) => item.title.toLowerCase());

  if (score.total >= PRO_THRESHOLD) {
    return `${name} is close to a marketplace-ready submission. The core demo and launch signals are strong; the next best improvements are ${top.join(', ')}.`;
  }

  if (score.total >= STARTER_THRESHOLD) {
    return `${name} has a credible MVP foundation and can be presented as an Advanced-level project. To push it toward Pro, focus on ${top.join(', ')}.`;
  }

  return `${name} is still closer to Starter level. The fastest path to a stronger submission is to fix ${top.join(', ')} and make the demo easier to evaluate.`;
}

export async function runAudit(input) {
  const cleanedInput = {
    name: normalizeWhitespace(input.name),
    demoUrl: normalizeUrl(input.demoUrl),
    repoUrl: normalizeWhitespace(input.repoUrl),
    description: normalizeWhitespace(input.description),
    targetAudience: normalizeWhitespace(input.targetAudience),
    monetization: normalizeWhitespace(input.monetization)
  };

  let fetchResult;
  try {
    fetchResult = await fetchWithTiming(cleanedInput.demoUrl);
  } catch (error) {
    fetchResult = {
      ok: false,
      status: 0,
      finalUrl: cleanedInput.demoUrl,
      elapsedMs: DEFAULT_TIMEOUT_MS,
      contentType: '',
      text: '',
      error: error.name === 'AbortError' ? 'Request timed out' : error.message
    };
  }

  const page = analyzeHtml(fetchResult.text || '', fetchResult.finalUrl || cleanedInput.demoUrl);
  const readme = await fetchReadme(cleanedInput.repoUrl).catch((error) => ({
    available: false,
    reason: error.message,
    text: ''
  }));
  const readmeAnalysis = analyzeReadme(readme);
  const score = scoreFromChecks(cleanedInput, page, readmeAnalysis, fetchResult);
  const level = maturityLevel(score.total);
  const recommendations = buildRecommendations(score);
  const executiveSummary = buildExecutiveSummary(cleanedInput, score, level, recommendations);

  return {
    input: cleanedInput,
    generatedAt: nowIso(),
    status: fetchResult.ok ? 'completed' : 'completed_with_warnings',
    page: {
      finalUrl: fetchResult.finalUrl,
      status: fetchResult.status,
      responseTimeMs: fetchResult.elapsedMs,
      contentType: fetchResult.contentType,
      error: fetchResult.error || null,
      ...page
    },
    readme: readmeAnalysis,
    score,
    level,
    recommendations,
    executiveSummary
  };
}

export function reportToMarkdown(report) {
  const groups = report.score.groups.map((group) => {
    const checks = group.items
      .map((item) => `- ${item.ok ? '✅' : '❌'} ${item.label} (${item.ok ? '+' : '0'}/${item.points})`)
      .join('\n');
    return `### ${group.label}: ${group.score}/${group.max}\n${checks}`;
  }).join('\n\n');

  const recommendations = report.recommendations.length
    ? report.recommendations.map((item, index) => `${index + 1}. **${item.title}** — ${item.action}`).join('\n')
    : 'No critical recommendations. Keep polishing and prepare the submission video.';

  const ai = report.ai?.status === 'completed'
    ? `## AI Advisor\n\n` +
      `- Coefficient: x${report.ai.coefficient}\n` +
      `- Base score: ${report.ai.baseScore}/100\n` +
      `- AI-adjusted score: ${report.ai.adjustedScore}/100 — ${report.ai.adjustedLevel}\n` +
      `- Confidence: ${report.ai.confidence}\n\n` +
      `${report.ai.verdict}\n\n` +
      `### AI priority actions\n` +
      `${report.ai.priorityActions.map((item, index) => `${index + 1}. **${item.title}** (${item.impact} impact, ${item.effort} effort) — ${item.action}`).join('\n')}\n\n` +
      `### Marketplace pitch\n${report.ai.marketplacePitch}\n\n`
    : `## AI Advisor\n\n${report.ai?.message || 'AI Advisor was not run. Mechanical score is used.'}\n\n`;

  const finalScore = report.ai?.status === 'completed' ? report.ai.adjustedScore : report.score.total;
  const finalLevel = report.ai?.status === 'completed' ? report.ai.adjustedLevel : report.level.name;
  const summary = report.ai?.status === 'completed' ? report.ai.verdict : report.executiveSummary;

  return `# LaunchMate AI Report: ${report.input.name}\n\n` +
    `Generated: ${report.generatedAt}\n\n` +
    `Demo URL: ${report.input.demoUrl}\n\n` +
    `Repository: ${report.input.repoUrl || 'not provided'}\n\n` +
    `## Marketplace Readiness Score\n\n` +
    `**${finalScore}/100 — ${finalLevel}**\n\n` +
    `${summary}\n\n` +
    `${ai}` +
    `## Score breakdown\n\n${groups}\n\n` +
    `## Recommended next steps\n\n${recommendations}\n\n` +
    `## Page snapshot\n\n` +
    `- Status: ${report.page.status}\n` +
    `- Response time: ${report.page.responseTimeMs} ms\n` +
    `- Title: ${report.page.title || 'missing'}\n` +
    `- Meta description: ${report.page.description || 'missing'}\n` +
    `- H1: ${report.page.h1 || 'missing'}\n` +
    `- Images with alt text: ${report.page.imagesWithAlt}/${report.page.imageCount}\n` +
    `- README: ${report.readme.summary}\n`;
}
