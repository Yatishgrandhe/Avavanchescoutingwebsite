import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resolveTeamNamesFromTba } from '@/lib/tba';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Read-only name lookup for a manually entered FRC number. It requires an
 * authenticated Avalanche user, prefers TBA's official nickname, and always
 * returns a readable fallback so a missing roster never blocks pit scouting.
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

  const teamNumber = parseInt(String(req.query.team_number || ''), 10);
  if (!Number.isFinite(teamNumber) || teamNumber < 1 || teamNumber > 99999) {
    res.status(400).json({ error: 'Team number must be between 1 and 99999' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.slice('Bearer '.length);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: existing } = await supabase
    .from('teams')
    .select('team_name')
    .eq('team_number', teamNumber)
    .maybeSingle();

  const existingName = existing?.team_name?.trim();
  if (existingName && existingName !== `Team ${teamNumber}`) {
    res.status(200).json({ team_number: teamNumber, team_name: existingName, source: 'cache' });
    return;
  }

  const names = await resolveTeamNamesFromTba([teamNumber]);
  const resolvedName = names.get(teamNumber)?.trim();
  res.status(200).json({
    team_number: teamNumber,
    team_name: resolvedName || existingName || `Team ${teamNumber}`,
    source: resolvedName ? 'tba' : existingName ? 'cache' : 'fallback',
  });
}
