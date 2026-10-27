import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrgCurrentEvent } from '@/lib/org-app-config';
import { readManualEventTeams } from '@/lib/event-team-scope';
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
  matchIds: string[];
};

function sameNumberList(left: number[] | null | undefined, right: number[] | null | undefined): boolean {
  if ((left?.length || 0) !== (right?.length || 0)) return false;
  return (left || []).every((value, index) => value === right?.[index]);
}

/**
 * Pull event teams and the qualification schedule from TBA for one org.
 * Playoff rows already stored in matches are retained as history.
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
  if (eventMeta.key !== key) throw new Error('TBA returned a different event');

  const [matchesRaw, teamsData] = await Promise.all([
    tbaFetchJson<TbaMatch[]>(`/event/${encodeURIComponent(key)}/matches`),
    tbaFetchJson<TbaTeam[]>(`/event/${encodeURIComponent(key)}/teams`),
  ]);

  const sorted = sortTbaMatches((matchesRaw || []).filter((match) => match.comp_level === 'qm'));

  // Validate before writing anything. Never truncate a suffix or drop a bad
  // team key: doing so can assign a different robot to an alliance position.
  const matchRows = sorted.map((match) => {
    if (match.event_key !== key || match.key !== `${key}_qm${match.match_number}`) {
      throw new Error('TBA returned an inconsistent qualification match');
    }
    const red = teamKeysToNumbers(match.alliances?.red?.team_keys || []);
    const blue = teamKeysToNumbers(match.alliances?.blue?.team_keys || []);
    if (red.length !== 3 || blue.length !== 3) throw new Error('TBA qualification schedule has incomplete alliances');
    return { match_id: match.key, event_key: key, match_number: match.match_number,
      red_teams: red, blue_teams: blue, organization_id: organizationId };
  });

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

  const active = await getOrgCurrentEvent(supabase, organizationId);
  if (active.eventKey === key && active.eventSource === 'tba') {
    const manual = await readManualEventTeams(supabase, organizationId, key);
    const numbers = Array.from(new Set([...rosterRows.map((team) => team.team_number), ...manual])).sort((a, b) => a - b);
    const values = [
      ['current_event_team_numbers', JSON.stringify(numbers)],
      ['current_event_match_ids', JSON.stringify(matchRows.map((match) => match.match_id))],
    ];
    const previous = [JSON.stringify(active.eventTeamNumbers), JSON.stringify(active.eventMatchIds)];
    const changes = values.filter(([, value], index) => value !== previous[index])
      .map(([configKey, value]) => ({ key: configKey, value, organization_id: organizationId, updated_at: new Date().toISOString() }));
    if (changes.length) {
      const { error } = await supabase.from('app_config').upsert(changes, { onConflict: 'key,organization_id' });
      if (error) throw new Error(`Could not save the active TBA roster: ${error.message}`);
    }
  }

  return {
    ok: true,
    teamsUpserted: rosterRows.length,
    matchesUpserted: matchRows.length,
    eventName: eventMeta.name || key,
    matchIds: matchRows.map((match) => match.match_id),
  };
}
