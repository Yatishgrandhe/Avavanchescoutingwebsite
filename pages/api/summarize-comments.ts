import { NextApiRequest, NextApiResponse } from 'next';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Default order for scouting comment summaries.
 * Primary: Gemma 3 4B (`gemma-3-4b-it`) — same Gemini API `generateContent` as other models;
 * instruction-tuned, good for summarization and long context (128K). Falls back if quota/unavailable.
 * Override with GEMINI_MODEL / GEMINI_MODEL_FALLBACKS.
 */
const DEFAULT_MODEL_CHAIN = [
  'gemma-3-4b-it',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
];

/** Vercel env names: GEMINI_API_KEY (required), GEMINI_API_KEY_BACKUP_1, GEMINI_API_KEY_BACKUP_2 */
function buildApiKeyChain(): { keys: string[]; labels: ('primary' | 'backup_1' | 'backup_2')[] } {
  const entries: Array<{ key: string; label: 'primary' | 'backup_1' | 'backup_2' }> = [
    { key: process.env.GEMINI_API_KEY?.trim() ?? '', label: 'primary' },
    { key: process.env.GEMINI_API_KEY_BACKUP_1?.trim() ?? '', label: 'backup_1' },
    { key: process.env.GEMINI_API_KEY_BACKUP_2?.trim() ?? '', label: 'backup_2' },
  ];
  const seen = new Set<string>();
  const keys: string[] = [];
  const labels: ('primary' | 'backup_1' | 'backup_2')[] = [];
  for (const { key, label } of entries) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
    labels.push(label);
  }
  return { keys, labels };
}

function parseRetryDelayMs(message: string): number {
  const m = /retry in ([\d.]+)\s*s/i.exec(message);
  if (!m) return 0;
  const sec = parseFloat(m[1]);
  if (!Number.isFinite(sec) || sec < 0) return 0;
  return Math.min(30_000, Math.ceil(sec * 1000) + 500);
}

function isQuotaOrModelUnavailable(status: number, errorData: unknown): boolean {
  if (status === 429 || status === 503) return true;
  const msg = String((errorData as { error?: { message?: string } })?.error?.message ?? '').toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource exhausted') ||
    msg.includes('limit: 0') ||
    msg.includes('too many requests') ||
    msg.includes('not found') ||
    msg.includes('not supported for generatecontent')
  );
}

function buildModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim();
  const extras = (process.env.GEMINI_MODEL_FALLBACKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (m: string) => {
    if (!m || seen.has(m)) return;
    seen.add(m);
    out.push(m);
  };
  if (primary) add(primary);
  extras.forEach(add);
  DEFAULT_MODEL_CHAIN.forEach(add);
  return out;
}

type GeminiErrorBody = { error?: { message?: string; code?: number; status?: string } };

async function callGenerateContent(
  apiKey: string,
  apiVersion: string,
  modelId: string,
  requestBody: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; errorData: GeminiErrorBody }> {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorData: GeminiErrorBody = {};
    try {
      errorData = (await response.json()) as GeminiErrorBody;
    } catch {
      const text = await response.text();
      errorData = { error: { message: text || response.statusText } };
    }
    return { ok: false, status: response.status, errorData };
  }

  const data = await response.json();
  return { ok: true, data };
}

function extractSummary(data: unknown): string | null {
  const d = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  if (d.promptFeedback?.blockReason) {
    return null;
  }
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { comments } = req.body;
  if (!comments || !Array.isArray(comments)) {
    return res.status(400).json({ message: 'Invalid comments' });
  }

  const { keys: apiKeys, labels: keyLabels } = buildApiKeyChain();
  if (apiKeys.length === 0) {
    return res.status(500).json({
      message: 'GEMINI_API_KEY not configured in Vercel (set at least the primary key)',
    });
  }

  const validComments = comments
    .map((c: unknown) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c: string) => c.length > 3);

  if (validComments.length === 0) {
    return res.status(200).json({ summary: 'No qualitative match reports available to summarize.' });
  }

  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
  const models = buildModelChain();

  const prompt = `You are a professional FRC (First Robotics Competition) strategy analyst and lead scout. 
    Review these raw scouting notes from multiple matches and provide a high-level, ONE-PARA GRAPH strategic summary (max 3-4 sentences total).
    
    Focus on:
    1. Overall robot reliability and consistency (did it break? did it always work?).
    2. Primary scoring strengths (speed, efficiency, accuracy).
    3. Defensive capabilities or weaknesses (tippiness, speed, aggression).
    4. Integration and overall utility in an alliance.
    
    Raw Scouting Notes:
    ${validComments.map((c, i) => `Match ${i + 1}: ${c}`).join('\n')}
    
    Your summary should be objective, professional, and actionable for an alliance selection captain.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.35,
    },
  };

  const errors: string[] = [];

  for (let mi = 0; mi < models.length; mi++) {
    const modelId = models[mi];

    for (let ki = 0; ki < apiKeys.length; ki++) {
      const apiKey = apiKeys[ki];
      const keyLabel = keyLabels[ki];

      const result = await callGenerateContent(apiKey, apiVersion, modelId, requestBody);

      if (result.ok) {
        const summary = extractSummary(result.data);
        if (summary) {
          return res.status(200).json({
            summary,
            modelUsed: modelId,
            apiKeySlot: keyLabel,
          });
        }
        errors.push(`${modelId} [${keyLabel}]: empty or blocked response`);
        continue;
      }

      const msg = result.errorData.error?.message || `HTTP ${result.status}`;
      errors.push(`${modelId} [${keyLabel}]: ${msg}`);

      if (result.status === 400) {
        return res.status(400).json({
          message: msg,
          code: 'GEMINI_BAD_REQUEST',
        });
      }

      if (result.status === 401 || result.status === 403) {
        continue;
      }

      if (!isQuotaOrModelUnavailable(result.status, result.errorData)) {
        if (ki < apiKeys.length - 1) {
          continue;
        }
        return res.status(500).json({
          message: msg,
          code: 'GEMINI_ERROR',
          modelTried: modelId,
        });
      }

      const waitMs = parseRetryDelayMs(msg);
      if (waitMs > 0 && ki < apiKeys.length - 1) {
        await sleep(waitMs);
      }
    }

    if (mi < models.length - 1) {
      const waitMs = parseRetryDelayMs(errors[errors.length - 1] ?? '');
      if (waitMs > 0) {
        await sleep(Math.min(waitMs, 5_000));
      }
    }
  }

  const combined = errors.join(' | ');
  const retryAfterMs = parseRetryDelayMs(combined);
  const payload = {
    message:
      'The summarizer could not complete (quota, rate limit, or no working model). ' +
      'Try again shortly, add GEMINI_API_KEY_BACKUP_1 / BACKUP_2, enable billing, or adjust GEMINI_MODEL. ' +
      `Details: ${combined.slice(0, 1200)}`,
    code: 'GEMINI_UNAVAILABLE' as const,
    retryAfterSeconds: retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1000) : undefined,
    modelsTried: models,
    keysTried: keyLabels.length,
  };

  return res.status(429).json(payload);
}
