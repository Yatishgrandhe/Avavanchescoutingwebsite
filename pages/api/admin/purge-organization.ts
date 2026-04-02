import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Superadmin-only: permanently delete an organization, all of its data rows, and
 * non–superadmin members (Auth + public.users). Superadmin profiles in that org
 * are detached (organization_id cleared) but accounts are kept.
 */
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

  const { data: requester } = await admin
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle();

  if (requester?.role !== 'superadmin') {
    res.status(403).json({ error: 'Superadmin only' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId.trim() : '';
  const confirmationName = typeof body.confirmationName === 'string' ? body.confirmationName.trim() : '';

  if (!organizationId || !confirmationName) {
    res.status(400).json({ error: 'organizationId and confirmationName are required' });
    return;
  }

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr || !org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  if (org.name !== confirmationName) {
    res.status(400).json({ error: 'Confirmation name does not match organization name' });
    return;
  }

  const orgId = organizationId;
  const errors: string[] = [];

  const del = async (label: string, op: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await Promise.resolve(op);
    if (error) {
      errors.push(`${label}: ${error.message}`);
    }
  };

  try {
    await del('scouting_data', admin.from('scouting_data').delete().eq('organization_id', orgId));
    await del('pit_scouting_data', admin.from('pit_scouting_data').delete().eq('organization_id', orgId));

    const { data: pickListRows } = await admin.from('pick_lists').select('id').eq('organization_id', orgId);
    const pickListIds = (pickListRows || []).map((r) => r.id as string);
    if (pickListIds.length > 0) {
      await del('pick_list_items', admin.from('pick_list_items').delete().in('pick_list_id', pickListIds));
    }
    await del('pick_lists', admin.from('pick_lists').delete().eq('organization_id', orgId));
    await del('scout_names', admin.from('scout_names').delete().eq('organization_id', orgId));
    await del('past_scouting_data', admin.from('past_scouting_data').delete().eq('organization_id', orgId));
    await del('past_pit_scouting_data', admin.from('past_pit_scouting_data').delete().eq('organization_id', orgId));
    await del('past_matches', admin.from('past_matches').delete().eq('organization_id', orgId));
    await del('past_teams', admin.from('past_teams').delete().eq('organization_id', orgId));
    await del('past_pick_lists', admin.from('past_pick_lists').delete().eq('organization_id', orgId));
    await del('past_competitions', admin.from('past_competitions').delete().eq('organization_id', orgId));
    await del('event_team_roster', admin.from('event_team_roster').delete().eq('organization_id', orgId));
    await del('event_scouting_lock', admin.from('event_scouting_lock').delete().eq('organization_id', orgId));
    await del('matches', admin.from('matches').delete().eq('organization_id', orgId));
    await del('teams', admin.from('teams').delete().eq('organization_id', orgId));
    await del('app_config', admin.from('app_config').delete().eq('organization_id', orgId));
    await del(
      'organization_invites (join targets)',
      admin.from('organization_invites').delete().eq('target_organization_id', orgId),
    );

    const { data: members, error: memErr } = await admin
      .from('users')
      .select('id, role')
      .eq('organization_id', orgId);

    if (memErr) {
      errors.push(`list members: ${memErr.message}`);
    } else {
      for (const m of members || []) {
        const uid = m.id as string;
        const role = m.role as string | null;
        if (role === 'superadmin') {
          const { error: uerr } = await admin.from('users').update({ organization_id: null }).eq('id', uid);
          if (uerr) errors.push(`detach superadmin ${uid}: ${uerr.message}`);
        } else {
          const { error: derr } = await admin.auth.admin.deleteUser(uid);
          if (derr) errors.push(`delete auth user ${uid}: ${derr.message}`);
        }
      }
    }

    await del('users (remaining profiles)', admin.from('users').delete().eq('organization_id', orgId));

    const { error: orgDelErr } = await admin.from('organizations').delete().eq('id', orgId);
    if (orgDelErr) {
      errors.push(`organizations: ${orgDelErr.message}`);
    }

    if (errors.length > 0) {
      res.status(500).json({
        error: 'Purge completed with errors',
        details: errors,
      });
      return;
    }

    res.status(200).json({ ok: true, deleted_organization_id: orgId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({ error: 'Purge failed', details: msg });
  }
}
