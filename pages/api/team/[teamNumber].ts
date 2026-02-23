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

      // Get team information (allow missing for past-only teams)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', teamNum)
        .maybeSingle();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        return res.status(500).json({ error: 'Failed to fetch team' });
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

      // Get pit scouting data for this team (one record per team)
      const { data: pitData, error: pitError } = await supabase
        .from('pit_scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .maybeSingle();

      if (pitError) {
        console.error('Error fetching pit scouting data:', pitError);
      }

      const totalMatches = scoutingData?.length || 0;
      if (totalMatches === 0) {
        return res.status(200).json({
          team: team || { team_number: teamNum, team_name: `Team ${teamNum}` },
          scoutingData: [],
          pitData: pitData || null,
          stats: null
        });
      }

      const avgAutonomous = scoutingData!.reduce((sum: number, data: any) => sum + (data.autonomous_points || 0), 0) / totalMatches;
      const avgTeleop = scoutingData!.reduce((sum: number, data: any) => sum + (data.teleop_points || 0), 0) / totalMatches;
      const avgEndgame = 0; // endgame_points not in database schema
      const avgTotal = scoutingData!.reduce((sum: number, data: any) => sum + (data.final_score || 0), 0) / totalMatches;
      const avgDefense = scoutingData!.reduce((sum: number, data: any) => sum + (data.defense_rating || 0), 0) / totalMatches;
      
      const bestScore = Math.max(...scoutingData!.map((data: any) => data.final_score || 0));
      const worstScore = Math.min(...scoutingData!.map((data: any) => data.final_score || 0));
      
      // Calculate consistency (lower coefficient of variation = higher consistency)
      const scores = scoutingData!.map((data: any) => data.final_score || 0);
      const variance = totalMatches > 1
        ? scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgTotal, 2), 0) / totalMatches
        : 0;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = (avgTotal > 0 && totalMatches > 0)
        ? Math.max(0, Math.min(100, 100 - (standardDeviation / avgTotal) * 100))
        : 0;

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
        team: team || { team_number: teamNum, team_name: `Team ${teamNum}` },
        scoutingData: scoutingData || [],
        pitData: pitData || null,
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
