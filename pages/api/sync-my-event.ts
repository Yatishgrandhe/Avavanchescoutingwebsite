import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { syncTbaEventToOrganization } from '@/lib/syncTbaToOrg';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  const orgId = profile?.organization_id;
  if (!orgId) {
    res.status(400).json({ error: 'User is not in an organization' });
    return;
  }

  const { data: eventCfg } = await supabase
    .from('app_config')
    .select('value')
    .eq('organization_id', orgId)
    .eq('key', 'current_event_key')
    .maybeSingle();

  const eventKey = String(eventCfg?.value || '').trim();
  if (!eventKey) {
    res.status(400).json({ error: 'No active event configured for your organization' });
    return;
  }

  try {
    const syncResult = await syncTbaEventToOrganization(supabase, orgId, eventKey);
    res.status(200).json(syncResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error('sync-my-event failed', {
      organizationId: orgId,
      eventKey,
      error,
    });
    res.status(502).json({ error: `TBA sync failed for ${eventKey}: ${message}` });
  }
}
