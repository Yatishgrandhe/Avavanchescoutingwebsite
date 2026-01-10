import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateScore(data: any) {
  if (!data) return { final_score: 0 };
  
  let score = 0;
  
  // Autonomous (first 20 seconds)
  if (data.auto_fuel_active_hub) score += 1 * data.auto_fuel_active_hub;
  if (data.auto_tower_level1) score += 15; // per robot
  
  // Teleop (last 2:20)
  if (data.teleop_fuel_active_hub) score += 1 * data.teleop_fuel_active_hub;
  // TOWER: Only highest level counts (mutually exclusive)
  if (data.teleop_tower_level3) score += 30; // LEVEL 3 highest
  else if (data.teleop_tower_level2) score += 20; // LEVEL 2

  return {
    final_score: score
  };
}
