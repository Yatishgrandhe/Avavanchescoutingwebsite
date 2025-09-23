import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/supabase';
import { calculateScore } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Create Supabase client with service role key for server-side operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  
  // Verify the JWT token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const {
        matchNumber,
        teamNumber,
        allianceColor,
        autonomous,
        teleop,
        endgame,
        miscellaneous,
      } = req.body;

      // Combine all scoring data
      const scoringNotes = {
        ...autonomous,
        ...teleop,
        ...endgame,
      };

      // Calculate scores
      const scores = calculateScore(scoringNotes);

      // Create scouting data
      const scoutingData = {
        scout_id: user.id,
        match_id: `match_${matchNumber}`,
        team_number: teamNumber,
        alliance_color: allianceColor,
        autonomous_points: calculateScore(scoringNotes.autonomous || {}).final_score,
        teleop_points: calculateScore(scoringNotes.teleop || {}).final_score,
        endgame_points: calculateScore(scoringNotes.endgame || {}).final_score,
        final_score: scores.final_score,
        notes: scoringNotes,
        defense_rating: miscellaneous.defense_rating,
        comments: miscellaneous.comments,
      };

      const result = await db.createScoutingData(scoutingData);

      res.status(201).json(result);
      return;
    } catch (error) {
      console.error('Error creating scouting data:', error);
      res.status(500).json({ error: 'Failed to create scouting data' });
      return;
    }
  } else if (req.method === 'GET') {
    try {
      const { match_id, team_number, alliance_color } = req.query;

      const filters: any = {};
      if (match_id) filters.match_id = match_id as string;
      if (team_number) filters.team_number = parseInt(team_number as string);
      if (alliance_color) filters.alliance_color = alliance_color as string;

      const data = await db.getScoutingData(filters);
      res.status(200).json(data);
      return;
    } catch (error) {
      console.error('Error fetching scouting data:', error);
      res.status(500).json({ error: 'Failed to fetch scouting data' });
      return;
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
