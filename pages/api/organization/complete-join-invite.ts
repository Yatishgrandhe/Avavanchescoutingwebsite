import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const inviteToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!inviteToken) {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  const { data: invite, error: invErr } = await supabaseAdmin
    .from('organization_invites')
    .select('*')
    .eq('token', inviteToken)
    .eq('status', 'pending')
    .maybeSingle();

  if (invErr || !invite) {
    res.status(400).json({ error: 'Invalid or expired invite' });
    return;
  }

  if (invite.invite_type !== 'join_org' || !invite.target_organization_id) {
    res.status(400).json({ error: 'This invite is not a join-org invite' });
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(400).json({ error: 'Invite has expired' });
    return;
  }

  const orgId = invite.target_organization_id as string;
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  const { error: upsertErr } = await supabaseAdmin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      name,
      image: (user.user_metadata?.avatar_url as string) || null,
      organization_id: orgId,
      role: 'user',
      can_edit_forms: false,
      can_view_pick_list: false,
      can_view_stats: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    console.error('complete-join-invite upsert:', upsertErr);
    res.status(500).json({ error: 'Failed to attach user to organization' });
    return;
  }

  await supabaseAdmin
    .from('organization_invites')
    .update({
      status: 'used',
      used_at: new Date().toISOString(),
      used_by: user.id,
    })
    .eq('id', invite.id);

  res.status(200).json({ ok: true, organization_id: orgId });
}
