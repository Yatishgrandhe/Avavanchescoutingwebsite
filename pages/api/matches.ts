import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { event_key } = req.query;

      // First, fetch all matches
      let matchesQuery = supabase
        .from('matches')
        .select('*')
        .order('match_number', { ascending: true });

      if (event_key) {
        matchesQuery = matchesQuery.eq('event_key', event_key);
      }

      const { data: matches, error: matchesError } = await matchesQuery;

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        return res.status(500).json({ error: 'Failed to fetch matches' });
      }

      if (!matches || matches.length === 0) {
        return res.status(200).json({ matches: [] });
      }

      // Get all unique team numbers from all matches
      const allTeamNumbers = new Set<number>();
      matches.forEach(match => {
        if (Array.isArray(match.red_teams)) {
          match.red_teams.forEach((team: number) => allTeamNumbers.add(team));
        }
        if (Array.isArray(match.blue_teams)) {
          match.blue_teams.forEach((team: number) => allTeamNumbers.add(team));
        }
      });

      // Fetch team details for all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('team_number, team_name, team_color')
        .in('team_number', Array.from(allTeamNumbers));

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return res.status(500).json({ error: 'Failed to fetch teams' });
      }

      // Create a map for quick team lookup
      const teamMap = new Map();
      teams?.forEach(team => {
        teamMap.set(team.team_number, team);
      });

      // Transform the data to include team details
      const transformedMatches = matches.map(match => {
        // Get team details for red alliance
        const redTeams = Array.isArray(match.red_teams) ? match.red_teams.map((teamNumber: number) => {
          const team = teamMap.get(teamNumber);
          return {
            team_number: teamNumber,
            team_name: team?.team_name || `Team ${teamNumber}`,
            team_color: 'red'
          };
        }) : [];

        // Get team details for blue alliance
        const blueTeams = Array.isArray(match.blue_teams) ? match.blue_teams.map((teamNumber: number) => {
          const team = teamMap.get(teamNumber);
          return {
            team_number: teamNumber,
            team_name: team?.team_name || `Team ${teamNumber}`,
            team_color: 'blue'
          };
        }) : [];

        return {
          match_id: match.match_id,
          event_key: match.event_key,
          match_number: match.match_number,
          red_teams: redTeams,
          blue_teams: blueTeams,
          created_at: match.created_at
        };
      });

      res.status(200).json({ matches: transformedMatches });

    } catch (error) {
      console.error('Error in matches API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // Handle creating a new match (for manual entry)
    try {
      const { event_key, match_number, red_teams, blue_teams } = req.body;

      if (!event_key || !match_number || !red_teams || !blue_teams) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const match_id = `${event_key}_qm${match_number}`;

      const { data, error } = await supabase
        .from('matches')
        .insert({
          match_id,
          event_key,
          match_number,
          red_teams,
          blue_teams,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating match:', error);
        return res.status(500).json({ error: 'Failed to create match' });
      }

      res.status(201).json({ match: data });

    } catch (error) {
      console.error('Error creating match:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}