import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const WINDOW_MS = 3 * 60 * 1000;
const MAX_TOKENS_PER_WINDOW = 15_000;
const MAX_OUTPUT_TOKENS = 500;
const MAX_CONTEXT_CHARS = 12_000;
const MODEL_PRIMARY = 'gemma-3-4b-it';

type RateEntry = { t: number; tokens: number };
const rateByUser = new Map<string, RateEntry[]>();

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function tryConsumeBudget(userId: string, estimatedTotalTokens: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const list = (rateByUser.get(userId) || []).filter((x) => now - x.t < WINDOW_MS);
  const sum = list.reduce((s, x) => s + x.tokens, 0);
  if (sum + estimatedTotalTokens > MAX_TOKENS_PER_WINDOW) {
    const oldest = list[0];
    const retryAfterSec = oldest
      ? Math.max(1, Math.ceil((WINDOW_MS - (now - oldest.t)) / 1000))
      : Math.ceil(WINDOW_MS / 1000);
    return { ok: false, retryAfterSec };
  }
  list.push({ t: now, tokens: estimatedTotalTokens });
  rateByUser.set(userId, list);
  return { ok: true };
}

function buildApiKeyChain(): string[] {
  const keys = [
    process.env.GEMINI_API_KEY?.trim() ?? '',
    process.env.GEMINI_API_KEY_BACKUP_1?.trim() ?? '',
    process.env.GEMINI_API_KEY_BACKUP_2?.trim() ?? '',
  ].filter(Boolean);
  return Array.from(new Set(keys));
}

async function callGemma(
  apiKey: string,
  prompt: string
): Promise<{ text: string; model: string } | { error: string }> {
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${MODEL_PRIMARY}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.25,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message || res.statusText;
    return { error: msg };
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return { error: 'Empty model response' };
  return { text, model: MODEL_PRIMARY };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { data: prof, error: profErr } = await admin
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profErr || prof?.role !== 'superadmin') {
    res.status(403).json({ message: 'Superadmin access required' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const contextBlock = typeof body.contextBlock === 'string' ? body.contextBlock.trim() : '';
  const localDigest = typeof body.localPendingDigest === 'string' ? body.localPendingDigest.trim() : '';

  if (!message || message.length > 4000) {
    res.status(400).json({ message: 'Invalid message' });
    return;
  }

  const combinedContext = [contextBlock, localDigest ? `LOCAL_NOT_SYNCED:\n${localDigest}` : '']
    .filter(Boolean)
    .join('\n\n');
  if (combinedContext.length > MAX_CONTEXT_CHARS) {
    res.status(400).json({ message: 'Context too large; narrow filters or reload page.' });
    return;
  }

  const sys = `You are Gemma 3 4B acting as an FRC scouting analyst. Rules:
- Use ONLY the CONTEXT and LOCAL_NOT_SYNCED sections below. If missing, say you lack data.
- Be analytical: trends, comparisons, risks, alliance-fit — not fluff.
- Max ~400 words. Bullet lists OK. No invented team numbers or scores.
- If asked something outside context, refuse briefly.`;

  const prompt = `${sys}

CONTEXT:
${combinedContext || '(none)'}

USER_QUESTION:
${message}

Answer concisely.`;

  const estTotal = estimateTokens(prompt) + MAX_OUTPUT_TOKENS;
  const budget = tryConsumeBudget(authData.user.id, estTotal);
  if (!budget.ok) {
    res.status(429).json({
      message: `Rate limit: max ~15k tokens per 3 minutes. Retry in ~${budget.retryAfterSec}s.`,
      retryAfterSeconds: budget.retryAfterSec,
    });
    return;
  }

  const keys = buildApiKeyChain();
  if (keys.length === 0) {
    res.status(500).json({ message: 'GEMINI_API_KEY not configured' });
    return;
  }

  let lastErr = 'Model unavailable';
  for (const key of keys) {
    const out = await callGemma(key, prompt);
    if ('text' in out) {
      res.status(200).json({
        reply: out.text,
        model: out.model,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      return;
    }
    lastErr = out.error;
  }

  res.status(503).json({ message: lastErr });
}
