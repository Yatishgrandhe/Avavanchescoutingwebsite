import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { INVITE_EXPIRY_DAY_OPTIONS, expiryIsoFromDays } from '@/lib/invite-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const allowedExpiry = new Set<number>([...INVITE_EXPIRY_DAY_OPTIONS]);

const bodySchema = z
  .object({
    mode: z.enum(['single', 'unlimited', 'limited']),
    expiryDays: z.number().int().refine((d) => allowedExpiry.has(d), 'Invalid expiryDays'),
    maxRedemptions: z.number().int().min(2).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'limited') {
      if (data.maxRedemptions == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'maxRedemptions is required for limited mode (2–500)',
          path: ['maxRedemptions'],
        });
      }
    } else if (data.maxRedemptions != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxRedemptions is only allowed when mode is limited',
        path: ['maxRedemptions'],
      });
    }
  });

function tokenForInvite(): string {
  return randomBytes(18).toString('base64url');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: profile } = await admin.from('users').select('role').eq('id', authUser.id).maybeSingle();
  if (profile?.role !== 'superadmin') {
    res.status(403).json({ error: 'Superadmin only' });
    return;
  }

  let raw: unknown;
  try {
    raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    res.status(400).json({ error: 'Invalid body', details: msg });
    return;
  }

  const { mode, expiryDays, maxRedemptions: maxLimited } = parsed.data;
  const max_redemptions =
    mode === 'single' ? 1 : mode === 'unlimited' ? null : maxLimited!;

  const inviteToken = tokenForInvite();

  const { data: row, error: insErr } = await admin
    .from('organization_invites')
    .insert({
      token: inviteToken,
      invite_type: 'new_org',
      created_by: authUser.id,
      expires_at: expiryIsoFromDays(expiryDays),
      max_redemptions,
      redemption_count: 0,
      status: 'pending',
    })
    .select()
    .single();

  if (insErr || !row) {
    console.error('create-new-org-invite insert:', insErr);
    res.status(500).json({ error: 'Failed to create invite', details: insErr?.message });
    return;
  }

  res.status(200).json({ invite: row });
}
