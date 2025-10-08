import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { PickList, PickListTeam } from '@/lib/types';

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
      const { id, event_key } = req.query;

      if (id) {
        // Get specific pick list
        const { data: pickList, error } = await supabaseAdmin
          .from('pick_lists')
          .select('*')
          .eq('id', id as string)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching pick list:', error);
          return res.status(404).json({ error: 'Pick list not found' });
        }

        // Enrich teams with stats
        const enrichedPickList = await enrichPickListWithStats(pickList);
        res.status(200).json(enrichedPickList);
      } else {
        // Get all pick lists for user
        let query = supabaseAdmin
          .from('pick_lists')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (event_key) {
          query = query.eq('event_key', event_key as string);
        }

        const { data: pickLists, error } = await query;

        if (error) {
          console.error('Error fetching pick lists:', error);
          return res.status(500).json({ error: 'Failed to fetch pick lists' });
        }

        // Enrich each pick list with stats
        const enrichedPickLists = await Promise.all(
          (pickLists || []).map(enrichPickListWithStats)
        );

        res.status(200).json({ pickLists: enrichedPickLists });
      }
    } catch (error) {
      console.error('Error fetching pick lists:', error);
      res.status(500).json({ error: 'Failed to fetch pick lists' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, event_key, teams } = req.body;

      if (!name || !teams) {
        return res.status(400).json({ error: 'Name and teams are required' });
      }

      // Validate teams data
      const validatedTeams = teams.map((team: any, index: number) => ({
        team_number: team.team_number,
        team_name: team.team_name,
        pick_order: team.pick_order || index + 1,
        notes: team.notes || '',
      }));

      const pickListData = {
        user_id: user.id,
        name,
        event_key: event_key || '2025test',
        teams: validatedTeams,
      };

      const { data: pickList, error } = await supabaseAdmin
        .from('pick_lists')
        .insert(pickListData)
        .select()
        .single();

      if (error) {
        console.error('Error creating pick list:', error);
        return res.status(500).json({ error: 'Failed to create pick list' });
      }

      const enrichedPickList = await enrichPickListWithStats(pickList);
      res.status(201).json(enrichedPickList);
    } catch (error) {
      console.error('Error creating pick list:', error);
      res.status(500).json({ error: 'Failed to create pick list' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, name, teams } = req.body;

      console.log('PUT request received:', { id, name, teams: teams?.length || 0 });

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (teams !== undefined) {
        console.log('Processing teams:', teams);
        const validatedTeams = teams.map((team: any, index: number) => ({
          team_number: team.team_number,
          team_name: team.team_name,
          pick_order: team.pick_order || index + 1,
          notes: team.notes || '',
        }));
        updateData.teams = validatedTeams;
        console.log('Validated teams:', validatedTeams);
      }

      console.log('Update data:', updateData);

      const { data: pickList, error } = await supabaseAdmin
        .from('pick_lists')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating pick list:', error);
        return res.status(500).json({ error: 'Failed to update pick list', details: error.message });
      }

      console.log('Updated pick list:', pickList);
      const enrichedPickList = await enrichPickListWithStats(pickList);
      res.status(200).json(enrichedPickList);
    } catch (error) {
      console.error('Error updating pick list:', error);
      res.status(500).json({ error: 'Failed to update pick list', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { error } = await supabaseAdmin
        .from('pick_lists')
        .delete()
        .eq('id', id as string)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting pick list:', error);
        return res.status(500).json({ error: 'Failed to delete pick list' });
      }

      res.status(200).json({ message: 'Pick list deleted successfully' });
    } catch (error) {
      console.error('Error deleting pick list:', error);
      res.status(500).json({ error: 'Failed to delete pick list' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Helper function to enrich pick list teams with stats
async function enrichPickListWithStats(pickList: any): Promise<PickList> {
  const teams = pickList.teams || [];
  
  const enrichedTeams = await Promise.all(
    teams.map(async (team: PickListTeam) => {
      try {
        // Get team stats from the team_statistics view
        const { data: stats, error } = await supabase
          .from('team_statistics')
          .select('*')
          .eq('team_number', team.team_number)
          .single();

        if (error || !stats) {
          console.warn(`No stats found for team ${team.team_number}`);
          return team;
        }

        return {
          ...team,
          stats: {
            team_number: stats.team_number,
            team_name: stats.team_name,
            total_matches: stats.match_count || 0,
            avg_autonomous_points: parseFloat(stats.avg_autonomous_points) || 0,
            avg_teleop_points: parseFloat(stats.avg_teleop_points) || 0,
            avg_endgame_points: parseFloat(stats.avg_endgame_points) || 0,
            avg_total_score: parseFloat(stats.avg_final_score) || 0,
            avg_defense_rating: parseFloat(stats.avg_defense_rating) || 0,
            win_rate: 0, // Calculate this if needed
            consistency_score: 0, // Calculate this if needed
          },
        };
      } catch (error) {
        console.error(`Error enriching team ${team.team_number}:`, error);
        return team;
      }
    })
  );

  return {
    ...pickList,
    teams: enrichedTeams,
  };
}
