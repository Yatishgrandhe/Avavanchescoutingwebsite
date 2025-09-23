import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateScore(data: any) {
  if (!data) return { final_score: 0 };
  
  let score = 0;
  
  // Calculate autonomous points
  if (data.auto_leave) score += 3;
  if (data.auto_coral_trough) score += 3 * data.auto_coral_trough;
  if (data.auto_coral_l2) score += 4 * data.auto_coral_l2;
  if (data.auto_coral_l3) score += 6 * data.auto_coral_l3;
  if (data.auto_coral_l4) score += 7 * data.auto_coral_l4;
  if (data.auto_algae_processor) score += 6 * data.auto_algae_processor;
  if (data.auto_algae_net) score += 4 * data.auto_algae_net;
  
  // Calculate teleop points
  if (data.teleop_coral_trough) score += 2 * data.teleop_coral_trough;
  if (data.teleop_coral_l2) score += 3 * data.teleop_coral_l2;
  if (data.teleop_coral_l3) score += 4 * data.teleop_coral_l3;
  if (data.teleop_coral_l4) score += 5 * data.teleop_coral_l4;
  if (data.teleop_algae_processor) score += 6 * data.teleop_algae_processor;
  if (data.teleop_algae_net) score += 4 * data.teleop_algae_net;
  
  // Calculate endgame points
  if (data.endgame_park) score += 2;
  if (data.endgame_shallow_cage) score += 6;
  if (data.endgame_deep_cage) score += 12;

  return {
    final_score: score
  };
}
