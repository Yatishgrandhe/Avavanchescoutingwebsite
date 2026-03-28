import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

  try {
    const { team_number } = req.query;

    if (team_number) {
      // Get specific team
      const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', parseInt(team_number as string))
        .eq('organization_id', user.organization_id)
        .single();

      if (error) {
        console.error('Error fetching team:', error);
        return res.status(404).json({ error: 'Team not found' });
      }

      res.status(200).json(team);
    } else {
      // Get all teams for org
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .eq('organization_id', user.organization_id)
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
}
