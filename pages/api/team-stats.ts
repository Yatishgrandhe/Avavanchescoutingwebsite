import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { roundToTenth } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getRobotImageUrlsByTeam(supabaseClient: SupabaseClient, teamNumbers: number[]): Promise<Map<number, string>> {
  if (teamNumbers.length === 0) return new Map();
  const { data: rows } = await supabaseClient
    .from('pit_scouting_data')
    .select('team_number, robot_image_url, photos, created_at')
    .in('team_number', teamNumbers)
    .order('created_at', { ascending: false });

  const map = new Map<number, string>();
  for (const row of rows || []) {
    if (map.has(row.team_number)) continue;
    const url = (row.robot_image_url && String(row.robot_image_url).trim()) ||
      (Array.isArray(row.photos) && row.photos[0] ? String(row.photos[0]).trim() : '');
    if (url) map.set(row.team_number, url);
  }
  return map;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { team_number } = req.query;

      if (team_number) {
        // Get stats for specific team
        const { data: stats, error } = await supabase
          .from('team_statistics')
          .select('*')
          .eq('team_number', parseInt(team_number as string, 10))
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
          avg_autonomous_points: roundToTenth(parseFloat(stats.avg_autonomous_points) || 0),
          avg_teleop_points: roundToTenth(parseFloat(stats.avg_teleop_points) || 0),
          avg_endgame_points: roundToTenth(parseFloat(stats.avg_endgame_points) || 0),
          avg_total_score: roundToTenth(parseFloat(stats.avg_final_score) || 0),
          avg_defense_rating: roundToTenth(parseFloat(stats.avg_defense_rating) || 0),
          win_rate: 0, // This would need to be calculated from match results
          consistency_score: roundToTenth(calculateConsistencyScore({
            total_matches: stats.match_count || 0,
            avg_total_score: parseFloat(stats.avg_final_score) || 0,
          })),
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

        const teamNumbers = (stats || []).map((s: any) => s.team_number);
        const imageByTeam = await getRobotImageUrlsByTeam(supabase, teamNumbers);

        // Enrich with additional metrics and map column names
        const enrichedStats = (stats || []).map((stat: any) => ({
          team_number: stat.team_number,
          team_name: stat.team_name,
          robot_image_url: imageByTeam.get(stat.team_number) || null,
          total_matches: stat.match_count || 0,
          avg_autonomous_points: roundToTenth(parseFloat(stat.avg_autonomous_points) || 0),
          avg_teleop_points: roundToTenth(parseFloat(stat.avg_teleop_points) || 0),
          avg_endgame_points: roundToTenth(parseFloat(stat.avg_endgame_points) || 0),
          avg_total_score: roundToTenth(parseFloat(stat.avg_final_score) || 0),
          avg_defense_rating: roundToTenth(parseFloat(stat.avg_defense_rating) || 0),
          win_rate: 0, // This would need to be calculated from match results
          consistency_score: roundToTenth(calculateConsistencyScore({
            total_matches: stat.match_count || 0,
            avg_total_score: parseFloat(stat.avg_final_score) || 0,
          })),
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
  
  return roundToTenth(matchWeight * scoreWeight);
}
