import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { Separator } from '../components/ui';
import {
  BarChart3,
  Target,
  Zap,
  Users,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  Play,
  Settings,
  Database,
  Activity,
  Clock,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import LandingPage, { LandingLoader } from '../components/landing/LandingPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useRefreshHandler } from '@/lib/refresh-handler';
import { fetchRecentMatchScoutingForActivity } from '@/lib/dashboard-activity';
import { getOrgCurrentEvent } from '@/lib/org-app-config';
import { getDashboardStatsForActiveEvent } from '@/lib/dashboard-event-stats';
import { getCachedValue, setCachedValue } from '@/lib/local-client-cache';
// Types for dashboard data (all from DB – no derived “success rate”)
interface DashboardStats {
  totalMatches: number;
  teamsCount: number;
  dataPoints: number;
  pitProfiles: number;
}

interface RecentActivity {
  id: string;
  type: 'match' | 'pit' | 'analysis';
  title: string;
  description: string;
  timestamp: string;
  icon: 'check' | 'clock' | 'chart';
}

export default function Home() {
  const { user, loading, supabase } = useSupabase();
  const router = useRouter();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalMatches: 0,
    teamsCount: 0,
    dataPoints: 0,
    pitProfiles: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dashboardEventLabel, setDashboardEventLabel] = useState<string | null>(null);

  useRefreshHandler();

  useEffect(() => {
    const { message, error, error_code, error_description } = router.query;

    // Handle error parameters from Supabase OAuth redirect
    if (error || error_code || error_description) {
      let errorMsg = '';

      // Decode error_description if present
      if (error_description && typeof error_description === 'string') {
        const decoded = decodeURIComponent(error_description);
        // Check if it's a hook 404 error (Edge Function not deployed)
        if (decoded.includes('404') || decoded.includes('status code returned from hook')) {
          errorMsg = "Authentication service is not properly configured. The Discord server verification function is not available. Please contact an administrator.";
        } else if (decoded.includes('Avalanche server') || decoded.includes('not allowed to login')) {
          errorMsg = "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again.";
        } else {
          errorMsg = decoded;
        }
      } else if (error && typeof error === 'string') {
        // Map common error codes to user-friendly messages
        switch (error) {
          case 'server_error':
            errorMsg = 'Authentication server error. Please try again in a few moments.';
            break;
          case 'access_denied':
            errorMsg = 'You denied access to your Discord account. Please try again and grant permission.';
            break;
          default:
            errorMsg = 'Authentication failed. Please try again.';
        }
      } else {
        errorMsg = 'An authentication error occurred. Please try again.';
      }

      // Redirect to error page with the message
      router.replace(`/auth/error?message=${encodeURIComponent(errorMsg)}&error=${error || error_code || 'unknown'}`);
      return;
    }

    // Handle message parameter (legacy)
    if (message && typeof message === 'string') {
      setErrorMessage(message);
      router.replace('/', undefined, { shallow: true });
    }
  }, [router.query, router]);

  useEffect(() => {
    if (user && supabase) {
      loadDashboardStats();
      loadRecentActivity();
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!user?.organization_id || !supabase) {
      setDashboardEventLabel(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;
      const res = await fetch('/api/my-competition', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok || cancelled) return;
      const j = await res.json();
      const label = String(j.current_event_name || j.current_event_key || '').trim();
      if (!cancelled) setDashboardEventLabel(label || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.organization_id, supabase]);

  const loadDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const orgId = user?.organization_id;
      if (!orgId) {
        setDashboardStats({
          totalMatches: 0,
          teamsCount: 0,
          dataPoints: 0,
          pitProfiles: 0,
        });
        return;
      }

      const { eventKey } = await getOrgCurrentEvent(supabase, orgId);
      if (!eventKey) {
        setDashboardStats({
          totalMatches: 0,
          teamsCount: 0,
          dataPoints: 0,
          pitProfiles: 0,
        });
        return;
      }

      const cacheKey = `dashboard:stats:${orgId}:${eventKey}`;
      const cachedStats = getCachedValue<DashboardStats>(cacheKey);
      if (cachedStats) {
        setDashboardStats(cachedStats);
        return;
      }

      const stats = await getDashboardStatsForActiveEvent(supabase, orgId, eventKey);
      setDashboardStats(stats);
      setCachedValue(cacheKey, stats, 45 * 1000);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadRecentActivity = async () => {
    setLoadingActivity(true);
    try {
      const orgId = user?.organization_id || 'none';
      const activityCacheKey = `dashboard:recent-activity:${orgId}`;
      const cachedActivity = getCachedValue<RecentActivity[]>(activityCacheKey);
      if (cachedActivity) {
        setRecentActivity(cachedActivity);
        return;
      }

      // Resolve CSV match IDs and team numbers for scoping
      let csvMatchIds: string[] = [];
      let csvTeamNumbers: number[] = [];
      if (user?.organization_id) {
        try {
          const { eventSource, eventMatchIds, eventTeamNumbers } = await getOrgCurrentEvent(supabase, user.organization_id);
          if (eventSource === 'csv') {
            csvMatchIds = eventMatchIds;
            csvTeamNumbers = eventTeamNumbers;
          }
        } catch {
          // Non-critical
        }
      }

      let pitQuery = supabase
        .from('pit_scouting_data')
        .select('id, team_number, robot_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      if (csvTeamNumbers.length > 0) {
        pitQuery = pitQuery.in('team_number', csvTeamNumbers);
      }

      const [enrichedScouting, pitRes] = await Promise.all([
        fetchRecentMatchScoutingForActivity(supabase, { orgId: user?.organization_id, limit: 5, csvMatchIds: csvMatchIds.length > 0 ? csvMatchIds : undefined }),
        pitQuery,
      ]);

      const activities: RecentActivity[] = [];

      enrichedScouting.forEach((entry) => {
        activities.push({
          id: entry.id,
          type: 'match',
          title: `Match ${entry.match_number ?? '?'} scouted`,
          description: `Team ${entry.team_number} • ${entry.team_name || '—'}`,
          timestamp: getTimeAgo(new Date(entry.created_at)),
          icon: 'check',
          _sort: new Date(entry.created_at).getTime(),
        } as RecentActivity & { _sort: number });
      });
      if (pitRes.data?.length) {
        pitRes.data.forEach((entry: any) => {
          activities.push({
            id: `pit-${entry.id}`,
            type: 'pit',
            title: 'Pit profile',
            description: `Team ${entry.team_number} • ${entry.robot_name || '—'}`,
            timestamp: getTimeAgo(new Date(entry.created_at)),
            icon: 'clock',
            _sort: new Date(entry.created_at).getTime(),
          } as RecentActivity & { _sort: number });
        });
      }

      type WithSort = RecentActivity & { _sort: number };
      (activities as WithSort[]).sort((a, b) => b._sort - a._sort);
      const recent = (activities as WithSort[]).slice(0, 5).map(({ _sort, ...rest }) => rest);
      setRecentActivity(recent);
      setCachedValue(activityCacheKey, recent, 20 * 1000);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  if (loading) return <LandingLoader />;

  // LOGGED IN DASHBOARD
  if (user) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-heading font-bold tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-muted-foreground mt-1.5">
                    Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'Scout'}.
                  </p>
                  {dashboardEventLabel ? (
                    <p className="text-sm text-muted-foreground/80 mt-0.5">
                      Active competition:{' '}
                      <span className="text-foreground font-medium">{dashboardEventLabel}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => loadDashboardStats()}
                    variant="outline"
                    size="sm"
                    disabled={loadingStats}
                  >
                    {loadingStats ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      'Refresh Data'
                    )}
                  </Button>
                  <Badge variant="outline" className="gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    System Online
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stats Cards – real data only */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Matches in schedule",
                  value: dashboardStats.totalMatches,
                  icon: Target,
                  description: dashboardEventLabel
                    ? "TBA schedule for active event"
                    : "Set active event in Team Management",
                },
                {
                  label: "Teams",
                  value: dashboardStats.teamsCount,
                  icon: Users,
                  description: dashboardEventLabel
                    ? "On event roster (TBA sync)"
                    : "Set active event in Team Management",
                },
                {
                  label: "Match scouting forms",
                  value: dashboardStats.dataPoints,
                  icon: Database,
                  description: "This event, your org",
                },
                {
                  label: "Pit profiles",
                  value: dashboardStats.pitProfiles,
                  icon: Activity,
                  description: "This event (linked to roster)",
                },
              ].map((stat, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <div className="space-y-2">
                        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.description}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Start Scouting",
                  description: "Collect match data",
                  icon: Target,
                  path: "/scout",
                  color: "text-blue-600 dark:text-blue-400"
                },
                {
                  title: "Pit Scouting",
                  description: "Robot analysis",
                  icon: Settings,
                  path: "/pit-scouting",
                  color: "text-purple-600 dark:text-purple-400"
                },
                {
                  title: "Data Analysis",
                  description: "View reports",
                  icon: BarChart3,
                  path: "/analysis/data",
                  color: "text-emerald-600 dark:text-emerald-400"
                },
                {
                  title: "Team Comparison",
                  description: "Compare stats",
                  icon: Users,
                  path: "/analysis/comparison",
                  color: "text-orange-600 dark:text-orange-400"
                }
              ].map((action, i) => (
                <Card
                  key={i}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => router.push(action.path)}
                >
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base mb-1">{action.title}</CardTitle>
                    <CardDescription className="text-xs">{action.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Stats Grid with Tabs */}
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Statistics Overview</CardTitle>
                  <CardDescription>Comprehensive view of scouting data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="stats">Statistics</TabsTrigger>
                      <TabsTrigger value="insights">Insights</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Matches in schedule</span>
                          <span className="text-sm font-medium">{loadingStats ? '...' : dashboardStats.totalMatches}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Teams (event roster)</span>
                          <span className="text-sm font-medium">{loadingStats ? '...' : dashboardStats.teamsCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Match scouting forms</span>
                          <span className="text-sm font-medium">{loadingStats ? '...' : dashboardStats.dataPoints}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Pit profiles</span>
                          <span className="text-sm font-medium">{loadingStats ? '...' : dashboardStats.pitProfiles}</span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="stats" className="mt-4">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Metric</TableHead>
                              <TableHead className="text-right">Value</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Matches in schedule</TableCell>
                              <TableCell className="text-right">{loadingStats ? '...' : dashboardStats.totalMatches}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                                  From event
                                </Badge>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Teams</TableCell>
                              <TableCell className="text-right">{loadingStats ? '...' : dashboardStats.teamsCount}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                  TBA roster
                                </Badge>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Match scouting forms</TableCell>
                              <TableCell className="text-right">{loadingStats ? '...' : dashboardStats.dataPoints}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                  Submitted
                                </Badge>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Pit profiles</TableCell>
                              <TableCell className="text-right">{loadingStats ? '...' : dashboardStats.pitProfiles}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
                                  Robot data
                                </Badge>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="insights" className="mt-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Insights</span>
                        </div>
                        {loadingStats ? (
                          <div className="space-y-2 text-sm text-muted-foreground">Loading…</div>
                        ) : (
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between rounded-lg border px-3 py-2">
                              <span className="text-muted-foreground">Match forms submitted</span>
                              <span className="font-medium">{dashboardStats.dataPoints}</span>
                            </div>
                            <div className="flex justify-between rounded-lg border px-3 py-2">
                              <span className="text-muted-foreground">Pit profiles</span>
                              <span className="font-medium">{dashboardStats.pitProfiles}</span>
                            </div>
                            <div className="flex justify-between rounded-lg border px-3 py-2">
                              <span className="text-muted-foreground">Teams in event</span>
                              <span className="font-medium">{dashboardStats.teamsCount}</span>
                            </div>
                            <div className="flex justify-between rounded-lg border px-3 py-2">
                              <span className="text-muted-foreground">Matches in schedule</span>
                              <span className="font-medium">{dashboardStats.totalMatches}</span>
                            </div>
                            {dashboardStats.totalMatches > 0 && (
                              <div className="flex justify-between rounded-lg border px-3 py-2 bg-muted/50">
                                <span className="text-muted-foreground">Forms per match</span>
                                <span className="font-medium">
                                  {(dashboardStats.dataPoints / dashboardStats.totalMatches).toFixed(1)}
                                </span>
                              </div>
                            )}
                            <div className="pt-2 flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => router.push('/analysis/data')}>
                                Data Analysis
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => router.push('/analysis/comparison')}>
                                Team Comparison
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Recent Activity Feed */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Activity Feed
                    </CardTitle>
                    <Badge variant="outline">Latest</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loadingActivity ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex gap-3 animate-pulse">
                            <div className="h-8 w-8 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-3/4 bg-muted rounded" />
                              <div className="h-3 w-1/2 bg-muted rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex gap-3 group">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.type === 'match' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                              activity.type === 'pit' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                            {activity.type === 'match' ? <CheckCircle className="h-4 w-4" /> :
                              activity.type === 'pit' ? <Settings className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium group-hover:text-primary transition-colors">
                              {activity.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                            <span className="text-xs text-muted-foreground mt-0.5 block">{activity.timestamp}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                        No recent activity
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return <LandingPage errorMessage={errorMessage} />;
}
