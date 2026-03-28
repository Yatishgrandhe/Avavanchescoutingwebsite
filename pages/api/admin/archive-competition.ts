import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Check admin role and organization
  const { data: user } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const orgId = user.organization_id;
  if (!orgId) {
    res.status(400).json({ error: 'User is not in an organization' });
    return;
  }

  try {
    // 1. Get current competition info from app_config for this org
    const { data: configRows } = await supabase
      .from('app_config')
      .select('key, value')
      .eq('organization_id', orgId)
      .in('key', ['current_event_key', 'current_event_name']);

    const configMap: Record<string, string> = {};
    (configRows || []).forEach(r => configMap[r.key] = r.value);

    const eventKey = configMap.current_event_key;
    const eventName = configMap.current_event_name;

    if (!eventKey || !eventName) {
      res.status(400).json({ error: 'No current competition set to archive' });
      return;
    }

    // 2. Create past_competitions entry
    const { data: pastComp, error: compErr } = await supabase
      .from('past_competitions')
      .insert({
        competition_name: eventName,
        competition_key: eventKey,
        competition_year: new Date().getFullYear(), // Defaulting to current year
        organization_id: orgId,
        migrated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (compErr || !pastComp) {
      console.error('Archive: Failed to create past_competitions', compErr);
      res.status(500).json({ error: 'Failed to create archive entry' });
      return;
    }

    const competitionId = pastComp.id;

    // 3. Move Scouting Data
    // Join matches to filter by eventKey (current competition) for matches in this org
    const { data: scoutingRecords } = await supabase
      .from('scouting_data')
      .select('*, matches!inner(event_key)')
      .eq('organization_id', orgId)
      .eq('matches.event_key', eventKey);

    if (scoutingRecords && scoutingRecords.length > 0) {
      const pastScouting = scoutingRecords.map(r => {
        const { matches, ...rest } = r;
        return {
          ...rest,
          competition_id: competitionId,
          organization_id: orgId
        };
      });
      await supabase.from('past_scouting_data').insert(pastScouting);
      
      // Delete from current
      const scoutIds = scoutingRecords.map(r => r.id);
      await supabase.from('scouting_data').delete().in('id', scoutIds).eq('organization_id', orgId);
    }

    // 4. Move Pit Scouting Data
    const { data: pitRecords } = await supabase
      .from('pit_scouting_data')
      .select('*')
      .eq('organization_id', orgId);

    if (pitRecords && pitRecords.length > 0) {
      const pastPit = pitRecords.map(r => ({
        ...r,
        competition_id: competitionId,
        organization_id: orgId
      }));
      await supabase.from('past_pit_scouting_data').insert(pastPit);
      
      // Delete from current
      const pitIds = pitRecords.map(r => r.id);
      await supabase.from('pit_scouting_data').delete().in('id', pitIds).eq('organization_id', orgId);
    }

    // 5. Move Matches
    const { data: matchRecords } = await supabase
      .from('matches')
      .select('*')
      .eq('organization_id', orgId)
      .eq('event_key', eventKey);

    if (matchRecords && matchRecords.length > 0) {
      const pastMatches = matchRecords.map(r => ({
        ...r,
        competition_id: competitionId,
        organization_id: orgId
      }));
      await supabase.from('past_matches').insert(pastMatches);
      
      // Delete from current
      const matchIds = matchRecords.map(r => r.match_id);
      await supabase.from('matches').delete().in('match_id', matchIds).eq('organization_id', orgId);
    }

    // 6. Move Teams (snapshot for the competition)
    const { data: teamRecords } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', orgId);

    if (teamRecords && teamRecords.length > 0) {
      const pastTeams = teamRecords.map(r => ({
        team_number: r.team_number,
        team_name: r.team_name,
        team_color: r.team_color,
        epa: r.epa,
        endgame_epa: r.endgame_epa,
        competition_id: competitionId,
        organization_id: orgId
      }));
      await supabase.from('past_teams').insert(pastTeams);
      
      // Note: We don't delete teams from current, but we may want to reset their stats?
      // For now, let's just keep them in current too as it's a team directory.
    }

    // 7. Move Pick Lists
    const { data: pickLists } = await supabase
      .from('pick_lists')
      .select('*')
      .eq('organization_id', orgId)
      .eq('event_key', eventKey);

    if (pickLists && pickLists.length > 0) {
      const pastPickLists = pickLists.map(r => ({
        ...r,
        competition_id: competitionId,
        organization_id: orgId
      }));
      await supabase.from('past_pick_lists').insert(pastPickLists);
      
      // Delete from current
      const plIds = pickLists.map(r => r.id);
      await supabase.from('pick_lists').delete().in('id', plIds).eq('organization_id', orgId);
    }

    // 8. Reset app_config for this org
    await supabase.from('app_config').delete().eq('organization_id', orgId).in('key', ['current_event_key', 'current_event_name']);

    res.status(200).json({ success: true, message: 'Competition archived successfully', competitionId });
  } catch (error) {
    console.error('Archive ERROR:', error);
    res.status(500).json({ error: 'Internal server error during archiving' });
  }
}
