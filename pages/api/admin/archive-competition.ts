import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { readAllRows } from '@/lib/server/event-team-stats';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function competitionYearFromEventKey(eventKey: string): number {
  const m = eventKey.match(/^(\d{4})/);
  if (m) return parseInt(m[1], 10);
  return new Date().getFullYear();
}

function dominantEventKey(rows: { event_key: string }[] | null | undefined): string | null {
  const freq = new Map<string, number>();
  for (const r of rows || []) {
    const k = (r.event_key || '').trim();
    if (!k) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}

/** Avoid PK / FK conflicts when copying live rows into past_* tables. */
function stripForPastInsert<T extends Record<string, unknown>>(
  row: T,
  extra: Record<string, unknown>
): Record<string, unknown> {
  const { id: _id, matches: _m, roster: _r, ...rest } = row as T & {
    id?: unknown;
    matches?: unknown;
    roster?: unknown;
  };
  return { ...rest, ...extra };
}

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
      .in('key', ['current_event_key', 'current_event_name', 'current_event_year']);

    const configMap: Record<string, string> = {};
    (configRows || []).forEach(r => configMap[r.key] = r.value);

    const keyFromDb = (configMap.current_event_key || '').trim();
    const nameFromDb = (configMap.current_event_name || '').trim();

    const { data: orgMatchRows } = await supabase
      .from('matches')
      .select('event_key')
      .eq('organization_id', orgId);

    const dominant = dominantEventKey(orgMatchRows);

    const configEventKey = keyFromDb;
    let eventName = nameFromDb;

    // A configured event remains authoritative even before its first match.
    const effectiveEventKey = configEventKey || dominant;

    if (!effectiveEventKey) {
      res.status(400).json({
        error:
          'No competition to archive. Set an event in Team Management or load matches so we can detect the event key.',
      });
      return;
    }

    if (!eventName) {
      eventName = effectiveEventKey;
    }

    const configuredYear = Number(configMap.current_event_year);
    const competitionYear = /^\d{4}/.test(effectiveEventKey) ? competitionYearFromEventKey(effectiveEventKey)
      : Number.isInteger(configuredYear) && configuredYear >= 1992 && configuredYear <= 2100 ? configuredYear : competitionYearFromEventKey(effectiveEventKey);

    // 2. Create past_competitions entry (use live data key so scouting/matches align)
    const { data: pastComp, error: compErr } = await supabase
      .from('past_competitions')
      .insert({
        competition_name: eventName,
        competition_key: effectiveEventKey,
        competition_year: competitionYear,
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

    // 3. Move Scouting Data (matches.event_key must match archived event)
    const matchRecords = await readAllRows((from, to) => supabase.from('matches').select('*').eq('organization_id', orgId).eq('event_key', effectiveEventKey).order('match_id').range(from, to));
    const matchIds = matchRecords.map((r) => r.match_id);
    const scoutingRecords: any[] = [];
    for (let from = 0; from < matchIds.length; from += 100) scoutingRecords.push(...await readAllRows((start, end) => supabase.from('scouting_data').select('*').eq('organization_id', orgId).in('match_id', matchIds.slice(from, from + 100)).order('id').range(start, end)));

    if (scoutingRecords && scoutingRecords.length > 0) {
      const pastScouting = scoutingRecords.map((r) =>
        stripForPastInsert(r as Record<string, unknown>, {
          competition_id: competitionId,
          organization_id: orgId,
        })
      );
      const { error: psErr } = await supabase.from('past_scouting_data').insert(pastScouting);
      if (psErr) {
        console.error('Archive: past_scouting_data insert', psErr);
        await supabase.from('past_competitions').delete().eq('id', competitionId);
        res.status(500).json({ error: 'Failed to archive match scouting data', details: psErr.message });
        return;
      }


    }

    // 4. Move Pit Scouting Data — only rows linked to this event via event_team_roster (same scope as analysis pages)
    const rosterRows = await readAllRows((from, to) => supabase.from('event_team_roster').select('team_number,team_name').eq('organization_id', orgId).eq('event_key', effectiveEventKey).order('team_number').range(from, to));
    const eventTeamNumbers = Array.from(new Set([...rosterRows.map((r) => r.team_number), ...matchRecords.flatMap((r) => [...(r.red_teams || []), ...(r.blue_teams || [])])]));
    const pitRecords: any[] = [];
    for (let from = 0; from < eventTeamNumbers.length; from += 100) pitRecords.push(...await readAllRows((start, end) => supabase.from('pit_scouting_data').select('*').eq('organization_id', orgId).in('team_number', eventTeamNumbers.slice(from, from + 100)).order('id').range(start, end)));

    if (pitRecords && pitRecords.length > 0) {
      const pastPit = pitRecords.map((r) =>
        stripForPastInsert(r as Record<string, unknown>, {
          competition_id: competitionId,
          organization_id: orgId,
        })
      );
      const { error: ppErr } = await supabase.from('past_pit_scouting_data').insert(pastPit);
      if (ppErr) {
        console.error('Archive: past_pit_scouting_data insert', ppErr);
        res.status(500).json({ error: 'Failed to archive pit scouting data', details: ppErr.message });
        return;
      }


    }

    // 5. Move Matches for this event

    if (matchRecords && matchRecords.length > 0) {
      const pastMatches = matchRecords.map((r) =>
        stripForPastInsert(r as Record<string, unknown>, {
          competition_id: competitionId,
          organization_id: orgId,
        })
      );
      const { error: pmErr } = await supabase.from('past_matches').insert(pastMatches);
      if (pmErr) {
        console.error('Archive: past_matches insert', pmErr);
        res.status(500).json({ error: 'Failed to archive matches', details: pmErr.message });
        return;
      }


    }

    // 6. Move Teams — snapshot only teams registered for this event (roster), else derive from this event's matches
    let teamNumbersForEvent = (rosterRows || []).map((r) => r.team_number);

    if (teamNumbersForEvent.length === 0 && matchRecords && matchRecords.length > 0) {
      const fromMatches = new Set<number>();
      for (const m of matchRecords) {
        const row = m as { red_teams?: number[]; blue_teams?: number[] };
        (row.red_teams || []).forEach((t) => fromMatches.add(t));
        (row.blue_teams || []).forEach((t) => fromMatches.add(t));
      }
      teamNumbersForEvent = Array.from(fromMatches);
    }

    // Team metadata is shared; the event roster above determines which teams belong in this archive.
    let teamQuery = supabase.from('teams').select('*');
    if (teamNumbersForEvent.length > 0) {
      teamQuery = teamQuery.in('team_number', teamNumbersForEvent);
    } else {
      // No roster/match-derived teams for this event — do not snapshot every team on the org
      teamQuery = teamQuery.eq('team_number', -1);
    }

    const { data: teamRecords, error: teamError } = await teamQuery;
    if (teamError) throw teamError;

    if (teamNumbersForEvent.length > 0) {
      const teamMap = new Map((teamRecords || []).map((r) => [r.team_number, r]));
      const rosterNames = new Map((rosterRows || []).map((r) => [r.team_number, r.team_name]));
      const pastTeams = teamNumbersForEvent.map((number) => ({
        team_number: number,
        team_name: rosterNames.get(number) || teamMap.get(number)?.team_name || `Team ${number}`,
        team_color: teamMap.get(number)?.team_color,
        epa: teamMap.get(number)?.epa,
        endgame_epa: teamMap.get(number)?.endgame_epa,
        competition_id: competitionId,
        organization_id: orgId
      }));
      const { error: ptErr } = await supabase.from('past_teams').insert(pastTeams);
      if (ptErr) {
        console.error('Archive: past_teams insert', ptErr);
        res.status(500).json({ error: 'Failed to archive team snapshot', details: ptErr.message });
        return;
      }
    }

    // 7. Snapshot pick lists for this event. Other events remain untouched.
    const pickLists = await readAllRows((from, to) => supabase.from('pick_lists').select('*').eq('organization_id', orgId).eq('event_key', effectiveEventKey).order('id').range(from, to));

    if (pickLists && pickLists.length > 0) {
      const pastPickLists = pickLists.map((r) =>
        stripForPastInsert(r as Record<string, unknown>, {
          competition_id: competitionId,
          organization_id: orgId,
        })
      );
      const { error: plErr } = await supabase.from('past_pick_lists').insert(pastPickLists);
      if (plErr) {
        console.error('Archive: past_pick_lists insert', plErr);
        res.status(500).json({ error: 'Failed to archive pick lists', details: plErr.message });
        return;
      }
    }

    // Robot observations retain their stable event/team identity after live rows are cleared.
    const { error: notesError } = await supabase.from('robot_notes')
      .update({ competition_id: competitionId })
      .eq('organization_id', orgId)
      .eq('event_key', effectiveEventKey)
      .eq('event_year', competitionYear);
    if (notesError) {
      await supabase.from('past_competitions').delete().eq('id', competitionId);
      res.status(500).json({ error: 'Could not preserve robot notes. The event was not archived.' });
      return;
    }

    // Delete only rows successfully copied above. Never wipe another event or shared pit forms.
    for (let from = 0; from < scoutingRecords.length; from += 100) {
      const { error } = await supabase.from('scouting_data').delete().eq('organization_id', orgId).in('id', scoutingRecords.slice(from, from + 100).map((r) => r.id));
      if (error) throw error;
    }
    const { error: listsDeleteError } = await supabase.from('pick_lists').delete().eq('organization_id', orgId).eq('event_key', effectiveEventKey);
    if (listsDeleteError) throw listsDeleteError;
    const { error: matchesDeleteError } = await supabase.from('matches').delete().eq('organization_id', orgId).eq('event_key', effectiveEventKey);
    if (matchesDeleteError) throw matchesDeleteError;
    const { error: rosterDeleteError } = await supabase.from('event_team_roster').delete().eq('organization_id', orgId).eq('event_key', effectiveEventKey);
    if (rosterDeleteError) throw rosterDeleteError;
    const { error: configDeleteError } = await supabase.from('app_config').delete().eq('organization_id', orgId).in('key', ['current_event_key','current_event_name','current_event_year','current_event_source','current_event_team_numbers','current_event_match_ids']);
    if (configDeleteError) throw configDeleteError;

    res.status(200).json({ success: true, message: 'Competition archived successfully', competitionId });
  } catch (error) {
    console.error('Archive ERROR:', error);
    res.status(500).json({ error: 'Internal server error during archiving' });
  }
}
