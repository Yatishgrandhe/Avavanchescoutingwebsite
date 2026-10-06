import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrgCurrentEvent } from '@/lib/org-app-config';

export type TeamRegistrationResult = {
  registered: boolean;
  eventKey: string;
  eventName: string;
};

/**
 * Registers a team into the organization's current event so it is identified in the
 * competition (event roster + teams table + current_event_team_numbers), even if it
 * wasn't on the imported/synced schedule. Best-effort — reads the current event and
 * silently no-ops when there is no active competition.
 */
export async function registerTeamInEvent(
  supabase: SupabaseClient,
  orgId: string,
  teamNumber: number,
  explicitName?: string
): Promise<TeamRegistrationResult> {
  // Prefer an explicit name, else a TBA-resolved name, else generic.
  let teamName = explicitName?.trim() || '';
  let resolvedFromTba = false;
  let existingName = '';

  if (!teamName) {
    const { data: existingTeam, error: existingTeamError } = await supabase
      .from('teams')
      .select('team_name')
      .eq('team_number', teamNumber)
      .maybeSingle();
    if (existingTeamError) throw existingTeamError;
    existingName = existingTeam?.team_name?.trim() || '';
  }

  if (!teamName) {
    try {
      const { resolveTeamNamesFromTba } = await import('@/lib/tba');
      const nameMap = await resolveTeamNamesFromTba([teamNumber]);
      teamName = nameMap.get(teamNumber) || '';
      resolvedFromTba = Boolean(teamName);
    } catch {
      teamName = '';
    }
  }
  if (!teamName) teamName = existingName;
  if (!teamName) teamName = `Team ${teamNumber}`;

  const now = new Date().toISOString();

  // 1. Always ensure the team exists in the global teams table. This matters even
  // when no competition is active yet: a manual pit report must remain identifiable
  // and discoverable after the schedule is imported later.
  // Do not replace an already-known canonical name with the generic fallback
  // when TBA is temporarily unavailable.
  if (Boolean(explicitName?.trim()) || resolvedFromTba || !existingName) {
    const { error: teamError } = await supabase.from('teams').upsert(
      { team_number: teamNumber, team_name: teamName },
      { onConflict: 'team_number' }
    );
    if (teamError) throw teamError;
  }

  const { eventKey, eventName, eventTeamNumbers } = await getOrgCurrentEvent(supabase, orgId);
  if (!eventKey) {
    return { registered: false, eventKey: '', eventName: '' };
  }

  // 2. Ensure the team is on the current event roster.
  const { error: rosterError } = await supabase.from('event_team_roster').upsert(
    {
      organization_id: orgId,
      event_key: eventKey,
      team_number: teamNumber,
      team_name: teamName,
      updated_at: now,
    },
    { onConflict: 'organization_id,event_key,team_number' }
  );
  if (rosterError) throw rosterError;

  // 3. Add the team to the event's team_numbers config (so CSV filters and pick lists include it).
  if (!eventTeamNumbers.includes(teamNumber)) {
    const { error: configError } = await supabase.from('app_config').upsert(
      {
        key: 'current_event_team_numbers',
        value: JSON.stringify(Array.from(new Set([...eventTeamNumbers, teamNumber])).sort((a, b) => a - b)),
        organization_id: orgId,
        updated_at: now,
      },
      { onConflict: 'key,organization_id' }
    );
    if (configError) throw configError;
  }

  return { registered: true, eventKey, eventName };
}
