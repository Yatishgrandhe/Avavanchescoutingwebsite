import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { syncTbaEventToOrganization } from '@/lib/syncTbaToOrg';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST { eventKey?: string } — sync teams + matches from TBA for the caller's org.
 * If eventKey omitted, uses current_event_key from app_config for that org.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: user } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const orgId = user.organization_id;
  if (!orgId) {
    res.status(400).json({ error: 'User is not in an organization' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  let eventKey = typeof body.eventKey === 'string' ? body.eventKey.trim() : '';

  if (!eventKey) {
    const { data: rows } = await supabase
      .from('app_config')
      .select('key, value')
      .eq('organization_id', orgId)
      .eq('key', 'current_event_key')
      .maybeSingle();
    eventKey = (rows?.value as string | undefined)?.trim() || '';
  }

  if (!eventKey) {
    res.status(400).json({ error: 'No active event. Save a competition first or pass eventKey in the body.' });
    return;
  }

  try {
    const result = await syncTbaEventToOrganization(supabase, orgId, eventKey);
    res.status(200).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    if (msg.includes('TBA_API_KEY')) {
      res.status(503).json({ error: 'The Blue Alliance is not configured (set TBA_API_KEY).' });
      return;
    }
    console.error('sync-from-tba', e);
    res.status(502).json({ error: msg });
  }
}
