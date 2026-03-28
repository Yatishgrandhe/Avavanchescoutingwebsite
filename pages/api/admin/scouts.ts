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

  // Get user role and org
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .single();

  if (userError || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const orgId = user.organization_id;
  if (!orgId) return res.status(400).json({ error: 'User is not in an organization' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('scout_names')
      .select('*')
      .eq('organization_id', orgId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const { data, error } = await supabase
      .from('scout_names')
      .insert({ 
        name: name.trim(), 
        organization_id: orgId 
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PATCH') {
    const { id, name, sort_order } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const { data, error } = await supabase
      .from('scout_names')
      .update({ name, sort_order })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const { error } = await supabase
      .from('scout_names')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
