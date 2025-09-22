import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SCORING_VALUES, ScoringNotes, ScoringElement } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateScore(notes: ScoringNotes): {
  autonomous_points: number;
  teleop_points: number;
  endgame_points: number;
  final_score: number;
} {
  // Calculate autonomous points
  const autonomous_points = 
    (notes.auto_leave ? SCORING_VALUES.auto_leave : 0) +
    (notes.auto_coral_trough * SCORING_VALUES.auto_coral_trough) +
    (notes.auto_coral_l2 * SCORING_VALUES.auto_coral_l2) +
    (notes.auto_coral_l3 * SCORING_VALUES.auto_coral_l3) +
    (notes.auto_coral_l4 * SCORING_VALUES.auto_coral_l4) +
    (notes.auto_algae_processor * SCORING_VALUES.auto_algae_processor) +
    (notes.auto_algae_net * SCORING_VALUES.auto_algae_net);

  // Calculate teleop points
  const teleop_points = 
    (notes.teleop_coral_trough * SCORING_VALUES.teleop_coral_trough) +
    (notes.teleop_coral_l2 * SCORING_VALUES.teleop_coral_l2) +
    (notes.teleop_coral_l3 * SCORING_VALUES.teleop_coral_l3) +
    (notes.teleop_coral_l4 * SCORING_VALUES.teleop_coral_l4) +
    (notes.teleop_algae_processor * SCORING_VALUES.teleop_algae_processor) +
    (notes.teleop_algae_net * SCORING_VALUES.teleop_algae_net);

  // Calculate endgame points
  const endgame_points = 
    (notes.endgame_park ? SCORING_VALUES.endgame_park : 0) +
    (notes.endgame_shallow_cage ? SCORING_VALUES.endgame_shallow_cage : 0) +
    (notes.endgame_deep_cage ? SCORING_VALUES.endgame_deep_cage : 0);

  const final_score = autonomous_points + teleop_points + endgame_points;

  return {
    autonomous_points,
    teleop_points,
    endgame_points,
    final_score,
  };
}

export function formatTeamNumber(teamNumber: number): string {
  return teamNumber.toString().padStart(4, '0');
}

export function formatMatchNumber(matchNumber: number): string {
  return `Match ${matchNumber}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateMatchId(eventKey: string, matchNumber: number): string {
  return `${eventKey}_qm${matchNumber}`;
}

export function validateMatchNumber(matchNumber: string): boolean {
  const num = parseInt(matchNumber);
  return !isNaN(num) && num > 0 && num <= 999;
}

export function getScoringElementLabel(element: ScoringElement): string {
  const labels: Record<ScoringElement, string> = {
    auto_leave: 'Leave Starting Zone',
    auto_coral_trough: 'Auto Coral in Trough (L1)',
    auto_coral_l2: 'Auto Coral on L2 Branch',
    auto_coral_l3: 'Auto Coral on L3 Branch',
    auto_coral_l4: 'Auto Coral on L4 Branch',
    auto_algae_processor: 'Auto Algae in Processor',
    auto_algae_net: 'Auto Algae on Net',
    teleop_coral_trough: 'Teleop Coral in Trough (L1)',
    teleop_coral_l2: 'Teleop Coral on L2 Branch',
    teleop_coral_l3: 'Teleop Coral on L3 Branch',
    teleop_coral_l4: 'Teleop Coral on L4 Branch',
    teleop_algae_processor: 'Teleop Algae in Processor',
    teleop_algae_net: 'Teleop Algae on Net',
    endgame_park: 'Park in Barge Zone',
    endgame_shallow_cage: 'Shallow Cage',
    endgame_deep_cage: 'Deep Cage',
  };
  
  return labels[element];
}

export function getScoringElementDescription(element: ScoringElement): string {
  const descriptions: Record<ScoringElement, string> = {
    auto_leave: 'Robot successfully leaves the starting zone during autonomous',
    auto_coral_trough: 'Coral pieces scored in the trough during autonomous',
    auto_coral_l2: 'Coral pieces scored on Level 2 branches during autonomous',
    auto_coral_l3: 'Coral pieces scored on Level 3 branches during autonomous',
    auto_coral_l4: 'Coral pieces scored on Level 4 branches during autonomous',
    auto_algae_processor: 'Algae pieces processed during autonomous',
    auto_algae_net: 'Algae pieces placed on nets during autonomous',
    teleop_coral_trough: 'Coral pieces scored in the trough during teleop',
    teleop_coral_l2: 'Coral pieces scored on Level 2 branches during teleop',
    teleop_coral_l3: 'Coral pieces scored on Level 3 branches during teleop',
    teleop_coral_l4: 'Coral pieces scored on Level 4 branches during teleop',
    teleop_algae_processor: 'Algae pieces processed during teleop',
    teleop_algae_net: 'Algae pieces placed on nets during teleop',
    endgame_park: 'Robot is parked in the barge zone at end of match',
    endgame_shallow_cage: 'Robot is lifted off ground via shallow cage',
    endgame_deep_cage: 'Robot is lifted off ground via deep cage',
  };
  
  return descriptions[element];
}
