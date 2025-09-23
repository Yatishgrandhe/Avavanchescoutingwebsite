import { createClient } from '@supabase/supabase-js';
import { ScoutingData } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Database helper functions
export const db = {
  // Teams
  async getTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('team_number');
    
    if (error) throw error;
    return data;
  },

  async getTeam(teamNumber: number) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('team_number', teamNumber)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Matches
  async getMatches(eventKey?: string) {
    let query = supabase.from('matches').select('*').order('match_number');
    
    if (eventKey) {
      query = query.eq('event_key', eventKey);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getMatch(matchId: string) {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('match_id', matchId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Scouting Data
  async getScoutingData(filters?: {
    match_id?: string;
    team_number?: number;
    alliance_color?: 'red' | 'blue';
  }) {
    let query = supabase.from('scouting_data').select('*').order('created_at', { ascending: false });
    
    if (filters?.match_id) {
      query = query.eq('match_id', filters.match_id);
    }
    if (filters?.team_number) {
      query = query.eq('team_number', filters.team_number);
    }
    if (filters?.alliance_color) {
      query = query.eq('alliance_color', filters.alliance_color);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createScoutingData(scoutingData: Omit<ScoutingData, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('scouting_data')
      .insert([scoutingData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateScoutingData(id: string, updates: Partial<ScoutingData>) {
    const { data, error } = await supabase
      .from('scouting_data')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Team Statistics
  async getTeamStats(teamNumber: number, eventKey?: string) {
    let query = supabase
      .from('scouting_data')
      .select('*')
      .eq('team_number', teamNumber);
    
    if (eventKey) {
      query = query.eq('event_key', eventKey);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const totalMatches = data.length;
    const avgAutonomous = data.reduce((sum, match) => sum + match.autonomous_points, 0) / totalMatches;
    const avgTeleop = data.reduce((sum, match) => sum + match.teleop_points, 0) / totalMatches;
    const avgEndgame = data.reduce((sum, match) => sum + match.endgame_points, 0) / totalMatches;
    const avgTotal = data.reduce((sum, match) => sum + match.final_score, 0) / totalMatches;
    const avgDefense = data.reduce((sum, match) => sum + match.defense_rating, 0) / totalMatches;
    
    return {
      team_number: teamNumber,
      total_matches: totalMatches,
      avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
      avg_teleop_points: Math.round(avgTeleop * 100) / 100,
      avg_endgame_points: Math.round(avgEndgame * 100) / 100,
      avg_total_score: Math.round(avgTotal * 100) / 100,
      avg_defense_rating: Math.round(avgDefense * 100) / 100,
    };
  },
};
