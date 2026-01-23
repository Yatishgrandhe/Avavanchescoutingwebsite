import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const AVALANCHE_GUILD_ID = process.env.AVALANCHE_GUILD_ID || '1241008226598649886';

/**
 * Verify Discord guild membership using the user's OAuth access token.
 * Uses Discord API: GET /users/@me/guilds (requires "guilds" scope).
 * No bot or bot token needed.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const supabaseJwt = authHeader.split(' ')[1];
  const { providerToken } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  if (!providerToken || typeof providerToken !== 'string') {
    res.status(400).json({ error: 'Missing providerToken (Discord OAuth access token)' });
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(supabaseJwt);

  if (userError || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  if (guildsRes.status === 401 || guildsRes.status === 403) {
    res.status(400).json({ error: 'Discord token invalid or missing guilds scope' });
    return;
  }

  if (!guildsRes.ok) {
    res.status(502).json({ error: 'Discord API error' });
    return;
  }

  const guilds: { id: string }[] = await guildsRes.json();
  const inGuild = Array.isArray(guilds) && guilds.some((g) => g.id === AVALANCHE_GUILD_ID);

  if (!inGuild) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    res.status(200).json({ inGuild: false });
    return;
  }

  res.status(200).json({ inGuild: true });
}
