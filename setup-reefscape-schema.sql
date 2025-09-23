-- REEFSCAPE 2025 Database Schema for Supabase
-- Run this in your Supabase SQL editor after the NextAuth tables

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  team_number INTEGER PRIMARY KEY,
  team_name TEXT,
  team_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  match_number INTEGER NOT NULL,
  red_teams INTEGER[] NOT NULL,
  blue_teams INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scouting Data table for REEFSCAPE 2025
CREATE TABLE IF NOT EXISTS scouting_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id TEXT REFERENCES matches(match_id) ON DELETE CASCADE,
  team_number INTEGER REFERENCES teams(team_number) ON DELETE CASCADE,
  alliance_color TEXT CHECK (alliance_color IN ('red', 'blue')) NOT NULL,
  
  -- Scoring breakdown
  autonomous_points INTEGER DEFAULT 0,
  teleop_points INTEGER DEFAULT 0,
  endgame_points INTEGER DEFAULT 0,
  final_score INTEGER DEFAULT 0,
  
  -- Detailed scoring notes (JSONB for flexibility)
  notes JSONB DEFAULT '{}',
  
  -- Additional metrics
  defense_rating INTEGER CHECK (defense_rating >= 1 AND defense_rating <= 5) DEFAULT 3,
  comments TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scouting_data_team_number ON scouting_data(team_number);
CREATE INDEX IF NOT EXISTS idx_scouting_data_match_id ON scouting_data(match_id);
CREATE INDEX IF NOT EXISTS idx_scouting_data_scout_id ON scouting_data(scout_id);
CREATE INDEX IF NOT EXISTS idx_scouting_data_alliance_color ON scouting_data(alliance_color);
CREATE INDEX IF NOT EXISTS idx_matches_event_key ON matches(event_key);
CREATE INDEX IF NOT EXISTS idx_matches_match_number ON matches(match_number);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_data ENABLE ROW LEVEL SECURITY;

-- Create policies for teams (read-only for all authenticated users)
CREATE POLICY "Teams are viewable by authenticated users" ON teams
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for matches (read-only for all authenticated users)
CREATE POLICY "Matches are viewable by authenticated users" ON matches
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policies for scouting_data
CREATE POLICY "Users can view all scouting data" ON scouting_data
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own scouting data" ON scouting_data
  FOR INSERT WITH CHECK (auth.uid()::text = scout_id::text);

CREATE POLICY "Users can update their own scouting data" ON scouting_data
  FOR UPDATE USING (auth.uid()::text = scout_id::text);

CREATE POLICY "Users can delete their own scouting data" ON scouting_data
  FOR DELETE USING (auth.uid()::text = scout_id::text);

-- Sample data for testing
INSERT INTO teams (team_number, team_name, team_color) VALUES
  (1234, 'Team Alpha', 'red'),
  (5678, 'Team Beta', 'blue'),
  (9012, 'Team Gamma', 'red')
ON CONFLICT (team_number) DO NOTHING;

-- Sample match data
INSERT INTO matches (match_id, event_key, match_number, red_teams, blue_teams) VALUES
  ('2025test_qm1', '2025test', 1, ARRAY[1234, 5678, 9012], ARRAY[3456, 7890, 2468])
ON CONFLICT (match_id) DO NOTHING;
