import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { teamNumber } = req.query;
      const teamNum = parseInt(teamNumber as string);

      if (!teamNum) {
        return res.status(400).json({ error: 'Invalid team number' });
      }

      // Get team information
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', teamNum)
        .single();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        return res.status(404).json({ error: 'Team not found' });
      }

      // Get all scouting data for this team
      const { data: scoutingData, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .order('created_at', { ascending: false });

      if (scoutingError) {
        console.error('Error fetching scouting data:', scoutingError);
        return res.status(500).json({ error: 'Failed to fetch scouting data' });
      }

      // Calculate team statistics
      const totalMatches = scoutingData?.length || 0;
      if (totalMatches === 0) {
        return res.status(200).json({
          team,
          scoutingData: [],
          stats: null
        });
      }

      const avgAutonomous = scoutingData!.reduce((sum, data) => sum + (data.autonomous_points || 0), 0) / totalMatches;
      const avgTeleop = scoutingData!.reduce((sum, data) => sum + (data.teleop_points || 0), 0) / totalMatches;
      const avgEndgame = scoutingData!.reduce((sum, data) => sum + (data.endgame_points || 0), 0) / totalMatches;
      const avgTotal = scoutingData!.reduce((sum, data) => sum + (data.final_score || 0), 0) / totalMatches;
      const avgDefense = scoutingData!.reduce((sum, data) => sum + (data.defense_rating || 0), 0) / totalMatches;
      
      const bestScore = Math.max(...scoutingData!.map(data => data.final_score || 0));
      const worstScore = Math.min(...scoutingData!.map(data => data.final_score || 0));
      
      // Calculate consistency
      const scores = scoutingData!.map(data => data.final_score || 0);
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgTotal, 2), 0) / totalMatches;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 100 - (standardDeviation / avgTotal) * 100);

      const stats = {
        totalMatches,
        avgAutonomous: Math.round(avgAutonomous * 100) / 100,
        avgTeleop: Math.round(avgTeleop * 100) / 100,
        avgEndgame: Math.round(avgEndgame * 100) / 100,
        avgTotal: Math.round(avgTotal * 100) / 100,
        avgDefense: Math.round(avgDefense * 100) / 100,
        bestScore,
        worstScore,
        consistencyScore: Math.round(consistencyScore * 100) / 100
      };

      res.status(200).json({
        team,
        scoutingData,
        stats
      });
    } catch (error) {
      console.error('Error in team API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
