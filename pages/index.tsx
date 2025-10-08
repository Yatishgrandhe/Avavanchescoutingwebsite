import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Button } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { Badge } from '../components/ui/badge';
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
  BarChart,
  Settings,
  Database,
  Activity,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Logo from '../components/ui/Logo';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useRefreshHandler } from '@/lib/refresh-handler';

// Avalanche animation component
const AvalancheAnimation = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5"></div>
      
      {/* Animated particles */}
      {[...Array(80)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/60 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
      
      {/* Larger floating elements */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`large-${i}`}
          className="absolute w-2 h-2 bg-primary/30 rounded-full"
          style={{
            left: `${15 + i * 7}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
      
      {/* Medium floating elements */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={`medium-${i}`}
          className="absolute w-1.5 h-1.5 bg-white/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -25, 0],
            opacity: [0.1, 0.4, 0.1],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 2.5 + Math.random() * 1.5,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

const features = [
  {
    title: "Real-time Scoring",
    description: "Automatic calculation of FRC 2025 scoring with instant feedback",
    icon: Target,
  },
  {
    title: "Advanced Analytics",
    description: "Deep insights into team performance and strategic analysis",
    icon: BarChart3,
  },
  {
    title: "Team Comparison",
    description: "Side-by-side analysis of multiple teams and their capabilities",
    icon: Users,
  },
  {
    title: "Match Validation",
    description: "Integration with FRC APIs for accurate match and team data",
    icon: Shield,
  },
];

const benefits = [
  {
    title: "Professional Design",
    description: "Clean, modern interface designed for competitive use",
    icon: Sparkles,
  },
  {
    title: "Real-time Updates",
    description: "Live data synchronization across all connected devices",
    icon: Zap,
  },
  {
    title: "Performance Insights",
    description: "Advanced metrics and trends to inform strategic decisions",
    icon: TrendingUp,
  },
  {
    title: "Secure Authentication",
    description: "Discord OAuth integration for seamless team access",
    icon: Shield,
  },
];

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

export default function Home() {
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
      case 'check': return CheckCircle;
      case 'clock': return Clock;
      case 'chart': return BarChart3;
      default: return CheckCircle;
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

  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="content-container space-y-6 md:space-y-8">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                <Logo size="lg" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-foreground">
                  Welcome to Avalanche
                </h1>
              </div>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
                Professional FRC scouting platform with advanced analytics and real-time data collection
              </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            >
              <Card className="card-modern group cursor-pointer bg-card border-border" onClick={() => router.push('/scout')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="p-3 bg-primary rounded-2xl text-primary-foreground">
                      <Target size={24} />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="font-heading font-semibold text-card-foreground">Start Scouting</h3>
                      <p className="text-sm text-muted-foreground">Begin collecting match data</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Primary
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-modern group cursor-pointer bg-card border-border" onClick={() => router.push('/pit-scouting')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="p-3 bg-secondary rounded-2xl text-secondary-foreground">
                      <Settings size={24} />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="font-heading font-semibold text-card-foreground">Pit Scouting</h3>
                      <p className="text-sm text-muted-foreground">Analyze robot capabilities</p>
                    </div>
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                      New
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-modern group cursor-pointer bg-card border-border" onClick={() => router.push('/analysis/data')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="p-3 bg-warning rounded-2xl text-white">
                      <BarChart3 size={24} />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="font-heading font-semibold text-card-foreground">Data Analysis</h3>
                      <p className="text-sm text-muted-foreground">View comprehensive analytics</p>
                    </div>
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      Featured
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-modern group cursor-pointer bg-card border-border" onClick={() => router.push('/analysis/comparison')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="p-3 bg-card border border-border rounded-2xl text-foreground">
                      <TrendingUp size={24} />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h3 className="font-heading font-semibold text-card-foreground">Team Comparison</h3>
                      <p className="text-sm text-muted-foreground">Compare team performance</p>
                    </div>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Analytics
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            >
              <Card className="stat-card bg-card border-border">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-sm font-medium text-muted-foreground">Total Matches</p>
                      {loadingStats ? (
                        <div className="flex items-center justify-center sm:justify-start space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Loading...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-xl sm:text-2xl font-heading font-bold text-card-foreground">{dashboardStats.totalMatches}</p>
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
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-sm font-medium text-muted-foreground">Teams Registered</p>
                      {loadingStats ? (
                        <div className="flex items-center justify-center sm:justify-start space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Loading...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-xl sm:text-2xl font-heading font-bold text-card-foreground">{dashboardStats.teamsCount}</p>
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
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                      {loadingStats ? (
                        <div className="flex items-center justify-center sm:justify-start space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Loading...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-xl sm:text-2xl font-heading font-bold text-card-foreground">{dashboardStats.dataPoints}</p>
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
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-sm font-medium text-muted-foreground">Data Coverage</p>
                      {loadingStats ? (
                        <div className="flex items-center justify-center sm:justify-start space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">Loading...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-xl sm:text-2xl font-heading font-bold text-card-foreground">{dashboardStats.successRate}%</p>
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

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {features.map((feature, index) => (
                <Card key={index} className="card-modern bg-card border-border">
                  <CardContent className="p-4 md:p-6 text-center">
                    <div className="p-3 bg-primary/10 rounded-2xl w-fit mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-card-foreground mb-2 text-sm sm:text-base">
                      {feature.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // Landing page for non-authenticated users - Match production site exactly
  return (
    <div className="min-h-screen bg-background refresh-safe size-on-refresh relative overflow-hidden">
      {/* Dynamic Background Animation */}
      <AvalancheAnimation />
      
      {/* Header Banner */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border refresh-safe relative z-10">
        <div className="flex items-center justify-between px-6 py-4 refresh-safe">
          <div className="flex items-center space-x-3">
            <Logo size="sm" />
            <div>
              <h2 className="text-lg font-heading font-bold text-card-foreground">Avalanche Scouting</h2>
              <p className="text-xs text-muted-foreground">FRC 2025 Data Platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-main refresh-safe size-on-refresh relative z-10">
        {/* Hero Section */}
        <div className="text-center py-8 md:py-12 px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Professional FRC Scouting Platform
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Advanced analytics, real-time data collection, and comprehensive team analysis for competitive FRC teams
          </p>
          <Button
            onClick={handleSignIn}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 md:px-8 py-3 text-base md:text-lg w-full sm:w-auto"
          >
            <Play className="w-5 h-5 mr-2" />
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 py-8 md:py-12 px-4">
          {benefits.map((benefit, index) => (
            <Card key={index} className="card-modern">
              <CardContent className="p-4 md:p-6 text-center">
                <div className="p-3 bg-primary/10 rounded-2xl w-fit mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-card-foreground mb-2 text-sm sm:text-base">
                  {benefit.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-6 md:py-8 px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Powered by Avalanche Robotics</span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};