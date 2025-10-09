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
  if (data.auto_l1) score += 3;
  if (data.auto_l2) score += 4;
  if (data.auto_l3) score += 6;
  if (data.auto_l4) score += 7;
  if (data.auto_clean_reef_low) score += 6;
  if (data.auto_clean_reef_high) score += 4;
  
  // Calculate teleop points
  if (data.teleop_coral_trough) score += 2 * data.teleop_coral_trough;
  if (data.teleop_coral_l2) score += 3 * data.teleop_coral_l2;
  if (data.teleop_coral_l3) score += 4 * data.teleop_coral_l3;
  if (data.teleop_coral_l4) score += 5 * data.teleop_coral_l4;
  if (data.teleop_algae_processor) score += 6 * data.teleop_algae_processor;
  if (data.teleop_algae_net) score += 4 * data.teleop_algae_net;
  
  // Calculate endgame points (these are the barge actions from the table)
  if (data.endgame_park) score += 2;  // PARK in the BARGE ZONE
  if (data.endgame_shallow_cage) score += 6;  // off-the-ground via shallow CAGE
  if (data.endgame_deep_cage) score += 12;  // off-the-ground via deep CAGE

  return {
    final_score: score
  };
}
