import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PickList, PickListTeam } from '@/lib/types';
import { PICKLIST_BLOCKED_ADMIN_USER_IDS } from '@/lib/constants';
import { getOrgCurrentEvent } from '@/lib/org-app-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type PickListProfile = {
  organization_id: string | null;
  role: string | null;
  can_view_pick_list: boolean | null;
};

async function getPickListProfile(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<PickListProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('organization_id, role, can_view_pick_list')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PickListProfile;
}

function canViewPickLists(p: PickListProfile): boolean {
  return (
    p.role === 'admin' ||
    p.role === 'superadmin' ||
    !!p.can_view_pick_list
  );
}

function canManagePickLists(p: PickListProfile): boolean {
  return p.role === 'admin' || p.role === 'superadmin';
}

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
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (PICKLIST_BLOCKED_ADMIN_USER_IDS.includes(user.id)) {
    res.status(403).json({ error: 'Access to pick lists is not allowed for this account.' });
    return;
  }

  const profile = await getPickListProfile(supabaseAdmin, user.id);
  if (!profile?.organization_id) {
    res.status(403).json({ error: 'No organization assigned. Contact an admin.' });
    return;
  }

  if (req.method === 'GET') {
    try {
      if (!canViewPickLists(profile)) {
        res.status(403).json({ error: 'Pick list access is not enabled for your account.' });
        return;
      }

      const { id, event_key } = req.query;

      if (id) {
        const { data: pickList, error } = await supabaseAdmin
          .from('pick_lists')
          .select('*')
          .eq('id', id as string)
          .eq('organization_id', profile.organization_id)
          .single();

        if (error) {
          console.error('Error fetching pick list:', error);
          return res.status(404).json({ error: 'Pick list not found' });
        }

        const enrichedPickList = await enrichPickListWithStats(supabaseAdmin, pickList);
        res.status(200).json(enrichedPickList);
      } else {
        let query = supabaseAdmin
          .from('pick_lists')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('updated_at', { ascending: false });

        if (event_key) {
          query = query.eq('event_key', event_key as string);
        }

        const { data: pickLists, error } = await query;

        if (error) {
          console.error('Error fetching pick lists:', error);
          return res.status(500).json({ error: 'Failed to fetch pick lists' });
        }

        const enrichedPickLists = await Promise.all(
          (pickLists || []).map((pl) => enrichPickListWithStats(supabaseAdmin, pl))
        );

        res.status(200).json({ pickLists: enrichedPickLists });
      }
    } catch (error) {
      console.error('Error fetching pick lists:', error);
      res.status(500).json({ error: 'Failed to fetch pick lists' });
    }
  } else if (req.method === 'POST') {
    try {
      if (!canManagePickLists(profile)) {
        res.status(403).json({ error: 'Only team admins can create pick lists.' });
        return;
      }

      const { name, event_key, teams } = req.body;

      if (!name || !teams) {
        return res.status(400).json({ error: 'Name and teams are required' });
      }

      const { eventKey: orgEventKey } = await getOrgCurrentEvent(supabaseAdmin, profile.organization_id);
      const resolvedEventKey =
        (typeof event_key === 'string' && event_key.trim()) || orgEventKey;
      if (!resolvedEventKey) {
        return res.status(400).json({
          error: 'No event key. Set your organization competition in Team Management, or pass event_key when creating the pick list.',
        });
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
        organization_id: profile.organization_id,
        name,
        event_key: resolvedEventKey,
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

      const enrichedPickList = await enrichPickListWithStats(supabaseAdmin, pickList);
      res.status(201).json(enrichedPickList);
    } catch (error) {
      console.error('Error creating pick list:', error);
      res.status(500).json({ error: 'Failed to create pick list' });
    }
  } else if (req.method === 'PUT') {
    try {
      if (!canManagePickLists(profile)) {
        res.status(403).json({ error: 'Only team admins can update pick lists.' });
        return;
      }

      const { id, name, teams } = req.body;

      console.log('PUT request received:', { id, name, teams: teams?.length || 0 });

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from('pick_lists')
        .select('id, organization_id')
        .eq('id', id)
        .maybeSingle();

      if (existingError) {
        console.error('Error fetching pick list for update:', existingError);
        return res.status(500).json({ error: 'Failed to verify pick list' });
      }
      if (!existing || existing.organization_id !== profile.organization_id) {
        return res.status(404).json({ error: 'Pick list not found' });
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
        .eq('organization_id', profile.organization_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating pick list:', error);
        return res.status(500).json({ error: 'Failed to update pick list', details: error.message });
      }

      console.log('Updated pick list:', pickList);
      const enrichedPickList = await enrichPickListWithStats(supabaseAdmin, pickList);
      res.status(200).json(enrichedPickList);
    } catch (error) {
      console.error('Error updating pick list:', error);
      res.status(500).json({ error: 'Failed to update pick list', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (!canManagePickLists(profile)) {
        res.status(403).json({ error: 'Only team admins can delete pick lists.' });
        return;
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { error } = await supabaseAdmin
        .from('pick_lists')
        .delete()
        .eq('id', id as string)
        .eq('organization_id', profile.organization_id);

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

// Helper to get one robot image URL per team from pit_scouting_data (latest record with image)
async function getRobotImageUrlsByTeam(
  supabaseAdmin: SupabaseClient,
  teamNumbers: number[],
  organizationId: string | null | undefined
): Promise<Map<number, string>> {
  if (teamNumbers.length === 0) return new Map();
  let q = supabaseAdmin
    .from('pit_scouting_data')
    .select('team_number, robot_image_url, photos, created_at')
    .in('team_number', teamNumbers)
    .order('created_at', { ascending: false });
  if (organizationId) {
    q = q.eq('organization_id', organizationId);
  }
  const { data: rows } = await q;

  const map = new Map<number, string>();
  for (const row of rows || []) {
    if (map.has(row.team_number)) continue;
    const url = (row.robot_image_url && String(row.robot_image_url).trim()) ||
      (Array.isArray(row.photos) && row.photos[0] ? String(row.photos[0]).trim() : '');
    if (url) map.set(row.team_number, url);
  }
  return map;
}

// Helper function to enrich pick list teams with stats and robot image
async function enrichPickListWithStats(
  supabaseAdmin: SupabaseClient,
  pickList: any
): Promise<PickList> {
  const teams = pickList.teams || [];
  const teamNumbers = teams.map((t: PickListTeam) => t.team_number);
  const imageByTeam = await getRobotImageUrlsByTeam(
    supabaseAdmin,
    teamNumbers,
    pickList.organization_id
  );

  const enrichedTeams = await Promise.all(
    teams.map(async (team: PickListTeam) => {
      try {
        // Get team stats from the team_statistics view
        const { data: stats, error } = await supabaseAdmin
          .from('team_statistics')
          .select('*')
          .eq('team_number', team.team_number)
          .single();

        const robot_image_url = imageByTeam.get(team.team_number) || null;
        const { data: tbaMetrics } = await supabaseAdmin
          .from('teams')
          .select('tba_opr, tba_epa, normalized_opr, avg_shooting_time_sec')
          .eq('organization_id', pickList.organization_id)
          .eq('team_number', team.team_number)
          .maybeSingle();

        if (error || !stats) {
          console.warn(`No stats found for team ${team.team_number}`);
          return { ...team, robot_image_url };
        }

        return {
          ...team,
          robot_image_url,
          stats: {
            team_number: stats.team_number,
            team_name: stats.team_name,
            total_matches: stats.match_count || 0,
            avg_autonomous_points: Math.round((parseFloat(stats.avg_autonomous_points) || 0) * 10) / 10,
            avg_teleop_points: Math.round((parseFloat(stats.avg_teleop_points) || 0) * 10) / 10,
            avg_endgame_points: Math.round((parseFloat(stats.avg_endgame_points) || 0) * 10) / 10,
            avg_total_score: Math.round((parseFloat(stats.avg_final_score) || 0) * 10) / 10,
            avg_defense_rating: Math.round((parseFloat(stats.avg_defense_rating) || 0) * 10) / 10,
            win_rate: 0,
            consistency_score: 0,
            tba_opr: Math.round((parseFloat(tbaMetrics?.tba_opr) || 0) * 10) / 10,
            tba_epa: Math.round((parseFloat(tbaMetrics?.tba_epa) || 0) * 10) / 10,
            normalized_opr: Math.round((parseFloat(tbaMetrics?.normalized_opr) || 0) * 10) / 10,
            avg_shooting_time_sec: Math.round((parseFloat(tbaMetrics?.avg_shooting_time_sec) || 0) * 10) / 10,
          },
        };
      } catch (error) {
        console.error(`Error enriching team ${team.team_number}:`, error);
        return { ...team, robot_image_url: imageByTeam.get(team.team_number) || null };
      }
    })
  );

  return {
    ...pickList,
    teams: enrichedTeams,
  };
}
