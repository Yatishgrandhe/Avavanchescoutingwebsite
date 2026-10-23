import type { SupabaseClient } from '@supabase/supabase-js';

export async function viewerOrganization(db: SupabaseClient, authorization?: string): Promise<string | null> {
  if (!authorization?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !user) return null;
  const { data } = await db.from('users').select('organization_id').eq('id', user.id).maybeSingle();
  return data?.organization_id || null;
}

// Keep numeric scoring details, while removing all free text from public JSON notes.
function publicScoringNotes(value: unknown, key = ''): unknown {
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.map((v) => publicScoringNotes(v)).filter((v) => v !== undefined);
  if (typeof value === 'string') {
    if ((key === 'shuttle_consistency' || key === 'shuttling_consistency') && ['consistent', 'inconsistent'].includes(value)) return value;
    try { const parsed = JSON.parse(value); if (typeof parsed === 'object' && parsed) return publicScoringNotes(parsed); } catch { /* Free text stays private. */ }
    return undefined;
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, /comment|note|summary|observation|description|scout|email|name/i.test(k) ? undefined : publicScoringNotes(v, k)]).filter(([, v]) => v !== undefined));
  return undefined;
}

/** Never mutate stored rows: only redact copies sent outside the owning organization. */
export function privateScoutingRows<T extends Record<string, any>>(rows: T[], organizationId: string | null): T[] {
  return rows.map((row) => {
    if (organizationId && row.organization_id === organizationId) return row;
    const result: Record<string, any> = { ...row };
    for (const key of Object.keys(result)) {
      if (key === 'notes') result[key] = publicScoringNotes(result[key]) ?? null;
      else if (/comment|note|summary|observation|description|strength|weakness|capabilit|drive_train_details|submitted_by|scout_id/i.test(key)) result[key] = null;
    }
    return result as T;
  });
}
