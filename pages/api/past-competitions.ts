import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Create Supabase client with service role key for server-side operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // For GET requests, allow public access (no auth required)
  const isGetRequest = req.method === 'GET';

  if (!isGetRequest) {
    // Get the authorization header for non-GET requests
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  if (req.method === 'GET') {
    try {
      // Determine if request is from a guest (unauthenticated) for permission rules
      let isGuest = true;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) isGuest = false;
      }

      const { id, competition_key, year, event_key } = req.query;

      if (event_key && !id) {
        // Live event detail: public, no auth required (for guests to view live data)
        const eventKeyStr = event_key as string;
        const { data: matches, error: matchesErr } = await supabaseAdmin
          .from('matches')
          .select('match_id, event_key, match_number, red_teams, blue_teams')
          .eq('event_key', eventKeyStr)
          .order('match_number');

        if (matchesErr || !matches || matches.length === 0) {
          return res.status(404).json({ error: 'Live event not found or no matches' });
        }

        const matchIds = matches.map((m: { match_id: string }) => m.match_id);
        const teamNumbers = new Set<number>();
        matches.forEach((m: { red_teams?: number[]; blue_teams?: number[] }) => {
          (m.red_teams || []).forEach((t: number) => teamNumbers.add(t));
          (m.blue_teams || []).forEach((t: number) => teamNumbers.add(t));
        });

        const { data: teamRows } = await supabaseAdmin
          .from('teams')
          .select('team_number, team_name')
          .in('team_number', Array.from(teamNumbers));

        const teamMap = new Map((teamRows || []).map((t: { team_number: number; team_name: string }) => [t.team_number, t.team_name]));
        const teams = Array.from(teamNumbers).sort((a, b) => a - b).map(tn => ({
          team_number: tn,
          team_name: teamMap.get(tn) || '',
        }));

        const { data: scoutingData } = await supabaseAdmin
          .from('scouting_data')
          .select('*')
          .in('match_id', matchIds);

        const competition = {
          id: eventKeyStr,
          competition_name: eventKeyStr,
          competition_key: eventKeyStr,
          competition_year: new Date().getFullYear(),
          total_teams: teams.length,
          total_matches: matches.length,
        };

        return res.status(200).json({
          competition,
          teams,
          matches: matches.map((m: { match_id: string; match_number: number; red_teams?: number[]; blue_teams?: number[] }) => ({
            match_id: m.match_id,
            match_number: m.match_number,
            red_teams: m.red_teams || [],
            blue_teams: m.blue_teams || [],
          })),
          scoutingData: scoutingData || [],
          pitScoutingData: [],
          pickLists: [],
        });
      }

      if (id) {
        // Get specific competition with all related data
        const { data: competition, error: compError } = await supabaseAdmin
          .from('past_competitions')
          .select('*')
          .eq('id', id as string)
          .single();

        if (compError) {
          console.error('Error fetching competition:', compError);
          return res.status(404).json({ error: 'Competition not found' });
        }

        // Get teams for this competition
        const { data: teams, error: teamsError } = await supabaseAdmin
          .from('past_teams')
          .select('*')
          .eq('competition_id', id as string)
          .order('team_number');

        // Get matches for this competition
        const { data: matches, error: matchesError } = await supabaseAdmin
          .from('past_matches')
          .select('*')
          .eq('competition_id', id as string)
          .order('match_number');

        // Get scouting data for this competition (match scouting — always allowed)
        const { data: scoutingData, error: scoutingError } = await supabaseAdmin
          .from('past_scouting_data')
          .select('*')
          .eq('competition_id', id as string);

        // Guests see only match scouting data; omit pit and pick lists
        let pitScoutingData: any[] = [];
        let pickLists: any[] = [];
        if (!isGuest) {
          const [pitRes, pickRes] = await Promise.all([
            supabaseAdmin.from('past_pit_scouting_data').select('*').eq('competition_id', id as string),
            supabaseAdmin.from('past_pick_lists').select('*').eq('competition_id', id as string),
          ]);
          pitScoutingData = pitRes.data || [];
          pickLists = pickRes.data || [];
        }

        res.status(200).json({
          competition,
          teams: teams || [],
          matches: matches || [],
          scoutingData: scoutingData || [],
          pitScoutingData,
          pickLists,
        });
      } else {
        // Get all past competitions with optional filtering
        let query = supabaseAdmin
          .from('past_competitions')
          .select('*')
          .order('competition_year', { ascending: false })
          .order('competition_name', { ascending: true });

        if (competition_key) {
          query = query.eq('competition_key', competition_key as string);
        }

        if (year) {
          query = query.eq('competition_year', parseInt(year as string));
        }

        const { data: competitions, error } = await query;

        if (error) {
          console.error('Error fetching competitions:', error);
          return res.status(500).json({ error: 'Failed to fetch competitions' });
        }

        // Build live events: event_keys from matches that are NOT in past_competitions
        const pastKeys = (competitions || []).map((c: { competition_key: string }) => c.competition_key);
        const { data: allMatches, error: matchesErr } = await supabaseAdmin
          .from('matches')
          .select('match_id, event_key, red_teams, blue_teams');

        let live: Array<{
          event_key: string;
          competition_name: string;
          total_teams: number;
          total_matches: number;
          scouting_count: number;
        }> = [];

        if (!matchesErr && allMatches && allMatches.length > 0) {
          const eventKeys = Array.from(new Set((allMatches as { event_key: string }[]).map(m => m.event_key)));
          const liveEventKeys = eventKeys.filter(ek => !pastKeys.includes(ek));

          for (const eventKey of liveEventKeys) {
            const eventMatches = (allMatches as { match_id: string; event_key: string; red_teams: number[]; blue_teams: number[] }[]).filter(m => m.event_key === eventKey);
            const matchIds = eventMatches.map(m => m.match_id);
            const teamSet = new Set<number>();
            eventMatches.forEach(m => {
              (m.red_teams || []).forEach((t: number) => teamSet.add(t));
              (m.blue_teams || []).forEach((t: number) => teamSet.add(t));
            });

            const { count: scoutingCount } = await supabaseAdmin
              .from('scouting_data')
              .select('*', { count: 'exact', head: true })
              .in('match_id', matchIds);

            live.push({
              event_key: eventKey,
              competition_name: eventKey,
              total_teams: teamSet.size,
              total_matches: eventMatches.length,
              scouting_count: scoutingCount ?? 0,
            });
          }
          live.sort((a, b) => (b.scouting_count || 0) - (a.scouting_count || 0));
        }

        // Logged-in users do not see live events; only guests see them
        const liveForResponse = isGuest ? live : [];

        res.status(200).json({
          competitions: competitions || [],
          live: liveForResponse,
        });
      }
    } catch (error) {
      console.error('Error fetching past competitions:', error);
      res.status(500).json({ error: 'Failed to fetch past competitions' });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        competition_name,
        competition_key,
        competition_year,
        competition_location,
        competition_date_start,
        competition_date_end
      } = req.body;

      if (!competition_name || !competition_key || !competition_year) {
        return res.status(400).json({ error: 'Competition name, key, and year are required' });
      }

      const competitionData = {
        competition_name,
        competition_key,
        competition_year,
        competition_location: competition_location || null,
        competition_date_start: competition_date_start || null,
        competition_date_end: competition_date_end || null,
      };

      const { data: competition, error } = await supabaseAdmin
        .from('past_competitions')
        .insert(competitionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating competition:', error);
        return res.status(500).json({ error: 'Failed to create competition' });
      }

      res.status(201).json(competition);
    } catch (error) {
      console.error('Error creating competition:', error);
      res.status(500).json({ error: 'Failed to create competition' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { data: competition, error } = await supabaseAdmin
        .from('past_competitions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating competition:', error);
        return res.status(500).json({ error: 'Failed to update competition' });
      }

      res.status(200).json(competition);
    } catch (error) {
      console.error('Error updating competition:', error);
      res.status(500).json({ error: 'Failed to update competition' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { error } = await supabaseAdmin
        .from('past_competitions')
        .delete()
        .eq('id', id as string);

      if (error) {
        console.error('Error deleting competition:', error);
        return res.status(500).json({ error: 'Failed to delete competition' });
      }

      res.status(200).json({ message: 'Competition deleted successfully' });
    } catch (error) {
      console.error('Error deleting competition:', error);
      res.status(500).json({ error: 'Failed to delete competition' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
