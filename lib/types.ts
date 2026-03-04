export interface Team {
  team_number: number;
  team_name: string;
  team_color: string;
  created_at: string;
}

export interface Match {
  match_id: string;
  event_key: string;
  match_number: number;
  red_teams: number[];
  blue_teams: number[];
  created_at: string;
}

export interface ScoutingData {
  id: string;
  scout_id: string;
  match_id: string;
  team_number: number;
  alliance_color: 'red' | 'blue';
  alliance_position?: 1 | 2 | 3;
  autonomous_points: number;
  teleop_points: number;
  final_score: number;
  /** @deprecated No longer used (2026 game); kept for DB compatibility. */
  autonomous_cleansing?: number;
  /** @deprecated No longer used (2026 game); kept for DB compatibility. */
  teleop_cleansing?: number;
  notes: ScoringNotes | { autonomous?: Partial<ScoringNotes>; teleop?: Partial<ScoringNotes> };
  defense_rating: number;
  comments: string;
  average_downtime?: number | null;
  broke?: boolean | null;
  created_at: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  submitted_at?: string;
}

export interface ScoringNotes {
  // Multiple runs per phase: each run = stopwatch duration + one multiple-choice (ball count)
  runs?: RunRecord[];
  // Legacy / derived
  duration_sec?: number | null;
  balls_0_15?: number;
  balls_15_30?: number;
  balls_30_45?: number;
  balls_45_60?: number;
  balls_60_75?: number;
  balls_75_90?: number;
  auto_fuel_active_hub: number;
  auto_tower_level1: boolean;
  /** Auto climb time in seconds (CLANK speed), with millisecond precision. */
  auto_climb_sec?: number | null;
  teleop_fuel_active_hub: number;
  /** Teleop climb time in seconds, with millisecond precision. */
  climb_sec?: number | null;
  teleop_fuel_shifts?: number[];
  teleop_tower_level1: boolean;
  teleop_tower_level2: boolean;
  teleop_tower_level3: boolean;
}

/** One recorded run: stopwatch stopped → user picked one ball-count option. */
export interface RunRecord {
  duration_sec: number;
  ball_choice: number; // index into BALL_CHOICE_OPTIONS
}

/** Legacy 8 options (indices 0–7); used for display when ball_choice < 8. */
export const LEGACY_BALL_CHOICE_OPTIONS = [
  { label: '0', value: 0 },
  { label: '1–15', value: 15 },
  { label: '16–30', value: 30 },
  { label: '31–45', value: 45 },
  { label: '46–60', value: 60 },
  { label: '61–75', value: 75 },
  { label: '76–90', value: 90 },
  { label: '91+', value: 95 },
] as const;

/** Multiple choice after each stopwatch run: ranges of 5 from 0 up to 70 (0, 1–5 … 66–70, 71+). Value = max of range. New submissions use indices 0–15. */
export const BALL_CHOICE_OPTIONS = [
  { label: '0', value: 0 },
  { label: '1–5', value: 5 },
  { label: '6–10', value: 10 },
  { label: '11–15', value: 15 },
  { label: '16–20', value: 20 },
  { label: '21–25', value: 25 },
  { label: '26–30', value: 30 },
  { label: '31–35', value: 35 },
  { label: '36–40', value: 40 },
  { label: '41–45', value: 45 },
  { label: '46–50', value: 50 },
  { label: '51–55', value: 55 },
  { label: '56–60', value: 60 },
  { label: '61–65', value: 65 },
  { label: '66–70', value: 70 },
  { label: '71+', value: 75 },
] as const;

/** Value for scoring from a run's ball_choice index. Legacy 0–7; new form saves 8+optionIndex so 8–23 map to BALL_CHOICE_OPTIONS 0–15. */
export function getBallChoiceValue(ball_choice: number): number {
  if (ball_choice < LEGACY_BALL_CHOICE_OPTIONS.length) return LEGACY_BALL_CHOICE_OPTIONS[ball_choice]?.value ?? 0;
  const idx = ball_choice - LEGACY_BALL_CHOICE_OPTIONS.length;
  return BALL_CHOICE_OPTIONS[idx]?.value ?? 0;
}

/** Label for display from a run's ball_choice index. Legacy 0–7; new form uses 8+optionIndex. */
export function getBallChoiceLabel(ball_choice: number): string {
  if (ball_choice < LEGACY_BALL_CHOICE_OPTIONS.length) return LEGACY_BALL_CHOICE_OPTIONS[ball_choice]?.label ?? '0';
  const idx = ball_choice - LEGACY_BALL_CHOICE_OPTIONS.length;
  return BALL_CHOICE_OPTIONS[idx]?.label ?? '0';
}

/** One phase (auto or teleop) can have multiple runs. */
export interface BallTrackingPhase {
  runs: RunRecord[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  username?: string;
  role?: 'user' | 'admin';
}

export interface TeamStats {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_endgame_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  avg_downtime?: number | null;
  broke_count?: number;
  broke_rate?: number;
  /** REBUILT: average auto fuel (game pieces) per match */
  avg_auto_fuel?: number;
  /** REBUILT: average teleop fuel per match */
  avg_teleop_fuel?: number;
  /** REBUILT: average climb points per match */
  avg_climb_pts?: number;
  /** REBUILT: uptime % (100 - downtime/match_length) */
  avg_uptime_pct?: number | null;
  /** REBUILT: CLANK – climb success rate % */
  clank?: number;
  /** REBUILT: RPMAGIC – ranking points potential */
  rpmagic?: number;
  /** REBUILT: GOBLIN – consistency (inverse luck) */
  goblin?: number;
  win_rate: number;
  consistency_score: number;
  avg_shifts?: number[];
}

export interface AnalysisFilters {
  event_key?: string;
  team_numbers?: number[];
  date_range?: {
    start: string;
    end: string;
  };
  alliance_color?: 'red' | 'blue';
}

export type ScoringElement =
  | 'auto_fuel_active_hub'
  | 'auto_tower_level1'
  | 'teleop_fuel_active_hub'
  | 'teleop_tower_level1'
  | 'teleop_tower_level2'
  | 'teleop_tower_level3';

export const SCORING_VALUES: Record<ScoringElement, number> = {
  auto_fuel_active_hub: 1,
  auto_tower_level1: 15,
  teleop_fuel_active_hub: 1,
  teleop_tower_level1: 10,
  teleop_tower_level2: 20,
  teleop_tower_level3: 30,
};

export interface PickList {
  id: string;
  user_id: string;
  name: string;
  event_key: string;
  teams: PickListTeam[];
  created_at: string;
  updated_at: string;
}

export interface PickListTeam {
  team_number: number;
  team_name: string;
  pick_order: number;
  notes?: string;
  stats?: TeamStats;
}

export interface PickListFilters {
  event_key?: string;
  min_matches?: number;
  min_avg_score?: number;
  alliance_color?: 'red' | 'blue';
}