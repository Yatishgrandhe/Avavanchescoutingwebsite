import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TBAEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  district?: {
    abbreviation: string;
    display_name: string;
  };
  city: string;
  state_prov: string;
  country: string;
  start_date: string;
  end_date: string;
  year: number;
}

interface TBAMatch {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: {
      team_keys: string[];
      score: number;
    };
    blue: {
      team_keys: string[];
      score: number;
    };
  };
  winning_alliance: string;
  event_key: string;
  time: number;
  actual_time: number;
  predicted_time: number;
  post_result_time: number;
  score_breakdown?: any;
}

interface TBATeam {
  key: string;
  team_number: number;
  nickname: string;
  name: string;
  city: string;
  state_prov: string;
  country: string;
  address: string;
  postal_code: string;
  gmaps_place_id: string;
  gmaps_url: string;
  lat: number;
  lng: number;
  location_name: string;
  website: string;
  rookie_year: number;
  motto: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { eventKey, apiKey } = req.body;

  if (!eventKey) {
    return res.status(400).json({ error: 'Event key is required' });
  }

  try {
    // Fetch event data from TBA
    const eventResponse = await fetch(
      `https://www.thebluealliance.com/api/v3/event/${eventKey}`,
      {
        headers: {
          'X-TBA-Auth-Key': apiKey || process.env.TBA_API_KEY || '',
        },
      }
    );

    if (!eventResponse.ok) {
      throw new Error(`TBA API error: ${eventResponse.status}`);
    }

    const eventData: TBAEvent = await eventResponse.json();

    // Fetch matches for the event
    const matchesResponse = await fetch(
      `https://www.thebluealliance.com/api/v3/event/${eventKey}/matches`,
      {
        headers: {
          'X-TBA-Auth-Key': apiKey || process.env.TBA_API_KEY || '',
        },
      }
    );

    if (!matchesResponse.ok) {
      throw new Error(`TBA API error: ${matchesResponse.status}`);
    }

    const matchesData: TBAMatch[] = await matchesResponse.json();

    // Fetch teams for the event
    const teamsResponse = await fetch(
      `https://www.thebluealliance.com/api/v3/event/${eventKey}/teams`,
      {
        headers: {
          'X-TBA-Auth-Key': apiKey || process.env.TBA_API_KEY || '',
        },
      }
    );

    if (!teamsResponse.ok) {
      throw new Error(`TBA API error: ${teamsResponse.status}`);
    }

    const teamsData: TBATeam[] = await teamsResponse.json();

    // Insert teams into Supabase
    const teamInserts = teamsData.map(team => ({
      team_number: team.team_number,
      team_name: team.nickname || team.name,
      team_color: null, // Will be determined by match data
    }));

    const { error: teamsError } = await supabase
      .from('teams')
      .upsert(teamInserts, { onConflict: 'team_number' });

    if (teamsError) {
      console.error('Error inserting teams:', teamsError);
      return res.status(500).json({ error: 'Failed to insert teams' });
    }

    // Insert matches into Supabase
    const matchInserts = matchesData.map(match => {
      const redTeams = match.alliances.red.team_keys.map(key => 
        parseInt(key.replace('frc', ''))
      );
      const blueTeams = match.alliances.blue.team_keys.map(key => 
        parseInt(key.replace('frc', ''))
      );

      return {
        match_id: match.key,
        event_key: match.event_key,
        match_number: match.match_number,
        red_teams: redTeams,
        blue_teams: blueTeams,
      };
    });

    const { error: matchesError } = await supabase
      .from('matches')
      .upsert(matchInserts, { onConflict: 'match_id' });

    if (matchesError) {
      console.error('Error inserting matches:', matchesError);
      return res.status(500).json({ error: 'Failed to insert matches' });
    }

    // Update team colors based on match data
    for (const match of matchesData) {
      const redTeams = match.alliances.red.team_keys.map(key => 
        parseInt(key.replace('frc', ''))
      );
      const blueTeams = match.alliances.blue.team_keys.map(key => 
        parseInt(key.replace('frc', ''))
      );

      // Update red teams
      if (redTeams.length > 0) {
        await supabase
          .from('teams')
          .update({ team_color: 'red' })
          .in('team_number', redTeams);
      }

      // Update blue teams
      if (blueTeams.length > 0) {
        await supabase
          .from('teams')
          .update({ team_color: 'blue' })
          .in('team_number', blueTeams);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully loaded ${teamsData.length} teams and ${matchesData.length} matches for ${eventData.name}`,
      data: {
        event: eventData,
        teamsCount: teamsData.length,
        matchesCount: matchesData.length,
      },
    });

  } catch (error) {
    console.error('Error loading match data:', error);
    res.status(500).json({ 
      error: 'Failed to load match data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
