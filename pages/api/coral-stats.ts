import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get all scouting data with notes to calculate coral scoring
      const { data: scoutingData, error } = await supabase
        .from('scouting_data')
        .select('team_number, notes')
        .not('notes', 'is', null);

      if (error) {
        console.error('Error fetching scouting data:', error);
        return res.status(500).json({ error: 'Failed to fetch scouting data' });
      }

      // Calculate coral scoring stats for each team
      const coralStats = new Map();

      scoutingData?.forEach((data: any) => {
        const teamNumber = data.team_number;
        const notes = data.notes || {};

        if (!coralStats.has(teamNumber)) {
          coralStats.set(teamNumber, {
            team_number: teamNumber,
            total_matches: 0,
            total_coral_points: 0,
            avg_coral_points: 0,
            autonomous_coral_points: 0,
            teleop_coral_points: 0,
            coral_trough_count: 0,
            coral_l2_count: 0,
            coral_l3_count: 0,
            coral_l4_count: 0,
          });
        }

        const stats = coralStats.get(teamNumber);
        stats.total_matches += 1;

        // Calculate coral points from notes
        const autonomousCoralPoints = 
          (notes.auto_coral_trough || 0) * 3 +
          (notes.auto_coral_l2 || 0) * 4 +
          (notes.auto_coral_l3 || 0) * 6 +
          (notes.auto_coral_l4 || 0) * 7;

        const teleopCoralPoints = 
          (notes.teleop_coral_trough || 0) * 2 +
          (notes.teleop_coral_l2 || 0) * 3 +
          (notes.teleop_coral_l3 || 0) * 4 +
          (notes.teleop_coral_l4 || 0) * 5;

        const totalCoralPoints = autonomousCoralPoints + teleopCoralPoints;

        stats.total_coral_points += totalCoralPoints;
        stats.autonomous_coral_points += autonomousCoralPoints;
        stats.teleop_coral_points += teleopCoralPoints;
        stats.coral_trough_count += (notes.auto_coral_trough || 0) + (notes.teleop_coral_trough || 0);
        stats.coral_l2_count += (notes.auto_coral_l2 || 0) + (notes.teleop_coral_l2 || 0);
        stats.coral_l3_count += (notes.auto_coral_l3 || 0) + (notes.teleop_coral_l3 || 0);
        stats.coral_l4_count += (notes.auto_coral_l4 || 0) + (notes.teleop_coral_l4 || 0);
      });

      // Calculate averages and convert to array
      const coralStatsArray = Array.from(coralStats.values()).map(stats => ({
        ...stats,
        avg_coral_points: stats.total_matches > 0 ? stats.total_coral_points / stats.total_matches : 0,
        avg_autonomous_coral_points: stats.total_matches > 0 ? stats.autonomous_coral_points / stats.total_matches : 0,
        avg_teleop_coral_points: stats.total_matches > 0 ? stats.teleop_coral_points / stats.total_matches : 0,
        avg_coral_trough_count: stats.total_matches > 0 ? stats.coral_trough_count / stats.total_matches : 0,
        avg_coral_l2_count: stats.total_matches > 0 ? stats.coral_l2_count / stats.total_matches : 0,
        avg_coral_l3_count: stats.total_matches > 0 ? stats.coral_l3_count / stats.total_matches : 0,
        avg_coral_l4_count: stats.total_matches > 0 ? stats.coral_l4_count / stats.total_matches : 0,
      }));

      // Sort by average coral points descending
      coralStatsArray.sort((a, b) => b.avg_coral_points - a.avg_coral_points);

      res.status(200).json({ coralStats: coralStatsArray });
    } catch (error) {
      console.error('Error fetching coral stats:', error);
      res.status(500).json({ error: 'Failed to fetch coral stats' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
