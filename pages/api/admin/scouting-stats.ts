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

    if (user.user_metadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [liveRes, pastRes] = await Promise.all([
      supabase.from('scouting_data').select('submitted_by_name'),
      supabase.from('past_scouting_data').select('submitted_by_name'),
    ]);

    if (liveRes.error) {
      console.error('scouting_data error:', liveRes.error);
      return res.status(500).json({ error: 'Failed to load scouting data' });
    }
    if (pastRes.error) {
      console.error('past_scouting_data error:', pastRes.error);
      return res.status(500).json({ error: 'Failed to load past scouting data' });
    }

    const allRows = [
      ...(liveRes.data || []).map((r: { submitted_by_name?: string | null }) => r.submitted_by_name ?? 'Unknown'),
      ...(pastRes.data || []).map((r: { submitted_by_name?: string | null }) => r.submitted_by_name ?? 'Unknown'),
    ];

    const countByPerson = new Map<string, number>();
    for (const name of allRows) {
      const displayName = (typeof name === 'string' && name.trim()) ? name.trim() : 'Unknown';
      countByPerson.set(displayName, (countByPerson.get(displayName) ?? 0) + 1);
    }

    const byPerson: ScoutingStatsByPerson[] = Array.from(countByPerson.entries())
      .map(([name, formCount]) => ({ name, formCount }))
      .sort((a, b) => b.formCount - a.formCount);

    const totalForms = allRows.length;

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
