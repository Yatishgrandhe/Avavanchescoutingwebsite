import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
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
      .in('key', ['current_event_key', 'current_event_name']);

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

    let effectiveEventKey = configEventKey;
    if (effectiveEventKey) {
      const countForConfig = (orgMatchRows || []).filter((m) => m.event_key === effectiveEventKey).length;
      if (countForConfig === 0 && dominant) {
        effectiveEventKey = dominant;
      }
    } else if (dominant) {
      effectiveEventKey = dominant;
    }

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

    const competitionYear = competitionYearFromEventKey(effectiveEventKey);

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
    const { data: scoutingRecords } = await supabase
      .from('scouting_data')
      .select('*, matches!inner(event_key)')
      .eq('organization_id', orgId)
      .eq('matches.event_key', effectiveEventKey);

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

      const scoutIds = scoutingRecords.map((r) => r.id);
      await supabase.from('scouting_data').delete().in('id', scoutIds).eq('organization_id', orgId);
    }

    // 4. Move Pit Scouting Data — only rows linked to this event via event_team_roster (same scope as analysis pages)
    const { data: pitRecords } = await supabase
      .from('pit_scouting_data')
      .select('*, roster:event_team_roster!inner(event_key)')
      .eq('organization_id', orgId)
      .eq('roster.event_key', effectiveEventKey);

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

      const pitIds = pitRecords.map((r) => r.id);
      await supabase.from('pit_scouting_data').delete().in('id', pitIds).eq('organization_id', orgId);
    }

    // 5. Move Matches for this event
    const { data: matchRecords } = await supabase
      .from('matches')
      .select('*')
      .eq('organization_id', orgId)
      .eq('event_key', effectiveEventKey);

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

      const matchIds = matchRecords.map((r) => r.match_id);
      await supabase.from('matches').delete().in('match_id', matchIds).eq('organization_id', orgId);
    }

    // 6. Move Teams — snapshot only teams registered for this event (roster), else derive from this event's matches
    const { data: rosterRows } = await supabase
      .from('event_team_roster')
      .select('team_number')
      .eq('organization_id', orgId)
      .eq('event_key', effectiveEventKey);

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

    let teamQuery = supabase.from('teams').select('*').eq('organization_id', orgId);
    if (teamNumbersForEvent.length > 0) {
      teamQuery = teamQuery.in('team_number', teamNumbersForEvent);
    } else {
      // No roster/match-derived teams for this event — do not snapshot every team on the org
      teamQuery = teamQuery.eq('team_number', -1);
    }

    const { data: teamRecords } = await teamQuery;

    if (teamRecords && teamRecords.length > 0) {
      const pastTeams = teamRecords.map((r) => ({
        team_number: r.team_number,
        team_name: r.team_name,
        team_color: r.team_color,
        epa: r.epa,
        endgame_epa: r.endgame_epa,
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

    // 7. Move Pick Lists for this event, then wipe all live pick lists for the org
    const { data: pickLists } = await supabase
      .from('pick_lists')
      .select('*')
      .eq('organization_id', orgId)
      .eq('event_key', effectiveEventKey);

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

    await supabase.from('pick_lists').delete().eq('organization_id', orgId);

    // 8. Clear live roster & schedules for this org (snapshot already in past_*)
    await supabase.from('users').update({ team_number: null }).eq('organization_id', orgId);

    await supabase
      .from('teams')
      .update({ organization_id: null, epa: 0, endgame_epa: 0 })
      .eq('organization_id', orgId);

    await supabase.from('matches').delete().eq('organization_id', orgId);

    await supabase.from('scout_names').delete().eq('organization_id', orgId);

    await supabase.from('event_team_roster').delete().eq('organization_id', orgId);

    // 9. Clear all app_config for this org so nothing points at a stale competition
    await supabase.from('app_config').delete().eq('organization_id', orgId);

    res.status(200).json({ success: true, message: 'Competition archived successfully', competitionId });
  } catch (error) {
    console.error('Archive ERROR:', error);
    res.status(500).json({ error: 'Internal server error during archiving' });
  }
}
