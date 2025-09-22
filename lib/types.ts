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
  autonomous_points: number;
  teleop_points: number;
  endgame_points: number;
  final_score: number;
  notes: ScoringNotes;
  defense_rating: number;
  comments: string;
  created_at: string;
}

export interface ScoringNotes {
  // Autonomous Period
  auto_leave: boolean;
  auto_coral_trough: number;
  auto_coral_l2: number;
  auto_coral_l3: number;
  auto_coral_l4: number;
  auto_algae_processor: number;
  auto_algae_net: number;
  
  // Teleop Period
  teleop_coral_trough: number;
  teleop_coral_l2: number;
  teleop_coral_l3: number;
  teleop_coral_l4: number;
  teleop_algae_processor: number;
  teleop_algae_net: number;
  
  // Endgame
  endgame_park: boolean;
  endgame_shallow_cage: boolean;
  endgame_deep_cage: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  username?: string;
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
  win_rate: number;
  consistency_score: number;
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
  | 'auto_leave'
  | 'auto_coral_trough'
  | 'auto_coral_l2'
  | 'auto_coral_l3'
  | 'auto_coral_l4'
  | 'auto_algae_processor'
  | 'auto_algae_net'
  | 'teleop_coral_trough'
  | 'teleop_coral_l2'
  | 'teleop_coral_l3'
  | 'teleop_coral_l4'
  | 'teleop_algae_processor'
  | 'teleop_algae_net'
  | 'endgame_park'
  | 'endgame_shallow_cage'
  | 'endgame_deep_cage';

export const SCORING_VALUES: Record<ScoringElement, number> = {
  auto_leave: 3,
  auto_coral_trough: 3,
  auto_coral_l2: 4,
  auto_coral_l3: 6,
  auto_coral_l4: 7,
  auto_algae_processor: 6,
  auto_algae_net: 4,
  teleop_coral_trough: 2,
  teleop_coral_l2: 3,
  teleop_coral_l3: 4,
  teleop_coral_l4: 5,
  teleop_algae_processor: 6,
  teleop_algae_net: 4,
  endgame_park: 2,
  endgame_shallow_cage: 6,
  endgame_deep_cage: 12,
};
