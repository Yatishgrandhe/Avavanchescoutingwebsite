import type { SupabaseClient } from '@supabase/supabase-js';

/** Current event settings from app_config for an organization (empty if unset). */
export async function getOrgCurrentEvent(
  admin: SupabaseClient,
  organizationId: string
): Promise<{ eventKey: string; eventName: string; eventSource: 'csv' | 'tba' }> {
  const { data: rows } = await admin
    .from('app_config')
    .select('key, value')
    .eq('organization_id', organizationId)
    .in('key', ['current_event_key', 'current_event_name', 'current_event_source']);

  const map: Record<string, string> = {};
  (rows || []).forEach((r: { key: string; value: string }) => {
    map[r.key] = r.value;
  });
  return {
    eventKey: (map.current_event_key || '').trim(),
    eventName: (map.current_event_name || '').trim(),
    eventSource: map.current_event_source === 'csv' ? 'csv' : 'tba',
  };
}
