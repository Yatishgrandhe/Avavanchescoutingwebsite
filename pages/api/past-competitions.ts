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

/** Pick an org that has pit rows for these teams (prefer viewer org when it has data). */
async function resolvePitSourceOrgId(
  admin: SupabaseClient,
  teamNumbers: number[],
  viewerOrgId: string | null,
  isGuest: boolean
): Promise<string | null> {
  if (teamNumbers.length === 0) return null;
  const preferred = isGuest ? null : viewerOrgId;
  if (preferred) {
    const { count } = await admin
      .from('pit_scouting_data')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', preferred)
      .in('team_number', teamNumbers);
    if ((count ?? 0) > 0) return preferred;
  }
  const { data: rows } = await admin
    .from('pit_scouting_data')
    .select('organization_id')
    .in('team_number', teamNumbers)
    .limit(2000);
  const freq = new Map<string, number>();
  for (const r of rows || []) {
    const oid = (r as { organization_id: string | null }).organization_id;
    if (oid) freq.set(oid, (freq.get(oid) || 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  freq.forEach((n, oid) => {
    if (n > bestN) {
      bestN = n;
      best = oid;
    }
  });
  return best;
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

      // Live event by event_key: default scope is one org (guests → reference org). see_all_orgs=1 merges schedules.
      // Pit: prefers viewer org; otherwise first org with pit rows for these teams.
      if (event_key && !id) {
        const eventKeyStr = event_key as string;
        const seeAllOrgs =
          req.query.see_all_orgs === '1' ||
          req.query.data_scope === 'all';

        const matchOrgFilter = seeAllOrgs ? null : effectiveFilterOrgId(viewer, queryOrgId);

        if (!seeAllOrgs && !matchOrgFilter) {
          return res.status(400).json({
            error: 'Organization required for scoped competition data (or pass see_all_orgs=1 for all organizations)',
          });
        }

        const pitAllOrgs = req.query.pit_all_orgs === '1' || req.query.pit_scope === 'all';

        let matchQuery = supabaseAdmin
          .from('matches')
          .select('match_id, event_key, match_number, red_teams, blue_teams, organization_id')
          .eq('event_key', eventKeyStr);
        if (matchOrgFilter) {
          matchQuery = matchQuery.eq('organization_id', matchOrgFilter);
        }
        const { data: matchesRaw, error: matchesErr } = await matchQuery;

        if (matchesErr) {
          return res.status(500).json({ error: 'Failed to load matches' });
        }

        let matches = [...(matchesRaw || [])].sort(
          (a: { match_number?: number }, b: { match_number?: number }) =>
            (a.match_number ?? 0) - (b.match_number ?? 0)
        );

        if (!matchOrgFilter) {
          const byKey = new Map<string, (typeof matches)[0]>();
          for (const m of matches) {
            const mid = (m as { match_id: string }).match_id;
            if (!byKey.has(mid)) byKey.set(mid, m);
          }
          matches = Array.from(byKey.values()).sort(
            (a: { match_number?: number }, b: { match_number?: number }) =>
              (a.match_number ?? 0) - (b.match_number ?? 0)
          );
        }

        if (matches.length === 0) {
          return res.status(404).json({ error: 'Live event not found or no matches' });
        }

        const matchIds = matches.map((m: { match_id: string }) => m.match_id);
        const teamNumbers = new Set<number>();
        matches.forEach((m: { red_teams?: number[]; blue_teams?: number[] }) => {
          (m.red_teams || []).forEach((t: number) => teamNumbers.add(t));
          (m.blue_teams || []).forEach((t: number) => teamNumbers.add(t));
        });
        const teamNumList = Array.from(teamNumbers);

        const teamMap = new Map<number, string>();
        if (matchOrgFilter && teamNumList.length > 0) {
          const { data: rosterRows } = await supabaseAdmin
            .from('event_team_roster')
            .select('team_number, team_name')
            .eq('organization_id', matchOrgFilter)
            .eq('event_key', eventKeyStr)
            .in('team_number', teamNumList);
          for (const t of rosterRows || []) {
            const row = t as { team_number: number; team_name: string };
            teamMap.set(row.team_number, row.team_name);
          }
        }
        const missingForRoster = teamNumList.filter((n) => !teamMap.has(n));
        if (missingForRoster.length > 0) {
          let teamQuery = supabaseAdmin
            .from('teams')
            .select('team_number, team_name')
            .in('team_number', missingForRoster);
          if (matchOrgFilter) {
            teamQuery = teamQuery.eq('organization_id', matchOrgFilter);
          }
          const { data: teamRows } = await teamQuery;
          for (const t of teamRows || []) {
            const row = t as { team_number: number; team_name: string };
            if (!teamMap.has(row.team_number)) {
              teamMap.set(row.team_number, row.team_name);
            }
          }
        }
        for (const n of teamNumList) {
          if (!teamMap.has(n)) teamMap.set(n, `Team ${n}`);
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
          } else {
            const pitOrgResolved = await resolvePitSourceOrgId(
              supabaseAdmin,
              teamNumArr,
              viewer.organizationId,
              viewer.isGuest
            );
            if (pitOrgResolved) {
              const { data: pitRows } = await supabaseAdmin
                .from('pit_scouting_data')
                .select('*')
                .eq('organization_id', pitOrgResolved)
                .in('team_number', teamNumArr)
                .order('created_at', { ascending: false });
              pitScoutingData = pitRows || [];
            }
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

      // --- Detail view by id ---
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

        // Guests must have a valid scope; logged-in users can view any org's competition.
        if (viewer.isGuest && competition.organization_id !== scopeOrgId) {
          return res.status(404).json({ error: 'Competition not found' });
        }

        // Enrich with org name
        const { data: orgRow } = await supabaseAdmin
          .from('organizations')
          .select('name')
          .eq('id', competition.organization_id)
          .maybeSingle();
        const enrichedCompetition = { ...competition, organization_name: orgRow?.name ?? null };

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
            ...enrichedCompetition,
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

      // --- List view: show ALL orgs' past competitions ---
      let query = supabaseAdmin
        .from('past_competitions')
        .select('*')
        .order('competition_year', { ascending: false })
        .order('competition_name', { ascending: true });

      // Guests: restrict to reference org only
      if (viewer.isGuest && scopeOrgId) {
        query = (query as any).eq('organization_id', scopeOrgId);
      }

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

      // Fetch org names for all competitions in batch
      const allOrgIds = Array.from(new Set((competitions || []).map((c) => c.organization_id).filter(Boolean)));
      const orgNameMap = new Map<string, string>();
      if (allOrgIds.length > 0) {
        const { data: orgRows } = await supabaseAdmin
          .from('organizations')
          .select('id, name')
          .in('id', allOrgIds);
        for (const o of orgRows || []) {
          orgNameMap.set((o as { id: string; name: string }).id, (o as { id: string; name: string }).name);
        }
      }

      const compIds = (competitions || []).map((c) => c.id);
      const teamCountMap = new Map<string, number>();
      const matchCountMap = new Map<string, number>();
      if (compIds.length > 0) {
        const [teamsCountRes, matchesCountRes] = await Promise.all([
          supabaseAdmin
            .from('past_teams')
            .select('competition_id')
            .in('competition_id', compIds),
          supabaseAdmin
            .from('past_matches')
            .select('competition_id')
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
        organization_name: orgNameMap.get(c.organization_id) ?? null,
        total_teams: teamCountMap.get(c.id) ?? 0,
        total_matches: matchCountMap.get(c.id) ?? 0,
      }));

      // Live events: scope to viewer's own org so they see their own current events
      const pastKeys = competitionsWithCounts.map((c) => c.competition_key);
      let allMatchesQuery = supabaseAdmin
        .from('matches')
        .select('match_id, event_key, red_teams, blue_teams, organization_id');
      if (scopeOrgId) {
        allMatchesQuery = allMatchesQuery.eq('organization_id', scopeOrgId);
      }
      const { data: allMatches, error: matchesErr } = await allMatchesQuery;

      let live: Array<{
        event_key: string;
        competition_name: string;
        total_teams: number;
        total_matches: number;
        scouting_count: number;
        organization_name: string | null;
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
            organization_id: string;
          }[]).filter((m) => m.event_key === eventKey);
          const matchIds = eventMatches.map((m) => m.match_id);
          const teamSet = new Set<number>();
          eventMatches.forEach((m) => {
            (m.red_teams || []).forEach((t: number) => teamSet.add(t));
            (m.blue_teams || []).forEach((t: number) => teamSet.add(t));
          });

          let scoutingQuery = supabaseAdmin
            .from('scouting_data')
            .select('*', { count: 'exact', head: true })
            .in('match_id', matchIds);
          if (scopeOrgId) scoutingQuery = scoutingQuery.eq('organization_id', scopeOrgId);

          const { count: scoutingCount } = await scoutingQuery;

          const liveOrgId = eventMatches[0]?.organization_id ?? null;
          live.push({
            event_key: eventKey,
            competition_name: eventKey,
            total_teams: teamSet.size,
            total_matches: eventMatches.length,
            scouting_count: scoutingCount ?? 0,
            organization_name: liveOrgId ? (orgNameMap.get(liveOrgId) ?? null) : null,
          });
        }
        live.sort((a, b) => (b.scouting_count || 0) - (a.scouting_count || 0));
      }

      // Show live events to all users (guests only see reference-org data, logged-in see their own org).
      const liveForResponse = live;

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
