import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/** Verify current database permissions before using privileged credentials. */
export async function authorizeOrganization(req: NextApiRequest, res: NextApiResponse, adminOnly = false, operatorOnly = false) {
  res.setHeader('Cache-Control', 'private, no-store');
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) { res.status(401).json({ error: 'Sign in required' }); return null; }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !publicKey) { res.status(500).json({ error: 'Server configuration error' }); return null; }
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) { res.status(401).json({ error: 'Invalid session' }); return null; }
    const { data: profile, error: profileError } = await db.from('users')
      .select('role, organization_id').eq('id', user.id).maybeSingle();
    if (profileError) { res.status(500).json({ error: 'Could not verify permissions' }); return null; }
    if (!profile?.organization_id || (adminOnly && !['admin', 'superadmin'].includes(profile.role)) ||
      (operatorOnly && profile.role !== 'superadmin')) {
      res.status(403).json({ error: 'Organization permission required' }); return null;
    }
    // Restore additionally runs through RLS with the caller's verified token.
    const userDb = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } } });
    return { db, userDb, userId: user.id, organizationId: profile.organization_id as string };
  } catch { res.status(500).json({ error: 'Could not verify permissions' }); return null; }
}
