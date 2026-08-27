import React, { useCallback, useEffect, useState } from 'react';
import { Wrench, Loader2, Plus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui';

type Props = {
  accessToken?: string;
  teams: { team_number: number; team_name: string }[];
  onPitChanged?: () => void;
};

type PitDraft = {
  robot_name: string;
  drive_type: string;
  autonomous_capabilities: string;
  teleop_capabilities: string;
  can_autoalign: boolean;
  climb_location: string;
  climb_levels: string;
  weight: string;
  camera_count: string;
  programming_language: string;
  notes: string;
  auto_fuel_count: string;
};

const EMPTY_DRAFT: PitDraft = {
  robot_name: '',
  drive_type: '',
  autonomous_capabilities: '',
  teleop_capabilities: '',
  can_autoalign: false,
  climb_location: '',
  climb_levels: '',
  weight: '',
  camera_count: '',
  programming_language: '',
  notes: '',
  auto_fuel_count: '',
};

export function ManualPitEntry({ accessToken, teams, onPitChanged }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [teamNumber, setTeamNumber] = useState<number>(0);
  const [draft, setDraft] = useState<PitDraft>(EMPTY_DRAFT);
  const [loadingReport, setLoadingReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasReport, setHasReport] = useState(false);

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setHasReport(false);
  };

  const loadExisting = useCallback(async (num: number) => {
    if (!accessToken || !num) {
      resetDraft();
      return;
    }
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/admin/manual-pit?team_number=${num}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not load pit data');
      const report = json.report;
      if (report) {
        const toCsv = (v: unknown) => (Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '');
        setHasReport(true);
        setDraft({
          robot_name: report.robot_name || '',
          drive_type: report.drive_type || (report.drive_train_details?.type || ''),
          autonomous_capabilities: toCsv(report.autonomous_capabilities),
          teleop_capabilities: toCsv(report.teleop_capabilities),
          can_autoalign: !!report.can_autoalign,
          climb_location: report.climb_location || '',
          climb_levels: toCsv(report.drive_train_details?.climb_levels),
          weight: report.weight != null ? String(report.weight) : '',
          camera_count: report.camera_count != null ? String(report.camera_count) : '',
          programming_language: report.programming_language || '',
          notes: report.notes || '',
          auto_fuel_count: report.auto_fuel_count != null ? String(report.auto_fuel_count) : '',
        });
      } else {
        resetDraft();
      }
    } catch (err) {
      resetDraft();
      toast.error(err instanceof Error ? err.message : 'Failed to load pit data');
    } finally {
      setLoadingReport(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (teamNumber && expanded) {
      loadExisting(teamNumber);
    } else {
      resetDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamNumber, expanded]);

  const handleSave = async () => {
    if (!teamNumber || !accessToken) {
      toast.error('Select a team first.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        team_number: teamNumber,
        ...draft,
        autonomous_capabilities: draft.autonomous_capabilities.split(',').map((s) => s.trim()).filter(Boolean),
        teleop_capabilities: draft.teleop_capabilities.split(',').map((s) => s.trim()).filter(Boolean),
        climb_levels: draft.climb_levels.split(',').map((s) => s.trim()).filter(Boolean),
        submitted_by_name: 'Admin',
      };
      const res = await fetch('/api/admin/manual-pit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save pit data');
      setHasReport(true);
      if (json.registeredInEvent) {
        toast.success(`Pit data saved. Team ${teamNumber} was registered into the current competition and synced.`);
      } else {
        toast.success('Pit data saved. (No active competition to register the team into yet.)');
      }
      onPitChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof PitDraft, placeholder = '') => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        placeholder={placeholder}
        value={draft[key] as string}
        onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
        className="h-10 bg-background/50"
      />
    </div>
  );

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
            <Wrench className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Manual pit scouting entry</p>
            <p className="text-xs text-muted-foreground">
              Record robot details for a team by hand (admin-entered).
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide' : 'Enter'}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="manual-pit-team-number">
              Team number (any team — even one not on the schedule)
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                id="manual-pit-team-number"
                inputMode="numeric"
                placeholder="e.g. 1234"
                value={teamNumber || ''}
                onChange={(e) => {
                  const num = parseInt(e.target.value.replace(/[^\d]/g, ''), 10);
                  setTeamNumber(Number.isFinite(num) ? num : 0);
                }}
                className="h-10 bg-background/50"
              />
              {teams.length > 0 && (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={teams.some((t) => t.team_number === teamNumber) ? teamNumber : ''}
                  onChange={(e) => setTeamNumber(parseInt(e.target.value, 10) || 0)}
                  aria-label="Quick pick from event roster"
                >
                  <option value="">— Or pick from event roster —</option>
                  {teams.map((t) => (
                    <option key={t.team_number} value={t.team_number}>
                      {t.team_number} · {t.team_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              Saving for a team outside the event automatically registers it into the current competition and syncs it.
            </p>
          </div>

          {teamNumber && (
            <div className="rounded-lg border border-border/70 bg-background/50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {loadingReport ? 'Loading existing…' : hasReport ? 'Edit existing pit data' : 'New pit entry'}
                  {hasReport && !loadingReport && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-green-500" aria-hidden />}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={() => loadExisting(teamNumber)} disabled={loadingReport}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingReport ? 'animate-spin' : ''}`} aria-hidden /> Reload
                </Button>
              </div>

              {loadingReport ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {field('Robot name', 'robot_name', 'e.g. Banshee')}
                  {field('Drive type', 'drive_type', 'e.g. Swerve Drive, Tank Drive')}
                  {field('Programming language', 'programming_language', 'e.g. Java, Python, C++')}
                  {field('Auto capabilities', 'autonomous_capabilities', 'comma-separated')}
                  {field('Teleop capabilities', 'teleop_capabilities', 'comma-separated')}
                  {field('Climb levels', 'climb_levels', 'comma-separated, e.g. none, deep')}
                  {field('Climb location', 'climb_location', 'e.g. sides, center')}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Can auto-align</Label>
                    <div className="flex h-10 items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={draft.can_autoalign}
                        onClick={() => setDraft((p) => ({ ...p, can_autoalign: !p.can_autoalign }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${draft.can_autoalign ? 'bg-primary' : 'bg-input'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition ${draft.can_autoalign ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                  {field('Weight (lb)', 'weight', 'e.g. 118')}
                  {field('Camera count', 'camera_count', 'e.g. 2')}
                  {field('Auto fuel count', 'auto_fuel_count', 'e.g. 15')}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <textarea
                      rows={3}
                      placeholder="Robot details and observations…"
                      value={draft.notes}
                      onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}

              <Button type="button" onClick={handleSave} disabled={saving || loadingReport} className="w-full sm:w-auto min-h-10">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                {hasReport ? 'Update pit data' : 'Save pit data'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
