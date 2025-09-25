import React from 'react';
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
  CheckCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Logo from '../components/ui/Logo';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';

// Avalanche animation component
const AvalancheAnimation = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-primary-light"></div>
      
      {/* Animated particles */}
      {[...Array(100)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full opacity-60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.6, 1, 0.6],
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
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`large-${i}`}
          className="absolute w-2 h-2 bg-white/40 rounded-full"
          style={{
            left: `${20 + i * 10}%`,
            top: `${30 + (i % 2) * 40}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
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

export default function Home() {
  const { user, loading } = useSupabase();
  const router = useRouter();

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
          <div className="space-y-8">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-4"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Logo size="lg" />
                <h1 className="text-4xl font-heading font-bold text-foreground">
                  Welcome to Avalanche
                </h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Professional FRC scouting platform with advanced analytics and real-time data collection
              </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid-dashboard"
            >
              <Card className="card-modern group cursor-pointer" onClick={() => router.push('/scout')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary rounded-2xl text-primary-foreground">
                      <Target size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-card-foreground">Start Scouting</h3>
                      <p className="text-sm text-muted-foreground">Begin collecting match data</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Primary
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-modern group cursor-pointer" onClick={() => router.push('/pit-scouting')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-secondary rounded-2xl text-secondary-foreground">
                      <Settings size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-card-foreground">Pit Scouting</h3>
                      <p className="text-sm text-muted-foreground">Analyze robot capabilities</p>
                    </div>
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                      New
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-modern group cursor-pointer" onClick={() => router.push('/analysis/data')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-warning rounded-2xl text-white">
                      <BarChart3 size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-card-foreground">Data Analysis</h3>
                      <p className="text-sm text-muted-foreground">View comprehensive analytics</p>
                    </div>
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      Featured
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-modern group cursor-pointer" onClick={() => router.push('/analysis/comparison')}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-card border border-border rounded-2xl text-foreground">
                      <TrendingUp size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
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
              className="grid-stats"
            >
              <Card className="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Total Matches</p>
                      <p className="text-2xl font-heading font-bold text-card-foreground">47</p>
                      <p className="text-xs text-primary font-medium">+12% from last week</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Teams Scouted</p>
                      <p className="text-2xl font-heading font-bold text-card-foreground">23</p>
                      <p className="text-xs text-secondary font-medium">+8% from last week</p>
                    </div>
                    <div className="p-3 bg-secondary/10 rounded-2xl">
                      <Users className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                      <p className="text-2xl font-heading font-bold text-card-foreground">1,247</p>
                      <p className="text-xs text-warning font-medium">+15% from last week</p>
                    </div>
                    <div className="p-3 bg-warning/10 rounded-2xl">
                      <Database className="w-6 h-6 text-warning" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-heading font-bold text-card-foreground">94%</p>
                      <p className="text-xs text-success font-medium">+3% from last week</p>
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
              <Card className="card-modern">
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
                  <div className="flex items-center space-x-4 p-4 rounded-xl bg-muted/50">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">Match 47 completed</p>
                      <p className="text-xs text-muted-foreground">Team 1234 vs Team 5678</p>
                    </div>
                    <div className="text-xs text-muted-foreground">2 min ago</div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 rounded-xl bg-muted/50">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Clock className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">Pit scouting updated</p>
                      <p className="text-xs text-muted-foreground">Team 9999 robot analysis</p>
                    </div>
                    <div className="text-xs text-muted-foreground">15 min ago</div>
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 rounded-xl bg-muted/50">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground">New analytics report</p>
                      <p className="text-xs text-muted-foreground">Team performance comparison</p>
                    </div>
                    <div className="text-xs text-muted-foreground">1 hour ago</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {features.map((feature, index) => (
                <Card key={index} className="card-modern">
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-primary/10 rounded-2xl w-fit mx-auto mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-card-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
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

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Avalanche Background */}
      <AvalancheAnimation />
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4">
        <div className="flex items-center space-x-4">
          <Logo size="lg" />
          <div className="text-white font-heading font-bold text-2xl tracking-wide">
            Avalanche Scouting
          </div>
        </div>
        <div className="text-white/80 text-sm">
          FRC 2025 Data Platform
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-4xl text-center"
        >
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h1 className="text-4xl font-heading font-bold text-white mb-6">
              Professional FRC Scouting Platform
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Advanced analytics, real-time data collection, and comprehensive team analysis for competitive FRC teams
            </p>
            <Button
              onClick={handleSignIn}
              className="btn-primary bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8 py-4 text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            {benefits.map((benefit, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-white/20 rounded-2xl w-fit mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-heading font-semibold text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-white/70">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Bottom Branding */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-white/40">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Powered by Avalanche Robotics</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};