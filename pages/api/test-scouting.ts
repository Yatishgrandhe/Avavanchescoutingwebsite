import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Test database connection
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test basic query
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('team_number, team_name')
      .limit(3);

    if (teamsError) {
      res.status(500).json({ 
        error: 'Database connection failed',
        details: teamsError.message
      });
      return;
    }

    // Test scouting_data table access
    const { data: scoutingCount, error: scoutingError } = await supabase
      .from('scouting_data')
      .select('id', { count: 'exact', head: true });

    if (scoutingError) {
      res.status(500).json({ 
        error: 'Scouting data table access failed',
        details: scoutingError.message
      });
      return;
    }

    res.status(200).json({
      status: 'Database connection successful',
      teams_found: teams?.length || 0,
      scouting_data_count: scoutingCount || 0,
      environment: {
        has_supabase_url: !!supabaseUrl,
        has_service_key: !!supabaseServiceKey,
        supabase_url: supabaseUrl?.substring(0, 30) + '...'
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
