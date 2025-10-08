import { createClient } from '@supabase/supabase-js';
import { ScoutingData } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a singleton instance to avoid multiple GoTrueClient instances
let supabaseInstance: any = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseInstance;
};

// For backward compatibility, export the client
export const supabase = getSupabaseClient();

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
    alliance_position?: 1 | 2 | 3;
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
    if (filters?.alliance_position) {
      query = query.eq('alliance_position', filters.alliance_position);
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
    const avgAutonomous = data.reduce((sum: number, match: any) => sum + match.autonomous_points, 0) / totalMatches;
    const avgTeleop = data.reduce((sum: number, match: any) => sum + match.teleop_points, 0) / totalMatches;
    const avgEndgame = data.reduce((sum: number, match: any) => sum + match.endgame_points, 0) / totalMatches;
    const avgTotal = data.reduce((sum: number, match: any) => sum + match.final_score, 0) / totalMatches;
    const avgDefense = data.reduce((sum: number, match: any) => sum + match.defense_rating, 0) / totalMatches;
    
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

  // Admin functions - using Supabase Auth metadata
  async isUserAdmin(userId: string): Promise<boolean> {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user) return false;
    return user.user_metadata?.role === 'admin';
  },

  async getCurrentUser(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Return user data from Supabase Auth
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      username: user.user_metadata?.username || user.email,
      image: user.user_metadata?.avatar_url,
      role: user.user_metadata?.role || 'user',
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  },

  // Pick Lists (Admin only)
  async getPickLists() {
    const { data, error } = await supabase
      .from('pick_lists')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createPickList(pickList: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('pick_lists')
      .insert([pickList])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePickList(id: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('pick_lists')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deletePickList(id: string) {
    const { error } = await supabase
      .from('pick_lists')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};
