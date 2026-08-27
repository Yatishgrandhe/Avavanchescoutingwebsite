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
  const { eventKey, eventName, eventTeamNumbers } = await getOrgCurrentEvent(supabase, orgId);
  if (!eventKey) {
    return { registered: false, eventKey: '', eventName: '' };
  }

  // Prefer an explicit name, else a TBA-resolved name, else generic.
  let teamName = explicitName?.trim() || '';
  if (!teamName) {
    try {
      const { resolveTeamNamesFromTba } = await import('@/lib/tba');
      const nameMap = await resolveTeamNamesFromTba([teamNumber]);
      teamName = nameMap.get(teamNumber) || '';
    } catch {
      teamName = '';
    }
  }
  if (!teamName) teamName = `Team ${teamNumber}`;

  const now = new Date().toISOString();

  // 1. Ensure the team exists in the global teams table (so it shows up everywhere).
  await supabase.from('teams').upsert(
    { team_number: teamNumber, team_name: teamName },
    { onConflict: 'team_number' }
  );

  // 2. Ensure the team is on the current event roster.
  await supabase.from('event_team_roster').upsert(
    {
      organization_id: orgId,
      event_key: eventKey,
      team_number: teamNumber,
      team_name: teamName,
      updated_at: now,
    },
    { onConflict: 'organization_id,event_key,team_number' }
  );

  // 3. Add the team to the event's team_numbers config (so CSV filters and pick lists include it).
  if (!eventTeamNumbers.includes(teamNumber)) {
    await supabase.from('app_config').upsert(
      {
        key: 'current_event_team_numbers',
        value: JSON.stringify(Array.from(new Set([...eventTeamNumbers, teamNumber])).sort((a, b) => a - b)),
        organization_id: orgId,
        updated_at: now,
      },
      { onConflict: 'key,organization_id' }
    );
  }

  return { registered: true, eventKey, eventName };
}
