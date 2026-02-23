import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { BALL_CHOICE_OPTIONS } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function fuelFromRuns(runs: Array<{ ball_choice: number }> | undefined): number {
  if (!runs?.length) return 0;
  return runs.reduce((sum, r) => sum + (BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0), 0);
}

export function calculateScore(data: any) {
  if (!data) return { final_score: 0 };

  let score = 0;
  const isAuto = data.auto_fuel_active_hub != null || data.auto_tower_level1 != null ||
    (data.runs?.length && data.teleop_tower_level1 == null && data.teleop_fuel_active_hub == null);

  if (isAuto) {
    const fuel = data.runs?.length ? fuelFromRuns(data.runs) : (
      data.auto_fuel_active_hub != null ? Number(data.auto_fuel_active_hub) : (
        ['balls_0_15', 'balls_15_30', 'balls_30_45', 'balls_45_60', 'balls_60_75', 'balls_75_90'] as const
      ).reduce((s, k) => s + (Number(data[k]) || 0), 0)
    );
    score += fuel * 1;
    if (data.auto_tower_level1) score += 15;
    if (data.autonomous_cleansing) score += Number(data.autonomous_cleansing) * 5;
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
    if (data.teleop_tower_level3) score += 30;
    else if (data.teleop_tower_level2) score += 20;
    else if (data.teleop_tower_level1) score += 10;
    if (data.teleop_cleansing) score += Number(data.teleop_cleansing) * 5;
  }

  return { final_score: score };
}
