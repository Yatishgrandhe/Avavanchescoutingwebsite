import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { event_key } = req.query;

      let query = supabase
        .from('matches')
        .select(`
          *,
          teams:red_teams(team_number, team_name, team_color),
          teams:blue_teams(team_number, team_name, team_color)
        `)
        .order('match_number', { ascending: true });

      if (event_key) {
        query = query.eq('event_key', event_key);
      }

      const { data: matches, error } = await query;

      if (error) {
        console.error('Error fetching matches:', error);
        return res.status(500).json({ error: 'Failed to fetch matches' });
      }

      // Transform the data to include team details
      const transformedMatches = matches?.map(match => {
        // Get team details for red alliance
        const redTeams = match.red_teams?.map((teamNumber: number) => {
          const team = match.teams?.find((t: any) => t.team_number === teamNumber);
          return {
            team_number: teamNumber,
            team_name: team?.team_name || `Team ${teamNumber}`,
            team_color: 'red'
          };
        }) || [];

        // Get team details for blue alliance
        const blueTeams = match.blue_teams?.map((teamNumber: number) => {
          const team = match.teams?.find((t: any) => t.team_number === teamNumber);
          return {
            team_number: teamNumber,
            team_name: team?.team_name || `Team ${teamNumber}`,
            team_color: 'blue'
          };
        }) || [];

        return {
          match_id: match.match_id,
          event_key: match.match_id,
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