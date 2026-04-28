import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { tbaFetchJson, type TbaEventSimple } from '@/lib/tba';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET ?year=2026 — list FRC events for dropdown (admin/superadmin only).
 * Uses server TBA_AUTH_KEY.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: prof } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (prof?.role !== 'admin' && prof?.role !== 'superadmin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const yearRaw = req.query.year;
  const year = Math.min(
    2100,
    Math.max(2000, parseInt(typeof yearRaw === 'string' ? yearRaw : String(new Date().getFullYear()), 10) || new Date().getFullYear())
  );

  try {
    const events = await tbaFetchJson<TbaEventSimple[]>(`/events/${year}`);
    const simple = (events || [])
      .filter((e) => e.key && e.name)
      .map((e) => ({
        key: e.key,
        name: e.name,
        short_name: e.short_name || e.name,
        city: e.city,
        state_prov: e.state_prov,
        country: e.country,
        start_date: e.start_date,
        end_date: e.end_date,
        event_type_string: e.event_type_string,
      }))
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '') || a.name.localeCompare(b.name));

    res.status(200).json({ year, events: simple });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'TBA request failed';
    if (msg.includes('TBA API key is not configured') || msg.includes('not configured')) {
      res.status(503).json({
        error:
          'The Blue Alliance API key is missing. Add TBA_AUTH_KEY to Vercel/host env (see .env.example).',
      });
      return;
    }
    console.error('tba/events', e);
    res.status(502).json({ error: msg });
  }
}
