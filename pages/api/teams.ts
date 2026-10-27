import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getOrgCurrentEvent } from '@/lib/org-app-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user's org
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authUser.id)
    .single();

  if (userError || !user?.organization_id) {
    return res.status(400).json({ error: 'User is not in an organization' });
  }

  try {
    const { team_number } = req.query;

    const { eventKey, eventTeamNumbers } = await getOrgCurrentEvent(supabase, user.organization_id);
    if (!eventKey) return team_number
      ? res.status(404).json({ error: 'No active event' })
      : res.status(200).json({ teams: [] });

    let query = supabase.from('event_team_roster').select('team_number, team_name')
      .eq('organization_id', user.organization_id).eq('event_key', eventKey);
    if (eventTeamNumbers.length > 0) query = query.in('team_number', eventTeamNumbers);
    if (team_number) {
      const number = Number(team_number);
      if (!Number.isSafeInteger(number) || number <= 0) return res.status(400).json({ error: 'Invalid team number' });
      query = query.eq('team_number', number);
    }
    const { data: roster, error } = await query.order('team_number');
    if (error) throw error;
    // Team metadata is shared; event membership and event names belong to the
    // caller's org. Global team ownership is not an event roster.
    const numbers = (roster || []).map((team) => team.team_number);
    const { data: metadata, error: metadataError } = numbers.length
      ? await supabase.from('teams').select('team_number, team_color, epa, endgame_epa').in('team_number', numbers)
      : { data: [], error: null };
    if (metadataError) throw metadataError;
    const byNumber = new Map((metadata || []).map((team) => [team.team_number, team]));
    const teams = (roster || []).map((team) => ({ ...byNumber.get(team.team_number), ...team }));
    if (team_number) return teams.length
      ? res.status(200).json(teams[0])
      : res.status(404).json({ error: 'Team not found in your active event' });
    res.status(200).json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
}
