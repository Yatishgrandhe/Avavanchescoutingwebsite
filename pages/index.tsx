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
import Logo from '../components/ui/Logo';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useRefreshHandler } from '@/lib/refresh-handler';

// Enhanced Avalanche Animation
const AvalancheAnimation = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      {/* Animated particles */}
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/40 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Larger floating glowing orbs */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: `${200 + Math.random() * 300}px`,
            height: `${200 + Math.random() * 300}px`,
            background: i % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
            left: `${Math.random() * 80}%`,
            top: `${Math.random() * 80}%`,
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -50, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 2,
            type: "spring", stiffness: 10
          }}
        />
      ))}
    </div>
  );
};

const features = [
  {
    title: "Real-time Scoring",
    description: "Instant feedback with automatic FRC 2026 Rebuilt score calculation.",
    icon: Target,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10"
  },
  {
    title: "Advanced Analytics",
    description: "Deep dive into team performance metrics and strategic trends.",
    icon: BarChart3,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10"
  },
  {
    title: "Team Comparison",
    description: "Side-by-side capability analysis for effective alliance selection.",
    icon: Users,
    color: "text-green-400",
    bgColor: "bg-green-400/10"
  },
  {
    title: "Match Validation",
    description: "Automated verification against FRC APIs for data integrity.",
    icon: Shield,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10"
  },
];

