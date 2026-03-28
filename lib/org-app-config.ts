import type { SupabaseClient } from '@supabase/supabase-js';

/** Current event key/name from app_config for an organization (empty if unset). */
export async function getOrgCurrentEvent(
  admin: SupabaseClient,
  organizationId: string
): Promise<{ eventKey: string; eventName: string }> {
  const { data: rows } = await admin
    .from('app_config')
    .select('key, value')
    .eq('organization_id', organizationId)
    .in('key', ['current_event_key', 'current_event_name']);

  const map: Record<string, string> = {};
  (rows || []).forEach((r: { key: string; value: string }) => {
    map[r.key] = r.value;
  });
  return {
    eventKey: (map.current_event_key || '').trim(),
    eventName: (map.current_event_name || '').trim(),
  };
}
