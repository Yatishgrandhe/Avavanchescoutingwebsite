# Avalanche Scouting Platform - Complete Setup Guide

## 🎯 Overview
This guide will help you set up the complete Avalanche Scouting Platform with Supabase integration, Discord OAuth, and match data loading capabilities.

## 📋 Prerequisites
- Node.js 18+ installed
- Supabase account
- Discord Developer account
- The Blue Alliance API key (optional)

## 🚀 Quick Setup

### 1. Environment Variables
Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret_key

# Discord OAuth Configuration
DISCORD_CLIENT_ID=1410224475592720499
DISCORD_CLIENT_SECRET=z5hdVYza8753QdjB0FBmyNtSTfYxTiH3

# The Blue Alliance API (optional)
TBA_API_KEY=your_tba_api_key
```

### 2. Database Setup with Supabase MCP

Run the following SQL commands in your Supabase SQL Editor:

#### Step 1: Create Tables
```sql
-- Create the 'teams' table
CREATE TABLE IF NOT EXISTS public.teams (
  team_number INT PRIMARY KEY,
  team_name TEXT NOT NULL,
  team_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the 'matches' table
CREATE TABLE IF NOT EXISTS public.matches (
  match_id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  match_number INT NOT NULL,
  red_teams INT[],
  blue_teams INT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the 'scouting_data' table
CREATE TABLE IF NOT EXISTS public.scouting_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT REFERENCES public.matches(match_id) ON DELETE CASCADE,
  team_number INT REFERENCES public.teams(team_number) ON DELETE CASCADE,
  alliance_color TEXT CHECK (alliance_color IN ('red', 'blue')) NOT NULL,
  autonomous_points INT DEFAULT 0,
  teleop_points INT DEFAULT 0,
  endgame_points INT DEFAULT 0,
  final_score INT DEFAULT 0,
  notes JSONB DEFAULT '{}'::jsonb,
  defense_rating INT DEFAULT 0 CHECK (defense_rating >= 0 AND defense_rating <= 10),
  comments TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Step 2: Enable Row Level Security
```sql
-- Enable RLS for all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read teams" ON public.teams
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert teams" ON public.teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read matches" ON public.matches
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert matches" ON public.matches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Scouts can read all scouting data" ON public.scouting_data
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Scouts can insert own scouting data" ON public.scouting_data
  FOR INSERT WITH CHECK (auth.uid() = scout_id);

CREATE POLICY "Scouts can update own scouting data" ON public.scouting_data
  FOR UPDATE USING (auth.uid() = scout_id);

CREATE POLICY "Scouts can delete own scouting data" ON public.scouting_data
  FOR DELETE USING (auth.uid() = scout_id);
```

#### Step 3: Create Views and Functions
```sql
-- Create team statistics view
CREATE OR REPLACE VIEW public.team_statistics AS
SELECT
    t.team_number,
    t.team_name,
    COUNT(sd.id) AS total_matches,
    ROUND(AVG(sd.autonomous_points)::numeric, 2) AS avg_autonomous_points,
    ROUND(AVG(sd.teleop_points)::numeric, 2) AS avg_teleop_points,
    ROUND(AVG(sd.endgame_points)::numeric, 2) AS avg_endgame_points,
    ROUND(AVG(sd.final_score)::numeric, 2) AS avg_total_score,
    ROUND(AVG(sd.defense_rating)::numeric, 2) AS avg_defense_rating,
    MAX(sd.created_at) AS last_match_date
FROM
    public.teams t
LEFT JOIN
    public.scouting_data sd ON t.team_number = sd.team_number
GROUP BY
    t.team_number, t.team_name
ORDER BY
    t.team_number;

-- Grant access to the view
ALTER VIEW public.team_statistics OWNER TO postgres;
GRANT SELECT ON public.team_statistics TO authenticated;
```

#### Step 4: Insert Sample Data
```sql
-- Insert sample teams
INSERT INTO public.teams (team_number, team_name, team_color)
VALUES
  (1234, 'Test Team Alpha', 'blue'),
  (5678, 'Test Team Beta', 'red'),
  (9012, 'Test Team Gamma', 'blue'),
  (3456, 'Team Delta', 'red'),
  (7890, 'Team Epsilon', 'blue'),
  (2468, 'Team Zeta', 'red')
ON CONFLICT (team_number) DO NOTHING;

-- Insert sample matches
INSERT INTO public.matches (match_id, event_key, match_number, red_teams, blue_teams)
VALUES
  ('2025test_qm1', '2025test', 1, ARRAY[5678, 3456, 2468], ARRAY[1234, 9012, 7890]),
  ('2025test_qm2', '2025test', 2, ARRAY[1234, 3456, 7890], ARRAY[5678, 9012, 2468]),
  ('2025test_qm3', '2025test', 3, ARRAY[9012, 2468, 7890], ARRAY[1234, 5678, 3456]),
  ('2025test_qm4', '2025test', 4, ARRAY[1234, 5678, 2468], ARRAY[9012, 3456, 7890])
ON CONFLICT (match_id) DO NOTHING;
```

### 3. Load Match Data from TBA

Use the `/api/load-match-data` endpoint to load real match data:

```bash
curl -X POST http://localhost:3001/api/load-match-data \
  -H "Content-Type: application/json" \
  -d '{
    "eventKey": "2025mabos",
    "apiKey": "your_tba_api_key"
  }'
```

### 4. Start Development Server

```bash
npm run dev
```

## 🎨 Features Implemented

### ✅ Beautiful Sign-in Page
- Avalanche-themed design with animated background
- Discord OAuth integration
- Professional styling with glassmorphism effects
- Smooth animations and transitions

### ✅ Avalanche Branding Throughout
- Logo integration using `image.png`
- Consistent "Avalanche Scouting" branding
- Professional color scheme (blue gradients)
- Enhanced typography with Inter font

### ✅ Match Data Integration
- API to load match data from The Blue Alliance
- Supabase integration for storing teams and matches
- Dynamic team selection based on match data
- Alliance color assignment (red/blue)

### ✅ Enhanced Scouting Forms
- Match and team selection from database
- Real-time score calculation
- Smooth form transitions
- Professional UI with animations

### ✅ Better Fonts & Animations
- Inter font family for modern typography
- JetBrains Mono for code elements
- Framer Motion animations throughout
- Smooth transitions and hover effects

## 🔧 API Endpoints

### `/api/matches`
- `GET`: Fetch all matches with team data
- `POST`: Create new match (manual entry)

### `/api/load-match-data`
- `POST`: Load match data from TBA API
- Requires: `eventKey`, optional `apiKey`

### `/api/scouting_data`
- `GET`: Fetch scouting data for analysis
- `POST`: Submit new scouting data

### `/api/teams`
- `GET`: Fetch team information
- `POST`: Create/update team data

## 🎯 Usage

1. **Sign in** with Discord OAuth
2. **Load match data** using the TBA API integration
3. **Select matches and teams** from the scouting form
4. **Fill out scouting data** with real-time scoring
5. **View analysis** of team performance

## 🚀 Deployment

For production deployment:

1. Update environment variables for production
2. Set `NEXTAUTH_URL` to your production domain
3. Update Discord OAuth redirect URI
4. Deploy to Vercel or your preferred platform

## 🎉 Result

You now have a fully functional, beautifully designed Avalanche Scouting Platform with:
- Professional Avalanche branding
- Discord OAuth authentication
- Supabase database integration
- Real-time match data loading
- Enhanced UI with smooth animations
- Modern typography and design

The platform is ready for competitive FRC scouting with a professional, modern interface that reflects the Avalanche Robotics brand!
