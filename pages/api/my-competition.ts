import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getOrgCurrentEvent } from '@/lib/org-app-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Logged-in user's org active competition labels (for dashboard, etc.). */
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
    .select('organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (!prof?.organization_id) {
    res.status(200).json({ current_event_key: '', current_event_name: '' });
    return;
  }

  const { eventKey, eventName } = await getOrgCurrentEvent(supabase, prof.organization_id);
  res.status(200).json({
    current_event_key: eventKey,
    current_event_name: eventName,
  });
}
