import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { db } from '@/lib/supabase';
import { calculateScore } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
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
        scout_id: session.user?.id,
        match_id: `match_${matchNumber}`,
        team_number: teamNumber,
        alliance_color: allianceColor,
        autonomous_points: scores.autonomous_points,
        teleop_points: scores.teleop_points,
        endgame_points: scores.endgame_points,
        final_score: scores.final_score,
        notes: scoringNotes,
        defense_rating: miscellaneous.defense_rating,
        comments: miscellaneous.comments,
      };

      const result = await db.createScoutingData(scoutingData);

      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating scouting data:', error);
      res.status(500).json({ error: 'Failed to create scouting data' });
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
    } catch (error) {
      console.error('Error fetching scouting data:', error);
      res.status(500).json({ error: 'Failed to fetch scouting data' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
