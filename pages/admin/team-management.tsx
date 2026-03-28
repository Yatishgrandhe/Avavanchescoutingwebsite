import React, { useEffect, useState } from 'react';
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
  Upload,
  FileUp,
  X,
  Check,
  AlertCircle,
  Settings,
  Clock,
  ExternalLink,
  ChevronDown,
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
  const { user, supabase } = useSupabase();
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

  // Match Schedule State
  const [uploadingSchedule, setUploadingSchedule] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Competition Settings State
  const [eventKey, setEventKey] = useState('');
  const [eventName, setEventName] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadOrg() {
      if (!user?.organization_id) {
        setOrgName(null);
        setOrgLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', user.organization_id)
        .maybeSingle();
      if (!cancelled && !error && data?.name) setOrgName(data.name);
      else if (!cancelled) setOrgName(null);
      if (!cancelled) setOrgLoading(false);
    }
    loadOrg();
    fetchScouts();
    fetchCompetitionSettings();
    return () => {
      cancelled = true;
    };
  }, [user?.organization_id, supabase]);

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

  const handleScheduleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    setUploadingSchedule(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const res = await fetch('/api/admin/upload-schedule', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ csv: text }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Successfully uploaded ${data.count} matches`);
        } else {
          toast.error(data.error || 'Failed to upload schedule');
        }
      } catch (err) {
        toast.error('Failed to upload schedule');
      } finally {
        setUploadingSchedule(false);
      }
    };
    reader.readAsText(file);
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
            <Card className="max-w-md w-full text-center p-8 border-destructive/20">
              <Shield className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-60" />
              <h2 className="text-xl font-bold mb-2">Access denied</h2>
              <p className="text-muted-foreground text-sm">Team Management is only available to organization admins.</p>
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

        <div className="max-w-5xl mx-auto space-y-8 pb-16 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
              Manage your organization's scouting operations, students, and competition data.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium">
                Organization:{' '}
                {orgLoading ? (
                  <span className="text-muted-foreground">Loading…</span>
                ) : (
                  <span className="text-foreground">{orgName ?? 'Unknown'}</span>
                )}
              </span>
            </div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Competition Card */}
              <Card className="border-border/80">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        Competition Management
                      </CardTitle>
                      <CardDescription>Manage active competition and match schedules.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Active Competition Settings */}
                  <div className="p-4 rounded-xl border bg-muted/10 space-y-4">
                    <div className="flex items-center gap-2 font-medium">
                      <Settings className="w-4 h-4 text-primary" />
                      Active Competition Details
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="event-key" className="text-xs">Event Key (e.g. 2024ncral)</Label>
                        <Input 
                          id="event-key"
                          placeholder="2024ncral"
                          value={eventKey}
                          onChange={(e) => setEventKey(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="event-name" className="text-xs">Competition Name</Label>
                        <Input 
                          id="event-name"
                          placeholder="Greater Raleigh Regional"
                          value={eventName}
                          onChange={(e) => setEventName(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleSaveCompetition} 
                      disabled={isSavingSettings || settingsLoading}
                      className="w-full sm:w-auto gap-2"
                      size="sm"
                    >
                      {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Competition Details
                    </Button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                      <div className="flex items-center gap-2 font-medium">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        Schedule Upload
                      </div>
                      <div className="space-y-2">
                        <Input 
                          id="schedule-upload" 
                          type="file" 
                          accept=".csv" 
                          className="text-xs"
                          onChange={handleScheduleUpload}
                          disabled={uploadingSchedule}
                        />
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          CSV Format: match_key,scheduled_date,scheduled_time,comp_level,match_number,set_number,red1...blue3,red_score,blue_score
                        </p>
                      </div>
                      {uploadingSchedule && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing schedule...
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                      <div className="flex items-center gap-2 font-medium text-amber-500">
                        <Clock className="w-4 h-4" />
                        Archive Competition
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Snapshot the current competition and move it to past records.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors"
                        onClick={handleArchiveCompetition}
                        disabled={isArchiving}
                      >
                        {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        Archive Current Event
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href="/past-competitions" className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5 border border-primary/20 px-4 py-2 rounded-lg bg-primary/5 w-fit">
                      <ExternalLink className="w-4 h-4" />
                      View Competitive History & Records
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Data & Stats Card */}
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    Review & Analytics
                  </CardTitle>
                  <CardDescription>Verify scouting submissions and track scout performance.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Link href="/admin/scouting-stats/forms">
                      <div className="p-4 rounded-xl border hover:bg-muted/30 transition-colors group cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 font-medium">
                            <ClipboardList className="w-4 h-4 text-green-500" />
                            Review Submissions
                          </div>
                          <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <p className="text-xs text-muted-foreground">View, edit, or delete match scouting forms.</p>
                      </div>
                    </Link>
                    <Link href="/admin/scouting-stats">
                      <div className="p-4 rounded-xl border hover:bg-muted/30 transition-colors group cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 font-medium">
                            <FileSpreadsheet className="w-4 h-4 text-green-500" />
                            Scouting Stats
                          </div>
                          <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <p className="text-xs text-muted-foreground">Leaderboards and stats per student/scout.</p>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Locks Card */}
              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Scouting Locks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10 px-4 group"
                    disabled={locksLoading}
                    onClick={() => setMatchScoutingLocked(!matchScoutingLocked)}
                  >
                    <span className="flex items-center gap-2">
                      {matchScoutingLocked ? (
                        <Lock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                      ) : (
                        <Unlock className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
                      )}
                      {matchScoutingLocked ? 'Match Scouting: LOCKED' : 'Match Scouting: OPEN'}
                    </span>
                    <Badge variant={matchScoutingLocked ? "destructive" : "outline"} className="text-[9px]">
                      {matchScoutingLocked ? "LOCKED" : "OPEN"}
                    </Badge>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10 px-4 group"
                    disabled={locksLoading}
                    onClick={() => setPitScoutingLocked(!pitScoutingLocked)}
                  >
                    <span className="flex items-center gap-2">
                      {pitScoutingLocked ? (
                        <Lock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                      ) : (
                        <Unlock className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
                      )}
                      {pitScoutingLocked ? 'Pit Scouting: LOCKED' : 'Pit Scouting: OPEN'}
                    </span>
                    <Badge variant={pitScoutingLocked ? "destructive" : "outline"} className="text-[9px]">
                      {pitScoutingLocked ? "LOCKED" : "OPEN"}
                    </Badge>
                  </Button>
                </CardContent>
              </Card>

              {/* Student management Card */}
              <Card className="border-border/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Scouts & Student Management
                  </CardTitle>
                  <CardDescription>Manage students who will appear in the form dropdown.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add student name..." 
                      className="h-9 glass-input"
                      value={newScoutName}
                      onChange={(e) => setNewScoutName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addScout()}
                    />
                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={addScout} disabled={scoutsLoading || !newScoutName.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {scouts.map((scout) => (
                      <div key={scout.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border text-sm group hover:border-primary/30 transition-colors">
                        <span className="font-medium tracking-tight">{scout.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => deleteScout(scout.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {scouts.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-4 italic">No students added yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {isSuperAdmin && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary font-bold">
                      <Shield className="w-4 h-4" />
                      GLOBAL ORG MANAGER
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href="/admin/org-manager">
                      <Button variant="outline" size="sm" className="w-full gap-2 text-xs border-primary/20 hover:bg-primary/10">
                        <Building2 className="w-4 h-4" />
                        Open Org Manager
                      </Button>
                    </Link>
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
