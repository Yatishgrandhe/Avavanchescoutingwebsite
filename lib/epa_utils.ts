import { createClient } from '@supabase/supabase-js';
import { computeRebuiltMetrics, type ScoutingRowForAnalytics } from './analytics';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Recalculates EPA and Endgame EPA for a specific team and updates the teams table.
 * Static calculation based on all available scouting data for that team.
 */
export async function updateTeamEpa(teamNumber: number, organizationId: string): Promise<void> {
  try {
    // 1. Fetch all scouting data for this team within the organization
    // Sorting by created_at ascending for chronological EPA calculation
    const { data: rows, error: fetchError } = await supabase
      .from('scouting_data')
      .select(`
        notes,
        average_downtime,
        broke,
        final_score,
        autonomous_points,
        teleop_points,
        defense_rating,
        autonomous_cleansing,
        teleop_cleansing,
        created_at
      `)
      .eq('team_number', teamNumber)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error(`Error fetching scouting data for team ${teamNumber}:`, fetchError);
      return;
    }

    if (!rows || rows.length === 0) {
      // If no data, reset EPA to 0
      await supabase
        .from('teams')
        .update({ epa: 0, endgame_epa: 0 })
        .eq('team_number', teamNumber)
        .eq('organization_id', organizationId);
      return;
    }

    // 2. Compute metrics
    const metrics = computeRebuiltMetrics(rows as ScoutingRowForAnalytics[]);

    // 3. Update the teams table
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        epa: metrics.epa,
        endgame_epa: metrics.endgame_epa
      })
      .eq('team_number', teamNumber)
      .eq('organization_id', organizationId);

    if (updateError) {
      console.error(`Error updating EPA for team ${teamNumber}:`, updateError);
    }
  } catch (err) {
    console.error(`Error in updateTeamEpa for team ${teamNumber}:`, err);
  }
}
