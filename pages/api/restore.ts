import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Only allow POST requests for restore
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
    const { backup_data, mode = 'merge' } = req.body;

    if (!backup_data || !backup_data.data) {
      return res.status(400).json({ error: 'Invalid backup data format' });
    }

    const restoreResults: any = {
      restore_date: new Date().toISOString(),
      mode,
      tables_restored: [],
      summary: {
        total_tables: 0,
        successful_tables: 0,
        failed_tables: 0,
        total_records_restored: 0
      }
    };

    // List of tables that can be restored (in dependency order)
    const tables = [
      'teams',
      'matches',
      'users',
      'accounts',
      'sessions',
      'verification_tokens',
      'scouting_data',
      'pick_lists',
      'pick_list_items',
      'pit_scouting_data',
      'scouting_data_audit',
      'past_competitions',
      'past_teams',
      'past_matches',
      'past_scouting_data',
      'past_pit_scouting_data',
      'past_pick_lists'
    ];

    // Restore each table
    for (const table of tables) {
      if (!backup_data.data[table]) {
        continue;
      }

      const tableData = backup_data.data[table];
      
      if (tableData.error || !tableData.data || tableData.data.length === 0) {
        restoreResults.tables_restored.push({
          table,
          status: 'skipped',
          reason: tableData.error || 'No data to restore',
          records_restored: 0
        });
        continue;
      }

      try {
        let recordsRestored = 0;

        if (mode === 'replace') {
          // Delete all existing records first
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)

          if (deleteError) {
            console.error(`Error deleting existing records from ${table}:`, deleteError);
          }
        }

        // Insert records in batches to avoid overwhelming the database
        const batchSize = 100;
        const records = tableData.data;

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          const { data, error } = await supabase
            .from(table)
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: mode === 'merge' });

          if (error) {
            console.error(`Error restoring batch for ${table}:`, error);
            restoreResults.tables_restored.push({
              table,
              status: 'error',
              error: error.message,
              records_restored: recordsRestored
            });
            break;
          }

          recordsRestored += batch.length;
        }

        restoreResults.tables_restored.push({
          table,
          status: 'success',
          records_restored: recordsRestored
        });

        restoreResults.summary.total_records_restored += recordsRestored;
        restoreResults.summary.successful_tables++;
      } catch (err) {
        console.error(`Exception restoring table ${table}:`, err);
        restoreResults.tables_restored.push({
          table,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          records_restored: 0
        });
        restoreResults.summary.failed_tables++;
      }

      restoreResults.summary.total_tables++;
    }

    return res.status(200).json(restoreResults);
  } catch (error) {
    console.error('Error restoring backup:', error);
    return res.status(500).json({ 
      error: 'Failed to restore backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

