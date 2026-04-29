import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SCOUTING_MATCH_ID_SEASON_PATTERN } from '@/lib/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Returns per-team count of distinct matches scouted (from scouting_data).
 * Matches = COUNT(DISTINCT match_id), not number of forms.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: rows, error } = await supabase
      .from('scouting_data')
      .select('team_number, match_id')
      .like('match_id', SCOUTING_MATCH_ID_SEASON_PATTERN);

    if (error) {
      console.error('Error fetching scouting data for match counts:', error);
      return res.status(500).json({ error: error.message });
    }

    const byTeam = new Map<number, Set<string>>();
    (rows || []).forEach((row: { team_number: number; match_id: string | null }) => {
      const mid = (row.match_id ?? '').trim();
      if (!mid) return;
      if (!byTeam.has(row.team_number)) byTeam.set(row.team_number, new Set());
      byTeam.get(row.team_number)!.add(mid);
    });
    const counts: Record<number, number> = {};
    byTeam.forEach((set, teamNumber) => {
      counts[teamNumber] = set.size;
    });

    return res.status(200).json({ counts });
  } catch (err) {
    console.error('team-match-counts error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get match counts' });
  }
}
