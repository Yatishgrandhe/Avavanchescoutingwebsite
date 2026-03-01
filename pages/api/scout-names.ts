import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('scout_names')
      .select('name')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('scout-names error:', error);
      return res.status(500).json({ error: 'Failed to fetch scout names' });
    }

    const names = (data || []).map((r: { name: string }) => r.name);
    return res.status(200).json({ names });
  } catch (err) {
    console.error('scout-names error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
