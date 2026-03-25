import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const KEYS = ['current_event_key', 'current_event_name'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  if (req.method === 'GET') {
    const { data: rows } = await supabaseAdmin.from('app_config').select('key, value').in('key', [...KEYS]);
    const map: Record<string, string> = {};
    (rows || []).forEach((r: { key: string; value: string }) => {
      map[r.key] = r.value;
    });
    res.status(200).json({
      current_event_key: map.current_event_key ?? '',
      current_event_name: map.current_event_name ?? '',
    });
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const key = typeof body.current_event_key === 'string' ? body.current_event_key.trim() : '';
    const name = typeof body.current_event_name === 'string' ? body.current_event_name.trim() : '';

    if (!key || !name) {
      res.status(400).json({ error: 'current_event_key and current_event_name are required' });
      return;
    }

    const now = new Date().toISOString();
    for (const [k, v] of [
      ['current_event_key', key],
      ['current_event_name', name],
    ] as const) {
      const { error } = await supabaseAdmin.from('app_config').upsert(
        { key: k, value: v, updated_at: now },
        { onConflict: 'key' }
      );
      if (error) {
        console.error('competition-settings upsert', error);
        res.status(500).json({ error: 'Failed to save settings' });
        return;
      }
    }

    res.status(200).json({ ok: true, current_event_key: key, current_event_name: name });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
