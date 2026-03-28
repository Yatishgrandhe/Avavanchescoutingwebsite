import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Scout names API.
 * GET: Fetch all scouts for the user's organization.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user's org
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authUser.id)
    .single();

  if (userError || !user?.organization_id) {
    return res.status(400).json({ error: 'User is not in an organization' });
  }

  const { data, error } = await supabase
    .from('scout_names')
    .select('name')
    .eq('organization_id', user.organization_id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('scout-names error:', error);
    return res.status(500).json({ error: 'Failed to fetch scout names' });
  }

  const names = (data || []).map((r: { name: string }) => r.name);
  return res.status(200).json({ names });
}

