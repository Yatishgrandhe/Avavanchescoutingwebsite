import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrgCurrentEvent } from './org-app-config';

export type DashboardEventStats = {
  totalMatches: number;
  teamsCount: number;
  dataPoints: number;
  pitProfiles: number;
};

/**
 * Metrics for the org's active event, using the uploaded schedule for CSV events.
 * Avoids counting the whole `teams` table (historical / all seasons), which inflates “Teams” into hundreds.
 */
export async function getDashboardStatsForActiveEvent(
  supabase: SupabaseClient,
  organizationId: string,
  eventKey: string
): Promise<DashboardEventStats> {
  const event = await getOrgCurrentEvent(supabase, organizationId);
  const isActiveCsv = event.eventKey === eventKey && event.eventSource === 'csv';
  let matchesQuery = supabase.from('matches').select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('event_key', eventKey);
  let rosterQuery = supabase.from('event_team_roster').select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('event_key', eventKey);
  let scoutingQuery = supabase.from('scouting_data')
    .select('id, matches!inner(event_key)', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('matches.event_key', eventKey);
  let pitQuery = supabase.from('pit_scouting_data')
    .select('id, roster:event_team_roster!inner(event_key)', { count: 'exact', head: true })
    .eq('organization_id', organizationId).eq('roster.event_key', eventKey);
  if (isActiveCsv && event.eventMatchIds.length > 0) {
    matchesQuery = matchesQuery.in('match_id', event.eventMatchIds);
    scoutingQuery = scoutingQuery.in('match_id', event.eventMatchIds);
  } else if (event.eventKey === eventKey && event.eventSource === 'tba') {
    matchesQuery = matchesQuery.like('match_id', `${eventKey}_qm%`);
    scoutingQuery = scoutingQuery.like('match_id', `${eventKey}_qm%`);
    const activeIds = event.eventMatchIds.filter((id) => id.startsWith(`${eventKey}_qm`));
    if (activeIds.length) {
      matchesQuery = matchesQuery.in('match_id', activeIds);
      scoutingQuery = scoutingQuery.in('match_id', activeIds);
    }
  }
  if (event.eventKey === eventKey && event.eventTeamNumbers.length > 0) {
    rosterQuery = rosterQuery.in('team_number', event.eventTeamNumbers);
    pitQuery = pitQuery.in('team_number', event.eventTeamNumbers);
  }
  const [
    { count: matchesCount, error: matchesErr },
    { count: rosterCount, error: rosterErr },
    { count: scoutingDataCount, error: scoutingErr },
    { count: pitCount, error: pitErr },
  ] = await Promise.all([
    matchesQuery,
    rosterQuery,
    scoutingQuery,
    pitQuery,
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
