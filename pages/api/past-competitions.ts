import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  // Create Supabase client with service role key for server-side operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get the authorization header
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

  if (req.method === 'GET') {
    try {
      const { id, competition_key, year } = req.query;

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

        // Get scouting data for this competition
        const { data: scoutingData, error: scoutingError } = await supabaseAdmin
          .from('past_scouting_data')
          .select('*')
          .eq('competition_id', id as string);

        // Get pit scouting data for this competition
        const { data: pitScoutingData, error: pitScoutingError } = await supabaseAdmin
          .from('past_pit_scouting_data')
          .select('*')
          .eq('competition_id', id as string);

        // Get pick lists for this competition
        const { data: pickLists, error: pickListsError } = await supabaseAdmin
          .from('past_pick_lists')
          .select('*')
          .eq('competition_id', id as string);

        res.status(200).json({
          competition,
          teams: teams || [],
          matches: matches || [],
          scoutingData: scoutingData || [],
          pitScoutingData: pitScoutingData || [],
          pickLists: pickLists || []
        });
      } else {
        // Get all competitions with optional filtering
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

        res.status(200).json({ competitions: competitions || [] });
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
