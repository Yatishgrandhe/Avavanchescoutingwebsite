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
    autonomous_cleansing?: number;
  };
  teleop: {
    teleop_fuel_active_hub: number;
    teleop_fuel_shifts: number[];
    teleop_tower_level1: boolean;
    teleop_tower_level2: boolean;
    teleop_tower_level3: boolean;
    climb_sec?: number | null;
    runs?: RunRecord[];
    duration_sec?: number | null;
    balls_0_15?: number;
    balls_15_30?: number;
    balls_30_45?: number;
    balls_45_60?: number;
    balls_60_75?: number;
    balls_75_90?: number;
    teleop_cleansing?: number;
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
      autonomous_cleansing: Number(auto.autonomous_cleansing) || 0,
    },
    teleop: {
      teleop_fuel_active_hub: teleopFuel,
      teleop_fuel_shifts: teleopShifts.map((n: number) => Number(n) || 0),
      teleop_tower_level1: Boolean(teleop.teleop_tower_level1),
      teleop_tower_level2: Boolean(teleop.teleop_tower_level2),
      teleop_tower_level3: Boolean(teleop.teleop_tower_level3),
      climb_sec: teleop.climb_sec != null && !Number.isNaN(Number(teleop.climb_sec)) ? Number(teleop.climb_sec) : undefined,
      runs: teleopRuns.length ? teleopRuns : undefined,
      duration_sec: teleop.duration_sec != null ? Number(teleop.duration_sec) : undefined,
      balls_0_15: Number(teleop.balls_0_15) || 0,
      balls_15_30: Number(teleop.balls_15_30) || 0,
      balls_30_45: Number(teleop.balls_30_45) || 0,
      balls_45_60: Number(teleop.balls_45_60) || 0,
      balls_60_75: Number(teleop.balls_60_75) || 0,
      balls_75_90: Number(teleop.balls_75_90) || 0,
      teleop_cleansing: Number(teleop.teleop_cleansing) || 0,
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

/** Auto climb points only (15 if L1, else 0). */
export function getAutoClimbPoints(notes: any): number {
  const p = parseNotes(notes);
  return p.autonomous.auto_tower_level1 ? 15 : 0;
}

/** Teleop/endgame climb points only (10/20/30 for L1/L2/L3). */
export function getTeleopClimbPoints(notes: any): number {
  const p = parseNotes(notes);
  if (p.teleop.teleop_tower_level3) return 30;
  if (p.teleop.teleop_tower_level2) return 20;
  if (p.teleop.teleop_tower_level1) return 10;
  return 0;
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

/** Single climb achieved per match (robot can only do one). Returns label and points; highest level wins. */
export function getClimbAchieved(notes: any): { label: string; points: number } | null {
  const p = parseNotes(notes);
  if (p.teleop.teleop_tower_level3) return { label: 'L3', points: 30 };
  if (p.teleop.teleop_tower_level2) return { label: 'L2', points: 20 };
  if (p.teleop.teleop_tower_level1) return { label: 'L1', points: 10 };
  if (p.autonomous.auto_tower_level1) return { label: 'Auto L1', points: 15 };
  return null;
}

/** Climb pts adjusted for speed: +2 for ≤3s, -2 for >6s (for CLANK). */
function getClimbSpeedAdjustment(notes: any): number {
  const p = parseNotes(notes);
  const sec = p.teleop.climb_sec;
  if (sec == null || Number.isNaN(sec)) return 0;
  if (sec <= 3) return 2;
  if (sec > 6) return -2;
  return 0;
}

/** Climb points + speed adjustment for one match (used for CLANK average). */
export function getClimbPointsAdjusted(notes: any): number {
  return getClimbPoints(notes) + getClimbSpeedAdjustment(notes);
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
  avg_auto_climb_pts: number;
  avg_teleop_climb_pts: number;
  avg_uptime_pct: number | null;
  avg_downtime_sec: number | null;
  broke_count: number;
  broke_rate: number;
  avg_autonomous_cleansing: number;
  avg_teleop_cleansing: number;
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
  autonomous_cleansing?: number;
  teleop_cleansing?: number;
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
      avg_auto_climb_pts: 0,
      avg_teleop_climb_pts: 0,
      avg_uptime_pct: null,
      avg_downtime_sec: null,
      broke_count: 0,
      broke_rate: 0,
      avg_autonomous_cleansing: 0,
      avg_teleop_cleansing: 0,
      clank: 0,
      rpmagic: 0,
      goblin: 0,
    };
  }

  let totalAutoFuel = 0;
  let totalTeleopFuel = 0;
  let totalClimbPts = 0;
  let totalAutoClimbPts = 0;
  let totalTeleopClimbPts = 0;
  let totalClimbAdjusted = 0;
  let climbSuccesses = 0;
  let climbAttempts = n;
  let downtimeSum = 0;
  let downtimeCount = 0;
  let brokeCount = 0;
  let totalAutoCleansing = 0;
  let totalTeleopCleansing = 0;
  const scores: number[] = [];

  rows.forEach((row) => {
    const notes = row.notes;
    totalAutoFuel += getAutoFuelCount(notes);
    totalTeleopFuel += getTeleopFuelCount(notes);
    const climbPts = getClimbPoints(notes);
    totalClimbPts += climbPts;
    totalAutoClimbPts += getAutoClimbPoints(notes);
    totalTeleopClimbPts += getTeleopClimbPoints(notes);
    totalClimbAdjusted += getClimbPointsAdjusted(notes);
    if (hadClimbSuccess(notes)) climbSuccesses += 1;
    if (row.average_downtime != null && !Number.isNaN(row.average_downtime)) {
      downtimeSum += Number(row.average_downtime);
      downtimeCount += 1;
    }
    if (row.broke === true) brokeCount += 1;
    totalAutoCleansing += row.autonomous_cleansing || 0;
    totalTeleopCleansing += row.teleop_cleansing || 0;
    const score = row.final_score ?? 0;
    scores.push(score);
  });

  const avgUptime =
    downtimeCount > 0
      ? getUptimePct(downtimeSum / downtimeCount)
      : null;
  const avgDowntimeSec =
    downtimeCount > 0 ? Math.round((downtimeSum / downtimeCount) * 100) / 100 : null;

  const avgScore = scores.reduce((a, b) => a + b, 0) / n;
  const totalSum = scores.reduce((a, b) => a + b, 0);

  // CLANK: Climb Level Accuracy & No-Knockdown. Avg of (climb pts + speed adj): +2 for ≤3s, -2 for >6s.
  const clank = n > 0 ? Math.round((totalClimbAdjusted / n) * 10) / 10 : 0;

  // RPMAGIC: Marginal probability of earning an RP from this team's scoring contribution per match (0–1).
  const climbRate = climbAttempts > 0 ? climbSuccesses / climbAttempts : 0;
  const rpmagicRaw = (avgScore / 200) * 0.5 + climbRate * 0.4;
  const rpmagic = Math.round(Math.min(1, Math.max(0, rpmagicRaw)) * 1000) / 1000;

  // GOBLIN: Difference between actual match margin and expected margin. Positive = luckier than expected.
  let goblin = 0;
  if (n > 1) {
    const diffs = scores.map((score_i) => {
      const expected_i = (totalSum - score_i) / (n - 1);
      return score_i - expected_i;
    });
    goblin = diffs.reduce((a, b) => a + b, 0) / n;
  }
  goblin = Math.round(goblin * 10) / 10;

  return {
    avg_auto_fuel: Math.round((totalAutoFuel / n) * 100) / 100,
    avg_teleop_fuel: Math.round((totalTeleopFuel / n) * 100) / 100,
    avg_climb_pts: Math.round((totalClimbPts / n) * 100) / 100,
    avg_auto_climb_pts: Math.round((totalAutoClimbPts / n) * 100) / 100,
    avg_teleop_climb_pts: Math.round((totalTeleopClimbPts / n) * 100) / 100,
    avg_uptime_pct: avgUptime,
    avg_downtime_sec: avgDowntimeSec,
    broke_count: brokeCount,
    broke_rate: Math.round((brokeCount / n) * 100),
    avg_autonomous_cleansing: Math.round((totalAutoCleansing / n) * 100) / 100,
    avg_teleop_cleansing: Math.round((totalTeleopCleansing / n) * 100) / 100,
    clank,
    rpmagic,
    goblin,
  };
}
