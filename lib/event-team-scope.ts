import type { SupabaseClient } from '@supabase/supabase-js';

export function manualEventTeamsKey(eventKey: string): string {
  return `manual_event_team_numbers:${eventKey}`;
}

/** Explicit manual additions are separate from TBA's authoritative team list. */
export async function readManualEventTeams(db: SupabaseClient, organizationId: string, eventKey: string): Promise<number[]> {
  const { data, error } = await db.from('app_config').select('value')
    .eq('organization_id', organizationId).eq('key', manualEventTeamsKey(eventKey)).maybeSingle();
  if (error) throw new Error(`Could not load manual event teams: ${error.message}`);
  if (!data?.value) return [];
  const parsed: unknown = JSON.parse(data.value);
  if (!Array.isArray(parsed)) throw new Error('Invalid manual event team list');
  return Array.from(new Set(parsed.filter((n): n is number => Number.isSafeInteger(n) && n > 0)));
}
