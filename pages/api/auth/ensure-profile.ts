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

  const { data: existing, error: readErr } = await admin.from('users').select('*').eq('id', user.id).maybeSingle();

  if (readErr) {
    console.error('ensure-profile read:', readErr);
    res.status(500).json({ error: 'Failed to sync profile' });
    return;
  }

  if (existing?.organization_id) {
    res.status(200).json({ profile: existing, updated: false });
    return;
  }

  // Row exists but no org yet (new-org invite / join in progress). Do not assign Avalanche — that
  // would overwrite the org set by complete-new-org-setup on the next login.
  if (existing && !existing.organization_id) {
    res.status(200).json({ profile: existing, updated: false });
    return;
  }

  const row = {
    id: user.id,
    email: user.email ?? null,
    name: displayName,
    image: meta?.avatar_url || null,
    organization_id: AVALANCHE_ORG_ID,
    role: 'user',
    team_number: null,
    can_view_pick_list: false,
    can_view_stats: true,
    updated_at: new Date().toISOString(),
  };

  // Insert the default only when the row is still absent. An auth callback can
  // race organization setup after the read above; conflict-ignore keeps the
  // newly assigned organization, role, and ban state intact.
  const { data: inserted, error: insertErr } = await admin
    .from('users')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true })
    .select('*')
    .maybeSingle();

  if (insertErr) {
    console.error('ensure-profile insert:', insertErr);
    res.status(500).json({ error: 'Failed to sync profile' });
    return;
  }

  if (inserted) {
    res.status(200).json({ profile: inserted, updated: true });
    return;
  }

  // A conflicting row won the race. Fetch and return its authoritative values.
  const { data: saved, error: rereadErr } = await admin.from('users').select('*').eq('id', user.id).maybeSingle();
  if (rereadErr || !saved) {
    console.error('ensure-profile reread:', rereadErr);
    res.status(500).json({ error: 'Failed to sync profile' });
    return;
  }

  res.status(200).json({ profile: saved, updated: false });
}
