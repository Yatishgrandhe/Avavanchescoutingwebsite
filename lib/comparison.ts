/**
 * Shared types and helpers for team comparison (view-data inline + analysis/comparison page).
 */
import { computeRebuiltMetrics } from '@/lib/analytics';

export interface TeamComparison {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_endgame_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  avg_downtime?: number | null;
  avg_downtime_sec?: number | null;
  broke_count?: number;
  broke_rate?: number;
  avg_auto_fuel?: number;
  avg_teleop_fuel?: number;
  avg_climb_pts?: number;
  avg_auto_climb_pts?: number;
  avg_teleop_climb_pts?: number;
  avg_uptime_pct?: number | null;
  clank?: number;
  avg_climb_speed_sec?: number | null;
  rpmagic?: number;
  goblin?: number;
  best_score: number;
  worst_score: number;
  consistency_score: number;
  win_rate: number;
  auto_pts_min?: number;
  auto_pts_max?: number;
  teleop_pts_min?: number;
  teleop_pts_max?: number;
  total_pts_min?: number;
  total_pts_max?: number;
  balls_per_cycle_min?: number;
  balls_per_cycle_max?: number;
  avg_shooting_time_sec?: number | null;
  epa?: number;
  tba_epa?: number;
  normalized_opr?: number;
}

/** Build TeamComparison from scouting rows (competition-scoped). total_matches = distinct match_id. */
export function buildTeamComparisonFromRows(
  teamNumber: number,
  teamName: string,
  scoutingData: any[],
): TeamComparison {
  const formCount = scoutingData.length;
  const uniqueMatchIds = new Set(scoutingData.map((m: any) => m.match_id).filter(Boolean));
  const totalMatches = uniqueMatchIds.size;
  const brokeMatchIds = new Set(scoutingData.filter((m: any) => m.broke === true).map((m: any) => m.match_id));
  const brokeCount = brokeMatchIds.size;
  const brokeRate = totalMatches > 0 ? Math.round((brokeCount / totalMatches) * 100) : 0;

  const scores = scoutingData.map((m: any) => m.final_score || 0);
  const autonomousScores = scoutingData.map((m: any) => m.autonomous_points || 0);
  const teleopScores = scoutingData.map((m: any) => m.teleop_points || 0);
  const endgameScores = scoutingData.map(() => 0);
  const defenseRatings = scoutingData.map((m: any) => m.defense_rating || 0);
  const downtimeValues = scoutingData.map((m: any) => m.average_downtime).filter((v: any) => v != null && !Number.isNaN(Number(v)));
  const avgDowntime = downtimeValues.length > 0
    ? downtimeValues.reduce((s: number, v: number) => s + Number(v), 0) / downtimeValues.length
    : null;
  const rebuilt = computeRebuiltMetrics(scoutingData);
  const n = formCount || 1;
  const avgAutonomous = autonomousScores.reduce((a: number, b: number) => a + b, 0) / n;
  const avgTeleop = teleopScores.reduce((a: number, b: number) => a + b, 0) / n;
  const avgEndgame = endgameScores.reduce((a: number, b: number) => a + b, 0) / n;
  const avgTotal = scores.reduce((a: number, b: number) => a + b, 0) / n;
  const avgDefense = defenseRatings.reduce((a: number, b: number) => a + b, 0) / n;
  const variance = scores.length > 1
    ? scores.reduce((sum: number, s: number) => sum + Math.pow(s - avgTotal, 2), 0) / scores.length
    : 0;
  const consistencyScore = (avgTotal > 0 && scores.length > 0)
    ? Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / avgTotal) * 100))
    : 0;
  return {
    team_number: teamNumber,
    team_name: teamName,
    total_matches: totalMatches,
    avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
    avg_teleop_points: Math.round(avgTeleop * 100) / 100,
    avg_endgame_points: Math.round(avgEndgame * 100) / 100,
    avg_total_score: Math.round(avgTotal * 100) / 100,
    avg_defense_rating: Math.round(avgDefense * 100) / 100,
    avg_downtime: avgDowntime != null ? Math.round(avgDowntime * 100) / 100 : null,
    avg_downtime_sec: rebuilt.avg_downtime_sec,
    broke_count: brokeCount,
    broke_rate: brokeRate,
    avg_auto_fuel: rebuilt.avg_auto_fuel,
    avg_teleop_fuel: rebuilt.avg_teleop_fuel,
    avg_climb_pts: rebuilt.avg_climb_pts,
    avg_auto_climb_pts: rebuilt.avg_auto_climb_pts,
    avg_teleop_climb_pts: rebuilt.avg_teleop_climb_pts,
    avg_uptime_pct: rebuilt.avg_uptime_pct,
    clank: rebuilt.clank,
    avg_climb_speed_sec: rebuilt.avg_climb_speed_sec ?? null,
    rpmagic: rebuilt.rpmagic,
    goblin: rebuilt.goblin,
    auto_pts_min: rebuilt.auto_pts_min,
    auto_pts_max: rebuilt.auto_pts_max,
    teleop_pts_min: rebuilt.teleop_pts_min,
    teleop_pts_max: rebuilt.teleop_pts_max,
    total_pts_min: rebuilt.total_pts_min,
    total_pts_max: rebuilt.total_pts_max,
    balls_per_cycle_min: rebuilt.balls_per_cycle_min,
    balls_per_cycle_max: rebuilt.balls_per_cycle_max,
    avg_shooting_time_sec: rebuilt.avg_shooting_time_sec ?? null,
    best_score: scores.length ? Math.max(...scores) : 0,
    worst_score: scores.length ? Math.min(...scores) : 0,
    consistency_score: Math.round(consistencyScore * 100) / 100,
    win_rate: 0.75,
    epa: rebuilt.epa,
  };
}
