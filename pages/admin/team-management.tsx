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

  // Invite Management State
  const [invites, setInvites] = useState<any[]>([]);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOrg() {
      // If no org ID, check if they are a superadmin for a better fallback
      if (!user?.organization_id) {
        if (!cancelled) {
          if (user?.role === 'superadmin') {
            setOrgName('Avalanche (Global)');
          } else {
            setOrgName(null);
          }
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
          // If ID exists but no record, or no name
          setOrgName(user?.role === 'superadmin' ? 'Avalanche (Global)' : 'Unknown');
        }
      } catch (err) {
        console.error('Failed to load organization', err);
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
                      className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 brightness-110"
                      size="sm"
                    >
                      {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Update Competition Details
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
                        className="w-full gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white hover:shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95"
                        onClick={handleArchiveCompetition}
                        disabled={isArchiving}
                      >
                        {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                        Archive Current Competition
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href="/past-competitions" className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5 border border-primary/20 px-4 py-2 rounded-lg bg-primary/5 w-fit hover:bg-primary/10 transition-colors shadow-sm">
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
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-green-500/30 transition-all group cursor-pointer shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 font-medium">
                            <ClipboardList className="w-4 h-4 text-green-500" />
                            Review Submissions
                          </div>
                          <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-muted-foreground">Detailed list of all match and pit scouting forms.</p>
                      </div>
                    </Link>
                    <Link href="/admin/scouting-stats">
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-green-500/30 transition-all group cursor-pointer shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 font-medium">
                            <FileSpreadsheet className="w-4 h-4 text-green-500" />
                            Scouting Leaderboard
                          </div>
                          <ChevronDown className="w-4 h-4 -rotate-90 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-muted-foreground">Performance metrics and student rankings.</p>
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
                    className="w-full justify-between h-11 px-4 group border-white/10 hover:border-primary/50 hover:bg-white/[0.02] transition-all"
                    disabled={locksLoading}
                    onClick={() => setMatchScoutingLocked(!matchScoutingLocked)}
                  >
                    <span className="flex items-center gap-2.5">
                      {matchScoutingLocked ? (
                        <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Unlock className="w-3.5 h-3.5 text-green-500" />
                        </div>
                      )}
                      <span className="font-semibold text-xs tracking-tight text-white/90">Match Scouting</span>
                    </span>
                    <Badge variant={matchScoutingLocked ? "destructive" : "outline"} className={cn(
                      "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 border-none",
                      matchScoutingLocked ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                    )}>
                      {matchScoutingLocked ? "LOCKED" : "OPEN"}
                    </Badge>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-11 px-4 group border-white/10 hover:border-primary/50 hover:bg-white/[0.02] transition-all"
                    disabled={locksLoading}
                    onClick={() => setPitScoutingLocked(!pitScoutingLocked)}
                  >
                    <span className="flex items-center gap-2.5">
                      {pitScoutingLocked ? (
                        <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Unlock className="w-3.5 h-3.5 text-green-500" />
                        </div>
                      )}
                      <span className="font-semibold text-xs tracking-tight text-white/90">Pit Scouting</span>
                    </span>
                    <Badge variant={pitScoutingLocked ? "destructive" : "outline"} className={cn(
                      "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 border-none",
                      pitScoutingLocked ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                    )}>
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
                      placeholder="Enter student name..." 
                      className="h-10 glass-input bg-white/[0.02]"
                      value={newScoutName}
                      onChange={(e) => setNewScoutName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addScout()}
                    />
                    <Button 
                      size="icon" 
                      className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 brightness-110" 
                      onClick={addScout} 
                      disabled={scoutsLoading || !newScoutName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {scouts.map((scout) => (
                      <div key={scout.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-sm group hover:border-primary/30 hover:bg-white/[0.04] transition-all">
                        <span className="font-medium tracking-tight text-white/90">{scout.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/50 hover:text-red-500 hover:bg-red-500/10 transition-colors" onClick={() => deleteScout(scout.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {scouts.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-6 italic opacity-50">No students added yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Member Invites Card */}
              <Card className="border-border/80 bg-gradient-to-br from-white/[0.02] to-transparent shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-500" />
                    Member Direct Invites
                  </CardTitle>
                  <CardDescription>Generate links for new students to join the team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={generateJoinInvite}
                    disabled={isGeneratingInvite}
                    className="w-full bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 gap-2 h-10 brightness-110 active:scale-95"
                  >
                    {isGeneratingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Generate New Join Link
                  </Button>

                  <div className="space-y-2 pt-2">
                    {invites.map((invite) => (
                      <div key={invite.id} className="p-3 rounded-lg border border-white/5 bg-white/[0.01] space-y-2 group hover:bg-white/[0.02] transition-colors shadow-sm">
                        <div className="flex items-center justify-between">
                          <code className="text-[10px] font-mono text-blue-400/80 bg-blue-400/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {invite.token.substring(0, 10)}...
                          </code>
                          <Badge variant="outline" className={cn(
                            "text-[9px] uppercase font-bold tracking-widest border-none px-1.5",
                            invite.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"
                          )}>
                            {invite.status}
                          </Badge>
                        </div>
                        {invite.status === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full h-8 text-[11px] font-bold border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 gap-2 transition-all active:scale-95"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            {copiedToken === invite.token ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Database className="w-3.5 h-3.5" />}
                            {copiedToken === invite.token ? 'Copied URL!' : 'Copy Invite Link'}
                          </Button>
                        )}
                      </div>
                    ))}
                    {invites.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-2 italic opacity-40">No invitations generated yet.</p>
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
                      <Button variant="outline" size="sm" className="w-full gap-2 text-[11px] font-black tracking-widest uppercase border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-95">
                        <Building2 className="w-3.5 h-3.5" />
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
