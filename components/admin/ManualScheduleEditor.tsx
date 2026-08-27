import React, { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Loader2, Plus, Trash2, Pencil, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui';

type ScheduleMatch = {
  match_id: string;
  match_number: number;
  red_teams: { team_number: number }[];
  blue_teams: { team_number: number }[];
};

type Props = {
  accessToken?: string;
  eventKey: string;
  eventSource: 'tba' | 'csv';
  onSchedulesChanged?: () => void;
};

const EMPTY_SLOTS = ['', '', ''];
const EMPTY_FORM = { match_number: '', red: [...EMPTY_SLOTS], blue: [...EMPTY_SLOTS] };

export function ManualScheduleEditor({ accessToken, eventKey, eventSource, onSchedulesChanged }: Props) {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<{ match_number: string; red: string[]; blue: string[] }>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setLoadError(null);
    try {
      const qs = eventKey ? `?event_key=${encodeURIComponent(eventKey)}` : '';
      const res = await fetch(`/api/matches${qs}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Could not load matches');
      setMatches((json.matches || []) as ScheduleMatch[]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [accessToken, eventKey]);

  useEffect(() => {
    if (expanded && accessToken) {
      loadMatches();
    }
  }, [expanded, accessToken, loadMatches]);

  const startEdit = (m: ScheduleMatch) => {
    setEditingId(m.match_id);
    setForm({
      match_number: String(m.match_number),
      red: (m.red_teams || []).map((t) => String(t.team_number)),
      blue: (m.blue_teams || []).map((t) => String(t.team_number)),
    });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const setSlot = (alliance: 'red' | 'blue', idx: number, value: string) => {
    setForm((prev) => {
      const arr = [...prev[alliance]];
      arr[idx] = value;
      return { ...prev, [alliance]: arr };
    });
  };

  const validateAndParse = () => {
    const matchNumber = parseInt(form.match_number, 10);
    if (!Number.isFinite(matchNumber) || matchNumber < 1) {
      toast.error('Enter a valid match number.');
      return null;
    }
    const parseAlliance = (alliance: string[]): number[] => {
      const nums = alliance.map((v) => parseInt(v.trim(), 10)).filter((n) => Number.isFinite(n));
      if (nums.length !== 3) throw new Error('Each alliance needs exactly 3 team numbers.');
      return nums;
    };
    let red: number[], blue: number[];
    try {
      red = parseAlliance(form.red);
      blue = parseAlliance(form.blue);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid alliance teams.');
      return null;
    }
    return { matchNumber, red, blue };
  };

  const handleSave = async () => {
    const parsed = validateAndParse();
    if (!parsed) return;
    setSaving(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? '/api/matches' : '/api/matches';
      const method = isEdit ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        event_key: eventKey,
        match_number: parsed.matchNumber,
        red_teams: parsed.red,
        blue_teams: parsed.blue,
      };
      if (isEdit) body.match_id = editingId;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save match');
      toast.success(isEdit ? 'Match updated.' : 'Match added.');
      resetForm();
      await loadMatches();
      onSchedulesChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    setDeletingId(matchId);
    try {
      const res = await fetch(`/api/matches?match_id=${encodeURIComponent(matchId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Could not delete match');
      }
      toast.success('Match removed from schedule (scouting records preserved).');
      await loadMatches();
      onSchedulesChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const teamInputs = (alliance: 'red' | 'blue') => (
    <div className="space-y-1.5">
      <p className={`text-xs font-medium ${alliance === 'red' ? 'text-red-400' : 'text-sky-400'}`}>
        {alliance === 'red' ? 'Red' : 'Blue'} alliance
      </p>
      <div className="grid grid-cols-3 gap-2">
        {form[alliance].map((val, i) => (
          <Input
            key={`${alliance}-${i}`}
            inputMode="numeric"
            placeholder={`Team ${i + 1}`}
            value={val}
            onChange={(e) => setSlot(alliance, i, e.target.value)}
            className="h-10 bg-background/50"
          />
        ))}
      </div>
    </div>
  );

  const existingRowAlliance = (teams: { team_number: number }[], color: 'red' | 'blue') => (
    <div className="flex flex-wrap gap-1">
      {(teams || []).map((t) => (
        <span key={t.team_number} className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${color === 'red' ? 'bg-red-500/10 text-red-300' : 'bg-sky-500/10 text-sky-300'}`}>
          {t.team_number}
        </span>
      ))}
    </div>
  );

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
            <CalendarRange className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Match schedule editor</p>
            <p className="text-xs text-muted-foreground">
              {matches.length > 0 ? `${matches.length} match(es) loaded for this event` : 'Manually add, edit, or remove matches.'}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Manage'}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4">
          {eventSource === 'csv' && (
            <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              A CSV schedule is paused from TBA auto-sync, so manual edits stay in place.
            </p>
          )}
          {loadError && <p className="text-xs text-destructive">{loadError}</p>}

          <div className="rounded-lg border border-border/70 bg-background/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{editingId ? 'Edit match' : 'Add a match'}</p>
              {editingId && (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-3.5 w-3.5" aria-hidden /> Cancel
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Match number</Label>
              <Input
                inputMode="numeric"
                placeholder="e.g. 12"
                value={form.match_number}
                onChange={(e) => setForm((p) => ({ ...p, match_number: e.target.value }))}
                className="h-10 bg-background/50"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {teamInputs('red')}
              {teamInputs('blue')}
            </div>
            <Button type="button" onClick={handleSave} disabled={saving} className="w-full sm:w-auto min-h-10">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : editingId ? <Pencil className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              {editingId ? 'Update match' : 'Add match'}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading schedule…
            </div>
          ) : matches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No matches for this event yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto pr-1">
              {matches.map((m) => (
                <div key={m.match_id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold">Match {m.match_number}</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(m)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        aria-label={`Edit match ${m.match_number}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.match_id)}
                        disabled={deletingId === m.match_id}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete match ${m.match_number}`}
                      >
                        {deletingId === m.match_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
                      </button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-red-400">Red</span>
                      {existingRowAlliance(m.red_teams, 'red')}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sky-400">Blue</span>
                      {existingRowAlliance(m.blue_teams, 'blue')}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Check className="h-3 w-3 shrink-0 text-green-500" aria-hidden />
                    Scouting records for this match are preserved on remove.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
