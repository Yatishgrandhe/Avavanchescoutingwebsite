import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Public (no auth) preview of an invite token for UX copy on sign-in / setup flows.
 * Does not expose internal IDs beyond org name for join invites.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: invite, error } = await admin
    .from('organization_invites')
    .select('id, invite_type, status, expires_at, redemption_count, max_redemptions, target_organization_id')
    .eq('token', token)
    .maybeSingle();

  if (error || !invite) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }

  if (invite.status !== 'pending') {
    res.status(200).json({
      valid: false,
      reason: invite.status === 'used' ? 'already_used' : 'inactive',
      invite_type: invite.invite_type,
    });
    return;
  }

  const expired =
    invite.expires_at && new Date(invite.expires_at as string) < new Date();

  if (expired) {
    res.status(200).json({
      valid: false,
      reason: 'expired',
      invite_type: invite.invite_type,
      expires_at: invite.expires_at,
    });
    return;
  }

  let organizationName: string | null = null;
  if (invite.invite_type === 'join_org' && invite.target_organization_id) {
    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', invite.target_organization_id)
      .maybeSingle();
    organizationName = org?.name ?? null;
  }

  const maxRedemptions = invite.max_redemptions as number | null;
  const redemptionCount = (invite.redemption_count as number) ?? 0;
  const unlimited = maxRedemptions == null;
  const usesRemaining =
    unlimited ? null : Math.max(0, (maxRedemptions as number) - redemptionCount);

  res.status(200).json({
    valid: true,
    invite_type: invite.invite_type,
    expires_at: invite.expires_at,
    organization_name: organizationName,
    redemption_count: redemptionCount,
    max_redemptions: maxRedemptions,
    unlimited_uses: unlimited,
    uses_remaining: usesRemaining,
  });
}
