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

type PastCompetitionRow = {
  id: string;
  organization_id: string;
  competition_key: string;
  competition_year: number;
  competition_name?: string;
  [key: string]: unknown;
};

function seeAllOrgsPastFromQuery(q: NextApiRequest['query']): boolean {
  return q.see_all_orgs === '1' || q.data_scope === 'all';
}

/** When see_all_orgs is off, limit archived rows to the viewer org (or guest reference org); fallback to the opened row by id. */
function scopePastArchiveRows(opts: {
  groupRows: PastCompetitionRow[];
  seeAllOrgsPast: boolean;
  viewer: ViewerContext;
  singleIdHint?: string;
}): PastCompetitionRow[] {
  const { groupRows, seeAllOrgsPast, viewer, singleIdHint } = opts;
  if (seeAllOrgsPast || groupRows.length === 0) return groupRows;

  if (!viewer.isGuest && viewer.organizationId) {
    const filtered = groupRows.filter((r) => r.organization_id === viewer.organizationId);
    if (filtered.length > 0) return filtered;
    if (singleIdHint) {
      const one = groupRows.filter((r) => r.id === singleIdHint);
      if (one.length > 0) return one;
    }
    return groupRows;
  }

  if (viewer.isGuest) {
    const gid = dataScopeOrgId(viewer);
    if (!gid) return groupRows;
    const filtered = groupRows.filter((r) => r.organization_id === gid);
    if (filtered.length > 0) return filtered;
    if (singleIdHint) {
      const one = groupRows.filter((r) => r.id === singleIdHint);
      if (one.length > 0) return one;
    }
    return groupRows;
  }

  return groupRows;
}

function pickRandomRow<T>(rows: T[]): T | null {
  if (!rows.length) return null;
  const idx = Math.floor(Math.random() * rows.length);
  return rows[idx] ?? null;
}

