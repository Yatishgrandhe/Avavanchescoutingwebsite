import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PickList, PickListTeam } from '@/lib/types';
import { PICKLIST_BLOCKED_ADMIN_USER_IDS } from '@/lib/constants';
import { getOrgCurrentEvent } from '@/lib/org-app-config';
import { getEventTeamStats } from '@/lib/server/event-team-stats';

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
  res.setHeader('Cache-Control', 'private, no-store');
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

        const currentEvent = await getOrgCurrentEvent(supabaseAdmin, profile.organization_id);
        // Default to the active event; old lists remain stored and can be requested explicitly.
        if (!event_key && req.query.scope !== 'all') query = query.eq('event_key', currentEvent.eventKey || '__no_active_event__');
        const { data: pickLists, error } = await query;

        if (error) {
          console.error('Error fetching pick lists:', error);
          return res.status(500).json({ error: 'Failed to fetch pick lists' });
        }

        const enrichedPickLists = await Promise.all(
          (pickLists || []).map((pl) => enrichPickListWithStats(supabaseAdmin, pl))
        );

        const { data: savedEvents, error: eventsError } = await supabaseAdmin.from('pick_lists').select('event_key').eq('organization_id', profile.organization_id);
        if (eventsError) throw eventsError;
        res.status(200).json({ pickLists: enrichedPickLists, currentEvent, events: Array.from(new Set([currentEvent.eventKey, ...(savedEvents || []).map((r) => r.event_key)].filter(Boolean))) });
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
          const validatedTeams = teams.map((team: any, index: number) => ({
          team_number: team.team_number,
          team_name: team.team_name,
          pick_order: team.pick_order || index + 1,
          notes: team.notes || '',
        }));
        updateData.teams = validatedTeams;
      }


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

// Enrichment uses this list's organization and event, never the global statistics view.
async function enrichPickListWithStats(db: SupabaseClient, pickList: any): Promise<PickList> {
  const eventStats = await getEventTeamStats(db, pickList.organization_id, pickList.event_key);
  const byTeam = new Map(eventStats.map((stat) => [stat.team_number, stat]));
  return { ...pickList, teams: (pickList.teams || []).map((team: PickListTeam) => {
    const stats = byTeam.get(team.team_number);
    return { ...team, stats: stats || undefined, robot_image_url: stats?.robot_image_url || null };
  }) };
}
