import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.user_metadata?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'Query parameter "name" is required' });
    }

    const [matchRes, pitRes] = await Promise.all([
      supabase.from('scouting_data')
        .select('*')
        .not('submitted_by_name', 'is', null)
        .order('created_at', { ascending: false }),
      supabase.from('pit_scouting_data')
        .select('*')
        .not('submitted_by_name', 'is', null)
        .order('created_at', { ascending: false })
    ]);

    if (matchRes.error) {
      console.error('match_scouting_forms error:', matchRes.error);
      return res.status(500).json({ error: 'Failed to load match scouting forms' });
    }
    if (pitRes.error) {
      console.error('pit_scouting_forms error:', pitRes.error);
      return res.status(500).json({ error: 'Failed to load pit scouting forms' });
    }

    const matchForms = (matchRes.data || []).filter(
      (r: { submitted_by_name?: string | null }) => (r.submitted_by_name || '').trim() === name
    );
    const pitForms = (pitRes.data || []).filter(
      (r: { submitted_by_name?: string | null }) => (r.submitted_by_name || '').trim() === name
    );

    const teamNumbers = Array.from(new Set([
      ...matchForms.map((r: { team_number: number }) => r.team_number),
      ...pitForms.map((r: { team_number: number }) => r.team_number)
    ]));

    const { data: teams } = teamNumbers.length > 0
      ? await supabase.from('teams').select('team_number, team_name').in('team_number', teamNumbers)
      : { data: [] };

    const teamMap = new Map<number, string>((teams || []).map((t: { team_number: number; team_name: string }) => [t.team_number, t.team_name || '']));

    return res.status(200).json({
      name,
      forms: matchForms,
      pitForms: pitForms,
      teams: Object.fromEntries(teamMap),
    });
  } catch (err) {
    console.error('scouting-forms error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
