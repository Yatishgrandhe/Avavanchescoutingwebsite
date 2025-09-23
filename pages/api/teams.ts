import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { team_number } = req.query;

      if (team_number) {
        // Get specific team
        const { data: team, error } = await supabase
          .from('teams')
          .select('*')
          .eq('team_number', parseInt(team_number as string))
          .single();

        if (error) {
          console.error('Error fetching team:', error);
          return res.status(404).json({ error: 'Team not found' });
        }

        res.status(200).json(team);
      } else {
        // Get all teams
        const { data: teams, error } = await supabase
          .from('teams')
          .select('*')
          .order('team_number');

        if (error) {
          console.error('Error fetching teams:', error);
          return res.status(500).json({ error: 'Failed to fetch teams' });
        }

        res.status(200).json({ teams: teams || [] });
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
