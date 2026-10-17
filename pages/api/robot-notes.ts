import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { getOrgCurrentEvent } from '@/lib/org-app-config';
import { eventKeyFromName } from '@/lib/event-key';
import { summarizeRobotNotes, type NotesEvent, type RobotNote } from '@/lib/robot-notes';

const NOTE_FIELDS = 'id,event_key,event_year,team_number,match_reference,body,author_id,author_name,created_at';

async function allRows<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await read(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in to use robot notes.' });
  }

  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await db.auth.getUser(req.headers.authorization.slice(7));
    if (authError || !user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    const { data: profile, error: profileError } = await db.from('users').select('organization_id,role,name').eq('id', user.id).single();
    if (profileError || !profile?.organization_id) return res.status(403).json({ error: 'Join an organization to use robot notes.' });
    const orgId = profile.organization_id;
    const canViewSummaries = ['admin', 'superadmin'].includes(profile.role);

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'A valid note ID is required.' });
      const { data: note, error } = await db.from('robot_notes').select('author_id,event_key,event_year,competition_id').eq('id', id).eq('organization_id', orgId).is('deleted_at', null).maybeSingle();
      if (error) throw error;
      if (!note) return res.status(404).json({ error: 'Note not found.' });
      if (note.author_id !== user.id && !['admin', 'superadmin'].includes(profile.role)) {
        return res.status(403).json({ error: 'Only the author or an admin can remove this note.' });
      }
      const { count: archivedCount, error: archiveError } = await db.from('past_competitions').select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId).eq('competition_key', note.event_key).eq('competition_year', note.event_year);
      if (archiveError) throw archiveError;
      if (note.competition_id || archivedCount) return res.status(409).json({ error: 'Archived observations are read-only.' });
      const { error: deleteError } = await db.from('robot_notes').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('organization_id', orgId);
      if (deleteError) throw deleteError;
      return res.status(200).json({ success: true });
    }

    const [current, archives, noteEvents] = await Promise.all([
      getOrgCurrentEvent(db, orgId),
      allRows<{ id: string; competition_key: string; competition_year: number; competition_name: string }>((from, to) =>
        db.from('past_competitions').select('id,competition_key,competition_year,competition_name').eq('organization_id', orgId).order('id').range(from, to)),
      allRows<{ event_key: string; event_year: number; event_name: string }>((from, to) =>
        db.from('robot_notes').select('event_key,event_year,event_name').eq('organization_id', orgId).is('deleted_at', null).order('id').range(from, to)),
    ]);
    const currentYear = current.eventYear;
    const events = new Map<string, NotesEvent>();
    for (const n of noteEvents) events.set(`${n.event_year}:${n.event_key}`, { key: n.event_key, year: n.event_year, name: n.event_name, archived: false });
    if (current.eventKey) events.set(`${currentYear}:${current.eventKey}`, { key: current.eventKey, year: currentYear, name: current.eventName || current.eventKey, archived: false });
    for (const a of archives) events.set(`${a.competition_year}:${a.competition_key}`, {
      key: a.competition_key, year: a.competition_year, name: a.competition_name, archived: true, competitionId: a.id,
    });
    const eventList = Array.from(events.values()).sort((a, b) => Number(a.archived) - Number(b.archived) || b.year - a.year || a.name.localeCompare(b.name));

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const manualName = typeof body.manual_event_name === 'string' ? body.manual_event_name.trim() : '';
      const eventKey = manualName ? eventKeyFromName(manualName) : typeof body.event_key === 'string' ? body.event_key.trim() : '';
      const eventYear = body.event_year;
      const text = typeof body.body === 'string' ? body.body.trim() : '';
      const match = typeof body.match_reference === 'string' ? body.match_reference.trim() : '';
      if (!/^[a-z0-9_-]{1,120}$/i.test(eventKey) || !Number.isInteger(eventYear) || eventYear < 1992 || eventYear > 2100 || manualName.length > 200) {
        return res.status(400).json({ error: 'Select an event or enter a valid event name and year.' });
      }
      if (!Number.isInteger(body.team_number) || body.team_number < 1 || body.team_number > 99999) {
        return res.status(400).json({ error: 'Enter a team number between 1 and 99999.' });
      }
      if (text.length < 3 || text.length > 4000 || match.length > 80 || (body.match_reference != null && typeof body.match_reference !== 'string')) {
        return res.status(400).json({ error: 'Write a note of 3–4000 characters. Match references must be 80 characters or fewer.' });
      }
      const event = events.get(`${eventYear}:${eventKey}`);
      if (event?.archived) return res.status(409).json({ error: 'This event has been archived. Its notes are available to read.' });
      if (!event && !manualName) return res.status(404).json({ error: 'Event not found in your organization.' });
      const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : randomUUID();
      const record = {
        id, organization_id: orgId, event_key: eventKey, event_year: eventYear,
        event_name: event?.name || manualName, team_number: body.team_number,
        match_reference: match || null, body: text, author_id: user.id,
        author_name: String(profile.name || user.email?.split('@')[0] || 'Scout').slice(0, 120),
      };
      const { data: note, error } = await db.from('robot_notes').insert(record).select(NOTE_FIELDS).single();
      if (error?.code === '23505') {
        const { data: existing } = await db.from('robot_notes').select(NOTE_FIELDS).eq('id', id).eq('organization_id', orgId).eq('author_id', user.id).is('deleted_at', null).maybeSingle();
        if (existing && existing.body === text && existing.team_number === body.team_number && existing.event_key === eventKey && existing.event_year === eventYear && existing.match_reference === (match || null)) {
          return res.status(200).json({ note: existing });
        }
        return res.status(409).json({ error: 'This note could not be saved. Refresh and try again.' });
      }
      if (error) throw error;
      return res.status(201).json({ note });
    }

    const requestedKey = typeof req.query.event_key === 'string' ? req.query.event_key : '';
    const requestedYear = typeof req.query.year === 'string' ? Number(req.query.year) : currentYear;
    const event = requestedKey ? events.get(`${requestedYear}:${requestedKey}`) ?? null : eventList[0] ?? null;
    if (requestedKey && !event) return res.status(404).json({ error: 'This event is not available in your organization.' });
    if (!event) return res.status(200).json({ events: eventList, event: null, teams: [], matches: [], notes: [], canViewSummaries, ...(canViewSummaries ? { summaries: {} } : {}) });
    const ids = archives.filter((a) => a.competition_key === event.key && a.competition_year === event.year).map((a) => a.id);
    const [notes, roster, matches] = await Promise.all([
      allRows<RobotNote>((from, to) => db.from('robot_notes').select(NOTE_FIELDS).eq('organization_id', orgId).eq('event_key', event.key).eq('event_year', event.year).is('deleted_at', null).order('created_at', { ascending: false }).order('id').range(from, to)),
      allRows<{ team_number: number; team_name: string }>((from, to) => event.archived
        ? db.from('past_teams').select('team_number,team_name').in('competition_id', ids).order('id').range(from, to)
        : db.from('event_team_roster').select('team_number,team_name').eq('organization_id', orgId).eq('event_key', event.key).order('team_number').range(from, to)),
      allRows<{ match_id: string; match_number: number }>((from, to) => event.archived
        ? db.from('past_matches').select('match_id,match_number').in('competition_id', ids).order('id').range(from, to)
        : db.from('matches').select('match_id,match_number').eq('organization_id', orgId).eq('event_key', event.key).order('match_id').range(from, to)),
    ]);
    const teams = new Map(roster.map((team) => [team.team_number, team]));
    for (const n of notes) if (!teams.has(n.team_number)) teams.set(n.team_number, { team_number: n.team_number, team_name: '' });
    let summaries: Record<string, string> | undefined;
    if (canViewSummaries) {
      const grouped = new Map<number, RobotNote[]>();
      for (const note of notes) {
        if (!grouped.has(note.team_number)) grouped.set(note.team_number, []);
        grouped.get(note.team_number)!.push(note);
      }
      summaries = Object.fromEntries(Array.from(grouped, ([number, observations]) => [number, summarizeRobotNotes(observations)]));
    }
    return res.status(200).json({ events: eventList, event, notes, teams: Array.from(teams.values()).sort((a, b) => a.team_number - b.team_number), matches, canViewSummaries, ...(canViewSummaries ? { summaries } : {}) });
  } catch (error) {
    console.error('Robot notes error:', error instanceof Error ? error.message : 'Database operation failed');
    return res.status(500).json({ error: 'Could not load or save robot notes. Please try again.' });
  }
}
