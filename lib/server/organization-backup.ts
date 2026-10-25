import type { SupabaseClient } from '@supabase/supabase-js';

// Identity, session, permission and configuration tables are never web-restorable.
export const ORGANIZATION_BACKUP_TABLES = [
  'teams', 'matches', 'event_team_roster', 'scout_names', 'scouting_data', 'pit_scouting_data', 'pick_lists',
  'past_competitions', 'past_teams', 'past_matches', 'past_scouting_data', 'past_pit_scouting_data', 'past_pick_lists', 'robot_notes',
] as const;

export async function readAllRows(query: (from: number, to: number) => PromiseLike<any>) {
  const rows: Record<string, any>[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

export function organizationRows(db: SupabaseClient, table: string, organizationId: string) {
  const order = table === 'matches' ? 'match_id' : table === 'teams' || table === 'event_team_roster' ? 'team_number' : 'id';
  return readAllRows((from, to) => {
    let query = db.from(table).select('*').eq('organization_id', organizationId);
    if (table === 'event_team_roster') query = query.order('event_key');
    return query.order(order).range(from, to);
  });
}
