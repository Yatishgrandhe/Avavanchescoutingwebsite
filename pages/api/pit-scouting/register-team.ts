import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { registerTeamInEvent } from '@/lib/register-team-in-event';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Registers a team into the caller's current event roster so that manually-scouted
 * pit/match data for teams not on the original schedule still merge into the active
 * competition. Any authenticated user with an organization may call this; it only
 * performs an idempotent registration side-effect (never deletes or overwrites data).
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
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authUser.id)
    .maybeSingle();
  const orgId = profile?.organization_id;
  if (!orgId) {
    res.status(400).json({ error: 'No organization' });
    return;
  }

  const teamNumber = parseInt(String(req.body?.team_number || ''), 10);
  if (!Number.isFinite(teamNumber) || teamNumber < 1 || teamNumber > 99999) {
    res.status(400).json({ error: 'Invalid team number' });
    return;
  }

  try {
    const registration = await registerTeamInEvent(supabase, orgId, teamNumber);
    res.status(200).json(registration);
  } catch (err) {
    console.error('register-team error', err);
    res.status(200).json({ registered: false, eventKey: '', eventName: '' });
  }
}
