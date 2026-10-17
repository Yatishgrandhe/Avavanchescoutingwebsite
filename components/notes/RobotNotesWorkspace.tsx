import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useSupabase } from '@/pages/_app';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { summarizeRobotNotes, type RobotNote, type RobotNotesResponse } from '@/lib/robot-notes';

const fieldClass = 'min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';

interface Props {
  eventKey?: string;
  eventYear?: number;
  teamNumber?: number;
  fixedEvent?: boolean;
}

export default function RobotNotesWorkspace({ eventKey, eventYear, teamNumber, fixedEvent = false }: Props) {
  const { supabase, session, user } = useSupabase();
  const [selection, setSelection] = useState(eventKey && eventYear ? `${eventYear}:${eventKey}` : '');
  const [data, setData] = useState<RobotNotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [team, setTeam] = useState(teamNumber ? String(teamNumber) : '');
  const [match, setMatch] = useState('');
  const [body, setBody] = useState('');
  const [eventName, setEventName] = useState('');
  const [manualYear, setManualYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState(teamNumber ? String(teamNumber) : '');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const listId = useId();
  const manual = selection === '__new__' || (!loading && !data?.event && !fixedEvent);
  const archived = !manual && data?.event?.archived === true;
  const canModerate = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (eventKey && eventYear) setSelection(`${eventYear}:${eventKey}`);
  }, [eventKey, eventYear]);

  useEffect(() => {
    if (teamNumber) { setTeam(String(teamNumber)); setSearch(String(teamNumber)); }
  }, [teamNumber]);

  useEffect(() => {
    const onFocus = () => setRefresh((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (selection && selection !== '__new__') {
          const colon = selection.indexOf(':');
          params.set('year', selection.slice(0, colon));
          params.set('event_key', selection.slice(colon + 1));
        }
        const response = await fetch(`/api/robot-notes?${params}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load robot notes.');
        if (!controller.signal.aborted) {
          setData(result);
          if (!selection && result.event) setSelection(`${result.event.year}:${result.event.key}`);
        }
      } catch (e) {
        if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Could not load robot notes.'); setData(null); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [session?.access_token, selection, refresh]);

  // A changed draft is a new request; an unchanged retry retains its ID.
  useEffect(() => { requestId.current = null; }, [body, team, match, selection, eventName, manualYear]);

  const teamNames = useMemo(() => new Map((data?.teams ?? []).map((t) => [t.team_number, t.team_name])), [data?.teams]);
  const groups = useMemo(() => {
    const byTeam = new Map<number, RobotNote[]>();
    for (const note of data?.notes ?? []) {
      if (!byTeam.has(note.team_number)) byTeam.set(note.team_number, []);
      byTeam.get(note.team_number)!.push(note);
    }
    const query = search.trim().toLowerCase();
    return Array.from(byTeam.entries()).filter(([number]) => !query || `${number} ${teamNames.get(number) || ''}`.toLowerCase().includes(query)).sort(([a], [b]) => a - b)
      .map(([number, notes]) => ({ number, notes, summary: summarizeRobotNotes(notes) }));
  }, [data?.notes, search, teamNames]);

  const accessToken = async () => {
    const { data: { session: fresh } } = await supabase.auth.getSession();
    if (!fresh?.access_token) throw new Error('Your session expired. Sign in again to save notes.');
    return fresh.access_token;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || loading) return;
    setError(null); setSuccess('');
    if (!/^\d+$/.test(team) || Number(team) < 1 || Number(team) > 99999) { setError('Enter a valid team number.'); return; }
    if (body.trim().length < 3) { setError('Write at least 3 characters in your observation.'); return; }
    setSaving(true);
    try {
      requestId.current ??= crypto.randomUUID();
      const response = await fetch('/api/robot-notes', {
        method: 'POST', headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId.current, event_key: data?.event?.key, event_year: manual ? Number(manualYear) : data?.event?.year,
          ...(manual ? { manual_event_name: eventName } : {}), team_number: Number(team), match_reference: match, body,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your note.');
      setBody(''); requestId.current = null;
      setSuccess(`Observation saved for Team ${team}.`);
      setSearch('');
      setSelection(`${result.note.event_year}:${result.note.event_key}`);
      setRefresh((v) => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your note. Your draft is still here.'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    setRemoving(id); setError(null);
    try {
      const response = await fetch(`/api/robot-notes?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${await accessToken()}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not remove note.');
      setData((old) => old ? { ...old, notes: old.notes.filter((note) => note.id !== id) } : old);
      setSuccess('Observation removed.'); setConfirmRemove(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not remove note.'); }
    finally { setRemoving(null); }
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          {fixedEvent ? <p className="font-semibold text-foreground">{data?.event?.name || 'Event observations'}</p> : <>
            <label htmlFor={`${listId}-event`} className="mb-2 block text-sm font-medium">Event</label>
            <select id={`${listId}-event`} value={selection} onChange={(e) => { setSelection(e.target.value); setSuccess(''); }} className={fieldClass} disabled={saving}>
              {!data?.events.length && <option value="">Select an event</option>}
              {data?.events.map((e) => <option key={`${e.year}:${e.key}`} value={`${e.year}:${e.key}`}>{e.name} · {e.year}{e.archived ? ' · Archived' : ''}</option>)}
              <option value="__new__">Event not imported yet…</option>
            </select>
          </>}
          <p className="mt-2 text-sm text-muted-foreground">{archived ? 'Archived observations and summaries are preserved here.' : 'Notes are shared with your organization and retained with the event.'}</p>
          {!archived && <a href={`#${listId}-summary`} className="mt-2 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden">View robot summaries</a>}
        </div>
        <Button type="button" variant="outline" onClick={() => setRefresh((v) => v + 1)} disabled={loading || saving} className="min-h-11 gap-2 rounded-xl"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">{error}</div>}
      {success && <p role="status" className="text-sm text-primary">{success}</p>}
      {loading && !data && <div role="status" className="flex items-center gap-3 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading robot notes…</div>}
      <div className={`grid min-w-0 gap-5 ${!archived ? 'lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]' : ''}`}>
        {!archived && (data || manual) && <Card className="h-fit rounded-2xl p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Add an observation</h2>
          <p className="mt-2 text-sm text-muted-foreground">Describe what you saw: reliability, driving, defense, or anything useful for strategy.</p>
          <form onSubmit={save} className="mt-5 space-y-4">
            {manual && <fieldset className="space-y-4 rounded-xl border border-border p-3" disabled={saving}>
              <legend className="px-1 text-sm font-medium">Event before import</legend>
              <div><label htmlFor={`${listId}-name`} className="mb-2 block text-sm font-medium">Event name</label><Input id={`${listId}-name`} value={eventName} onChange={(e) => setEventName(e.target.value)} required maxLength={200} className={fieldClass} placeholder="e.g. Asheville 2026" /></div>
              <div><label htmlFor={`${listId}-year`} className="mb-2 block text-sm font-medium">Year</label><Input id={`${listId}-year`} type="number" min={1992} max={2100} required value={manualYear} onChange={(e) => setManualYear(e.target.value)} className={fieldClass} /></div>
              <p className="text-sm text-muted-foreground">Use this same event name when importing the CSV to connect the notes automatically.</p>
            </fieldset>}
            <div>
              <label htmlFor={`${listId}-team`} className="mb-2 block text-sm font-medium">Team number <span className="text-muted-foreground">(required)</span></label>
              <Input id={`${listId}-team`} list={`${listId}-teams`} inputMode="numeric" pattern="[0-9]+" required value={team} onChange={(e) => setTeam(e.target.value)} maxLength={5} placeholder="e.g. 2724" className={fieldClass} disabled={saving} />
              <datalist id={`${listId}-teams`}>{!manual && data?.teams.map((t) => <option key={t.team_number} value={t.team_number}>{t.team_name || `Team ${t.team_number}`}</option>)}</datalist>
              <p className="mt-2 text-sm text-muted-foreground">{!manual && teamNames.get(Number(team)) ? teamNames.get(Number(team)) : 'Choose an imported team or type a team number.'}</p>
            </div>
            <div>
              <label htmlFor={`${listId}-match`} className="mb-2 block text-sm font-medium">Match <span className="text-muted-foreground">(optional)</span></label>
              <Input id={`${listId}-match`} list={`${listId}-matches`} value={match} onChange={(e) => setMatch(e.target.value)} maxLength={80} placeholder="e.g. QM 12" className={fieldClass} disabled={saving} />
              <datalist id={`${listId}-matches`}>{!manual && data?.matches.map((m) => <option key={m.match_id} value={`QM ${m.match_number}`} />)}</datalist>
            </div>
            <div>
              <label htmlFor={`${listId}-body`} className="mb-2 block text-sm font-medium">Observation</label>
              <textarea id={`${listId}-body`} required minLength={3} maxLength={4000} rows={5} value={body} onChange={(e) => setBody(e.target.value)} disabled={saving} className={`${fieldClass} resize-y`} placeholder="e.g. Browned out twice in QM 12, then recovered and finished the match." aria-describedby={`${listId}-help`} />
              <p id={`${listId}-help`} className="mt-2 text-sm text-muted-foreground">{body.length.toLocaleString()} / 4,000 characters</p>
            </div>
            <Button type="submit" disabled={saving || loading} className="min-h-11 w-full gap-2 rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{saving ? 'Saving…' : 'Save observation'}</Button>
          </form>
        </Card>}
        <section className="min-w-0 space-y-4" aria-labelledby={`${listId}-summary`} aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 id={`${listId}-summary`} className="scroll-mt-24 text-xl font-semibold">Robot summaries</h2><span className="text-sm text-muted-foreground">{manual ? 0 : data?.notes.length ?? 0} {!manual && data?.notes.length === 1 ? 'observation' : 'observations'}</span></div>
          <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" /><label htmlFor={`${listId}-search`} className="sr-only">Find a robot by team number or name</label><Input id={`${listId}-search`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a robot by number or name" className={`${fieldClass} pl-10`} /></div>
          {!manual && groups.map(({ number, notes, summary }) => <Card key={number} className="min-w-0 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-xl font-semibold">Team {number}</h3>{teamNames.get(number) && <p className="mt-1 break-words text-sm text-muted-foreground">{teamNames.get(number)}</p>}</div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span></div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Summary from observations</p>
            <p className="mt-2 break-words leading-relaxed">{summary}</p>
            <details className="mt-4 border-t border-border pt-4">
              <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Read all observations</summary>
              <ol className="mt-2 space-y-4">{notes.map((note) => <li key={note.id} className="rounded-xl bg-background/50 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span>{note.author_name}</span><time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString()}</time>{note.match_reference && <span className="font-medium text-foreground">{note.match_reference}</span>}</div>
                <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{note.body}</p>
                {!archived && (note.author_id === user?.id || canModerate) && <div className="mt-2 flex flex-wrap gap-2">
                  {confirmRemove === note.id ? <><Button type="button" variant="destructive" disabled={removing !== null} onClick={() => void remove(note.id)} className="min-h-11 rounded-xl">{removing === note.id ? 'Removing…' : 'Remove observation'}</Button><Button type="button" variant="outline" disabled={removing !== null} onClick={() => setConfirmRemove(null)} className="min-h-11 rounded-xl">Cancel</Button></> : <Button type="button" variant="ghost" onClick={() => setConfirmRemove(note.id)} className="min-h-11 gap-2 rounded-xl text-muted-foreground"><Trash2 className="h-4 w-4" />Remove</Button>}
                </div>}
              </li>)}</ol>
            </details>
          </Card>)}
          {(manual || (!loading && !groups.length)) && <Card className="rounded-2xl p-8 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h3 className="font-semibold">{search && !manual ? 'No observations match this robot' : 'No observations yet'}</h3><p className="mt-2 text-sm text-muted-foreground">{archived ? 'No robot observations were recorded for this event.' : 'Add a note to start a robot’s summary. Every observation remains available below it.'}</p></Card>}
        </section>
      </div>
    </div>
  );
}
