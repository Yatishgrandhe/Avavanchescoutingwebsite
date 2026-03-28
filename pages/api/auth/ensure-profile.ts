import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { AVALANCHE_ORG_ID } from '@/lib/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Ensures the authenticated user has a public.users row tied to Avalanche.
 * Used when Discord login created auth.users but no profile or organization_id.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  const displayName =
    meta?.full_name ||
    meta?.name ||
    user.email?.split('@')[0] ||
    'User';

  const { data: existing } = await admin.from('users').select('*').eq('id', user.id).maybeSingle();

  if (existing?.organization_id) {
    res.status(200).json({ profile: existing, updated: false });
    return;
  }

  const row = {
    id: user.id,
    email: user.email ?? existing?.email ?? null,
    name: existing?.name || displayName,
    image: existing?.image || meta?.avatar_url || null,
    organization_id: AVALANCHE_ORG_ID,
    role: (existing?.role as string) || 'user',
    team_number: existing?.team_number ?? null,
    can_edit_forms: existing?.can_edit_forms ?? false,
    can_view_pick_list: existing?.can_view_pick_list ?? false,
    can_view_stats: existing?.can_view_stats ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error: upsertErr } = await admin
    .from('users')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (upsertErr) {
    console.error('ensure-profile upsert:', upsertErr);
    res.status(500).json({ error: 'Failed to sync profile' });
    return;
  }

  res.status(200).json({ profile: saved, updated: true });
}
