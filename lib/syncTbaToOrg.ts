import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sortTbaMatches,
  tbaFetchJson,
  teamKeysToNumbers,
  type TbaMatch,
  type TbaTeam,
} from '@/lib/tba';

export type SyncTbaResult = {
  ok: true;
  teamsUpserted: number;
  matchesUpserted: number;
  eventName: string;
};

function sameNumberList(left: number[] | null | undefined, right: number[] | null | undefined): boolean {
  if ((left?.length || 0) !== (right?.length || 0)) return false;
  return (left || []).every((value, index) => value === right?.[index]);
}

/**
 * Pull event teams + match schedule from TBA into event_team_roster and matches for one org.
 */
export async function syncTbaEventToOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  eventKey: string
): Promise<SyncTbaResult> {
  const key = eventKey.trim();
  if (!key) {
    throw new Error('eventKey is required');
  }

  const eventMeta = await tbaFetchJson<{ name: string; key: string }>(`/event/${encodeURIComponent(key)}`);

  const [matchesRaw, teamsData] = await Promise.all([
    tbaFetchJson<TbaMatch[]>(`/event/${encodeURIComponent(key)}/matches`),
    tbaFetchJson<TbaTeam[]>(`/event/${encodeURIComponent(key)}/teams`),
  ]);

  const sorted = sortTbaMatches(matchesRaw || []);

  const rosterRows = (teamsData || []).map((team) => ({
    organization_id: organizationId,
    event_key: key,
    team_number: team.team_number,
    team_name: (team.nickname || team.name || `Team ${team.team_number}`).trim(),
    updated_at: new Date().toISOString(),
  }));

  if (rosterRows.length > 0) {
    const { data: currentRoster, error: rosterReadErr } = await supabase
      .from('event_team_roster')
      .select('team_number, team_name')
      .eq('organization_id', organizationId)
      .eq('event_key', key)
      .in('team_number', rosterRows.map((row) => row.team_number));
    if (rosterReadErr) throw new Error(`event_team_roster read: ${rosterReadErr.message}`);

    const rosterByTeam = new Map((currentRoster || []).map((row) => [row.team_number, row.team_name]));
    const changedRosterRows = rosterRows.filter((row) => rosterByTeam.get(row.team_number) !== row.team_name);
    const { error: rosterErr } = changedRosterRows.length > 0
      ? await supabase.from('event_team_roster').upsert(changedRosterRows, {
      onConflict: 'organization_id,event_key,team_number',
      })
      : { error: null };
    if (rosterErr) {
      throw new Error(`event_team_roster upsert: ${rosterErr.message}`);
    }
  }

  const matchRows = sorted.map((match, index) => {
    const red = teamKeysToNumbers(match.alliances?.red?.team_keys || []);
    const blue = teamKeysToNumbers(match.alliances?.blue?.team_keys || []);
    return {
      match_id: match.key,
      event_key: match.event_key || key,
      match_number: index + 1,
      red_teams: red,
      blue_teams: blue,
      organization_id: organizationId,
    };
  });

  if (matchRows.length > 0) {
    const { data: currentMatches, error: matchReadErr } = await supabase
      .from('matches')
      .select('match_id, event_key, match_number, red_teams, blue_teams')
      .eq('organization_id', organizationId)
      .in('match_id', matchRows.map((row) => row.match_id));
    if (matchReadErr) throw new Error(`matches read: ${matchReadErr.message}`);

    const matchesById = new Map((currentMatches || []).map((row) => [row.match_id, row]));
    const changedMatchRows = matchRows.filter((row) => {
      const current = matchesById.get(row.match_id);
      return !current ||
        current.event_key !== row.event_key ||
        current.match_number !== row.match_number ||
        !sameNumberList(current.red_teams, row.red_teams) ||
        !sameNumberList(current.blue_teams, row.blue_teams);
    });
    const { error: matchErr } = changedMatchRows.length > 0
      ? await supabase.from('matches').upsert(changedMatchRows, {
      onConflict: 'organization_id,match_id',
      })
      : { error: null };
    if (matchErr) {
      throw new Error(`matches upsert: ${matchErr.message}`);
    }
  }

  const canonicalNames = (teamsData || []).map((team) => ({
    team_number: team.team_number,
    team_name: (team.nickname || team.name || `Team ${team.team_number}`).trim(),
  }));

  if (canonicalNames.length > 0) {
    const { data: currentTeams, error: teamsReadErr } = await supabase
      .from('teams')
      .select('team_number, team_name')
      .in('team_number', canonicalNames.map((team) => team.team_number));
    if (teamsReadErr) throw new Error(`teams read: ${teamsReadErr.message}`);

    const teamsByNumber = new Map((currentTeams || []).map((row) => [row.team_number, row.team_name]));
    const changedCanonicalNames = canonicalNames.filter((team) => teamsByNumber.get(team.team_number) !== team.team_name);
    const { error: teamsErr } = changedCanonicalNames.length > 0
      ? await supabase.from('teams').upsert(changedCanonicalNames, {
      onConflict: 'team_number',
      })
      : { error: null };
    if (teamsErr) {
      throw new Error(`teams upsert: ${teamsErr.message}`);
    }
  }

  return {
    ok: true,
    teamsUpserted: rosterRows.length,
    matchesUpserted: matchRows.length,
    eventName: eventMeta.name || key,
  };
}
