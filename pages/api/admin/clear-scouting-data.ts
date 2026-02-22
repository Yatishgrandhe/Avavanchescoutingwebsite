import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * DELETE all match scouting data from scouting_data table.
 * Admin only (user_metadata.role === 'admin').
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing token' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  if (user.user_metadata?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin only' });
  }

  try {
    // Delete all rows: Supabase requires a filter; created_at is always set
    const { error: deleteError } = await supabase
      .from('scouting_data')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00.000Z');

    if (deleteError) {
      console.error('Clear scouting data error:', deleteError);
      return res.status(500).json({
        error: 'Failed to clear scouting data',
        details: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'All match scouting data has been deleted.',
    });
  } catch (err) {
    console.error('Unexpected error clearing scouting data:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
