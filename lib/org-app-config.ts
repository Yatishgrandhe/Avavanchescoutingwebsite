import type { SupabaseClient } from '@supabase/supabase-js';

/** Current event settings from app_config for an organization (empty if unset). */
export async function getOrgCurrentEvent(
  admin: SupabaseClient,
  organizationId: string
): Promise<{ eventKey: string; eventName: string; eventSource: 'csv' | 'tba'; eventTeamNumbers: number[]; eventMatchIds: string[] }> {
  const { data: rows } = await admin
    .from('app_config')
    .select('key, value')
    .eq('organization_id', organizationId)
    .in('key', ['current_event_key', 'current_event_name', 'current_event_source', 'current_event_team_numbers', 'current_event_match_ids']);

  const map: Record<string, string> = {};
  (rows || []).forEach((r: { key: string; value: string }) => {
    map[r.key] = r.value;
  });
  let eventTeamNumbers: number[] = [];
  try {
    const parsed = JSON.parse(map.current_event_team_numbers || '[]');
    if (Array.isArray(parsed)) {
      eventTeamNumbers = Array.from(new Set(parsed.filter((team): team is number => Number.isInteger(team) && team > 0)));
    }
  } catch {
    // Imports made before this setting existed safely fall back to the event roster.
  }

  let eventMatchIds: string[] = [];
  try {
    const parsed = JSON.parse(map.current_event_match_ids || '[]');
    if (Array.isArray(parsed)) {
      eventMatchIds = parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
    }
  } catch {
    // Ignore malformed data
  }

  return {
    eventKey: (map.current_event_key || '').trim(),
    eventName: (map.current_event_name || '').trim(),
    eventSource: map.current_event_source === 'csv' ? 'csv' : 'tba',
    eventTeamNumbers,
    eventMatchIds,
  };
}
