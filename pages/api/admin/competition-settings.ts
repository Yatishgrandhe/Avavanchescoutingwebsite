import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const KEYS = ['current_event_key', 'current_event_name'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: user } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const orgId = user.organization_id;
  if (!orgId) {
    res.status(400).json({ error: 'User is not in an organization' });
    return;
  }

  if (req.method === 'GET') {
    const { data: rows } = await supabase
      .from('app_config')
      .select('key, value')
      .eq('organization_id', orgId)
      .in('key', [...KEYS]);

    const map: Record<string, string> = {};
    (rows || []).forEach((r: { key: string; value: string }) => {
      map[r.key] = r.value;
    });

    // No env fallback: after archive, DB has no keys — UI must show "no active competition"
    // instead of pulling default keys from code (which made schedules look live).
    res.status(200).json({
      current_event_key: (map.current_event_key || '').trim(),
      current_event_name: (map.current_event_name || '').trim(),
    });
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    if (body.clear === true) {
      // 1. Delete match scouting data for the org
      await supabase.from('scouting_data').delete().eq('organization_id', orgId);

      // 2. Delete pit scouting data for the org
      await supabase.from('pit_scouting_data').delete().eq('organization_id', orgId);

      // 3. Delete matches for the org
      await supabase.from('matches').delete().eq('organization_id', orgId);

      // 4. Delete pick lists for the org
      await supabase.from('pick_lists').delete().eq('organization_id', orgId);

      // 5. Reset teams for the org
      await supabase
        .from('teams')
        .update({ organization_id: null, epa: 0, endgame_epa: 0 })
        .eq('organization_id', orgId);

      // 6. Reset user team numbers for the org
      await supabase.from('users').update({ team_number: null }).eq('organization_id', orgId);

      // 7. Clear current event settings last
      const { error: delErr } = await supabase
        .from('app_config')
        .delete()
        .eq('organization_id', orgId)
        .in('key', [...KEYS]);

      if (delErr) {
        console.error('competition-settings clear', delErr);
        res.status(500).json({ error: 'Failed to clear competition' });
        return;
      }
      res.status(200).json({ ok: true, current_event_key: '', current_event_name: '', cleared: true });
      return;
    }

    const key = typeof body.current_event_key === 'string' ? body.current_event_key.trim() : '';
    const name = typeof body.current_event_name === 'string' ? body.current_event_name.trim() : '';

    if (!key || !name) {
      res.status(400).json({ error: 'current_event_key and current_event_name are required (or pass clear: true)' });
      return;
    }

    const now = new Date().toISOString();
    for (const [k, v] of [
      ['current_event_key', key],
      ['current_event_name', name],
    ] as const) {
      const { error } = await supabase.from('app_config').upsert(
        { key: k, value: v, organization_id: orgId, updated_at: now },
        { onConflict: 'key,organization_id' }
      );
      if (error) {
        console.error('competition-settings upsert', error);
        res.status(500).json({ error: 'Failed to save settings' });
        return;
      }
    }

    res.status(200).json({ ok: true, current_event_key: key, current_event_name: name });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

