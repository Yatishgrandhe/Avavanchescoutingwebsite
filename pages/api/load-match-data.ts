import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { syncTbaEventToOrganization } from '@/lib/syncTbaToOrg';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST — same as /api/admin/sync-from-tba (admin session + org + eventKey in body or app_config).
 * Prefer the admin route; this endpoint is kept for older clients.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const orgId = user.organization_id;
  if (!orgId) {
    return res.status(400).json({ error: 'User is not in an organization' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  let eventKey = typeof body.eventKey === 'string' ? body.eventKey.trim() : '';

  if (!eventKey) {
    const { data: cfg } = await supabase
      .from('app_config')
      .select('value')
      .eq('organization_id', orgId)
      .eq('key', 'current_event_key')
      .maybeSingle();
    eventKey = (cfg?.value as string | undefined)?.trim() || '';
  }

  if (!eventKey) {
    return res.status(400).json({ error: 'eventKey required or save competition settings first' });
  }

  try {
    const result = await syncTbaEventToOrganization(supabase, orgId, eventKey);
    return res.status(200).json({
      success: true,
      message: `Loaded ${result.teamsUpserted} teams, ${result.matchesUpserted} matches, and refreshed ${result.metricsUpdated} team metrics for ${result.eventName}`,
      data: result,
    });
  } catch (error) {
    console.error('load-match-data', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('TBA API key is not configured')) {
      return res.status(503).json({ error: 'The Blue Alliance is not configured (set TBA_AUTH_KEY).' });
    }
    return res.status(500).json({ error: 'Failed to load match data', details: msg });
  }
}
