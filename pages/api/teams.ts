import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { team_number } = req.query;

      if (team_number) {
        const team = await db.getTeam(parseInt(team_number as string));
        res.status(200).json(team);
      } else {
        const teams = await db.getTeams();
        res.status(200).json(teams);
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
