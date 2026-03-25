import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['match_scouting_locked', 'pit_scouting_locked']);

      if (error) {
        console.error('scouting-locks GET error:', error);
        res.status(500).json({ error: 'Failed to fetch lock state' });
        return;
      }

      const row = (data || []).reduce<Record<string, string>>((acc, r: { key: string; value: string }) => {
        acc[r.key] = r.value;
        return acc;
      }, {});

      res.status(200).json({
        matchScoutingLocked: row.match_scouting_locked === 'true',
        pitScoutingLocked: row.pit_scouting_locked === 'true',
      });
    } catch (err) {
      console.error('scouting-locks GET:', err);
      res.status(500).json({ error: 'Failed to fetch lock state' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === 'admin' ||
      profile?.role === 'superadmin' ||
      user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      res.status(403).json({ error: 'Admin only' });
      return;
    }

    const { matchScoutingLocked, pitScoutingLocked } = req.body || {};
    const updates: { key: string; value: string }[] = [];

    if (typeof matchScoutingLocked === 'boolean') {
      updates.push({ key: 'match_scouting_locked', value: matchScoutingLocked ? 'true' : 'false' });
    }
    if (typeof pitScoutingLocked === 'boolean') {
      updates.push({ key: 'pit_scouting_locked', value: pitScoutingLocked ? 'true' : 'false' });
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Provide matchScoutingLocked and/or pitScoutingLocked' });
      return;
    }

    try {
      for (const { key, value } of updates) {
        const { error } = await supabase
          .from('app_config')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }

      const { data: rows, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', ['match_scouting_locked', 'pit_scouting_locked']);

      if (error) throw error;
      const row = (rows || []).reduce<Record<string, string>>((acc, r: { key: string; value: string }) => {
        acc[r.key] = r.value;
        return acc;
      }, {});

      res.status(200).json({
        matchScoutingLocked: row.match_scouting_locked === 'true',
        pitScoutingLocked: row.pit_scouting_locked === 'true',
      });
    } catch (err) {
      console.error('scouting-locks PATCH:', err);
      res.status(500).json({ error: 'Failed to update lock state' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
