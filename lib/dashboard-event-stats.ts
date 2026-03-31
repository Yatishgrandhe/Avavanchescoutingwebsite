import type { SupabaseClient } from '@supabase/supabase-js';

export type DashboardEventStats = {
  totalMatches: number;
  teamsCount: number;
  dataPoints: number;
  pitProfiles: number;
};

/**
 * Metrics for the org's **active** TBA event only (matches `event_team_roster` + `matches.event_key`).
 * Avoids counting the whole `teams` table (historical / all seasons), which inflates “Teams” into hundreds.
 */
export async function getDashboardStatsForActiveEvent(
  supabase: SupabaseClient,
  organizationId: string,
  eventKey: string
): Promise<DashboardEventStats> {
  const [
    { count: matchesCount, error: matchesErr },
    { count: rosterCount, error: rosterErr },
    { count: scoutingDataCount, error: scoutingErr },
    { count: pitCount, error: pitErr },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('event_key', eventKey),
    supabase
      .from('event_team_roster')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('event_key', eventKey),
    supabase
      .from('scouting_data')
      .select('id, matches!inner(event_key)', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('matches.event_key', eventKey),
    supabase
      .from('pit_scouting_data')
      .select('id, roster:event_team_roster!inner(event_key)', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('roster.event_key', eventKey),
  ]);

  if (matchesErr) console.warn('dashboard matches count:', matchesErr.message);
  if (rosterErr) console.warn('dashboard roster count:', rosterErr.message);
  if (scoutingErr) console.warn('dashboard scouting count:', scoutingErr.message);
  if (pitErr) console.warn('dashboard pit count:', pitErr.message);

  return {
    totalMatches: matchesCount ?? 0,
    teamsCount: rosterCount ?? 0,
    dataPoints: scoutingDataCount ?? 0,
    pitProfiles: pitCount ?? 0,
  };
}
