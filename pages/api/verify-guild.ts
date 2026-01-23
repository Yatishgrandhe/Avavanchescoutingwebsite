import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: { sizeLimit: '64kb' } } };

/** Avalanche Discord server (guild) ID – used to restrict login to members of this server. */
const AVALANCHE_GUILD_ID =
  (process.env.AVALANCHE_GUILD_ID || process.env.DISCORD_SERVER_ID || '1241008226598649886').trim();

/**
 * Verify Discord guild membership using the user's OAuth access token.
 * Uses Discord API: GET /users/@me/guilds (requires "guilds" scope).
 * Checks that the user is in the Avalanche Discord server (guild ID above).
 * No bot or bot token needed.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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

  if (!AVALANCHE_GUILD_ID) {
    res.status(500).json({ error: 'AVALANCHE_GUILD_ID or DISCORD_SERVER_ID must be set' });
    return;
  }

  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(supabaseJwt);

  if (userError || !user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  const discordTimeoutMs = 10000;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), discordTimeoutMs);
  let guildsRes: Response;
  try {
    guildsRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${providerToken}` },
      signal: ac.signal,
    });
  } catch (e) {
    clearTimeout(t);
    res.status(504).json({ error: 'Discord API request timed out' });
    return;
  }
  clearTimeout(t);

  if (guildsRes.status === 401 || guildsRes.status === 403) {
    res.status(400).json({ error: 'Discord token invalid or missing guilds scope' });
    return;
  }

  if (!guildsRes.ok) {
    res.status(502).json({ error: 'Discord API error' });
    return;
  }

  const guilds: { id: string }[] = await guildsRes.json();
  const inGuild =
    Array.isArray(guilds) &&
    guilds.some((g) => String(g?.id || '').trim() === AVALANCHE_GUILD_ID);

  if (!inGuild) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    res.status(200).json({ inGuild: false });
    return;
  }

  res.status(200).json({ inGuild: true });
  } catch (e) {
    console.error('verify-guild error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
