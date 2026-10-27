import { computeRebuiltMetrics, type RebuiltTeamMetrics } from '@/lib/analytics';
import type { ScoutingData, Team } from '@/lib/types';

export interface AnalysisTeamStat extends RebuiltTeamMetrics {
  team_number: number;
  team_name: string;
  total_matches: number;
  starter_epa?: number;
}

/** Roster membership is independent of scouting forms and shared team metadata. */
export function buildAnalysisRoster(
  numbers: number[],
  roster: { team_number: number; team_name?: string | null }[],
  metadata: Team[]
): Team[] {
  const names = new Map(roster.map((team) => [team.team_number, team.team_name]));
  const byNumber = new Map(metadata.map((team) => [team.team_number, team]));
  return Array.from(new Set(numbers)).sort((a, b) => a - b).map((number) => ({
    team_color: '', organization_id: '', created_at: '', ...byNumber.get(number),
    team_number: number,
    team_name: names.get(number)?.trim() || byNumber.get(number)?.team_name || `Team ${number}`,
  }));
}

export function calculateAnalysisTeamStats(
  scoutingData: ScoutingData[],
  teams: Team[],
  matchCounts?: Record<number, number>,
  epaMap?: Record<number, number>
): AnalysisTeamStat[] {
  const grouped = new Map<number, ScoutingData[]>();
  for (const row of scoutingData) {
    if (!grouped.has(row.team_number)) grouped.set(row.team_number, []);
    grouped.get(row.team_number)!.push(row);
  }
  return teams.map((team) => {
    const records = grouped.get(team.team_number) || [];
    const distinct = new Set(records.map((row) => row.match_id).filter(Boolean));
    return {
      ...computeRebuiltMetrics(records, epaMap?.[team.team_number]),
      team_number: team.team_number,
      team_name: team.team_name,
      total_matches: matchCounts?.[team.team_number] ?? distinct.size,
    };
  });
}
