import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * Verifies the caller's JWT can reach Supabase REST (RLS) before offline queue sync.
 * Pairs with the client speed test so uploads only run when network + DB path work.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return res.status(500).json({ ok: false, error: 'Server missing Supabase env' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await supabase.from('scouting_data').select('id').limit(1);
  if (error) {
    return res.status(503).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true });
}
