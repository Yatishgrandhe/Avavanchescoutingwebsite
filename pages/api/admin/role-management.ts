import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get requester's role and org
  const { data: requester, error: requesterError } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .single();

  if (requesterError || (requester?.role !== 'admin' && requester?.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const orgId = requester.organization_id;
  if (!orgId) return res.status(400).json({ error: 'User is not in an organization' });

  // FETCH USERS IN ORG
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, can_edit_forms, can_view_pick_list, can_view_stats')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // UPDATE USER ROLE / PERMISSIONS
  if (req.method === 'PATCH') {
    const { id, role, can_edit_forms, can_view_pick_list, can_view_stats } = req.body;
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    // 1. Fetch the target user to check their role and org
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', id)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Ensure target user is in the same organization
    if (targetUser.organization_id !== orgId) {
      return res.status(403).json({ error: 'Cannot manage users from other organizations' });
    }

    // 3. Security Checks for Admins vs Superadmins
    if (requester.role === 'admin') {
      // Admins cannot change superadmins
      if (targetUser.role === 'superadmin') {
        return res.status(403).json({ error: 'Admins cannot modify superadmins.' });
      }
      // Admins cannot promote to superadmin
      if (role === 'superadmin') {
        return res.status(403).json({ error: 'Only superadmins can promote users to superadmin.' });
      }
    }

    // Note: If requester is superadmin, they can change anything, including making others superadmin.

    // 4. Perform the update
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (can_edit_forms !== undefined) updateData.can_edit_forms = can_edit_forms;
    if (can_view_pick_list !== undefined) updateData.can_view_pick_list = can_view_pick_list;
    if (can_view_stats !== undefined) updateData.can_view_stats = can_view_stats;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, can_edit_forms, can_view_pick_list, can_view_stats')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
