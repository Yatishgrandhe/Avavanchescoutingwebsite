import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
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
  Database
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
      <div className="absolute inset-0 bg-gradient-to-br from-avalanche-400 via-avalanche-500 to-avalanche-600"></div>
      
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
              transition={{ duration: 0.8 }}
              className="text-center space-y-4"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant="secondary" className="text-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  FRC 2025 Season
                </Badge>
              </div>
              <h1 className="text-4xl font-bold text-foreground">
                Welcome to Avalanche Scouting
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your comprehensive FRC 2025 scouting data platform with advanced analytics and real-time insights
              </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/scout'}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Start Scouting</CardTitle>
                  <CardDescription>
                    Begin collecting match data and team performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    New Scouting Session
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/analysis/basic'}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart className="w-6 h-6 text-blue-500" />
                  </div>
                  <CardTitle>View Analysis</CardTitle>
                  <CardDescription>
                    Analyze team performance and generate insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" size="lg">
                    <BarChart className="w-4 h-4 mr-2" />
                    Open Analytics
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/analysis/advanced'}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Database className="w-6 h-6 text-green-500" />
                  </div>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>
                    Manage teams, matches, and scouting data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" size="lg">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Data
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Teams Scouted</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">
                    +2 from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Matches Recorded</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">
                    +12 from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47.2</div>
                  <p className="text-xs text-muted-foreground">
                    +3.1 from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-xs text-muted-foreground">
                    +234 from last week
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Avalanche Animation Background */}
      <AvalancheAnimation />
      
      {/* Header Navigation */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-4">
            <Logo size="lg" />
            <div className="text-white font-bold text-2xl tracking-wide">
              Avalanche Scouting
            </div>
          </div>
        <div className="flex items-center space-x-4">
          <a href="/analysis/basic" className="text-white hover:text-gray-200 transition-colors">
            Data
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignIn}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
          >
            <Shield className="mr-1 w-4 h-4" />
            Login
            <ArrowRight className="ml-1 w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* In Development Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-medium mb-6"
          >
            In Development
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6"
          >
            Avalanche Scouting
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white mb-4 max-w-3xl mx-auto"
          >
            Advanced FRC scouting data platform for Avalanche Robotics.
          </motion.p>

          {/* Attribution */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg text-white/80 mb-8"
          >
            Comprehensive analytics and insights for competitive robotics teams.
          </motion.p>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
          <Button
            size="lg"
            onClick={handleSignIn}
            className="text-lg px-8 py-4"
          >
            <Shield className="mr-2 w-5 h-5" />
            Sign in with Discord
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Elements Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 40}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
