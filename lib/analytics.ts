/**
 * REBUILT 2026 FRC analytics – Polar Edge–style KPIs
 * Match length 2:45 = 165 seconds for UPTIME calculation.
 */

import type { RunRecord } from '@/lib/types';
import { BALL_CHOICE_OPTIONS } from '@/lib/types';

const MATCH_LENGTH_SEC = 165;

export interface ParsedNotes {
  autonomous: {
    auto_fuel_active_hub: number;
    auto_tower_level1: boolean;
    runs?: RunRecord[];
    duration_sec?: number | null;
    balls_0_15?: number;
    balls_15_30?: number;
    balls_30_45?: number;
    balls_45_60?: number;
    balls_60_75?: number;
    balls_75_90?: number;
  };
  teleop: {
    teleop_fuel_active_hub: number;
    teleop_fuel_shifts: number[];
    teleop_tower_level1: boolean;
    teleop_tower_level2: boolean;
    teleop_tower_level3: boolean;
    runs?: RunRecord[];
    duration_sec?: number | null;
    balls_0_15?: number;
    balls_15_30?: number;
    balls_30_45?: number;
    balls_45_60?: number;
    balls_60_75?: number;
    balls_75_90?: number;
  };
}

const BALL_KEYS = ['balls_0_15', 'balls_15_30', 'balls_30_45', 'balls_45_60', 'balls_60_75', 'balls_75_90'] as const;

function sumBalls(phase: Record<string, unknown>): number {
  return BALL_KEYS.reduce((s, k) => s + (Number(phase[k]) || 0), 0);
}

function fuelFromRuns(runs: RunRecord[] | undefined): number {
  if (!runs?.length) return 0;
  return runs.reduce((sum, r) => sum + (BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0), 0);
}

export function parseNotes(notes: any): ParsedNotes {
  const parsed = typeof notes === 'string' ? (JSON.parse(notes || '{}') || {}) : notes || {};
  const auto = parsed.autonomous || (parsed.auto_fuel_active_hub !== undefined ? parsed : {});
  const teleop = parsed.teleop || (parsed.teleop_fuel_active_hub !== undefined ? parsed : {});

  const autoRuns = Array.isArray(auto.runs) ? auto.runs : [];
  const teleopRuns = Array.isArray(teleop.runs) ? teleop.runs : [];
  const autoFuelFromRuns = fuelFromRuns(autoRuns);
  const teleopFuelFromRuns = fuelFromRuns(teleopRuns);

  const autoFuelFromBalls = sumBalls(auto);
  const teleopFuelFromBalls = sumBalls(teleop);
  const teleopShifts = Array.isArray(teleop.teleop_fuel_shifts)
    ? teleop.teleop_fuel_shifts
    : teleopRuns.length > 0
      ? teleopRuns.map((r: RunRecord) => BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0)
      : teleopFuelFromBalls > 0
        ? [Number(teleop.balls_0_15) || 0, Number(teleop.balls_15_30) || 0, Number(teleop.balls_30_45) || 0, Number(teleop.balls_45_60) || 0, Number(teleop.balls_60_75) || 0, Number(teleop.balls_75_90) || 0]
        : teleop.teleop_fuel_active_hub != null
          ? [teleop.teleop_fuel_active_hub]
          : [];

  const autoFuel = autoFuelFromRuns > 0 ? autoFuelFromRuns : (autoFuelFromBalls > 0 ? autoFuelFromBalls : (Number(auto.auto_fuel_active_hub) || 0));
  const teleopFuel = teleopFuelFromRuns > 0 ? teleopFuelFromRuns : (teleopFuelFromBalls > 0 ? teleopFuelFromBalls : (Number(teleop.teleop_fuel_active_hub) || 0));

  return {
    autonomous: {
      auto_fuel_active_hub: autoFuel,
      auto_tower_level1: Boolean(auto.auto_tower_level1),
      runs: autoRuns.length ? autoRuns : undefined,
      duration_sec: auto.duration_sec != null ? Number(auto.duration_sec) : undefined,
      balls_0_15: Number(auto.balls_0_15) || 0,
      balls_15_30: Number(auto.balls_15_30) || 0,
      balls_30_45: Number(auto.balls_30_45) || 0,
      balls_45_60: Number(auto.balls_45_60) || 0,
      balls_60_75: Number(auto.balls_60_75) || 0,
      balls_75_90: Number(auto.balls_75_90) || 0,
    },
    teleop: {
      teleop_fuel_active_hub: teleopFuel,
      teleop_fuel_shifts: teleopShifts.map((n: number) => Number(n) || 0),
      teleop_tower_level1: Boolean(teleop.teleop_tower_level1),
      teleop_tower_level2: Boolean(teleop.teleop_tower_level2),
      teleop_tower_level3: Boolean(teleop.teleop_tower_level3),
      runs: teleopRuns.length ? teleopRuns : undefined,
      duration_sec: teleop.duration_sec != null ? Number(teleop.duration_sec) : undefined,
      balls_0_15: Number(teleop.balls_0_15) || 0,
      balls_15_30: Number(teleop.balls_15_30) || 0,
      balls_30_45: Number(teleop.balls_30_45) || 0,
      balls_45_60: Number(teleop.balls_45_60) || 0,
      balls_60_75: Number(teleop.balls_60_75) || 0,
      balls_75_90: Number(teleop.balls_75_90) || 0,
    },
  };
}

