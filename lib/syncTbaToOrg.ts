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
    const { error: rosterErr } = await supabase.from('event_team_roster').upsert(rosterRows, {
      onConflict: 'organization_id,event_key,team_number',
    });
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
    const { error: matchErr } = await supabase.from('matches').upsert(matchRows, {
      onConflict: 'organization_id,match_id',
    });
    if (matchErr) {
      throw new Error(`matches upsert: ${matchErr.message}`);
    }
  }

  const canonicalNames = (teamsData || []).map((team) => ({
    team_number: team.team_number,
    team_name: (team.nickname || team.name || `Team ${team.team_number}`).trim(),
  }));

  if (canonicalNames.length > 0) {
    const { error: teamsErr } = await supabase.from('teams').upsert(canonicalNames, {
      onConflict: 'team_number',
    });
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
