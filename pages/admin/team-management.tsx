import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { useScoutingLocks } from '@/hooks/use-scouting-locks';
import { motion } from 'framer-motion';
import {
  Building2,
  ClipboardList,
  Lock,
  Unlock,
  Users,
  FileSpreadsheet,
  Database,
  Loader2,
  Shield,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Settings,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  Button,
  Input,
  Label,
  Badge,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TeamManagementPage() {
  const { user, supabase, session } = useSupabase();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin();
  const {
    matchScoutingLocked,
    pitScoutingLocked,
    loading: locksLoading,
    setMatchScoutingLocked,
    setPitScoutingLocked,
  } = useScoutingLocks();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  // Student Management State
  const [scouts, setScouts] = useState<{ id: string; name: string }[]>([]);
  const [newScoutName, setNewScoutName] = useState('');
  const [scoutsLoading, setScoutsLoading] = useState(false);

  // Competition Settings State
  const [eventKey, setEventKey] = useState('');
  const [eventName, setEventName] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [tbaYear, setTbaYear] = useState(() => new Date().getFullYear());
  const [tbaEvents, setTbaEvents] = useState<
    { key: string; name: string; short_name?: string; city?: string; state_prov?: string; start_date?: string }[]
  >([]);
  const [tbaEventsLoading, setTbaEventsLoading] = useState(false);
  const [tbaEventsHint, setTbaEventsHint] = useState<string | null>(null);
  const [tbaEventSearch, setTbaEventSearch] = useState('');
  const [tbaSyncStatus, setTbaSyncStatus] = useState<string | null>(null);
  const [isSyncingTba, setIsSyncingTba] = useState(false);

  // Invite Management State
  const [invites, setInvites] = useState<any[]>([]);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOrg() {
      // If no org ID is found on the profile, we mark it as null
      if (!user?.organization_id) {
        if (!cancelled) {
          setOrgName(null);
          setOrgLoading(false);
        }
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', user.organization_id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('Error loading organization:', error);
          setOrgName(null);
        } else if (data?.name) {
          setOrgName(data.name);
        } else {
          // If ID was present in profile but no organization row matched
          setOrgName(null);
        }
      } catch (err) {
        console.error('Failed to load organization details', err);
        setOrgName(null);
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    }
    loadOrg();
    fetchScouts();
    fetchCompetitionSettings();
    fetchInvites();
    return () => {
      cancelled = true;
    };
  }, [user?.organization_id, user?.role, supabase]);

  const fetchInvites = async () => {
    if (!user?.organization_id) return;
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('target_organization_id', user.organization_id)
      .eq('invite_type', 'join_org')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && data) {
      setInvites(data);
    }
  };

  const generateJoinInvite = async () => {
    if (!user?.organization_id) {
      toast.error("Organization ID not found");
      return;
    }
    setIsGeneratingInvite(true);
    try {
      const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const { data, error } = await supabase
        .from('organization_invites')
        .insert({
          token,
          invite_type: 'join_org',
          target_organization_id: user.organization_id,
          created_by: user?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setInvites([data, ...invites]);
      toast.success("Student join invite created");
    } catch (error: any) {
      toast.error(error.message || "Error generating join invite");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://avalanchescouting.vercel.app';
    const link = `${origin}/auth/signin?token=${encodeURIComponent(token)}&invite_type=join_org`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success("Invite link copied to clipboard");
  };

  const fetchCompetitionSettings = async () => {
    setSettingsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/competition-settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEventKey(data.current_event_key || '');
        setEventName(data.current_event_name || '');
      }
    } catch (err) {
      console.error('Failed to fetch competition settings', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchTbaEventsList = useCallback(async () => {
    setTbaEventsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`/api/tba/events?year=${tbaYear}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Could not load events from The Blue Alliance');
        setTbaEvents([]);
        setTbaEventsHint(null);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.events) ? data.events : [];
      setTbaEvents(list);
      setTbaEventsHint(
        list.length === 0
          ? 'TBA returned no events for this year. Try another season, or ensure the server has TBA_API_KEY (or THE_BLUE_ALLIANCE_API_KEY) set.'
          : null
      );
    } catch (e) {
      console.error(e);
      toast.error('Failed to load TBA events');
      setTbaEventsHint(null);
    } finally {
      setTbaEventsLoading(false);
    }
  }, [tbaYear, supabase]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    if (!session?.access_token) return;
    fetchTbaEventsList();
  }, [isAdmin, adminLoading, session?.access_token, fetchTbaEventsList]);

  const runTbaSync = useCallback(async (opts?: { silent?: boolean }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    if (!opts?.silent) setIsSyncingTba(true);
    try {
      const res = await fetch('/api/admin/sync-from-tba', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!opts?.silent) toast.error(data.error || 'TBA sync failed');
        setTbaSyncStatus(data.error || 'Sync failed');
        return;
      }
      const msg = `Synced ${data.matchesUpserted ?? 0} matches, ${data.teamsUpserted ?? 0} teams`;
      setTbaSyncStatus(msg);
      if (!opts?.silent) toast.success(msg);
    } catch (e) {
      if (!opts?.silent) toast.error('TBA sync failed');
      setTbaSyncStatus('Sync failed');
    } finally {
      if (!opts?.silent) setIsSyncingTba(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!isAdmin || !eventKey.trim()) return;
    runTbaSync({ silent: true });
  }, [isAdmin, eventKey, runTbaSync]);

  useEffect(() => {
    if (!isAdmin || !eventKey.trim()) return;
    const id = window.setInterval(() => {
      runTbaSync({ silent: true });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [isAdmin, eventKey, runTbaSync]);

  const handleSaveCompetition = async () => {
    if (!eventKey.trim() || !eventName.trim()) {
      toast.error('Event key and name are required');
      return;
    }

    setIsSavingSettings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/admin/competition-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          current_event_key: eventKey.trim(),
          current_event_name: eventName.trim()
        })
      });

      if (res.ok) {
        toast.success('Competition settings updated');
        await runTbaSync();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update settings');
      }
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleClearCompetition = async () => {
    if (
      !confirm(
        'WARNING: This will PERMANENTLY DELETE all matches, match scouting, pit data, and pick lists for your organization. This action CANNOT be undone.\n\nUse "Archive" instead if you want to save this data to past records before starting a new competition.\n\nAre you sure you want to clear EVERYTHING for this organization?'
      )
    ) {
      return;
    }
    setIsSavingSettings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');
      const res = await fetch('/api/admin/competition-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clear: true }),
      });
      if (res.ok) {
        setEventKey('');
        setEventName('');
        setTbaSyncStatus(null);
        toast.success('Active competition cleared');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to clear');
      }
    } catch {
      toast.error('Failed to clear competition');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveCompetition = async () => {
    if (!confirm('Are you sure you want to archive the current competition? This will move all scouting data and matches to past records and reset the current event settings.')) return;
    
    setIsArchiving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session');

      const res = await fetch('/api/admin/archive-competition', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (res.ok) {
        toast.success('Competition archived successfully');
        // Refresh page or update state
        window.location.reload();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to archive competition');
      }
    } catch (err) {
      toast.error('Failed to archive competition');
    } finally {
      setIsArchiving(false);
    }
  };

  const fetchScouts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/scouts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setScouts(data);
      }
    } catch (err) {
      console.error('Failed to fetch scouts', err);
    }
  };

  const addScout = async () => {
    if (!newScoutName.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    setScoutsLoading(true);
    try {
      const res = await fetch('/api/admin/scouts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: newScoutName }),
      });
      if (res.ok) {
        const data = await res.json();
        setScouts([...scouts, data]);
        setNewScoutName('');
        toast.success('Scout added');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add scout');
      }
    } catch (err) {
      toast.error('Failed to add scout');
    } finally {
      setScoutsLoading(false);
    }
  };

  const deleteScout = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    try {
      const res = await fetch('/api/admin/scouts', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setScouts(scouts.filter((s) => s.id !== id));
        toast.success('Scout removed');
      }
    } catch (err) {
      toast.error('Failed to remove scout');
    }
  };

  if (adminLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <Card className="max-w-md w-full text-center border-destructive/30 shadow-xl">
              <CardContent className="pt-8 pb-8 px-6">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" aria-hidden />
                <h2 className="text-xl font-heading font-bold mb-2">Access denied</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Team Management is only available to organization admins.
                </p>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Head>
          <title>Team Management | Avalanche Scouting</title>
        </Head>

        <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-foreground">
                Team Management
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl mt-2 leading-relaxed">
                Manage your organization&apos;s scouting operations, students, and competition data.
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border px-4 py-3 flex flex-wrap items-center gap-3',
                orgName
                  ? 'border-border/80 bg-muted/25'
                  : 'border-destructive/40 bg-destructive/5'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Building2 className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Organization</p>
                  <p className="text-sm font-semibold truncate">
                    {orgLoading ? (
                      <span className="text-muted-foreground font-normal">Loading…</span>
                    ) : (
                      <span className={cn(orgName ? 'text-primary' : 'text-destructive')}>
                        {orgName || 'Not assigned'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {!orgLoading && !orgName && (
                <p className="text-xs text-destructive/90 flex items-start gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                  <span>
                    This account is not linked to an organization. Ask a superadmin to add you, or use a join invite link.
                  </span>
                </p>
              )}
            </div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/60 shadow-md overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-lg flex items-center gap-2.5 text-foreground">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                      <Database className="h-4 w-4" aria-hidden />
                    </span>
                    Competition management
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Choose an official FRC event from The Blue Alliance; teams and match schedule sync automatically about every minute while this page is open.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Settings className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      Active competition (TBA)
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      New organizations start with no event until an admin selects one here. Students joining an org are never placed into a competition automatically.
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="tba-year" className="text-xs text-muted-foreground">
                          Season year
                        </Label>
                        <Input
                          id="tba-year"
                          type="number"
                          min={2000}
                          max={2100}
                          value={tbaYear}
                          onChange={(e) => setTbaYear(Math.max(2000, parseInt(e.target.value, 10) || tbaYear))}
                          className="h-10 w-28 bg-background/50"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="min-h-10"
                        onClick={() => fetchTbaEventsList()}
                        disabled={tbaEventsLoading}
                      >
                        {tbaEventsLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                        Load events
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tba-search" className="text-xs text-muted-foreground">
                        Search events
                      </Label>
                      <Input
                        id="tba-search"
                        placeholder="City, name, or key…"
                        value={tbaEventSearch}
                        onChange={(e) => setTbaEventSearch(e.target.value)}
                        className="h-10 bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tba-pick" className="text-xs text-muted-foreground">
                        Select event
                      </Label>
                      <select
                        id="tba-pick"
                        className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={eventKey}
                        onChange={(e) => {
                          const key = e.target.value;
                          setEventKey(key);
                          const ev = tbaEvents.find((x) => x.key === key);
                          if (ev) setEventName(ev.name);
                        }}
                      >
                        <option value="">— No event selected —</option>
                        {tbaEvents
                          .filter((ev) => {
                            const q = tbaEventSearch.trim().toLowerCase();
                            if (!q) return true;
                            const blob = `${ev.key} ${ev.name} ${ev.city || ''} ${ev.state_prov || ''}`.toLowerCase();
                            return blob.includes(q);
                          })
                          .map((ev) => (
                            <option key={ev.key} value={ev.key}>
                              {ev.start_date ? `${ev.start_date} · ` : ''}
                              {ev.name} ({ev.key})
                            </option>
                          ))}
                      </select>
                      {tbaEventsHint ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
                          {tbaEventsHint}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="event-key" className="text-xs text-muted-foreground">
                          Event key (editable)
                        </Label>
                        <Input
                          id="event-key"
                          placeholder="e.g. 2026ncash"
                          value={eventKey}
                          onChange={(e) => setEventKey(e.target.value)}
                          className="h-10 bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event-name" className="text-xs text-muted-foreground">
                          Display name
                        </Label>
                        <Input
                          id="event-name"
                          placeholder="e.g. Asheville Regional"
                          value={eventName}
                          onChange={(e) => setEventName(e.target.value)}
                          className="h-10 bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={handleSaveCompetition}
                        disabled={isSavingSettings || settingsLoading}
                        className="min-h-10"
                      >
                        {isSavingSettings ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Check className="h-4 w-4" aria-hidden />
                        )}
                        Save &amp; sync from TBA
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => runTbaSync()}
                        disabled={isSyncingTba || !eventKey.trim()}
                        className="min-h-10"
                      >
                        {isSyncingTba ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Database className="h-4 w-4" aria-hidden />}
                        Sync now
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearCompetition}
                        disabled={isSavingSettings}
                        className="min-h-10 border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        Clear competition
                      </Button>
                    </div>
                    {tbaSyncStatus && (
                      <p className="text-[11px] text-muted-foreground">{tbaSyncStatus}</p>
                    )}
                  </div>

                  <div>
                    <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                        <Clock className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                        Archive competition
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Uses the event key and name saved for your organization (or the dominant event from your match
                        rows). Moves matches, match scouting, pit, pick lists, and a team snapshot into past records;
                        clears saved event settings.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full min-h-10 border-amber-500/45 text-amber-100 hover:bg-amber-500/15 hover:text-amber-50"
                        onClick={handleArchiveCompetition}
                        disabled={isArchiving}
                      >
                        {isArchiving ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Database className="h-4 w-4" aria-hidden />
                        )}
                        Archive current competition
                      </Button>
                    </div>
                  </div>

                  <Button variant="secondary" className="w-full sm:w-auto gap-2" asChild>
                    <Link href="/past-competitions">
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Past competitions &amp; records
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-md overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-lg flex items-center gap-2.5 text-foreground">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                      <FileSpreadsheet className="h-4 w-4" aria-hidden />
                    </span>
                    Review &amp; analytics
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Audit submissions and scout activity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Link
                      href="/admin/scouting-stats/forms"
                      className="group rounded-xl border border-border/60 bg-muted/15 p-4 transition-colors hover:border-emerald-500/35 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                          <ClipboardList className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
                          Review submissions
                        </div>
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Match and pit forms submitted by scouts.
                      </p>
                    </Link>
                    <Link
                      href="/admin/scouting-stats"
                      className="group rounded-xl border border-border/60 bg-muted/15 p-4 transition-colors hover:border-emerald-500/35 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
                          Scouting leaderboard
                        </div>
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Rankings and performance metrics.
                      </p>
                    </Link>
                    <Link
                      href="/admin/role-management"
                      className="group rounded-xl border border-border/60 bg-muted/15 p-4 transition-colors hover:border-blue-500/35 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                          <Shield className="h-4 w-4 text-blue-400 shrink-0" aria-hidden />
                          Role management
                        </div>
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Manage user roles and page permissions.
                      </p>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/60 shadow-md overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Lock className="h-4 w-4" aria-hidden />
                    </span>
                    Scouting locks
                  </CardTitle>
                  <CardDescription className="text-xs">Tap to toggle match and pit form access.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between min-h-12 px-3 border-border/70 hover:bg-muted/30 hover:border-primary/35"
                    disabled={locksLoading}
                    onClick={() => setMatchScoutingLocked(!matchScoutingLocked)}
                  >
                    <span className="flex items-center gap-3">
                      {matchScoutingLocked ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
                          <Lock className="h-4 w-4 text-amber-400" aria-hidden />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
                          <Unlock className="h-4 w-4 text-emerald-400" aria-hidden />
                        </span>
                      )}
                      <span className="font-medium text-sm text-foreground text-left">Match scouting</span>
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px] uppercase tracking-wide border-0',
                        matchScoutingLocked
                          ? 'bg-destructive/15 text-red-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      )}
                    >
                      {matchScoutingLocked ? 'Locked' : 'Open'}
                    </Badge>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between min-h-12 px-3 border-border/70 hover:bg-muted/30 hover:border-primary/35"
                    disabled={locksLoading}
                    onClick={() => setPitScoutingLocked(!pitScoutingLocked)}
                  >
                    <span className="flex items-center gap-3">
                      {pitScoutingLocked ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
                          <Lock className="h-4 w-4 text-amber-400" aria-hidden />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15">
                          <Unlock className="h-4 w-4 text-emerald-400" aria-hidden />
                        </span>
                      )}
                      <span className="font-medium text-sm text-foreground text-left">Pit scouting</span>
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px] uppercase tracking-wide border-0',
                        pitScoutingLocked
                          ? 'bg-destructive/15 text-red-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      )}
                    >
                      {pitScoutingLocked ? 'Locked' : 'Open'}
                    </Badge>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-md overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Users className="h-4 w-4" aria-hidden />
                    </span>
                    Scouts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Names shown in scouting form dropdowns.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Student name"
                      className="h-10 flex-1 min-w-0 bg-background/50"
                      value={newScoutName}
                      onChange={(e) => setNewScoutName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addScout()}
                      aria-label="New scout name"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={addScout}
                      disabled={scoutsLoading || !newScoutName.trim()}
                      aria-label="Add scout"
                    >
                      {scoutsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar rounded-lg border border-border/50 bg-muted/10 p-2">
                    {scouts.map((scout) => (
                      <div
                        key={scout.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-transparent bg-background/40 px-3 py-2.5 text-sm hover:border-border/80 transition-colors"
                      >
                        <span className="font-medium text-foreground truncate">{scout.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteScout(scout.id)}
                          aria-label={`Remove ${scout.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {scouts.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-8">No scouts yet. Add a name above.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-md overflow-hidden border-l-2 border-l-primary/50">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Plus className="h-4 w-4" aria-hidden />
                    </span>
                    Join invites
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Share a link so new members can join this organization in Discord.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <Button
                    type="button"
                    onClick={generateJoinInvite}
                    disabled={isGeneratingInvite}
                    className="w-full min-h-10 gap-2"
                    variant="secondary"
                  >
                    {isGeneratingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Plus className="h-4 w-4" aria-hidden />
                    )}
                    Generate join link
                  </Button>

                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-[10px] font-mono text-primary/90 bg-primary/10 px-2 py-1 rounded truncate max-w-[60%]">
                            {invite.token.substring(0, 10)}…
                          </code>
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 text-[10px] capitalize border-0',
                              invite.status === 'pending'
                                ? 'bg-amber-500/15 text-amber-200'
                                : 'bg-emerald-500/15 text-emerald-200'
                            )}
                          >
                            {invite.status}
                          </Badge>
                        </div>
                        {invite.status === 'pending' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full min-h-9 text-xs"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                            ) : (
                              <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                            )}
                            {copiedToken === invite.token ? 'Copied' : 'Copy invite link'}
                          </Button>
                        )}
                      </div>
                    ))}
                    {invites.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-4">No invites yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {isSuperAdmin && (
                <Card className="border-primary/35 bg-primary/5 shadow-md overflow-hidden">
                  <CardHeader className="pb-3 border-b border-primary/20">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary font-semibold">
                      <Shield className="h-4 w-4 shrink-0" aria-hidden />
                      Organization admin
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Create organizations and manage invites across the site.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Button variant="outline" size="sm" className="w-full min-h-10 gap-2 border-primary/30 hover:bg-primary/10" asChild>
                      <Link href="/admin/org-manager">
                        <Building2 className="h-4 w-4" aria-hidden />
                        Open org manager
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
