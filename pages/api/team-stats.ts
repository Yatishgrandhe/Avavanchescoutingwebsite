import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { team_number } = req.query;

      if (team_number) {
        // Get stats for specific team
        const { data: stats, error } = await supabase
          .from('team_statistics')
          .select('*')
          .eq('team_number', parseInt(team_number as string))
          .single();

        if (error) {
          console.error('Error fetching team stats:', error);
          return res.status(404).json({ error: 'Team stats not found' });
        }

        // Calculate additional metrics and map column names
        const enrichedStats = {
          team_number: stats.team_number,
          team_name: stats.team_name,
          total_matches: stats.match_count || 0,
          avg_autonomous_points: parseFloat(stats.avg_autonomous_points) || 0,
          avg_teleop_points: parseFloat(stats.avg_teleop_points) || 0,
          avg_endgame_points: parseFloat(stats.avg_endgame_points) || 0,
          avg_total_score: parseFloat(stats.avg_final_score) || 0,
          avg_defense_rating: parseFloat(stats.avg_defense_rating) || 0,
          win_rate: 0, // This would need to be calculated from match results
          consistency_score: calculateConsistencyScore({
            total_matches: stats.match_count || 0,
            avg_total_score: parseFloat(stats.avg_final_score) || 0,
          }),
        };

        res.status(200).json(enrichedStats);
      } else {
        // Get stats for all teams
        const { data: stats, error } = await supabase
          .from('team_statistics')
          .select('*')
          .order('avg_final_score', { ascending: false });

        if (error) {
          console.error('Error fetching team stats:', error);
          return res.status(500).json({ error: 'Failed to fetch team stats' });
        }

        console.log('Raw stats from database:', stats?.length || 0, 'teams');

        // Enrich with additional metrics and map column names
        const enrichedStats = (stats || []).map((stat: any) => ({
          team_number: stat.team_number,
          team_name: stat.team_name,
          total_matches: stat.match_count || 0,
          avg_autonomous_points: parseFloat(stat.avg_autonomous_points) || 0,
          avg_teleop_points: parseFloat(stat.avg_teleop_points) || 0,
          avg_endgame_points: parseFloat(stat.avg_endgame_points) || 0,
          avg_total_score: parseFloat(stat.avg_final_score) || 0,
          avg_defense_rating: parseFloat(stat.avg_defense_rating) || 0,
          win_rate: 0, // This would need to be calculated from match results
          consistency_score: calculateConsistencyScore({
            total_matches: stat.match_count || 0,
            avg_total_score: parseFloat(stat.avg_final_score) || 0,
          }),
        }));

        res.status(200).json({ stats: enrichedStats });
      }
    } catch (error) {
      console.error('Error fetching team stats:', error);
      res.status(500).json({ error: 'Failed to fetch team stats' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Helper function to calculate consistency score
function calculateConsistencyScore(stats: any): number {
  // Simple consistency score based on total matches and average score
  // Higher matches with good scores = more consistent
  const matchWeight = Math.min(stats.total_matches / 10, 1); // Max weight at 10+ matches
  const scoreWeight = Math.min(stats.avg_total_score / 100, 1); // Max weight at 100+ score
  
  return Math.round((matchWeight * scoreWeight) * 100) / 100;
}