/** AVG AUTO Fuel: fuel count in autonomous (game pieces scored). */
export function getAutoFuelCount(notes: any): number {
  const p = parseNotes(notes);
  return p.autonomous.auto_fuel_active_hub;
}

/** AVG TELEOP Fuel: total fuel count in teleop (sum of shifts or single value). */
export function getTeleopFuelCount(notes: any): number {
  const p = parseNotes(notes);
  const shifts = p.teleop.teleop_fuel_shifts;
  if (shifts && shifts.length > 0) {
    return shifts.reduce((s, n) => s + n, 0);
  }
  return p.teleop.teleop_fuel_active_hub || 0;
}

/** Climb points from tower levels: auto 15 if L1, teleop 10/20/30 (highest only). */
export function getClimbPoints(notes: any): number {
  const p = parseNotes(notes);
  let pts = 0;
  if (p.autonomous.auto_tower_level1) pts += 15;
  if (p.teleop.teleop_tower_level3) pts += 30;
  else if (p.teleop.teleop_tower_level2) pts += 20;
  else if (p.teleop.teleop_tower_level1) pts += 10;
  return pts;
}

/** Whether the robot achieved any climb (auto or teleop tower). */
export function hadClimbSuccess(notes: any): boolean {
  const p = parseNotes(notes);
  return (
    p.autonomous.auto_tower_level1 ||
    p.teleop.teleop_tower_level1 ||
    p.teleop.teleop_tower_level2 ||
    p.teleop.teleop_tower_level3
  );
}

/** Uptime % from average_downtime (seconds). Match = 165s. */
export function getUptimePct(averageDowntimeSec: number | null | undefined): number | null {
  if (averageDowntimeSec == null || Number.isNaN(averageDowntimeSec)) return null;
  const active = Math.max(0, MATCH_LENGTH_SEC - averageDowntimeSec);
  return Math.round((active / MATCH_LENGTH_SEC) * 1000) / 10;
}

export interface RebuiltTeamMetrics {
  avg_auto_fuel: number;
  avg_teleop_fuel: number;
  avg_climb_pts: number;
  avg_uptime_pct: number | null;
  broke_rate: number;
  clank: number;
  rpmagic: number;
  goblin: number;
}

export interface ScoutingRowForAnalytics {
  notes?: any;
  average_downtime?: number | null;
  broke?: boolean | null;
  final_score?: number;
  autonomous_points?: number;
  teleop_points?: number;
}

/**
 * Compute REBUILT KPIs for a set of scouting rows (same team).
 */
export function computeRebuiltMetrics(rows: ScoutingRowForAnalytics[]): RebuiltTeamMetrics {
  const n = rows.length;
  if (n === 0) {
    return {
      avg_auto_fuel: 0,
      avg_teleop_fuel: 0,
      avg_climb_pts: 0,
      avg_uptime_pct: null,
      broke_rate: 0,
      clank: 0,
      rpmagic: 0,
      goblin: 0,
    };
  }

  let totalAutoFuel = 0;
  let totalTeleopFuel = 0;
  let totalClimbPts = 0;
  let climbSuccesses = 0;
  let climbAttempts = n;
  let downtimeSum = 0;
  let downtimeCount = 0;
  let brokeCount = 0;
  const scores: number[] = [];

  rows.forEach((row) => {
    const notes = row.notes;
    totalAutoFuel += getAutoFuelCount(notes);
    totalTeleopFuel += getTeleopFuelCount(notes);
    const climbPts = getClimbPoints(notes);
    totalClimbPts += climbPts;
    if (hadClimbSuccess(notes)) climbSuccesses += 1;
    if (row.average_downtime != null && !Number.isNaN(row.average_downtime)) {
      downtimeSum += Number(row.average_downtime);
      downtimeCount += 1;
    }
    if (row.broke === true) brokeCount += 1;
    const score = row.final_score ?? 0;
    scores.push(score);
  });

  const avgUptime =
    downtimeCount > 0
      ? getUptimePct(downtimeSum / downtimeCount)
      : null;

  const avgScore = scores.reduce((a, b) => a + b, 0) / n;
  const variance =
    scores.reduce((sum, s) => sum + (s - avgScore) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // CLANK: successful climbs / attempted (all matches count as attempt)
  const clank = climbAttempts > 0 ? Math.round((climbSuccesses / climbAttempts) * 1000) / 10 : 0;

  // RPMAGIC: simplified – ranking points potential from avg score + climb consistency
  const rpmagic = Math.round((avgScore * 0.4 + (clank / 100) * 40) * 10) / 10;

  // GOBLIN: inverse of coefficient of variation (lower variance = less “luck”)
  const goblin =
    avgScore > 0
      ? Math.round(Math.max(0, 100 - (stdDev / avgScore) * 100) * 10) / 10
      : 0;

  return {
    avg_auto_fuel: Math.round((totalAutoFuel / n) * 100) / 100,
    avg_teleop_fuel: Math.round((totalTeleopFuel / n) * 100) / 100,
    avg_climb_pts: Math.round((totalClimbPts / n) * 100) / 100,
    avg_uptime_pct: avgUptime,
    broke_rate: Math.round((brokeCount / n) * 100),
    clank,
    rpmagic,
    goblin,
  };
}
