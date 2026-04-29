import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getBallChoiceScoreFromRange } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Round a number to one decimal place (tenth). */
export function roundToTenth(n: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0
  return Math.round(n * 10) / 10
}

/** Format duration in seconds with milliseconds (e.g. "12.345s") */
export function formatDurationSec(sec: number): string {
  if (typeof sec !== 'number' || Number.isNaN(sec)) return '0.000s';
  return `${(Math.round(sec * 1000) / 1000).toFixed(3)}s`;
}

function fuelFromRuns(runs: Array<{ ball_choice: number }> | undefined): number {
  if (!runs?.length) return 0;
  return runs.reduce((sum, r) => sum + getBallChoiceScoreFromRange(r.ball_choice), 0);
}

export function calculateScore(data: any) {
  if (!data) return { final_score: 0 };

  let score = 0;
  const isAuto = data.auto_fuel_active_hub != null || data.auto_climb != null ||
    (data.runs?.length && data.teleop_fuel_active_hub == null);

  if (isAuto) {
    const fuel = data.runs?.length ? fuelFromRuns(data.runs) : (
      data.auto_fuel_active_hub != null ? Number(data.auto_fuel_active_hub) : (
        ['balls_0_15', 'balls_15_30', 'balls_30_45', 'balls_45_60', 'balls_60_75', 'balls_75_90'] as const
      ).reduce((s, k) => s + (Number(data[k]) || 0), 0)
    );
    score += fuel * 1;
  } else {
    let teleopFuel = 0;
    if (data.runs?.length) {
      teleopFuel = fuelFromRuns(data.runs);
    } else if (data.teleop_fuel_shifts && Array.isArray(data.teleop_fuel_shifts)) {
      teleopFuel = data.teleop_fuel_shifts.reduce((sum: number, f: number) => sum + (f || 0), 0);
    } else if (data.teleop_fuel_active_hub != null) {
      teleopFuel = Number(data.teleop_fuel_active_hub);
    } else {
      teleopFuel = (['balls_0_15', 'balls_15_30', 'balls_30_45', 'balls_45_60', 'balls_60_75', 'balls_75_90'] as const)
        .reduce((s, k) => s + (Number(data[k]) || 0), 0);
    }
    score += teleopFuel * 1;
  }

  return { final_score: score };
}
