import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Only allow GET requests for backup
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Check if environment variables are set
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Create Supabase client with service role key for server-side operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    return res.status(401).json({ error: 'Unauthorized - Missing token' });
  }

  const token = authHeader.split(' ')[1];
  
  // Verify the JWT token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Token verification error:', authError);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  try {
    const backupTimestamp = new Date().toISOString();
    const backup: any = {
      metadata: {
        backup_date: backupTimestamp,
        version: '1.0',
        database_url: supabaseUrl,
        tables_backed_up: []
      },
      data: {}
    };

    // List of all tables to backup
    const tables = [
      'teams',
      'matches',
      'scouting_data',
      'users',
      'accounts',
      'sessions',
      'verification_tokens',
      'pick_lists',
      'pick_list_items',
      'pit_scouting_data',
      'scouting_data_audit',
      'past_competitions',
      'past_scouting_data',
      'past_matches',
      'past_teams',
      'past_pit_scouting_data',
      'past_pick_lists'
    ];

    // Backup each table
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          backup.data[table] = {
            error: error.message,
            count: 0,
            data: []
          };
        } else {
          backup.data[table] = {
            count: data?.length || 0,
            data: data || []
          };
          backup.metadata.tables_backed_up.push({
            table,
            record_count: data?.length || 0,
            status: 'success'
          });
        }
      } catch (err) {
        console.error(`Exception backing up table ${table}:`, err);
        backup.data[table] = {
          error: err instanceof Error ? err.message : 'Unknown error',
          count: 0,
          data: []
        };
        backup.metadata.tables_backed_up.push({
          table,
          record_count: 0,
          status: 'error'
        });
      }
    }

    // Calculate summary statistics
    const totalRecords = Object.values(backup.data).reduce((sum: number, tableData: any) => {
      return sum + (tableData.count || 0);
    }, 0);

    backup.metadata.summary = {
      total_tables: tables.length,
      total_records: totalRecords,
      successful_tables: backup.metadata.tables_backed_up.filter((t: any) => t.status === 'success').length,
      failed_tables: backup.metadata.tables_backed_up.filter((t: any) => t.status === 'error').length
    };

    // Set headers for file download
    const filename = `avalanche-scouting-backup-${backupTimestamp.replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).json(backup);
  } catch (error) {
    console.error('Error creating backup:', error);
    return res.status(500).json({ 
      error: 'Failed to create backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

