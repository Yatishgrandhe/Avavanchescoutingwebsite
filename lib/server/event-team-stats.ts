import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrgCurrentEvent } from '@/lib/org-app-config';
import { roundToTenth } from '@/lib/utils';

export async function readAllRows(query: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

/** The event roster is authoritative, including robots with no scouting forms yet. */
export async function getEventTeamStats(db: SupabaseClient, organizationId: string, requestedEventKey?: string) {
  const current = await getOrgCurrentEvent(db, organizationId);
  const eventKey = requestedEventKey || current.eventKey;
  if (!eventKey) return [];
  const [roster, matches] = await Promise.all([
    readAllRows((from, to) => {
      let query = db.from('event_team_roster').select('team_number,team_name').eq('organization_id', organizationId).eq('event_key', eventKey);
      if (eventKey === current.eventKey && current.eventTeamNumbers.length) query = query.in('team_number', current.eventTeamNumbers);
      return query.order('team_number').range(from, to);
    }),
    readAllRows((from, to) => {
      let query = db.from('matches').select('match_id,red_teams,blue_teams').eq('organization_id', organizationId).eq('event_key', eventKey);
      if (eventKey === current.eventKey && current.eventSource === 'csv' && current.eventMatchIds.length) query = query.in('match_id', current.eventMatchIds);
      else if (eventKey === current.eventKey && current.eventSource === 'tba') query = query.like('match_id', `${eventKey}_qm%`);
      return query.order('match_id').range(from, to);
    }),
  ]);
  const names = new Map<number, string>(roster.map((t) => [t.team_number, t.team_name]));
  for (const match of matches) for (const n of [...(match.red_teams || []), ...(match.blue_teams || [])]) if (!names.has(n)) names.set(n, '');
  if (!names.size && eventKey === current.eventKey && current.eventSource === 'csv') for (const n of current.eventTeamNumbers) names.set(n, '');
  const rows: any[] = [];
  for (let offset = 0; offset < matches.length; offset += 100) {
    const ids = matches.slice(offset, offset + 100).map((m) => m.match_id);
    rows.push(...await readAllRows((from, to) => db.from('scouting_data').select('id,team_number,autonomous_points,teleop_points,final_score,defense_rating').eq('organization_id', organizationId).in('match_id', ids).order('id').range(from, to)));
  }
  const pits = names.size ? await readAllRows((from, to) => db.from('pit_scouting_data').select('id,team_number,robot_image_url,photos,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).order('id').range(from, to)) : [];
  const grouped = new Map<number, any[]>();
  for (const row of rows) {
    if (!grouped.has(row.team_number)) grouped.set(row.team_number, []);
    grouped.get(row.team_number)!.push(row);
  }
  return Array.from(names, ([number, name]) => {
    const records = grouped.get(number) || [];
    const average = (key: string) => roundToTenth(records.length ? records.reduce((sum, r) => sum + (Number(r[key]) || 0), 0) / records.length : 0);
    const pit = eventKey === current.eventKey ? pits.find((r) => r.team_number === number && (r.robot_image_url || r.photos?.length)) : undefined;
    return { team_number: number, team_name: name || `Team ${number}`, robot_image_url: pit?.robot_image_url || pit?.photos?.[0] || null,
      total_matches: records.length, avg_autonomous_points: average('autonomous_points'), avg_teleop_points: average('teleop_points'),
      avg_endgame_points: 0, avg_total_score: average('final_score'), avg_defense_rating: average('defense_rating'), win_rate: 0,
      consistency_score: roundToTenth(Math.min(records.length / 10, 1) * Math.min(average('final_score') / 100, 1)) };
  }).sort((a, b) => b.avg_total_score - a.avg_total_score || a.team_number - b.team_number);
}