function mapPitRowsToTeams(
  pitRows: Record<string, unknown>[],
  teamNumbers: number[]
): Record<string, unknown>[] {
  if (teamNumbers.length === 0 || pitRows.length === 0) return [];

  const rowsByTeam = new Map<number, Record<string, unknown>[]>();
  for (const row of pitRows) {
    const teamNum = Number((row as { team_number?: unknown }).team_number);
    if (!Number.isFinite(teamNum)) continue;
    if (!rowsByTeam.has(teamNum)) rowsByTeam.set(teamNum, []);
    rowsByTeam.get(teamNum)!.push(row);
  }

  return teamNumbers
    .map((teamNumber) => {
      const directRows = rowsByTeam.get(teamNumber) || [];
      if (directRows.length > 0) {
        return {
          ...directRows[0],
          team_number: teamNumber,
          is_team_specific: true,
          is_fallback: false,
        };
      }

      const fallback = pickRandomRow(pitRows);
      if (!fallback) return null;
      return {
        ...fallback,
        team_number: teamNumber,
        is_team_specific: false,
        is_fallback: true,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];
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
        let pitScoutingData: Record<string, unknown>[] = [];
        if (teamNumArr.length > 0) {
          if (pitAllOrgs) {
            const { data: pitRows } = await supabaseAdmin
              .from('pit_scouting_data')
              .select('*')
              .in('team_number', teamNumArr)
              .order('created_at', { ascending: false });
            pitScoutingData = (pitRows || []) as Record<string, unknown>[];
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
              pitScoutingData = (pitRows || []) as Record<string, unknown>[];
            }
          }
        }
        const normalizedPitScoutingData = mapPitRowsToTeams(pitScoutingData, teamNumArr);

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
          pitScoutingData: normalizedPitScoutingData,
          pickLists: [],
        });
      }

      const scopeOrgId = effectiveFilterOrgId(viewer, queryOrgId);

      // --- Detail view by id OR competition_key ---
      if (id || competition_key) {
        const seeAllOrgsPast = seeAllOrgsPastFromQuery(req.query);
        let anchor: PastCompetitionRow | null = null;
        let compError: unknown = null;

        if (id) {
          const { data, error } = await supabaseAdmin
            .from('past_competitions')
            .select('*')
            .eq('id', id as string)
            .single();
          anchor = (data as PastCompetitionRow | null) ?? null;
          compError = error;
        } else if (competition_key) {
          let q = supabaseAdmin
            .from('past_competitions')
            .select('*')
            .eq('competition_key', competition_key as string);
          if (year) {
            q = q.eq('competition_year', parseInt(year as string, 10));
          }
          const { data, error } = await q;
          compError = error;
          if (data && data.length > 0) {
            anchor = data[0] as PastCompetitionRow;
          }
        }

        if (compError || !anchor) {
          console.error('Error fetching competition:', compError);
          return res.status(404).json({ error: 'Competition not found' });
        }

        const { data: groupData, error: groupErr } = await supabaseAdmin
          .from('past_competitions')
          .select('*')
          .eq('competition_key', anchor.competition_key)
          .eq('competition_year', anchor.competition_year);

        if (groupErr) {
          console.error('past_competitions group:', groupErr);
          return res.status(500).json({ error: 'Failed to load competition group' });
        }

        const groupRows = (groupData || []) as PastCompetitionRow[];
        const singleIdHint = typeof id === 'string' ? id : undefined;
        const scopedRows = scopePastArchiveRows({
          groupRows,
          seeAllOrgsPast,
          viewer,
          singleIdHint,
        });

        let competition: Record<string, unknown> = { ...scopedRows[0] };
        const orgIds = Array.from(new Set(scopedRows.map((r) => r.organization_id).filter(Boolean)));
        const compIds = scopedRows.map((r) => r.id);
        if (orgIds.length > 1) {
          competition = { ...competition, is_global: true };
        }

        // Guests must have a valid scope if it's not global; logged-in users can view any org's competition.
        if (viewer.isGuest && !competition.is_global && competition.organization_id !== scopeOrgId) {
          return res.status(404).json({ error: 'Competition not found' });
        }

        // Enrich with org name(s)
        const { data: orgRows } = await supabaseAdmin
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        
        const orgNames = (orgRows || []).map(o => (o as { name: string }).name);
        const enrichedCompetition = { 
          ...competition, 
          organization_name: orgNames.length > 1 ? `Shared by ${orgNames.join(', ')}` : (orgNames[0] ?? null),
          contributing_organizations: orgRows || []
        };

        const { data: teams, error: teamsError } = await supabaseAdmin
          .from('past_teams')
          .select('*')
          .in('competition_id', compIds)
          .order('team_number');

        if (teamsError) {
          console.error('past_teams:', teamsError);
        }

        // Unique teams across all orgs if global
        const uniqueTeamsMap = new Map<number, any>();
        (teams || []).forEach(t => {
          if (!uniqueTeamsMap.has(t.team_number)) {
            uniqueTeamsMap.set(t.team_number, t);
          }
        });
        const teamNumArr = Array.from(uniqueTeamsMap.keys());
        const teamsList = Array.from(uniqueTeamsMap.values());

        const { data: historicalData } = await supabaseAdmin
          .from('past_scouting_data')
          .select('team_number, notes')
          .in('organization_id', orgIds)
          .in('team_number', teamNumArr)
          .not('competition_id', 'in', `(${compIds.join(',')})`);

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

        const updatedTeams = teamsList.map((t) => {
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
          .in('competition_id', compIds)
          .order('match_number');

        if (matchesError) {
          console.error('past_matches:', matchesError);
        }

        // Unique matches across all orgs
        const uniqueMatchesMap = new Map<number, any>();
        (matches || []).forEach(m => {
          if (!uniqueMatchesMap.has(m.match_number)) {
            uniqueMatchesMap.set(m.match_number, m);
          }
        });
        const matchesList = Array.from(uniqueMatchesMap.values()).sort((a, b) => a.match_number - b.match_number);

        // Scope by competition_id only: each archived row belongs to one org; filtering again by
        // organization_id dropped rows when that column was null or inconsistent across imports.
        const { data: scoutingData, error: scoutingError } = await supabaseAdmin
          .from('past_scouting_data')
          .select('*')
          .in('competition_id', compIds);

        if (scoutingError) {
          console.error('past_scouting_data:', scoutingError);
        }

        const { data: pitScoutingDataRaw = [] } = await supabaseAdmin
          .from('past_pit_scouting_data')
          .select('*')
          .in('competition_id', compIds);
        
        const pitScoutingData = mapPitRowsToTeams(
          (pitScoutingDataRaw || []) as Record<string, unknown>[],
          teamNumArr
        );

        let pickLists: any[] = [];
        if (!viewer.isGuest) {
          const { data: pickData } = await supabaseAdmin
            .from('past_pick_lists')
            .select('*')
            .in('competition_id', compIds);
          pickLists = pickData || [];
        }

        return res.status(200).json({
          competition: {
            ...enrichedCompetition,
            total_teams: teamsList.length,
            total_matches: matchesList.length,
          },
          teams: updatedTeams,
          matches: matchesList,
          scoutingData: scoutingData || [],
          pitScoutingData,
          pickLists,
        });
      }

      // --- List view: group competitions by key + year, showing multi-org badges ---
      let query = supabaseAdmin
        .from('past_competitions')
        .select('*')
        .order('competition_year', { ascending: false })
        .order('competition_name', { ascending: true });

      if (competition_key) {
        query = query.eq('competition_key', competition_key as string);
      }

      if (year) {
        query = query.eq('competition_year', parseInt(year as string, 10));
      }

      const { data: allCompetitions, error } = await query;

      if (error) {
        console.error('Error fetching competitions:', error);
        return res.status(500).json({ error: 'Failed to fetch competitions' });
      }

      // Group past competitions by [key, year]
      const groupedCompMap = new Map<string, any>();
      for (const c of allCompetitions || []) {
        const groupKey = `${c.competition_key}-${c.competition_year}`;
        if (!groupedCompMap.has(groupKey)) {
          groupedCompMap.set(groupKey, { 
            ...c, 
            contributing_org_ids: [c.organization_id],
            contributing_comp_ids: [c.id]
          });
        } else {
          const existing = groupedCompMap.get(groupKey);
          existing.contributing_org_ids.push(c.organization_id);
          existing.contributing_comp_ids.push(c.id);
        }
      }
      const groupedCompetitions = Array.from(groupedCompMap.values());

      // Current-event orgs (live cards): needed so org names resolve for teams that have never archived.
      const { data: currentEventRows } = await supabaseAdmin
        .from('app_config')
        .select('organization_id, key, value')
        .in('key', ['current_event_key', 'current_event_name']);

      const currentByOrg = new Map<string, { eventKey: string; eventName: string }>();
      for (const row of currentEventRows || []) {
        const r = row as { organization_id: string; key: string; value: string };
        if (!r.organization_id) continue;
        const current = currentByOrg.get(r.organization_id) || { eventKey: '', eventName: '' };
        if (r.key === 'current_event_key') current.eventKey = (r.value || '').trim();
        if (r.key === 'current_event_name') current.eventName = (r.value || '').trim();
        currentByOrg.set(r.organization_id, current);
      }

      const liveCandidates = Array.from(currentByOrg.entries())
        .filter(([, cfg]) => cfg.eventKey)
        .map(([organization_id, cfg]) => ({
          organization_id,
          eventKey: cfg.eventKey,
          eventName: cfg.eventName,
        }));

      // Fetch org names for past competitions AND any org with a current event (so live badges list every team).
      const pastOrgIds = Array.from(new Set((allCompetitions || []).map((c) => c.organization_id).filter(Boolean)));
      const liveOrgIds = Array.from(new Set(liveCandidates.map((c) => c.organization_id).filter(Boolean)));
      const orgIdsForNameLookup = Array.from(new Set([...pastOrgIds, ...liveOrgIds]));

      const orgNameMap = new Map<string, string>();
      if (orgIdsForNameLookup.length > 0) {
        const { data: orgRows } = await supabaseAdmin
          .from('organizations')
          .select('id, name')
          .in('id', orgIdsForNameLookup);
        for (const o of orgRows || []) {
          orgNameMap.set((o as { id: string; name: string }).id, (o as { id: string; name: string }).name);
        }
      }

      // Fetch team and match counts for all contributing competition IDs
      const allCompIds = (allCompetitions || []).map(c => c.id);
      const teamCountsByCompId = new Map<string, Set<number>>();
      const matchCountsByCompId = new Map<string, Set<number>>();
      
      if (allCompIds.length > 0) {
        const [teamsRes, matchesRes] = await Promise.all([
          supabaseAdmin
            .from('past_teams')
            .select('competition_id, team_number')
            .in('competition_id', allCompIds),
          supabaseAdmin
            .from('past_matches')
            .select('competition_id, match_number')
            .in('competition_id', allCompIds),
        ]);
        
        (teamsRes.data || []).forEach(row => {
          const cid = row.competition_id;
          if (!teamCountsByCompId.has(cid)) teamCountsByCompId.set(cid, new Set());
          teamCountsByCompId.get(cid)!.add(row.team_number);
        });
        (matchesRes.data || []).forEach(row => {
          const cid = row.competition_id;
          if (!matchCountsByCompId.has(cid)) matchCountsByCompId.set(cid, new Set());
          matchCountsByCompId.get(cid)!.add(row.match_number);
        });
      }

      const competitionsForResponse = groupedCompetitions.map((c) => {
        const uniqueOrgIds = Array.from(
          new Set((c.contributing_org_ids as string[]).filter((oid): oid is string => Boolean(oid)))
        );
        const orgNames = uniqueOrgIds.map((oid) => orgNameMap.get(oid)).filter((n): n is string => Boolean(n));

        // Aggregate unique teams and matches across all contributing competitions in this group
        const groupTeamSet = new Set<number>();
        const groupMatchSet = new Set<number>();
        c.contributing_comp_ids.forEach((cid: string) => {
          const teamSet = teamCountsByCompId.get(cid);
          if (teamSet) teamSet.forEach((tn) => groupTeamSet.add(tn));
          const matchSet = matchCountsByCompId.get(cid);
          if (matchSet) matchSet.forEach((mn) => groupMatchSet.add(mn));
        });

        const isMulti = uniqueOrgIds.length > 1;

        return {
          ...c,
          organization_name: isMulti ? 'Multiple teams' : (orgNames[0] ?? null),
          contributing_organization_names: orgNames,
          is_multi_org: isMulti,
          total_teams: groupTeamSet.size,
          total_matches: groupMatchSet.size,
        };
      });

      // --- Group Live Events by event_key ---
      // Group live candidates by eventKey
      const groupedLiveMap = new Map<string, any>();
      for (const cand of liveCandidates) {
        if (!groupedLiveMap.has(cand.eventKey)) {
          groupedLiveMap.set(cand.eventKey, {
            event_key: cand.eventKey,
            competition_name: cand.eventName || cand.eventKey,
            org_ids: [cand.organization_id]
          });
        } else {
          groupedLiveMap.get(cand.eventKey).org_ids.push(cand.organization_id);
        }
      }

      const liveFull: any[] = [];
      for (const [evtKey, info] of Array.from(groupedLiveMap.entries())) {
        const orgIds = info.org_ids as string[];
        
        // Fetch matches and scouting count for all orgs in this live event
        const { data: eventMatchesRaw } = await supabaseAdmin
          .from('matches')
          .select('match_id, event_key, red_teams, blue_teams, organization_id')
          .in('organization_id', orgIds)
          .eq('event_key', evtKey);

        const eventMatches = (eventMatchesRaw || []) as any[];
        const matchIds = eventMatches.map((m) => m.match_id);
        const teamSet = new Set<number>();
        eventMatches.forEach((m) => {
          (m.red_teams || []).forEach((t: number) => teamSet.add(t));
          (m.blue_teams || []).forEach((t: number) => teamSet.add(t));
        });

        const { count: scoutingCount } = await supabaseAdmin
          .from('scouting_data')
          .select('*', { count: 'exact', head: true })
          .in('organization_id', orgIds)
          .in('match_id', matchIds);

        const orgNames = Array.from(
          new Set(orgIds.map((oid) => orgNameMap.get(oid)).filter((n): n is string => Boolean(n)))
        );
        const isMultiLive = orgIds.length > 1;

        liveFull.push({
          event_key: evtKey,
          competition_name: info.competition_name,
          total_teams: teamSet.size,
          total_matches: new Set(eventMatches.map(m => m.match_id)).size,
          scouting_count: scoutingCount ?? 0,
          organization_name: isMultiLive ? 'Multiple teams' : (orgNames[0] ?? null),
          contributing_organization_names: orgNames,
          is_multi_org: isMultiLive,
        });
      }

      const liveForResponse = liveFull;

      return res.status(200).json({
        competitions: competitionsForResponse,
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
