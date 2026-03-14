import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface LeaderboardEntry {
  name: string;
  matchScoutingCount: number;
  pitScoutingCount: number;
  totalCount: number;
}

export interface LeaderboardResponse {
  totalForms: number;
  leaderboard: LeaderboardEntry[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch data from all sources (pit needs team_number to count unique teams = one form per team)
    const [matchRes, pitRes, namesRes] = await Promise.all([
      supabase.from('scouting_data').select('submitted_by_name'),
      supabase.from('pit_scouting_data').select('submitted_by_name, team_number'),
      supabase.from('scout_names').select('name').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    ]);

    if (matchRes.error) {
      console.error('scouting_data error:', matchRes.error);
      return res.status(500).json({ error: 'Failed to load match scouting data' });
    }
    if (pitRes.error) {
      console.error('pit_scouting_data error:', pitRes.error);
      return res.status(500).json({ error: 'Failed to load pit scouting data' });
    }
    if (namesRes.error) {
      console.error('scout_names error:', namesRes.error);
      return res.status(500).json({ error: 'Failed to load scout names' });
    }

    // Match scouting: each row = one form
    const matchCounts = new Map<string, number>();
    for (const row of (matchRes.data || [])) {
      const name = (row.submitted_by_name || '').trim() || 'Unknown';
      matchCounts.set(name, (matchCounts.get(name) ?? 0) + 1);
    }

    // Pit scouting: one form per unique team (multiple submissions for same team count as one)
    const pitCountByScout = new Map<string, Set<number>>();
    const pitUniqueTeams = new Set<number>();
    for (const row of (pitRes.data || [])) {
      const name = (row.submitted_by_name || '').trim() || 'Unknown';
      const teamNumber = row.team_number as number;
      if (teamNumber == null) continue;
      pitUniqueTeams.add(teamNumber);
      if (!pitCountByScout.has(name)) pitCountByScout.set(name, new Set());
      pitCountByScout.get(name)!.add(teamNumber);
    }
    const pitCounts = new Map<string, number>();
    pitCountByScout.forEach((teams, name) => pitCounts.set(name, teams.size));

    const allScoutNames = (namesRes.data || []).map((r: { name: string }) => r.name);
    
    // Supplement with unique names found in data but NOT in scout_names
    const uniqueDataNames = new Set([...Array.from(matchCounts.keys()), ...Array.from(pitCounts.keys())]);
    uniqueDataNames.delete('Unknown');
    for (const name of allScoutNames) {
      uniqueDataNames.delete(name);
    }
    
    const finalNamesList = [...allScoutNames, ...Array.from(uniqueDataNames).sort()];

    const leaderboard: LeaderboardEntry[] = finalNamesList.map((name) => {
      const matchScoutingCount = matchCounts.get(name) ?? 0;
      const pitScoutingCount = pitCounts.get(name) ?? 0;
      return {
        name,
        matchScoutingCount,
        pitScoutingCount,
        totalCount: matchScoutingCount + pitScoutingCount,
      };
    });

    // Sort by totalCount descending, then matchScoutingCount descending
    leaderboard.sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return b.matchScoutingCount - a.matchScoutingCount;
    });

    const response: LeaderboardResponse = {
      totalForms: (matchRes.data?.length || 0) + pitUniqueTeams.size,
      leaderboard,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('leaderboard api error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
