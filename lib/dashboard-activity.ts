import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Load recent scouting rows without PostgREST embeds. Composite FK
 * (organization_id, match_id) → matches breaks `matches:match_id(...)` hints.
 */
export type RecentScoutingActivityRow = {
  id: string;
  match_id: string;
  team_number: number;
  created_at: string;
  organization_id?: string | null;
  match_number: number | null;
  event_key: string | null;
  team_name: string | null;
};

export async function fetchRecentMatchScoutingForActivity(
  supabase: SupabaseClient,
  options: { orgId?: string | null; limit?: number }
): Promise<RecentScoutingActivityRow[]> {
  const limit = options.limit ?? 5;
  let q = supabase
    .from('scouting_data')
    .select('id, match_id, team_number, created_at, organization_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (options.orgId) {
    q = q.eq('organization_id', options.orgId);
  }

  const { data: scoutRows, error } = await q;
  if (error) {
    console.error('fetchRecentMatchScoutingForActivity:', error.message);
    return [];
  }
  if (!scoutRows?.length) return [];

  const orgIds = Array.from(
    new Set(scoutRows.map((r) => r.organization_id).filter(Boolean))
  ) as string[];
  const matchIds = Array.from(new Set(scoutRows.map((r) => r.match_id).filter(Boolean))) as string[];
  const teamNums = Array.from(
    new Set(scoutRows.map((r) => r.team_number).filter((n): n is number => typeof n === 'number'))
  );

  const [matchRes, teamRes] = await Promise.all([
    orgIds.length && matchIds.length
      ? supabase
          .from('matches')
          .select('match_id, match_number, event_key, organization_id')
          .in('organization_id', orgIds)
          .in('match_id', matchIds)
      : Promise.resolve({ data: [] as { match_id: string; match_number: number; event_key: string; organization_id: string }[] }),
    orgIds.length && teamNums.length
      ? supabase
          .from('teams')
          .select('team_number, team_name, organization_id')
          .in('organization_id', orgIds)
          .in('team_number', teamNums)
      : Promise.resolve({ data: [] as { team_number: number; team_name: string; organization_id: string }[] }),
  ]);

  const matchMap = new Map<string, { match_number: number; event_key: string }>();
  (matchRes.data ?? []).forEach((m) => {
    matchMap.set(`${m.organization_id}:${m.match_id}`, {
      match_number: m.match_number,
      event_key: m.event_key,
    });
  });

  const teamMap = new Map<string, string>();
  (teamRes.data ?? []).forEach((t) => {
    teamMap.set(`${t.organization_id}:${t.team_number}`, t.team_name);
  });

  return scoutRows.map((r) => {
    const oid = r.organization_id ?? '';
    const mk = `${oid}:${r.match_id}`;
    const tk = `${oid}:${r.team_number}`;
    const m = matchMap.get(mk);
    return {
      id: r.id,
      match_id: r.match_id,
      team_number: r.team_number,
      created_at: r.created_at,
      organization_id: r.organization_id,
      match_number: m?.match_number ?? null,
      event_key: m?.event_key ?? null,
      team_name: teamMap.get(tk) ?? null,
    };
  });
}
