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
  endgame_points: number;
  final_score: number;
  autonomous_cleansing: number;
  teleop_cleansing: number;
  notes: ScoringNotes;
  defense_rating: number;
  comments: string;
  created_at: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  submitted_at?: string;
}

export interface ScoringNotes {
  // Autonomous Period (first 20 seconds)
  auto_fuel_active_hub: number;     // 1 pt per FUEL in active HUB
  auto_tower_level1: boolean;        // 15 pts per robot (LEVEL 1 climb)
  
  // Teleop Period (last 2:20, especially last 0:30)
  teleop_fuel_active_hub: number;    // 1 pt per FUEL in active HUB (total of all shifts)
  teleop_fuel_shifts?: number[];     // Array of fuel counts for each shift
  teleop_tower_level1: boolean;      // 10 pts per robot (LEVEL 1 climb)
  teleop_tower_level2: boolean;      // 20 pts per robot (LEVEL 2 - above LOW RUNG)
  teleop_tower_level3: boolean;      // 30 pts per robot (LEVEL 3 - above MID RUNG)
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