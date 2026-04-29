/**
 * REBUILT 2026 FRC analytics – Polar Edge–style KPIs
 * Match length 2:45 = 165 seconds for UPTIME calculation.
 */

import type { RunRecord } from '@/lib/types';
import { getBallChoiceScoreFromRange, getBallChoiceLabel } from '@/lib/types';
import { roundToTenth } from '@/lib/utils';
import { normalizeShuttleConsistency } from '@/lib/scouting-notes-merge';

const MATCH_LENGTH_SEC = 165;

export interface ParsedNotes {
  autonomous: {
    auto_fuel_active_hub: number;
    auto_climb?: boolean;
    auto_climb_level?: 'L1' | 'L2' | 'L3';
    auto_tower_level1: boolean;
    auto_climb_sec?: number | null;
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
    teleop_climb?: boolean;
    teleop_climb_level?: 'L1' | 'L2' | 'L3';
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
    shuttle?: boolean;
    shuttle_consistency?: 'consistent' | 'inconsistent';
    shuttle_runs?: RunRecord[];
  };
}

const BALL_KEYS = ['balls_0_15', 'balls_15_30', 'balls_30_45', 'balls_45_60', 'balls_60_75', 'balls_75_90'] as const;

function sumBalls(phase: Record<string, unknown>): number {
  return BALL_KEYS.reduce((s, k) => s + (Number(phase[k]) || 0), 0);
}

function fuelFromRuns(runs: RunRecord[] | undefined): number {
  if (!runs?.length) return 0;
  return runs.reduce((sum, r) => sum + getBallChoiceScoreFromRange(r.ball_choice), 0);
}

/** Optional DB row fields when `notes.teleop` lacks shuttle (legacy submissions). */
export type ScoutingRowShuttleMeta = {
  shuttling?: boolean | null;
  shuttling_consistency?: string | null;
};

