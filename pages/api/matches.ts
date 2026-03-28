import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function loadTeamNameMap(
  supabase: SupabaseClient,
  organizationId: string,
  eventKey: string,
  teamNumbers: number[]
): Promise<Map<number, { team_name: string; team_color?: string | null }>> {
  const map = new Map<number, { team_name: string; team_color?: string | null }>();
  if (teamNumbers.length === 0) return map;

  const { data: roster } = await supabase
    .from('event_team_roster')
    .select('team_number, team_name')
    .eq('organization_id', organizationId)
    .eq('event_key', eventKey)
    .in('team_number', teamNumbers);

  for (const r of roster || []) {
    map.set((r as { team_number: number }).team_number, {
      team_name: (r as { team_name: string }).team_name,
    });
  }

  const missing = teamNumbers.filter((n) => !map.has(n));
  if (missing.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('team_number, team_name, team_color')
      .in('team_number', missing);
    for (const t of teams || []) {
      const row = t as { team_number: number; team_name: string; team_color?: string | null };
      if (!map.has(row.team_number)) {
        map.set(row.team_number, { team_name: row.team_name, team_color: row.team_color });
      }
    }
  }

  return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', authUser.id)
        .maybeSingle();

      const orgId = profile?.organization_id;
      if (!orgId) {
        return res.status(200).json({ matches: [], message: 'No organization assigned' });
      }

      const queryEventKey = typeof req.query.event_key === 'string' ? req.query.event_key.trim() : '';

      let eventKey = queryEventKey;
      if (!eventKey) {
        const { data: cfg } = await supabase
          .from('app_config')
          .select('value')
          .eq('organization_id', orgId)
          .eq('key', 'current_event_key')
          .maybeSingle();
        eventKey = (cfg?.value as string | undefined)?.trim() || '';
      }

      if (!eventKey) {
        return res.status(200).json({
          matches: [],
          message: 'No active competition. An admin must select an event in Team Management.',
        });
      }

      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('organization_id', orgId)
        .eq('event_key', eventKey)
        .order('match_number', { ascending: true });

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        return res.status(500).json({ error: 'Failed to fetch matches' });
      }

      if (!matches || matches.length === 0) {
        return res.status(200).json({ matches: [] });
      }

      const allTeamNumbers = new Set<number>();
      matches.forEach((match) => {
        if (Array.isArray(match.red_teams)) {
          match.red_teams.forEach((team: number) => allTeamNumbers.add(team));
        }
        if (Array.isArray(match.blue_teams)) {
          match.blue_teams.forEach((team: number) => allTeamNumbers.add(team));
        }
      });

      const teamMap = await loadTeamNameMap(supabase, orgId, eventKey, Array.from(allTeamNumbers));

      const transformedMatches = matches.map((match) => {
        const redTeams = Array.isArray(match.red_teams)
          ? match.red_teams.map((teamNumber: number) => {
              const team = teamMap.get(teamNumber);
              return {
                team_number: teamNumber,
                team_name: team?.team_name || `Team ${teamNumber}`,
                team_color: 'red',
              };
            })
          : [];

        const blueTeams = Array.isArray(match.blue_teams)
          ? match.blue_teams.map((teamNumber: number) => {
              const team = teamMap.get(teamNumber);
              return {
                team_number: teamNumber,
                team_name: team?.team_name || `Team ${teamNumber}`,
                team_color: 'blue',
              };
            })
          : [];

        return {
          match_id: match.match_id,
          event_key: match.event_key,
          match_number: match.match_number,
          red_teams: redTeams,
          blue_teams: blueTeams,
          created_at: match.created_at,
        };
      });

      res.status(200).json({ matches: transformedMatches });
    } catch (error) {
      console.error('Error in matches API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role, organization_id')
        .eq('id', authUser.id)
        .maybeSingle();
      if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const orgId = profile?.organization_id;
      if (!orgId) {
        return res.status(400).json({ error: 'No organization' });
      }

      const { event_key, match_number, red_teams, blue_teams } = req.body;

      if (!event_key || !match_number || !red_teams || !blue_teams) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const match_id = `${event_key}_qm${match_number}`;

      const { data, error } = await supabase
        .from('matches')
        .upsert(
          {
            match_id,
            event_key,
            match_number,
            red_teams,
            blue_teams,
            organization_id: orgId,
          },
          { onConflict: 'organization_id,match_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error creating match:', error);
        return res.status(500).json({ error: 'Failed to create match' });
      }

      res.status(201).json({ match: data });
    } catch (error) {
      console.error('Error creating match:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
