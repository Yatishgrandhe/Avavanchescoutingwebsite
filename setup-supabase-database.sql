-- Complete Supabase Database Setup for Avalanche 2025 Scouting Platform
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NextAuth.js required tables
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMP WITH TIME ZONE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avalanche 2025 Tables
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

-- Scouting Data table for Avalanche 2025
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
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_scouting_data_team_number ON scouting_data(team_number);
CREATE INDEX IF NOT EXISTS idx_scouting_data_match_id ON scouting_data(match_id);
CREATE INDEX IF NOT EXISTS idx_scouting_data_scout_id ON scouting_data(scout_id);
CREATE INDEX IF NOT EXISTS idx_scouting_data_alliance_color ON scouting_data(alliance_color);
CREATE INDEX IF NOT EXISTS idx_matches_event_key ON matches(event_key);
CREATE INDEX IF NOT EXISTS idx_matches_match_number ON matches(match_number);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_data ENABLE ROW LEVEL SECURITY;

-- Create policies for NextAuth
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Accounts policies
CREATE POLICY "Users can read own accounts" ON accounts
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Sessions policies
CREATE POLICY "Users can read own sessions" ON sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Verification tokens policies (more permissive for NextAuth)
CREATE POLICY "Allow all operations on verification_tokens" ON verification_tokens
  FOR ALL USING (true);

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
  (9012, 'Team Gamma', 'red'),
  (3456, 'Team Delta', 'blue'),
  (7890, 'Team Epsilon', 'red'),
  (2468, 'Team Zeta', 'blue')
ON CONFLICT (team_number) DO NOTHING;

-- Sample match data
INSERT INTO matches (match_id, event_key, match_number, red_teams, blue_teams) VALUES
  ('2025test_qm1', '2025test', 1, ARRAY[1234, 5678, 9012], ARRAY[3456, 7890, 2468]),
  ('2025test_qm2', '2025test', 2, ARRAY[3456, 7890, 2468], ARRAY[1234, 5678, 9012]),
  ('2025test_qm3', '2025test', 3, ARRAY[1234, 3456, 7890], ARRAY[5678, 9012, 2468])
ON CONFLICT (match_id) DO NOTHING;

-- Sample scouting data
INSERT INTO scouting_data (
  match_id, team_number, alliance_color, 
  autonomous_points, teleop_points, endgame_points, final_score,
  notes, defense_rating, comments
) VALUES
  ('2025test_qm1', 1234, 'red', 15, 45, 12, 72, 
   '{"auto_leave": true, "auto_coral_trough": 2, "auto_coral_l2": 1}', 4, 'Strong autonomous performance'),
  ('2025test_qm1', 5678, 'red', 12, 38, 8, 58,
   '{"auto_leave": true, "auto_coral_trough": 1, "auto_algae_processor": 1}', 3, 'Good teleop scoring'),
  ('2025test_qm2', 1234, 'blue', 18, 52, 15, 85,
   '{"auto_leave": true, "auto_coral_l3": 1, "auto_algae_net": 2}', 5, 'Excellent match performance'),
  ('2025test_qm2', 3456, 'red', 9, 35, 6, 50,
   '{"auto_leave": false, "teleop_coral_trough": 3}', 2, 'Struggled with autonomous')
ON CONFLICT DO NOTHING;

-- Create a view for team statistics
CREATE OR REPLACE VIEW team_statistics AS
SELECT 
  t.team_number,
  t.team_name,
  COUNT(sd.id) as total_matches,
  ROUND(AVG(sd.autonomous_points), 2) as avg_autonomous_points,
  ROUND(AVG(sd.teleop_points), 2) as avg_teleop_points,
  ROUND(AVG(sd.endgame_points), 2) as avg_endgame_points,
  ROUND(AVG(sd.final_score), 2) as avg_total_score,
  ROUND(AVG(sd.defense_rating), 2) as avg_defense_rating,
  MAX(sd.created_at) as last_match_date
FROM teams t
LEFT JOIN scouting_data sd ON t.team_number = sd.team_number
GROUP BY t.team_number, t.team_name;

-- Grant permissions on the view
GRANT SELECT ON team_statistics TO authenticated;

-- Create a function to get team performance summary
CREATE OR REPLACE FUNCTION get_team_performance(team_num INTEGER)
RETURNS TABLE (
  team_number INTEGER,
  team_name TEXT,
  total_matches BIGINT,
  avg_autonomous_points NUMERIC,
  avg_teleop_points NUMERIC,
  avg_endgame_points NUMERIC,
  avg_total_score NUMERIC,
  avg_defense_rating NUMERIC,
  best_score INTEGER,
  worst_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.team_number,
    t.team_name,
    COUNT(sd.id) as total_matches,
    ROUND(AVG(sd.autonomous_points), 2) as avg_autonomous_points,
    ROUND(AVG(sd.teleop_points), 2) as avg_teleop_points,
    ROUND(AVG(sd.endgame_points), 2) as avg_endgame_points,
    ROUND(AVG(sd.final_score), 2) as avg_total_score,
    ROUND(AVG(sd.defense_rating), 2) as avg_defense_rating,
    MAX(sd.final_score) as best_score,
    MIN(sd.final_score) as worst_score
  FROM teams t
  LEFT JOIN scouting_data sd ON t.team_number = sd.team_number
  WHERE t.team_number = team_num
  GROUP BY t.team_number, t.team_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_team_performance(INTEGER) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Avalanche 2025 Database setup completed successfully!';
  RAISE NOTICE 'Tables created: users, accounts, sessions, verification_tokens, teams, matches, scouting_data';
  RAISE NOTICE 'Sample data inserted for testing';
  RAISE NOTICE 'Row Level Security enabled with appropriate policies';
  RAISE NOTICE 'Views and functions created for data analysis';
END $$;