const benefits = [
  {
    title: "Professional Design",
    description: "Clean, glassmorphic interface optimized for dark environments.",
    icon: Sparkles,
  },
  {
    title: "Real-time Updates",
    description: "Live synchronization across all team devices instantly.",
    icon: Zap,
  },
  {
    title: "Performance Insights",
    description: "Visual metrics to guide match strategy and picking.",
    icon: TrendingUp,
  },
  {
    title: "Secure Access",
    description: "Role-based authentication via Discord for team security.",
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useRefreshHandler();

  useEffect(() => {
    const { message, error } = router.query;
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

  const loadDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const { count: matchesCount } = await supabase.from('matches').select('*', { count: 'exact', head: true });
      const { count: teamsCount } = await supabase.from('teams').select('*', { count: 'exact', head: true });
      const { count: scoutingDataCount } = await supabase.from('scouting_data').select('*', { count: 'exact', head: true });

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
    } finally {
      setLoadingStats(false);
    }
  };

  const loadRecentActivity = async () => {
    setLoadingActivity(true);
    try {
      const { data: recentScoutingData } = await supabase
        .from('scouting_data')
        .select(`
          id,
          match_id,
          team_number,
          created_at,
          matches:match_id (match_number, event_key),
          teams:team_number (team_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];

      if (recentScoutingData) {
        recentScoutingData.forEach((entry: any) => {
          activities.push({
            id: entry.id,
            type: 'match',
            title: `Match ${entry.matches?.match_number || 'Unknown'} Scouted`,
            description: `Team ${entry.team_number} • ${entry.teams?.team_name || 'Avalanche'}`,
            timestamp: getTimeAgo(new Date(entry.created_at)),
            icon: 'check',
          });
        });
      }

      if (activities.length < 3) {
        activities.push({
          id: 'pit-sample',
          type: 'pit',
          title: 'Pit Scouting Updated',
          description: 'Robot mechanics analyzed for Team 2724',
          timestamp: '1 hour ago',
          icon: 'clock',
        });
      }

      setRecentActivity(activities.slice(0, 3));
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([{
        id: 'default',
        type: 'match',
        title: 'Welcome to Avalanche',
        description: 'Start scouting to populate this feed',
        timestamp: 'now',
        icon: 'check',
      }]);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD
  if (user) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-8 animate-in-fade">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                  Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                  Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'Scout'}. Ready for the competition?
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => loadDashboardStats()} variant="outline" size="sm" className="glass bg-white/5 hover:bg-white/10 border-white/10 text-xs">
                  Refresh Data
                </Button>
                <div className="text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 animate-pulse"></span>
                  System Online
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Start Scouting", subtitle: "Collect match data", icon: Target, path: "/scout", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                { title: "Pit Scouting", subtitle: "Robot analysis", icon: Settings, path: "/pit-scouting", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                { title: "Data Analysis", subtitle: "View reports", icon: BarChart3, path: "/analysis/data", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                { title: "Team Comparison", subtitle: "Compare stats", icon: Users, path: "/analysis/comparison", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" }
              ].map((action, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(action.path)}
                  className={`glass-card p-4 rounded-xl flex items-center space-x-4 text-left group border ${action.border}`}
                >
                  <div className={`p-3 rounded-lg ${action.bg} ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-white transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                  </div>
                  <ChevronRight className="ml-auto text-white/20 group-hover:text-white/50 transition-colors" size={18} />
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stats Grid */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Total Matches", value: dashboardStats.totalMatches, icon: Target, color: "text-blue-400" },
                  { label: "Teams Tracked", value: dashboardStats.teamsCount, icon: Users, color: "text-purple-400" },
                  { label: "Data Points", value: dashboardStats.dataPoints, icon: Database, color: "text-emerald-400" },
                  { label: "Success Rate", value: `${dashboardStats.successRate}%`, icon: Activity, color: "text-orange-400" }
                ].map((stat, i) => (
                  <div key={i} className="glass-card p-5 rounded-xl flex items-center justify-between border-l-4 border-l-primary/50 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-5 pointer-events-none">
                      <stat.icon size={64} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      {loadingStats ? (
                        <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-1" />
                      ) : (
                        <h2 className="text-2xl font-bold text-foreground mt-1 font-heading">{stat.value}</h2>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                  </div>
                ))}

                {/* Feature Highlights (Mini) */}
                <div className="col-span-1 sm:col-span-2 glass-card p-5 rounded-xl border border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Quick Insights</h3>
                    <Sparkles size={16} className="text-primary" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Rankings', 'Averages', 'Predictions'].map((item) => (
                      <div key={item} className="text-center p-2 rounded-lg bg-background/40 border border-white/5 text-xs text-muted-foreground hover:text-white hover:bg-white/10 cursor-pointer transition-colors">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity Feed */}
              <div className="glass-card rounded-xl flex flex-col h-full max-h-[400px]">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    Activity Feed
                  </h3>
                  <Badge variant="outline" className="text-[10px] h-5 border-white/10 bg-white/5">Latest</Badge>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                  {loadingActivity ? (
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 animate-pulse">
                          <div className="w-8 h-8 rounded-full bg-white/5" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-white/5 rounded" />
                            <div className="h-3 w-1/2 bg-white/5 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex gap-3 group">
                        <div className={`mt-1 p-1.5 rounded-full h-fit flex-shrink-0 ${activity.type === 'match' ? 'bg-blue-500/20 text-blue-400' :
                          activity.type === 'pit' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                          {activity.type === 'match' ? <CheckCircle size={14} /> :
                            activity.type === 'pit' ? <Settings size={14} /> : <BarChart3 size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                          <span className="text-[10px] text-white/30 mt-1 block">{activity.timestamp}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs">
                      <Clock size={24} className="mb-2 opacity-50" />
                      No recent activity
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-white/5">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-white justify-between group">
                    View All Activity
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  // LANDING PAGE (Non-authenticated)
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <AvalancheAnimation />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="container mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <Logo size="sm" />
            <span className="text-sm sm:text-lg font-heading font-bold text-foreground tracking-tight truncate">Avalanche Scouting</span>
          </div>
          <Button onClick={handleSignIn} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full px-3 sm:px-6 flex-shrink-0">
            <span className="hidden sm:inline">Sign In</span>
            <span className="sm:hidden">Sign In</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 flex flex-col items-center justify-center text-center relative z-20 max-w-full overflow-x-hidden">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-3 px-4 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-2 text-red-200 text-sm backdrop-blur-md"
          >
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="mb-6 relative"
        >
          <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-50"></div>
          <Badge className="relative bg-primary/20 text-primary-foreground hover:bg-primary/30 border-primary/20 px-4 py-1.5 text-sm rounded-full mb-6 transition-all">
            FRC 2026 Rebuilt Ready
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/50 mb-6 tracking-tight max-w-4xl px-4"
        >
          Precision Scouting for <br className="hidden md:block" /> Championship Performance
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground/80 max-w-2xl mb-10 leading-relaxed px-4"
        >
          The advanced data platform for Avalanche Robotics.
          Real-time analytics, predictive modeling, and comprehensive robot validation.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4"
        >
          <Button onClick={handleSignIn} size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all font-semibold text-lg">
            System Access <ArrowRight size={20} className="ml-2" />
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full border-white/10 hover:bg-white/5 text-white hover:border-white/20 transition-all font-medium backdrop-blur-sm">
            Read Documentation
          </Button>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-24 w-full px-4"
        >
          {features.map((feature, i) => (
            <div key={i} className="glass-card p-6 rounded-2xl text-left border border-white/5 hover:border-primary/20 transition-all group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.bgColor} ${feature.color} group-hover:scale-110 transition-transform`}>
                <feature.icon size={24} />
              </div>
              <h3 className="font-semibold text-foreground text-base sm:text-lg mb-2 break-words">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-8 text-center text-xs text-muted-foreground/50 border-t border-white/5 bg-background/50 backdrop-blur-xl">
        <p>© 2026 Avalanche Robotics • FRC Team 2724</p>
      </footer>
    </div>
  );
};