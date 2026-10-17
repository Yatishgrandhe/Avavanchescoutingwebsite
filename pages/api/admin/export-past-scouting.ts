import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { archivedScoutingCsv } from '@/lib/archived-scouting-csv';

const PAGE_SIZE = 500;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const competitionKey = typeof req.query.competition_key === 'string' ? req.query.competition_key.trim() : '';
  const year = typeof req.query.year === 'string' ? Number(req.query.year) : NaN;
  if (!competitionKey || competitionKey.length > 120 || !Number.isInteger(year) || year < 1900 || year > 2100) {
    return res.status(400).json({ error: 'A valid competition key and year are required' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (!profile.organization_id) {
      return res.status(400).json({ error: 'Your account must belong to an organization' });
    }

    const { data: competitions, error: competitionError } = await supabase
      .from('past_competitions')
      .select('id, competition_name')
      .eq('organization_id', profile.organization_id)
      .eq('competition_key', competitionKey)
      .eq('competition_year', year);
    if (competitionError) throw competitionError;
    if (!competitions?.length) {
      return res.status(404).json({ error: 'No archive for this event belongs to your organization' });
    }

    const competitionIds = competitions.map((competition) => competition.id);
    const rows: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      // Competition IDs have already been scoped to the admin's organization.
      const { data, error } = await supabase
        .from('past_scouting_data')
        .select('*')
        .in('competition_id', competitionIds)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No stand scouting forms were archived for this event' });
    }

    const competitionNames = new Map(competitions.map((competition) => [competition.id, competition.competition_name]));
    const csv = archivedScoutingCsv(rows.map((row) => ({
      ...row,
      competition_name: competitionNames.get(String(row.competition_id)) ?? competitions[0].competition_name,
      competition_key: competitionKey,
      competition_year: year,
    })));
    const safeKey = competitionKey.replace(/[^a-z0-9_-]/gi, '-').slice(0, 80);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${year}-${safeKey}-stand-scouting.csv"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Past scouting export error:', error);
    return res.status(500).json({ error: 'Failed to export stand scouting forms' });
  }
}
