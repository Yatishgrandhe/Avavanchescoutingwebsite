import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'CSV data is required' });

    const lines = csv.split('\n');
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have a header and at least one data row' });

    const headers = lines[0].split(',');
    const matchesToInsert = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',');
      if (values.length < 12) continue; // Minimal required data

      // Format: match_key,scheduled_date,scheduled_time,comp_level,match_number,set_number,red1,red2,red3,blue1,blue2,blue3,red_score,blue_score
      const match = {
        match_id: values[0],
        event_key: values[0].split('_')[0],
        comp_level: values[3] || 'qm',
        match_number: parseInt(values[4]) || 0,
        set_number: parseInt(values[5]) || 1,
        red_teams: [parseInt(values[6]), parseInt(values[7]), parseInt(values[8])],
        blue_teams: [parseInt(values[9]), parseInt(values[10]), parseInt(values[11])],
        red_score: values[12] ? parseInt(values[12]) : null,
        blue_score: values[13] ? parseInt(values[13]) : null,
        organization_id: orgId
      };
      
      matchesToInsert.push(match);
    }

    if (matchesToInsert.length === 0) {
      return res.status(400).json({ error: 'No valid matches found in CSV' });
    }

    // Upsert matches based on match_id
    const { error: insertError } = await supabase
      .from('matches')
      .upsert(matchesToInsert, { onConflict: 'match_id' });

    if (insertError) {
      console.error('Match insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({ success: true, count: matchesToInsert.length });
  } catch (err: any) {
    console.error('CSV parse error:', err);
    return res.status(500).json({ error: 'Failed to process CSV' });
  }
}
