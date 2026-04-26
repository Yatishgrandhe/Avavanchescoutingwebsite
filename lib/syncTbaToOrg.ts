import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sortTbaMatches,
  tbaFetchJson,
  teamKeysToNumbers,
  type TbaMatch,
  type TbaEventOprs,
  type TbaTeam,
} from '@/lib/tba';

export type SyncTbaResult = {
  ok: true;
  teamsUpserted: number;
  matchesUpserted: number;
  metricsUpdated: number;
  eventName: string;
};

function parseRunsFromNotesObject(notesObject: any): Array<{ duration_sec: number }> {
  if (!notesObject || typeof notesObject !== 'object') return [];
  const autonomousRuns = Array.isArray(notesObject?.autonomous?.runs) ? notesObject.autonomous.runs : [];
  const teleopRuns = Array.isArray(notesObject?.teleop?.runs) ? notesObject.teleop.runs : [];
  const shuttleRuns = Array.isArray(notesObject?.teleop?.shuttle_runs) ? notesObject.teleop.shuttle_runs : [];
  return [...autonomousRuns, ...teleopRuns, ...shuttleRuns].filter(
    (run) => run && typeof run.duration_sec === 'number' && Number.isFinite(run.duration_sec) && run.duration_sec > 0
  );
}

async function getAvgShootingTimeByTeamForEvent(
  supabase: SupabaseClient,
  organizationId: string,
  eventKey: string
): Promise<Map<number, number>> {
  const { data: eventMatches, error: matchesErr } = await supabase
    .from('matches')
    .select('match_id')
    .eq('organization_id', organizationId)
    .eq('event_key', eventKey);
  if (matchesErr) {
    throw new Error(`matches lookup for avg shooting time failed: ${matchesErr.message}`);
  }
  const matchIds = (eventMatches || []).map((m: any) => String(m.match_id)).filter(Boolean);
  if (matchIds.length === 0) return new Map();

  const { data: scoutingRows, error: scoutingErr } = await supabase
    .from('scouting_data')
    .select('team_number, notes, match_id')
    .eq('organization_id', organizationId)
    .in('match_id', matchIds);
  if (scoutingErr) {
    throw new Error(`scouting_data lookup for avg shooting time failed: ${scoutingErr.message}`);
  }

  const durationSumByTeam = new Map<number, number>();
  const durationCountByTeam = new Map<number, number>();
  for (const row of scoutingRows || []) {
    const teamNumber = Number((row as any).team_number);
    if (!Number.isFinite(teamNumber)) continue;
    const notes = typeof (row as any).notes === 'string' ? JSON.parse((row as any).notes || '{}') : (row as any).notes;
    for (const run of parseRunsFromNotesObject(notes)) {
      durationSumByTeam.set(teamNumber, (durationSumByTeam.get(teamNumber) || 0) + run.duration_sec);
      durationCountByTeam.set(teamNumber, (durationCountByTeam.get(teamNumber) || 0) + 1);
    }
  }

  const avgByTeam = new Map<number, number>();
  durationSumByTeam.forEach((durationSum, teamNumber) => {
    const count = durationCountByTeam.get(teamNumber) || 0;
    if (count > 0) {
      avgByTeam.set(teamNumber, durationSum / count);
    }
  });
  return avgByTeam;
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

  const [matchesRaw, teamsData, eventOprs] = await Promise.all([
    tbaFetchJson<TbaMatch[]>(`/event/${encodeURIComponent(key)}/matches`),
    tbaFetchJson<TbaTeam[]>(`/event/${encodeURIComponent(key)}/teams`),
    tbaFetchJson<TbaEventOprs>(`/event/${encodeURIComponent(key)}/oprs`),
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
    organization_id: organizationId,
    team_number: team.team_number,
    team_name: (team.nickname || team.name || `Team ${team.team_number}`).trim(),
  }));

  if (canonicalNames.length > 0) {
    const { error: teamsErr } = await supabase.from('teams').upsert(canonicalNames, {
      onConflict: 'organization_id,team_number',
    });
    if (teamsErr) {
      throw new Error(`teams upsert: ${teamsErr.message}`);
    }
  }

  const avgShootingTimeByTeam = await getAvgShootingTimeByTeamForEvent(supabase, organizationId, key);
  const oprByTeamKey = eventOprs?.oprs || {};
  const ccwmByTeamKey = eventOprs?.ccwms || {};
  const teamMetricRows = (teamsData || []).map((team) => {
    const teamKey = `frc${team.team_number}`;
    const tbaOpr = Number(oprByTeamKey[teamKey] ?? 0);
    // TBA has no native EPA endpoint; use CCWM as TBA-derived EPA-equivalent.
    const tbaEpa = Number(ccwmByTeamKey[teamKey] ?? 0);
    const avgShootingTimeSec = avgShootingTimeByTeam.get(team.team_number) ?? null;
    const normalizedOpr =
      avgShootingTimeSec && avgShootingTimeSec > 0 ? Number((tbaOpr / avgShootingTimeSec).toFixed(3)) : 0;
    return {
      organization_id: organizationId,
      team_number: team.team_number,
      tba_opr: Number.isFinite(tbaOpr) ? tbaOpr : 0,
      tba_epa: Number.isFinite(tbaEpa) ? tbaEpa : 0,
      avg_shooting_time_sec: avgShootingTimeSec,
      normalized_opr: Number.isFinite(normalizedOpr) ? normalizedOpr : 0,
      epa: Number.isFinite(tbaEpa) ? tbaEpa : 0,
    };
  });

  if (teamMetricRows.length > 0) {
    const { error: metricErr } = await supabase
      .from('teams')
      .upsert(teamMetricRows, { onConflict: 'organization_id,team_number' });
    if (metricErr) {
      throw new Error(`teams metrics upsert: ${metricErr.message}`);
    }
  }

  return {
    ok: true,
    teamsUpserted: rosterRows.length,
    matchesUpserted: matchRows.length,
    metricsUpdated: teamMetricRows.length,
    eventName: eventMeta.name || key,
  };
}
