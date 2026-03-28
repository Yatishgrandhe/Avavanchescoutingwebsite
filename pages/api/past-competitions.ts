import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAutoFuelCount, getTeleopFuelCount, getClimbPoints } from '@/lib/analytics';
import { AVALANCHE_ORG_ID } from '@/lib/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type ViewerContext = {
  isGuest: boolean;
  userId: string | null;
  organizationId: string | null;
  role: string | null;
};

async function resolveViewer(
  admin: SupabaseClient,
  authHeader: string | undefined
): Promise<ViewerContext> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { isGuest: true, userId: null, organizationId: null, role: null };
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    return { isGuest: true, userId: null, organizationId: null, role: null };
  }
  const { data: prof } = await admin
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle();
  return {
    isGuest: false,
    userId: user.id,
    organizationId: prof?.organization_id ?? null,
    role: prof?.role ?? null,
  };
}

/** Org used for list/live/detail: guests → Avalanche only; members → their org. */
function dataScopeOrgId(viewer: ViewerContext): string | null {
  if (viewer.isGuest) {
    return AVALANCHE_ORG_ID;
  }
  return viewer.organizationId;
}

/**
 * For query ?organization_id= — only superadmins may override; everyone else uses their profile org.
 */
function effectiveFilterOrgId(
  viewer: ViewerContext,
  queryOrgId: string | undefined
): string | null {
  const base = dataScopeOrgId(viewer);
  if (queryOrgId && typeof queryOrgId === 'string' && viewer.role === 'superadmin') {
    return queryOrgId;
  }
  return base;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const isGetRequest = req.method === 'GET';

  if (!isGetRequest) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      const viewer = await resolveViewer(supabaseAdmin, authHeader);
      const { id, competition_key, year, event_key, organization_id: queryOrgIdRaw } = req.query;
      const queryOrgId = typeof queryOrgIdRaw === 'string' ? queryOrgIdRaw : undefined;

      // Live event by event_key: runs BEFORE scopeOrgId gate so users without an org can still view
      // aggregated match data. Pit is always org-scoped (Avalanche for guests, viewer org when logged in).
      if (event_key && !id) {
        const eventKeyStr = event_key as string;
        const matchMyOrgOnly =
          req.query.match_my_org_only === '1' ||
          req.query.match_scope === 'org';

        const matchOrgFilter = matchMyOrgOnly ? effectiveFilterOrgId(viewer, queryOrgId) : null;
        if (matchMyOrgOnly && !matchOrgFilter) {
          return res.status(400).json({
            error: 'Organization required when limiting match data to your team (match_my_org_only=1)',
          });
        }

        const pitOrgId = viewer.isGuest ? AVALANCHE_ORG_ID : viewer.organizationId;
        const pitAllOrgs = req.query.pit_all_orgs === '1' || req.query.pit_scope === 'all';

        let matchQuery = supabaseAdmin
          .from('matches')
          .select('match_id, event_key, match_number, red_teams, blue_teams')
          .eq('event_key', eventKeyStr);
        if (matchOrgFilter) {
          matchQuery = matchQuery.eq('organization_id', matchOrgFilter);
        }
        const { data: matchesRaw, error: matchesErr } = await matchQuery;

        const matches = [...(matchesRaw || [])].sort(
          (a: { match_number?: number }, b: { match_number?: number }) =>
            (a.match_number ?? 0) - (b.match_number ?? 0)
        );

        if (matchesErr || matches.length === 0) {
          return res.status(404).json({ error: 'Live event not found or no matches' });
        }

        const matchIds = matches.map((m: { match_id: string }) => m.match_id);
        const teamNumbers = new Set<number>();
        matches.forEach((m: { red_teams?: number[]; blue_teams?: number[] }) => {
          (m.red_teams || []).forEach((t: number) => teamNumbers.add(t));
          (m.blue_teams || []).forEach((t: number) => teamNumbers.add(t));
        });

        let teamQuery = supabaseAdmin
          .from('teams')
          .select('team_number, team_name')
          .in('team_number', Array.from(teamNumbers));
        if (matchOrgFilter) {
          teamQuery = teamQuery.eq('organization_id', matchOrgFilter);
        }
        const { data: teamRows } = await teamQuery;

        const teamMap = new Map<number, string>();
        for (const t of teamRows || []) {
          const row = t as { team_number: number; team_name: string };
          if (!teamMap.has(row.team_number)) {
            teamMap.set(row.team_number, row.team_name);
          }
        }

        let histQuery = supabaseAdmin
          .from('past_scouting_data')
          .select('team_number, notes')
          .in('team_number', Array.from(teamNumbers));
        if (matchOrgFilter) {
          histQuery = histQuery.eq('organization_id', matchOrgFilter);
        }
        const { data: historicalData } = await histQuery;

        const teamScoresMap = new Map<number, number[]>();
        if (historicalData) {
          historicalData.forEach((row) => {
            const autoFuel = getAutoFuelCount(row.notes);
            const teleopFuel = getTeleopFuelCount(row.notes);
            const climbPts = getClimbPoints(row.notes);
            const score = autoFuel + teleopFuel + climbPts;

            const scores = teamScoresMap.get(row.team_number) || [];
            scores.push(score);
            teamScoresMap.set(row.team_number, scores);
          });
        }

        const teams = Array.from(teamNumbers)
          .sort((a, b) => a - b)
          .map((tn) => {
            const pastScores = teamScoresMap.get(tn) || [];
            const starterEpa = pastScores.length > 0 ? pastScores.reduce((a, b) => a + b, 0) / pastScores.length : 0;

            return {
              team_number: tn,
              team_name: teamMap.get(tn) || '',
              starter_epa: Math.round(starterEpa * 10) / 10,
            };
          });

        let scoutQuery = supabaseAdmin.from('scouting_data').select('*').in('match_id', matchIds);
        if (matchOrgFilter) {
          scoutQuery = scoutQuery.eq('organization_id', matchOrgFilter);
        }
        const { data: scoutingData } = await scoutQuery;

        const competition = {
          id: eventKeyStr,
          competition_name: eventKeyStr,
          competition_key: eventKeyStr,
          competition_year: new Date().getFullYear(),
          total_teams: teams.length,
          total_matches: matches.length,
        };

        const teamNumArr = Array.from(teamNumbers);
        let pitScoutingData: unknown[] = [];
        if (teamNumArr.length > 0) {
          if (pitAllOrgs) {
            const { data: pitRows } = await supabaseAdmin
              .from('pit_scouting_data')
              .select('*')
              .in('team_number', teamNumArr)
              .order('created_at', { ascending: false });
            pitScoutingData = pitRows || [];
          } else if (pitOrgId) {
            const { data: pitRows } = await supabaseAdmin
              .from('pit_scouting_data')
              .select('*')
              .eq('organization_id', pitOrgId)
              .in('team_number', teamNumArr)
              .order('created_at', { ascending: false });
            pitScoutingData = pitRows || [];
          }
        }

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
          pitScoutingData: pitScoutingData || [],
          pickLists: [],
        });
      }

      const scopeOrgId = effectiveFilterOrgId(viewer, queryOrgId);

      if (!scopeOrgId) {
        if (id) {
          return res.status(403).json({ error: 'No organization on your account' });
        }
        return res.status(200).json({ competitions: [], live: [] });
      }

      if (id) {
        const { data: competition, error: compError } = await supabaseAdmin
          .from('past_competitions')
          .select('*')
          .eq('id', id as string)
          .single();

        if (compError || !competition) {
          console.error('Error fetching competition:', compError);
          return res.status(404).json({ error: 'Competition not found' });
        }

        if (competition.organization_id !== scopeOrgId) {
          return res.status(404).json({ error: 'Competition not found' });
        }

        const orgId = competition.organization_id as string;

        const { data: teams, error: teamsError } = await supabaseAdmin
          .from('past_teams')
          .select('*')
          .eq('competition_id', id as string)
          .eq('organization_id', orgId)
          .order('team_number');

        if (teamsError) {
          console.error('past_teams:', teamsError);
        }

        const teamNumArr = (teams || []).map((t) => t.team_number);
        const { data: historicalData } = await supabaseAdmin
          .from('past_scouting_data')
          .select('team_number, notes')
          .eq('organization_id', orgId)
          .in('team_number', teamNumArr)
          .neq('competition_id', id as string);

        const teamScoresMap = new Map<number, number[]>();
        if (historicalData) {
          historicalData.forEach((row) => {
            const autoFuel = getAutoFuelCount(row.notes);
            const teleopFuel = getTeleopFuelCount(row.notes);
            const climbPts = getClimbPoints(row.notes);
            const score = autoFuel + teleopFuel + climbPts;

            const scores = teamScoresMap.get(row.team_number) || [];
            scores.push(score);
            teamScoresMap.set(row.team_number, scores);
          });
        }

        const updatedTeams = (teams || []).map((t) => {
          const pastScores = teamScoresMap.get(t.team_number) || [];
          const starterEpa = pastScores.length > 0 ? pastScores.reduce((a, b) => a + b, 0) / pastScores.length : 0;
          return {
            ...t,
            starter_epa: Math.round(starterEpa * 10) / 10,
          };
        });

        const { data: matches, error: matchesError } = await supabaseAdmin
          .from('past_matches')
          .select('*')
          .eq('competition_id', id as string)
          .eq('organization_id', orgId)
          .order('match_number');

        if (matchesError) {
          console.error('past_matches:', matchesError);
        }

        const { data: scoutingData, error: scoutingError } = await supabaseAdmin
          .from('past_scouting_data')
          .select('*')
          .eq('competition_id', id as string)
          .eq('organization_id', orgId);

        if (scoutingError) {
          console.error('past_scouting_data:', scoutingError);
        }

        const { data: pitScoutingData = [] } = await supabaseAdmin
          .from('past_pit_scouting_data')
          .select('*')
          .eq('competition_id', id as string)
          .eq('organization_id', orgId);

        let pickLists: any[] = [];
        if (!viewer.isGuest) {
          const { data: pickData } = await supabaseAdmin
            .from('past_pick_lists')
            .select('*')
            .eq('competition_id', id as string)
            .eq('organization_id', orgId);
          pickLists = pickData || [];
        }

        const teamsList = updatedTeams || [];
        const matchesList = matches || [];
        return res.status(200).json({
          competition: {
            ...competition,
            total_teams: teamsList.length,
            total_matches: matchesList.length,
          },
          teams: teamsList,
          matches: matchesList,
          scoutingData: scoutingData || [],
          pitScoutingData,
          pickLists,
        });
      }

      let query = supabaseAdmin
        .from('past_competitions')
        .select('*')
        .eq('organization_id', scopeOrgId)
        .order('competition_year', { ascending: false })
        .order('competition_name', { ascending: true });

      if (competition_key) {
        query = query.eq('competition_key', competition_key as string);
      }

      if (year) {
        query = query.eq('competition_year', parseInt(year as string, 10));
      }

      const { data: competitions, error } = await query;

      if (error) {
        console.error('Error fetching competitions:', error);
        return res.status(500).json({ error: 'Failed to fetch competitions' });
      }

      const compIds = (competitions || []).map((c) => c.id);
      const teamCountMap = new Map<string, number>();
      const matchCountMap = new Map<string, number>();
      if (compIds.length > 0) {
        const [teamsCountRes, matchesCountRes] = await Promise.all([
          supabaseAdmin
            .from('past_teams')
            .select('competition_id')
            .eq('organization_id', scopeOrgId)
            .in('competition_id', compIds),
          supabaseAdmin
            .from('past_matches')
            .select('competition_id')
            .eq('organization_id', scopeOrgId)
            .in('competition_id', compIds),
        ]);
        for (const row of teamsCountRes.data || []) {
          const cid = (row as { competition_id: string }).competition_id;
          teamCountMap.set(cid, (teamCountMap.get(cid) || 0) + 1);
        }
        for (const row of matchesCountRes.data || []) {
          const cid = (row as { competition_id: string }).competition_id;
          matchCountMap.set(cid, (matchCountMap.get(cid) || 0) + 1);
        }
      }

      const competitionsWithCounts = (competitions || []).map((c) => ({
        ...c,
        total_teams: teamCountMap.get(c.id) ?? 0,
        total_matches: matchCountMap.get(c.id) ?? 0,
      }));

      const pastKeys = competitionsWithCounts.map((c) => c.competition_key);
      const { data: allMatches, error: matchesErr } = await supabaseAdmin
        .from('matches')
        .select('match_id, event_key, red_teams, blue_teams')
        .eq('organization_id', scopeOrgId);

      let live: Array<{
        event_key: string;
        competition_name: string;
        total_teams: number;
        total_matches: number;
        scouting_count: number;
      }> = [];

      if (!matchesErr && allMatches && allMatches.length > 0) {
        const eventKeys = Array.from(new Set((allMatches as { event_key: string }[]).map((m) => m.event_key)));
        const liveEventKeys = eventKeys.filter((ek) => !pastKeys.includes(ek));

        for (const eventKey of liveEventKeys) {
          const eventMatches = (allMatches as {
            match_id: string;
            event_key: string;
            red_teams: number[];
            blue_teams: number[];
          }[]).filter((m) => m.event_key === eventKey);
          const matchIds = eventMatches.map((m) => m.match_id);
          const teamSet = new Set<number>();
          eventMatches.forEach((m) => {
            (m.red_teams || []).forEach((t: number) => teamSet.add(t));
            (m.blue_teams || []).forEach((t: number) => teamSet.add(t));
          });

          const { count: scoutingCount } = await supabaseAdmin
            .from('scouting_data')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', scopeOrgId)
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

      // Guests see org-scoped live blocks; logged-in users use the list for archived only (same as before).
      const liveForResponse = viewer.isGuest ? live : [];

      return res.status(200).json({
        competitions: competitionsWithCounts,
        live: liveForResponse,
      });
    } catch (error) {
      console.error('Error fetching past competitions:', error);
      res.status(500).json({ error: 'Failed to fetch past competitions' });
    }
  } else if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization!;
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('organization_id, role')
        .eq('id', authUser!.id)
        .maybeSingle();

      const orgId = profile?.organization_id;
      if (!orgId) {
        return res.status(400).json({ error: 'Your account is not in an organization' });
      }

      const {
        competition_name,
        competition_key,
        competition_year,
        competition_location,
        competition_date_start,
        competition_date_end,
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
        organization_id: orgId,
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
      const authHeader = req.headers.authorization!;
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('organization_id, role')
        .eq('id', authUser!.id)
        .maybeSingle();

      const orgId = profile?.organization_id;
      if (!orgId) {
        return res.status(400).json({ error: 'Your account is not in an organization' });
      }

      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('past_competitions')
        .select('id, organization_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !existing) {
        return res.status(404).json({ error: 'Competition not found' });
      }

      if (existing.organization_id !== orgId && profile?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const safeUpdate = { ...updateData };
      delete safeUpdate.organization_id;

      const { data: competition, error } = await supabaseAdmin
        .from('past_competitions')
        .update(safeUpdate)
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
      const authHeader = req.headers.authorization!;
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token);

      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('organization_id, role')
        .eq('id', authUser!.id)
        .maybeSingle();

      const orgId = profile?.organization_id;
      if (!orgId) {
        return res.status(400).json({ error: 'Your account is not in an organization' });
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('past_competitions')
        .select('id, organization_id')
        .eq('id', id as string)
        .maybeSingle();

      if (fetchErr || !existing) {
        return res.status(404).json({ error: 'Competition not found' });
      }

      if (existing.organization_id !== orgId && profile?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { error } = await supabaseAdmin.from('past_competitions').delete().eq('id', id as string);

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
