import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getOrgCurrentEvent } from '@/lib/org-app-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Teams at the org's current event (roster from TBA sync, else derived from matches).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: prof } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  const orgId = prof?.organization_id;
  if (!orgId) {
    res.status(400).json({ error: 'No organization', teams: [], event_key: null, event_name: null });
    return;
  }

  const { eventKey, eventName } = await getOrgCurrentEvent(supabase, orgId);

  if (!eventKey) {
    res.status(200).json({
      teams: [],
      event_key: null,
      event_name: null,
      message: 'No active competition. Ask an admin to select an event in Team Management.',
    });
    return;
  }

  const { data: roster } = await supabase
    .from('event_team_roster')
    .select('team_number, team_name')
    .eq('organization_id', orgId)
    .eq('event_key', eventKey)
    .order('team_number', { ascending: true });

  if (roster && roster.length > 0) {
    res.status(200).json({
      teams: roster.map((r: { team_number: number; team_name: string }) => ({
        team_number: r.team_number,
        team_name: r.team_name || `Team ${r.team_number}`,
      })),
      event_key: eventKey,
      event_name: eventName || eventKey,
    });
    return;
  }

  const { data: matchRows } = await supabase
    .from('matches')
    .select('red_teams, blue_teams')
    .eq('organization_id', orgId)
    .eq('event_key', eventKey);

  const nums = new Set<number>();
  for (const m of matchRows || []) {
    const row = m as { red_teams?: number[]; blue_teams?: number[] };
    (row.red_teams || []).forEach((n) => nums.add(n));
    (row.blue_teams || []).forEach((n) => nums.add(n));
  }

  const sorted = Array.from(nums).sort((a, b) => a - b);
  if (sorted.length === 0) {
    res.status(200).json({
      teams: [],
      event_key: eventKey,
      event_name: eventName || eventKey,
      message: 'No teams yet. Sync from The Blue Alliance in Team Management.',
    });
    return;
  }

  const { data: teamRows } = await supabase
    .from('teams')
    .select('team_number, team_name')
    .eq('organization_id', orgId)
    .in('team_number', sorted);

  const nameByNum = new Map<number, string>();
  for (const t of teamRows || []) {
    const row = t as { team_number: number; team_name: string };
    nameByNum.set(row.team_number, row.team_name || `Team ${row.team_number}`);
  }

  const teams = sorted.map((n) => ({
    team_number: n,
    team_name: nameByNum.get(n) || `Team ${n}`,
  }));

  res.status(200).json({
    teams,
    event_key: eventKey,
    event_name: eventName || eventKey,
  });
}
