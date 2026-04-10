import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Creates the organization server-side (service role), sets created_by explicitly,
 * seeds teams row if needed, and assigns the user as org admin.
 * Avoids client-side org insert + RLS/trigger issues where created_by was null or profile upsert failed.
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
  const orgNameRaw = typeof req.body?.orgName === 'string' ? req.body.orgName.trim() : '';
  const teamNumberRaw = req.body?.teamNumber;

  const tn =
    teamNumberRaw === null || teamNumberRaw === undefined || teamNumberRaw === ''
      ? null
      : Number(teamNumberRaw);
  const teamNumber = Number.isFinite(tn) ? Math.trunc(tn as number) : null;

  if (!inviteToken || !orgNameRaw || teamNumber === null) {
    res.status(400).json({ error: 'token, orgName, and teamNumber are required' });
    return;
  }

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

  const maxRedemptions = invite.max_redemptions as number | null | undefined;
  const prevCount = (invite.redemption_count as number) ?? 0;
  if (maxRedemptions != null && prevCount >= maxRedemptions) {
    res.status(400).json({ error: 'This invite has reached its maximum number of uses' });
    return;
  }

  const { data: newOrg, error: orgInsErr } = await admin
    .from('organizations')
    .insert({
      name: orgNameRaw,
      created_by: user.id,
    })
    .select('id, name')
    .single();

  if (orgInsErr || !newOrg) {
    console.error('complete-new-org-setup org insert:', orgInsErr);
    res.status(500).json({
      error: 'Failed to create organization',
      details: orgInsErr?.message,
      code: orgInsErr?.code,
    });
    return;
  }

  const organizationId = newOrg.id as string;
  let newRole = 'admin';

  try {
    const { data: existingTeam } = await admin
      .from('teams')
      .select('team_number, organization_id')
      .eq('team_number', teamNumber)
      .maybeSingle();

    if (!existingTeam) {
      const { error: teamInsErr } = await admin.from('teams').insert({
        team_number: teamNumber,
        team_name: orgNameRaw,
        organization_id: organizationId,
      });
      if (teamInsErr && teamInsErr.code !== '23505') {
        console.error('complete-new-org-setup teams insert:', teamInsErr);
        throw new Error(teamInsErr.message || 'teams insert failed');
      }
    } else if (existingTeam.organization_id == null) {
      await admin
        .from('teams')
        .update({ organization_id: organizationId })
        .eq('team_number', teamNumber);
    }

    const { data: existing } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
    newRole = existing?.role === 'superadmin' ? 'superadmin' : 'admin';

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
        can_view_pick_list: true,
        can_view_stats: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (upsertErr) {
      console.error('complete-new-org-setup upsert:', upsertErr);
      throw new Error(upsertErr.message || 'profile upsert failed');
    }

    const nextCount = prevCount + 1;
    const exhausted = maxRedemptions != null && nextCount >= maxRedemptions;
    const inviteUpdate: Record<string, unknown> = {
      redemption_count: nextCount,
      used_by: user.id,
    };
    if (exhausted) {
      inviteUpdate.status = 'used';
      inviteUpdate.used_at = new Date().toISOString();
    } else {
      inviteUpdate.status = 'pending';
    }

    const { error: inviteUpdErr } = await admin
      .from('organization_invites')
      .update(inviteUpdate)
      .eq('id', invite.id);

    if (inviteUpdErr) {
      console.error('complete-new-org-setup invite update:', inviteUpdErr);
      throw new Error(inviteUpdErr.message || 'invite update failed');
    }
  } catch (e: unknown) {
    await admin.from('organizations').delete().eq('id', organizationId);
    const msg = e instanceof Error ? e.message : 'Setup failed';
    res.status(500).json({ error: 'Failed to finish organization setup', details: msg });
    return;
  }

  res.status(200).json({ ok: true, organization_id: organizationId, role: newRole });
}