export function parseNotes(notes: any, row?: ScoutingRowShuttleMeta): ParsedNotes {
  const parsed = typeof notes === 'string' ? (JSON.parse(notes || '{}') || {}) : notes || {};
  const auto = parsed.autonomous || (parsed.auto_fuel_active_hub !== undefined ? parsed : {});
  const teleop = parsed.teleop || (parsed.teleop_fuel_active_hub !== undefined ? parsed : {});

  const autoRuns = Array.isArray(auto.runs) ? auto.runs : [];
  const teleopRuns = Array.isArray(teleop.runs) ? teleop.runs : [];
  /** Legacy: shuttle was collected on the auto step but stored under teleop in JSON; older rows may only have autonomous.shuttle_runs. */
  const legacyAutoShuttleRuns = Array.isArray((auto as { shuttle_runs?: RunRecord[] }).shuttle_runs)
    ? (auto as { shuttle_runs: RunRecord[] }).shuttle_runs
    : [];
  const teleopShuttleRuns = Array.isArray(teleop.shuttle_runs) ? teleop.shuttle_runs : [];
  const shuttleRuns = teleopShuttleRuns.length > 0 ? teleopShuttleRuns : legacyAutoShuttleRuns;
  const autoFuelFromRuns = fuelFromRuns(autoRuns);
  const teleopFuelFromRuns = fuelFromRuns(teleopRuns);

  const autoFuelFromBalls = sumBalls(auto);
  const teleopFuelFromBalls = sumBalls(teleop);
  const teleopShifts = Array.isArray(teleop.teleop_fuel_shifts)
    ? teleop.teleop_fuel_shifts
    : teleopRuns.length > 0
      ? teleopRuns.map((r: RunRecord) => getBallChoiceScoreFromRange(r.ball_choice))
      : teleopFuelFromBalls > 0
        ? [Number(teleop.balls_0_15) || 0, Number(teleop.balls_15_30) || 0, Number(teleop.balls_30_45) || 0, Number(teleop.balls_45_60) || 0, Number(teleop.balls_60_75) || 0, Number(teleop.balls_75_90) || 0]
        : teleop.teleop_fuel_active_hub != null
          ? [teleop.teleop_fuel_active_hub]
          : [];

  const autoFuel = autoFuelFromRuns > 0 ? autoFuelFromRuns : (autoFuelFromBalls > 0 ? autoFuelFromBalls : (Number(auto.auto_fuel_active_hub) || 0));
  const teleopFuel = teleopFuelFromRuns > 0 ? teleopFuelFromRuns : (teleopFuelFromBalls > 0 ? teleopFuelFromBalls : (Number(teleop.teleop_fuel_active_hub) || 0));

  const legacyAutoShuttle = Boolean((auto as { shuttle?: boolean }).shuttle);
  const legacyAutoShuttleConsistency = normalizeShuttleConsistency(
    (auto as { shuttle_consistency?: string }).shuttle_consistency
  );
  let shuttle = Boolean(teleop.shuttle) || shuttleRuns.length > 0 || legacyAutoShuttle;
  let shuttle_consistency =
    normalizeShuttleConsistency(teleop.shuttle_consistency) || (legacyAutoShuttle ? legacyAutoShuttleConsistency : undefined);
  if (row && (row.shuttling === true || row.shuttling === false)) {
    shuttle = row.shuttling;
  }
  if (row?.shuttling_consistency != null && String(row.shuttling_consistency).trim() !== '') {
    const fromRow = normalizeShuttleConsistency(row.shuttling_consistency);
    if (fromRow) shuttle_consistency = fromRow;
  }
  if (!shuttle) shuttle_consistency = undefined;

  return {
    autonomous: {
      auto_fuel_active_hub: autoFuel,
      auto_climb: auto.auto_climb === true || Boolean(auto.auto_tower_level1),
      auto_climb_level:
        auto.auto_climb_level === 'L1' || auto.auto_climb_level === 'L2' || auto.auto_climb_level === 'L3'
          ? auto.auto_climb_level
          : (auto.auto_tower_level1 ? 'L1' : undefined),
      auto_tower_level1: Boolean(auto.auto_tower_level1),
      auto_climb_sec: auto.auto_climb_sec != null && !Number.isNaN(Number(auto.auto_climb_sec)) ? Number(auto.auto_climb_sec) : undefined,
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
      teleop_climb:
        teleop.teleop_climb === true ||
        Boolean(teleop.teleop_tower_level1 || teleop.teleop_tower_level2 || teleop.teleop_tower_level3),
      teleop_climb_level:
        teleop.teleop_climb_level === 'L1' || teleop.teleop_climb_level === 'L2' || teleop.teleop_climb_level === 'L3'
          ? teleop.teleop_climb_level
          : (teleop.teleop_tower_level3 ? 'L3' : teleop.teleop_tower_level2 ? 'L2' : teleop.teleop_tower_level1 ? 'L1' : undefined),
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
      shuttle,
      shuttle_consistency,
      shuttle_runs: shuttleRuns.length ? shuttleRuns : undefined,
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
  const usingNewClimbModel =
    p.autonomous.auto_climb != null ||
    p.autonomous.auto_climb_level != null ||
    p.teleop.teleop_climb != null ||
    p.teleop.teleop_climb_level != null;
  if (usingNewClimbModel) return 0;
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
  if (p.teleop.teleop_climb) {
    return { label: p.teleop.teleop_climb_level || 'Yes', points: 0 };
  }
  if (p.autonomous.auto_climb) {
    return { label: `Auto ${p.autonomous.auto_climb_level || 'Yes'}`, points: 0 };
  }
  if (p.teleop.teleop_tower_level3) return { label: 'L3', points: 30 };
  if (p.teleop.teleop_tower_level2) return { label: 'L2', points: 20 };
  if (p.teleop.teleop_tower_level1) return { label: 'L1', points: 10 };
  if (p.autonomous.auto_tower_level1) return { label: 'Auto L1', points: 15 };
  return null;
}

/** Teleop climb time in seconds from notes (for CLANK speed display). Returns null if not recorded. */
export function getClimbSpeedSec(notes: any): number | null {
  const p = parseNotes(notes);
  const teleopSec = p.teleop.climb_sec;
  if (teleopSec != null && !Number.isNaN(teleopSec)) return teleopSec;
  const sec = p.autonomous.auto_climb_sec;
  if (sec == null || Number.isNaN(sec)) return null;
  return sec;
}

/** Auto climb time in seconds from notes (CLANK speed in autonomous). Returns null if not recorded. */
export function getAutoClimbSpeedSec(notes: any): number | null {
  const p = parseNotes(notes);
  const sec = p.autonomous.auto_climb_sec;
  if (sec == null || Number.isNaN(sec)) return null;
  return sec;
}

/** Climb pts adjusted for speed: +2 for ≤3s, -2 for >6s (for CLANK). */
function getClimbSpeedAdjustment(notes: any): number {
  const sec = getClimbSpeedSec(notes);
  if (sec == null) return 0;
  if (sec <= 3) return 2;
  if (sec > 6) return -2;
  return 0;
}

/** Climb points + speed adjustment for one match (used for CLANK average). */
export function getClimbPointsAdjusted(notes: any): number {
  return getClimbPoints(notes) + getClimbSpeedAdjustment(notes);
}

/** 2026 REBUILT: estimated score from notes (fuel 1 pt each + climb). */
export function getEstimatedScoreFromNotes(notes: any): number {
  const autoFuel = getAutoFuelCount(notes);
  const teleopFuel = getTeleopFuelCount(notes);
  const climbPts = getClimbPoints(notes);
  return autoFuel * 1 + teleopFuel * 1 + climbPts;
}

/** One run for display: time, ball range label, value, estimated pts (2026: 1 pt per piece). */
export interface RunForDisplay {
  duration_sec: number;
  ballLabel: string;
  ballValue: number;
  estPts: number;
}

/** All runs and estimated total for a match (2026 REBUILT). */
export interface RunsForDisplay {
  auto: RunForDisplay[];
  teleop: RunForDisplay[];
  shuttle: RunForDisplay[];
  autoClimbPts: number;
  teleopClimbPts: number;
  estimatedTotal: number;
}

/** Parse notes into runs for UI: each run shows time, ball range (multiple choice), estimated pts. Uses legacy labels/values when ball_choice < 8. */
export function getRunsForDisplay(notes: any): RunsForDisplay {
  const p = parseNotes(notes);
  const autoRuns = (p.autonomous.runs || []).map((r: RunRecord) => {
    const value = getBallChoiceScoreFromRange(r.ball_choice);
    const label = getBallChoiceLabel(r.ball_choice);
    return { duration_sec: r.duration_sec, ballLabel: label, ballValue: value, estPts: value * 1 };
  });
  const teleopRuns = (p.teleop.runs || []).map((r: RunRecord) => {
    const value = getBallChoiceScoreFromRange(r.ball_choice);
    const label = getBallChoiceLabel(r.ball_choice);
    return { duration_sec: r.duration_sec, ballLabel: label, ballValue: value, estPts: value * 1 };
  });
  const autoClimbPts = getAutoClimbPoints(notes);
  const teleopClimbPts = getTeleopClimbPoints(notes);
  const estimatedTotal = getEstimatedScoreFromNotes(notes);
  return {
    auto: autoRuns,
    teleop: teleopRuns,
    shuttle: (p.teleop.shuttle_runs || []).map((r: RunRecord) => {
      const value = getBallChoiceScoreFromRange(r.ball_choice);
      const label = getBallChoiceLabel(r.ball_choice);
      return { duration_sec: r.duration_sec, ballLabel: label, ballValue: value, estPts: value * 1 };
    }),
    autoClimbPts,
    teleopClimbPts,
    estimatedTotal,
  };
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
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  avg_downtime: number | null;
  avg_uptime_pct: number | null;
  avg_downtime_sec: number | null;
  /** Average climb time in seconds (CLANK speed). Null when no climb times recorded. */
  avg_climb_speed_sec: number | null;
  broke_count: number;
  broke_rate: number;
  avg_autonomous_cleansing: number;
  avg_teleop_cleansing: number;
  clank: number;
  rpmagic: number;
  goblin: number;
  best_score: number;
  worst_score: number;
  consistency_score: number;
  /** Min/max autonomous points across matches. */
  auto_pts_min: number;
  auto_pts_max: number;
  /** Min/max teleop points across matches. */
  teleop_pts_min: number;
  teleop_pts_max: number;
  /** Min/max total (final) score across matches. */
  total_pts_min: number;
  total_pts_max: number;
  /** Min/max of (teleop fuel / num teleop runs) per match — balls per cycle. */
  balls_per_cycle_min: number;
  balls_per_cycle_max: number;
  /** Average balls per cycle (teleop fuel / num teleop runs) across matches. */
  avg_balls_per_cycle: number;
  /** Min/max auto fuel (game pieces) across matches — for detail stats range display. */
  auto_fuel_min: number;
  auto_fuel_max: number;
  /** Min/max teleop fuel across matches — for detail stats range display. */
  teleop_fuel_min: number;
  teleop_fuel_max: number;
  /** Expected Points Added: contribution based on fuel and climb pieces (average of estimated match scores). */
  epa: number;
  /** Endgame EPA: average climbing points per match (climb contribution to score). */
  endgame_epa: number;
  /** Average time per shooting attempt (run) in seconds across all runs in all matches. */
  avg_shooting_time_sec: number | null;
  /** Percentage of matches where the robot shuttle (0-100). */
  shuttle_rate: number;
  /** Average shuttle balls per shuttle run using range midpoints (e.g., 1-5 -> 3). */
  avg_shuttle_balls: number | null;
}

export interface ScoutingRowForAnalytics {
  notes?: any;
  average_downtime?: number | null;
  broke?: boolean | null;
  final_score?: number;
  autonomous_points?: number;
  teleop_points?: number;
  defense_rating?: number;
  autonomous_cleansing?: number;
  teleop_cleansing?: number;
  /** DB columns when shuttle was stored outside notes (optional). */
  shuttling?: boolean | null;
  shuttling_consistency?: string | null;
  /** For sequential EPA: sort matches by time so EPA is a moving average (Statbotics-style). */
  created_at?: string;
}

/**
 * Statbotics-style K factor for EPA update (number of matches played, 1-based).
 * See https://www.statbotics.io/blog/epa and https://www.statbotics.io/blog/intro
 */
function epaKFactor(matchesPlayed: number): number {
  if (matchesPlayed <= 6) return 0.5;
  if (matchesPlayed <= 12) return 0.5 - (matchesPlayed - 6) / 30;
  return 0.3;
}

/**
 * Compute REBUILT KPIs for a set of scouting rows (same team).
 * EPA is a sequential moving average (Statbotics-style): after each match, EPA is updated
 * by K * (score - EPA). Uses actual score when available, else estimated from notes.
 */
export function computeRebuiltMetrics(rows: ScoutingRowForAnalytics[], starterEpa?: number): RebuiltTeamMetrics {
  const n = rows.length;
  if (n === 0) {
    return {
      avg_auto_fuel: 0,
      avg_teleop_fuel: 0,
      avg_climb_pts: 0,
      avg_auto_climb_pts: 0,
      avg_teleop_climb_pts: 0,
      avg_autonomous_points: 0,
      avg_teleop_points: 0,
      avg_total_score: 0,
      avg_defense_rating: 0,
      avg_downtime: null,
      avg_uptime_pct: null,
      avg_downtime_sec: null,
      avg_climb_speed_sec: null,
      broke_count: 0,
      broke_rate: 0,
      avg_autonomous_cleansing: 0,
      avg_teleop_cleansing: 0,
      clank: 0,
      rpmagic: 0,
      goblin: 0,
      best_score: 0,
      worst_score: 0,
      consistency_score: 0,
      auto_pts_min: 0,
      auto_pts_max: 0,
      teleop_pts_min: 0,
      teleop_pts_max: 0,
      total_pts_min: 0,
      total_pts_max: 0,
      balls_per_cycle_min: 0,
      balls_per_cycle_max: 0,
      avg_balls_per_cycle: 0,
      auto_fuel_min: 0,
      auto_fuel_max: 0,
      teleop_fuel_min: 0,
      teleop_fuel_max: 0,
      epa: starterEpa || 0,
      endgame_epa: 0,
      avg_shooting_time_sec: null,
      shuttle_rate: 0,
      avg_shuttle_balls: null,
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
  let climbSpeedSum = 0;
  let climbSpeedCount = 0;
  let downtimeSum = 0; // For avg_downtime_sec
  let downtimeCount = 0; // For avg_downtime_sec
  let totalDowntimeS = 0; // For avg_downtime (minutes) and avg_uptime_pct
  let totalUptimeS = 0; // For avg_uptime_pct
  let totalUptimeMatches = 0; // Count matches with valid downtime for avg_downtime and avg_uptime_pct
  let brokeCount = 0;
  let totalAutoCleansing = 0;
  let totalTeleopCleansing = 0;
  let totalAutoPts = 0;
  let totalTeleopPts = 0;
  let totalMatchScores = 0;
  let totalDefenseRating = 0;
  let shuttleMatches = 0;
  let shuttleBallTotal = 0;
  let shuttleRunCount = 0;
  const matchScores: number[] = [];
  const scores: number[] = [];
  const autoPtsList: number[] = [];
  const teleopPtsList: number[] = [];
  const ballsPerCycleList: number[] = [];
  const autoFuelList: number[] = [];
  const teleopFuelList: number[] = [];
  const shootingDurations: number[] = [];
  /** Per-match score (actual or estimated) + created_at for chronological EPA (Statbotics-style moving average). */
  const epaMatchScores: { score: number; created_at?: string }[] = [];

  rows.forEach((row) => {
    const notes = row.notes;
    const p = parseNotes(row.notes, row); // Shuttle from notes or legacy columns
    const autoFuel = getAutoFuelCount(notes);
    const teleopFuel = getTeleopFuelCount(notes);
    totalAutoFuel += autoFuel;
    totalTeleopFuel += teleopFuel;
    autoFuelList.push(autoFuel);
    teleopFuelList.push(teleopFuel);
    const climbPts = getClimbPoints(notes);
    totalClimbPts += climbPts;
    totalAutoClimbPts += getAutoClimbPoints(notes);
    totalTeleopClimbPts += getTeleopClimbPoints(notes);
    totalClimbAdjusted += getClimbPointsAdjusted(notes);
    const teleopClimbSec = p.teleop.climb_sec;
    if (teleopClimbSec != null && !Number.isNaN(teleopClimbSec)) {
      climbSpeedSum += teleopClimbSec;
      climbSpeedCount += 1;
    }
    const autoClimbSec = p.autonomous.auto_climb_sec;
    if (autoClimbSec != null && !Number.isNaN(autoClimbSec)) {
      climbSpeedSum += autoClimbSec;
      climbSpeedCount += 1;
    }
    if (hadClimbSuccess(notes)) climbSuccesses += 1;
    if (row.average_downtime != null && !Number.isNaN(row.average_downtime)) {
      const downtimeSec = Number(row.average_downtime);
      downtimeSum += downtimeSec;
      downtimeCount += 1;

      totalDowntimeS += downtimeSec;
      totalUptimeS += Math.max(0, MATCH_LENGTH_SEC - downtimeSec);
      totalUptimeMatches += 1;
    }
    if (row.broke === true) brokeCount += 1;
    totalAutoCleansing += row.autonomous_cleansing || 0;
    totalTeleopCleansing += row.teleop_cleansing || 0;
    totalAutoPts += row.autonomous_points || 0;
    totalTeleopPts += row.teleop_points || 0;
    totalMatchScores += row.final_score || 0;
    totalDefenseRating += row.defense_rating || 0;
    matchScores.push(row.final_score || 0);
    
    if (p.teleop.shuttle) {
      shuttleMatches += 1;
    }
    const shuttleRuns = p.teleop.shuttle_runs || [];
    shuttleRuns.forEach((run: RunRecord) => {
      shuttleBallTotal += getBallChoiceScoreFromRange(run.ball_choice);
      shuttleRunCount += 1;
    });

    const score = row.final_score ?? 0;
    scores.push(score);
    // EPA: use actual match score when valid, else estimated from notes (aligns with Statbotics-style “expected points”)
    const hasActualScore = row.final_score != null && !Number.isNaN(Number(row.final_score));
    const matchScore = hasActualScore ? Number(row.final_score) : getEstimatedScoreFromNotes(notes);
    epaMatchScores.push({ score: matchScore, created_at: row.created_at });
    autoPtsList.push(row.autonomous_points ?? 0);
    teleopPtsList.push(row.teleop_points ?? 0);
    const autoRuns = p.autonomous?.runs ?? [];
    const teleopRuns = p.teleop?.runs ?? [];
    [...autoRuns, ...teleopRuns].forEach((r: RunRecord) => {
      if (typeof r.duration_sec === 'number' && !Number.isNaN(r.duration_sec)) {
        shootingDurations.push(r.duration_sec);
      }
    });
    const totalRuns = autoRuns.length + teleopRuns.length;
    const totalBalls = autoFuel + teleopFuel;
    const bpc = totalRuns > 0 ? totalBalls / totalRuns : 0;
    ballsPerCycleList.push(bpc);
  });

  const autoPtsMin = autoPtsList.length ? Math.min(...autoPtsList) : 0;
  const autoPtsMax = autoPtsList.length ? Math.max(...autoPtsList) : 0;
  const teleopPtsMin = teleopPtsList.length ? Math.min(...teleopPtsList) : 0;
  const teleopPtsMax = teleopPtsList.length ? Math.max(...teleopPtsList) : 0;
  const totalPtsMin = scores.length ? Math.min(...scores) : 0;
  const totalPtsMax = scores.length ? Math.max(...scores) : 0;
  const ballsPerCycleMin = ballsPerCycleList.length ? Math.round(Math.min(...ballsPerCycleList)) : 0;
  const ballsPerCycleMax = ballsPerCycleList.length ? Math.round(Math.max(...ballsPerCycleList)) : 0;
  const avgBallsPerCycle = ballsPerCycleList.length ? Math.round(ballsPerCycleList.reduce((a, b) => a + b, 0) / ballsPerCycleList.length) : 0;
  const autoFuelMin = autoFuelList.length ? Math.min(...autoFuelList) : 0;
  const autoFuelMax = autoFuelList.length ? Math.max(...autoFuelList) : 0;
  const teleopFuelMin = teleopFuelList.length ? Math.min(...teleopFuelList) : 0;
  const teleopFuelMax = teleopFuelList.length ? Math.max(...teleopFuelList) : 0;

  const avgDowntimeSec =
    downtimeCount > 0 ? Math.round(downtimeSum / downtimeCount) : null;

  const avgScore = scores.reduce((a, b) => a + b, 0) / n;
  const totalSum = scores.reduce((a, b) => a + b, 0);

  // EPA: Statbotics-style moving average (statbotics.io/blog/epa, blog/intro). Sort by created_at, then update after each match.
  const sortedForEpa = [...epaMatchScores].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tA - tB;
  });
  
  // Use starterEpa if provided, otherwise start with the first match score
  let epa = starterEpa !== undefined ? starterEpa : (sortedForEpa.length > 0 ? sortedForEpa[0].score : avgScore);
  
  // Start iteration from 0 if starterEpa is used, otherwise from 1
  const startIdx = starterEpa !== undefined ? 0 : 1;
  
  for (let i = startIdx; i < sortedForEpa.length; i++) {
    const K = epaKFactor(i + 1 + (starterEpa !== undefined ? 1 : 0)); // N = matches played (1-based)
    epa = epa + K * (sortedForEpa[i].score - epa);
  }

  // CLANK: Climb Level Accuracy & No-Knockdown. Avg of (climb pts + speed adj): +2 for ≤3s, -2 for >6s.
  const clank = n > 0 ? Math.round(totalClimbAdjusted / n) : 0;

  // RPMAGIC: Marginal probability of earning an RP from this team's scoring contribution per match (0–100).
  const climbRate = climbAttempts > 0 ? climbSuccesses / climbAttempts : 0;
  const rpmagicRaw = (avgScore / 200) * 0.5 + climbRate * 0.4;
  const rpmagic = Math.round(Math.min(100, Math.max(0, rpmagicRaw * 100)));

  // GOBLIN: Difference between actual match margin and expected margin. Positive = luckier than expected.
  let goblin = 0;
  if (n > 1) {
    const diffs = scores.map((score_i) => {
      const expected_i = (totalSum - score_i) / (n - 1);
      return score_i - expected_i;
    });
    goblin = diffs.reduce((a, b) => a + b, 0) / n;
  }
  goblin = Math.round(goblin);

  const avgClimbSpeedSec =
    climbSpeedCount > 0 ? Math.round(climbSpeedSum / climbSpeedCount) : null;

  const avgShootingTimeSec =
    shootingDurations.length > 0
      ? Math.round(shootingDurations.reduce((a, b) => a + b, 0) / shootingDurations.length)
      : null;

  const avgTotal = totalMatchScores / n;
  const bestScore = matchScores.length > 0 ? Math.max(...matchScores) : 0;
  const worstScore = matchScores.length > 0 ? Math.min(...matchScores) : 0;
  const variance = matchScores.length > 1
    ? matchScores.reduce((sum, s) => sum + Math.pow(s - avgTotal, 2), 0) / n
    : 0;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = avgTotal > 0 ? Math.max(0, Math.min(100, 100 - (stdDev / avgTotal) * 100)) : 0;

  return {
    avg_auto_fuel: Math.round(totalAutoFuel / n),
    avg_teleop_fuel: Math.round(totalTeleopFuel / n),
    avg_climb_pts: Math.round(totalClimbPts / n),
    avg_auto_climb_pts: Math.round(totalAutoClimbPts / n),
    avg_teleop_climb_pts: Math.round(totalTeleopClimbPts / n),
    avg_autonomous_points: Math.round(totalAutoPts / n),
    avg_teleop_points: Math.round(totalTeleopPts / n),
    avg_total_score: Math.round(avgTotal),
    avg_defense_rating: Math.round(totalDefenseRating / n),
    avg_downtime: totalUptimeMatches > 0 ? Math.round(totalDowntimeS / totalUptimeMatches / 60) : null,
    avg_uptime_pct: totalUptimeMatches > 0 ? Math.round((totalUptimeS / (totalUptimeS + totalDowntimeS)) * 100) : null,
    avg_downtime_sec: avgDowntimeSec,
    avg_climb_speed_sec: avgClimbSpeedSec,
    broke_count: brokeCount,
    broke_rate: Math.round((brokeCount / n) * 100),
    avg_autonomous_cleansing: Math.round(totalAutoCleansing / n),
    avg_teleop_cleansing: Math.round(totalTeleopCleansing / n),
    clank,
    rpmagic,
    goblin,
    best_score: bestScore,
    worst_score: worstScore,
    consistency_score: Math.round(consistencyScore),
    auto_pts_min: autoPtsMin,
    auto_pts_max: autoPtsMax,
    teleop_pts_min: teleopPtsMin,
    teleop_pts_max: teleopPtsMax,
    total_pts_min: totalPtsMin,
    total_pts_max: totalPtsMax,
    balls_per_cycle_min: ballsPerCycleMin,
    balls_per_cycle_max: ballsPerCycleMax,
    avg_balls_per_cycle: avgBallsPerCycle,
    auto_fuel_min: autoFuelMin,
    auto_fuel_max: autoFuelMax,
    teleop_fuel_min: teleopFuelMin,
    teleop_fuel_max: teleopFuelMax,
    epa: Math.round(epa),
    endgame_epa: Math.round(totalClimbPts / n), // climbing points = endgame EPA
    avg_shooting_time_sec: avgShootingTimeSec,
    shuttle_rate: Math.round((shuttleMatches / n) * 100),
    avg_shuttle_balls: shuttleRunCount > 0 ? roundToTenth(shuttleBallTotal / shuttleRunCount) : null,
  };
}

/** Format min–max score range for display: "min–max" when different, "min" when equal. */
export function formatScoreRange(min: number, max: number): string {
  if (min === max || Number.isNaN(min) || Number.isNaN(max)) return String(min);
  return `${min}–${max}`;
}
