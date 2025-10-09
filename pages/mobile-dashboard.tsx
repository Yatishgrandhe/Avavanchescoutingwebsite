import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { Button } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { 
  Target, 
  Settings,
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  Database,
  Shield,
  Loader2,
  Home,
  Menu
} from 'lucide-react';
import { useSupabase } from '@/pages/_app';
import { useRefreshHandler } from '@/lib/refresh-handler';

// Types for dashboard data
interface DashboardStats {
  totalMatches: number;
  teamsCount: number;
  dataPoints: number;
  successRate: number;
}

interface RecentActivity {
  id: string;
  type: 'match' | 'pit' | 'analysis';
  title: string;
  description: string;
  timestamp: string;
  icon: 'check' | 'clock' | 'chart';
}

export default function MobileDashboard() {
  const { user, loading, supabase } = useSupabase();
  const router = useRouter();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalMatches: 0,
    teamsCount: 0,
    dataPoints: 0,
    successRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Handle refresh and resize properly
  useRefreshHandler();

  // Load dashboard statistics from Supabase
  useEffect(() => {
    if (user && supabase) {
      loadDashboardStats();
      loadRecentActivity();
    }
  }, [user, supabase]);

  const loadDashboardStats = async () => {
    setLoadingStats(true);
    try {
      // Get total matches count
      const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });

      // Get total teams count
      const { count: teamsCount } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      // Get total scouting data entries
      const { count: scoutingDataCount } = await supabase
        .from('scouting_data')
        .select('*', { count: 'exact', head: true });

      // Calculate success rate (percentage of matches with complete data)
      const { data: matchesWithData } = await supabase
        .from('scouting_data')
        .select('match_id')
        .not('match_id', 'is', null);

      const uniqueMatchesWithData = matchesWithData ? new Set(matchesWithData.map((item: any) => item.match_id)).size : 0;
      const successRate = matchesCount ? Math.round((uniqueMatchesWithData / matchesCount) * 100) : 0;

      setDashboardStats({
        totalMatches: matchesCount || 0,
        teamsCount: teamsCount || 0,
        dataPoints: scoutingDataCount || 0,
        successRate: successRate,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Keep default values on error
    } finally {
      setLoadingStats(false);
    }
  };

  const loadRecentActivity = async () => {
    setLoadingActivity(true);
    try {
      // Get recent scouting data entries
      const { data: recentScoutingData } = await supabase
        .from('scouting_data')
        .select(`
          id,
          match_id,
          team_number,
          created_at,
          matches:match_id (
            match_number,
            event_key
          ),
          teams:team_number (
            team_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];

      if (recentScoutingData) {
        recentScoutingData.forEach((entry: any) => {
          const timeAgo = getTimeAgo(new Date(entry.created_at));
          activities.push({
            id: entry.id,
            type: 'match',
            title: `Match ${entry.matches?.match_number || 'Unknown'} completed`,
            description: `Team ${entry.team_number} - ${entry.teams?.team_name || 'Unknown Team'}`,
            timestamp: timeAgo,
            icon: 'check',
          });
        });
      }

      // Add some sample pit scouting and analysis activities if needed
      if (activities.length < 3) {
        activities.push({
          id: 'pit-1',
          type: 'pit',
          title: 'Pit scouting updated',
          description: 'Robot capabilities analysis',
          timestamp: '1 hour ago',
          icon: 'clock',
        });
      }

      if (activities.length < 3) {
        activities.push({
          id: 'analysis-1',
          type: 'analysis',
          title: 'New analytics report',
          description: 'Team performance comparison',
          timestamp: '2 hours ago',
          icon: 'chart',
        });
      }

      setRecentActivity(activities.slice(0, 3)); // Keep only top 3
    } catch (error) {
      console.error('Error loading recent activity:', error);
      // Set default activity on error
      setRecentActivity([
        {
          id: 'default-1',
          type: 'match',
          title: 'Welcome to Avalanche',
          description: 'Start scouting to see activity here',
          timestamp: 'now',
          icon: 'check',
        }
      ]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'check': return Target;
      case 'clock': return Activity;
      case 'chart': return BarChart3;
      default: return Target;
    }
  };

  const getActivityIconColor = (type: string) => {
    switch (type) {
      case 'match': return 'text-primary';
      case 'pit': return 'text-secondary';
      case 'analysis': return 'text-warning';
      default: return 'text-primary';
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'match': return 'bg-primary/10';
      case 'pit': return 'bg-secondary/10';
      case 'analysis': return 'bg-warning/10';
      default: return 'bg-primary/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="p-2"
            >
              <Home size={20} />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
            >
              <Menu size={20} />
            </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card border-b border-border"
          >
          <div className="p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                router.push('/scout');
                setIsMenuOpen(false);
              }}
            >
              <Target className="w-4 h-4 mr-2" />
              Start Scouting
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                router.push('/pit-scouting');
                setIsMenuOpen(false);
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Pit Scouting
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                router.push('/analysis/data');
                setIsMenuOpen(false);
              }}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Data Analysis
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                router.push('/analysis/comparison');
                setIsMenuOpen(false);
              }}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Team Comparison
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                router.push('/pick-list');
                setIsMenuOpen(false);
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Pick Lists
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                router.push('/learn-game');
                setIsMenuOpen(false);
              }}
            >
              <Database className="w-4 h-4 mr-2" />
              Learn Game
            </Button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-foreground">
            Welcome to Avalanche
          </h2>
          <p className="text-muted-foreground">
            Professional FRC scouting platform with advanced analytics
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <Card className="card-modern cursor-pointer" onClick={() => router.push('/mobile-scout')}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-primary rounded-2xl text-primary-foreground">
                    <Target size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground">Start Scouting</h3>
                    <p className="text-sm text-muted-foreground">Begin collecting match data</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Primary
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern cursor-pointer" onClick={() => router.push('/pit-scouting')}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-secondary rounded-2xl text-secondary-foreground">
                    <Settings size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground">Pit Scouting</h3>
                    <p className="text-sm text-muted-foreground">Analyze robot capabilities</p>
                  </div>
                  <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                    New
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern cursor-pointer" onClick={() => router.push('/analysis/data')}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-warning rounded-2xl text-white">
                    <BarChart3 size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground">Data Analysis</h3>
                    <p className="text-sm text-muted-foreground">View comprehensive analytics</p>
                  </div>
                  <Badge variant="secondary" className="bg-warning/10 text-warning">
                    Featured
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-foreground">Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Card className="stat-card bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Total Matches</p>
                    {loadingStats ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-card-foreground">{dashboardStats.totalMatches}</p>
                        <p className="text-xs text-primary font-medium">
                          {dashboardStats.totalMatches > 0 ? 'Active matches tracked' : 'No matches yet'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Teams Registered</p>
                    {loadingStats ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-card-foreground">{dashboardStats.teamsCount}</p>
                        <p className="text-xs text-secondary font-medium">
                          {dashboardStats.teamsCount > 0 ? 'Teams in database' : 'No teams registered'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-secondary/10 rounded-2xl">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                    {loadingStats ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-card-foreground">{dashboardStats.dataPoints}</p>
                        <p className="text-xs text-warning font-medium">
                          {dashboardStats.dataPoints > 0 ? 'Scouting entries collected' : 'Start scouting!'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-warning/10 rounded-2xl">
                    <Database className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Data Coverage</p>
                    {loadingStats ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-card-foreground">{dashboardStats.successRate}%</p>
                        <p className="text-xs text-success font-medium">
                          {dashboardStats.successRate > 0 ? 'Matches with data' : 'No data yet'}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-success/10 rounded-2xl">
                    <Shield className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="card-modern bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-primary" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>
                Latest scouting data and team updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading recent activity...</span>
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity) => {
                  const IconComponent = getActivityIcon(activity.icon);
                  return (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-xl bg-muted/50">
                      <div className={`p-2 ${getActivityBgColor(activity.type)} rounded-lg`}>
                        <IconComponent className={`w-5 h-5 ${getActivityIconColor(activity.type)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-sm text-muted-foreground">Start scouting to see activity here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
