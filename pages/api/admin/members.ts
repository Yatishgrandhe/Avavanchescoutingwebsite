import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAdminUser(req: NextApiRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
  if (error || !authUser) return null;
  const { data: profile } = await supabase
    .from('users')
    .select('id, role, organization_id')
    .eq('id', authUser.id)
    .single();
  if (!profile) return null;
  if (profile.role !== 'admin' && profile.role !== 'superadmin') return null;
  if (!profile.organization_id) return null;
  return { supabase, authUser, profile };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await getAdminUser(req);
  if (!ctx) return res.status(403).json({ error: 'Forbidden' });
  const { supabase, profile, authUser } = ctx;

  // GET — list all members of the org
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, image, banned, created_at')
      .eq('organization_id', profile.organization_id)
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  // DELETE — remove a member from the org
  if (req.method === 'DELETE') {
    const { userId } = req.body as { userId?: string };
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Prevent removing yourself
    if (userId === authUser.id) {
      return res.status(400).json({ error: 'You cannot remove yourself from the organization' });
    }

    // Confirm target is in the same org
    const { data: target, error: fetchErr } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.organization_id !== profile.organization_id) {
      return res.status(403).json({ error: 'User is not in your organization' });
    }
    // Non-superadmins cannot remove admins
    if (target.role === 'admin' && profile.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmins can remove admins' });
    }

    // Remove from org + ban (prevents login until they use a new invite)
    const { error: updateErr } = await supabase
      .from('users')
      .update({ organization_id: null, banned: true })
      .eq('id', userId);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    // Immediately revoke all sessions for this user
    await supabase.auth.admin.signOut(userId, 'global').catch(() => {
      // Non-fatal — session will expire on its own
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
