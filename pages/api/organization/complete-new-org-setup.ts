import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * After the client creates an organization (RLS: creator can insert/select),
 * this endpoint assigns the authenticated user as org admin using the service role
 * so profile updates are not blocked by users-table RLS.
 */
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
  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const inviteToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const organizationId = typeof req.body?.organizationId === 'string' ? req.body.organizationId.trim() : '';
  const teamNumberRaw = req.body?.teamNumber;

  if (!inviteToken || !organizationId) {
    res.status(400).json({ error: 'token and organizationId are required' });
    return;
  }

  const tn =
    teamNumberRaw === null || teamNumberRaw === undefined || teamNumberRaw === ''
      ? null
      : Number(teamNumberRaw);
  const teamNumber = Number.isFinite(tn) ? Math.trunc(tn as number) : null;

  const { data: invite, error: invErr } = await admin
    .from('organization_invites')
    .select('*')
    .eq('token', inviteToken)
    .eq('status', 'pending')
    .maybeSingle();

  if (invErr || !invite) {
    res.status(400).json({ error: 'Invalid or expired invite' });
    return;
  }

  if (invite.invite_type === 'join_org') {
    res.status(400).json({ error: 'Use the join-organization flow for this invite' });
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) {
    res.status(400).json({ error: 'Invite has expired' });
    return;
  }

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, created_by')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr || !org) {
    res.status(400).json({ error: 'Organization not found' });
    return;
  }

  if (org.created_by !== user.id) {
    res.status(403).json({ error: 'You can only claim organizations you created' });
    return;
  }

  const { data: existing } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
  const newRole = existing?.role === 'superadmin' ? 'superadmin' : 'admin';

  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  const name =
    meta?.full_name ||
    meta?.name ||
    user.email?.split('@')[0] ||
    'User';

  const { error: upsertErr } = await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      name,
      image: (meta?.avatar_url as string) || null,
      organization_id: organizationId,
      role: newRole,
      team_number: teamNumber,
      can_edit_forms: true,
      can_view_pick_list: true,
      can_view_stats: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    console.error('complete-new-org-setup upsert:', upsertErr);
    res.status(500).json({ error: 'Failed to set you as organization admin' });
    return;
  }

  await admin
    .from('organization_invites')
    .update({
      status: 'used',
      used_at: new Date().toISOString(),
      used_by: user.id,
    })
    .eq('id', invite.id);

  res.status(200).json({ ok: true, organization_id: organizationId, role: newRole });
}
