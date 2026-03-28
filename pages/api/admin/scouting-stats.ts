import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface ScoutingStatsByPerson {
  name: string;
  formCount: number;
}

export interface ScoutingStatsResponse {
  totalForms: number;
  byPerson: ScoutingStatsByPerson[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile to find organization_id
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orgId = profile.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: 'Your account must belong to an organization' });
    }

    const [liveRes, pitRes, namesRes] = await Promise.all([
      supabase.from('scouting_data').select('submitted_by_name').eq('organization_id', orgId),
      supabase.from('pit_scouting_data').select('submitted_by_name').eq('organization_id', orgId),
      supabase.from('scout_names').select('name').eq('organization_id', orgId).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    ]);

    if (liveRes.error) {
      console.error('scouting_data error:', liveRes.error);
      return res.status(500).json({ error: 'Failed to load match scouting data' });
    }
    if (pitRes.error) {
      console.error('pit_scouting_data error:', pitRes.error);
      return res.status(500).json({ error: 'Failed to load pit scouting data' });
    }
    if (namesRes.error) {
      console.error('scout_names error:', namesRes.error);
      return res.status(500).json({ error: 'Failed to load scout names' });
    }

    const matchRows = (liveRes.data || []).map((r: { submitted_by_name?: string | null }) => r.submitted_by_name ?? 'Unknown');
    const pitRows = (pitRes.data || []).map((r: { submitted_by_name?: string | null }) => r.submitted_by_name ?? 'Unknown');

    const countByPerson = new Map<string, number>();
    for (const name of [...matchRows, ...pitRows]) {
      const displayName = (typeof name === 'string' && name.trim()) ? name.trim() : 'Unknown';
      countByPerson.set(displayName, (countByPerson.get(displayName) ?? 0) + 1);
    }

    const allScoutNames = (namesRes.data || []).map((r: { name: string }) => r.name);
    const byPerson: ScoutingStatsByPerson[] = allScoutNames.map((name) => ({
      name,
      formCount: countByPerson.get(name) ?? 0,
    }));

    const totalForms = matchRows.length + pitRows.length;

    const response: ScoutingStatsResponse = {
      totalForms,
      byPerson,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('scouting-stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
