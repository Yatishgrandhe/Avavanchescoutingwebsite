import type { SupabaseClient } from '@supabase/supabase-js';

/** Keep retained rows outside an organization's active scouting schedule. */
export async function filterActiveEventMatches<T extends { organization_id: string; match_id: string }>(
  db: SupabaseClient,
  eventKey: string,
  matches: T[]
): Promise<T[]> {
  const orgIds = Array.from(new Set(matches.map((match) => match.organization_id)));
  if (!orgIds.length) return matches;
  const { data, error } = await db.from('app_config').select('organization_id, key, value')
    .in('organization_id', orgIds)
    .in('key', ['current_event_key', 'current_event_source', 'current_event_match_ids']);
  if (error) throw new Error(`Could not load active schedules: ${error.message}`);
  const configs = new Map<string, Record<string, string>>();
  for (const row of data || []) {
    const config = configs.get(row.organization_id) || {};
    config[row.key] = row.value;
    configs.set(row.organization_id, config);
  }
  const activeIds = new Map<string, Set<string>>();
  for (const [orgId, config] of Array.from(configs.entries())) {
    if (config.current_event_key?.trim() !== eventKey) continue;
    try {
      const parsed: unknown = JSON.parse(config.current_event_match_ids || '[]');
      if (Array.isArray(parsed)) {
        const ids = parsed.filter((id): id is string => typeof id === 'string' && id.length > 0 &&
          (config.current_event_source === 'csv' || id.startsWith(`${eventKey}_qm`)));
        // Legacy imports without an ID list retain the existing event-based fallback.
        if (ids.length) activeIds.set(orgId, new Set(ids));
      }
    } catch {
      // Match the legacy fallback used by /api/matches.
    }
  }
  return matches.filter((match) => {
    if (activeIds.has(match.organization_id)) return activeIds.get(match.organization_id)!.has(match.match_id);
    const config = configs.get(match.organization_id);
    if (config?.current_event_key?.trim() === eventKey && config.current_event_source !== 'csv') {
      const prefix = `${eventKey}_qm`;
      return match.match_id.startsWith(prefix) && /^\d+$/.test(match.match_id.slice(prefix.length));
    }
    return true;
  });
}
