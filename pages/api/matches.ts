import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { match_id, event_key } = req.query;

      if (match_id) {
        const match = await db.getMatch(match_id as string);
        res.status(200).json(match);
      } else {
        const matches = await db.getMatches(event_key as string);
        res.status(200).json(matches);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).json({ error: 'Failed to fetch matches' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
