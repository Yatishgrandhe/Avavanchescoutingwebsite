import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
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
  TreePine,
  Waves
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Logo from '@/components/ui/Logo';

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
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to data analysis page
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/analysis/basic');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Redirecting to data analysis...</p>
        </motion.div>
      </div>
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
            <div className="text-white font-semibold text-xl">
              REEFSCAPE Scouting
            </div>
          </div>
        <div className="flex items-center space-x-4">
          <a href="/analysis/basic" className="text-white hover:text-gray-200 transition-colors">
            Data
          </a>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => signIn('discord')}
            className="bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Login <ArrowRight className="ml-1 w-4 h-4" />
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
            REEFSCAPE Scouting Platform
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white mb-4 max-w-3xl mx-auto"
          >
            Advanced scouting data platform for FRC 2025 REEFSCAPE.
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

          {/* Game Elements Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex justify-center space-x-8 mb-8"
          >
            <div className="flex items-center space-x-2 text-white/80">
              <Play className="w-5 h-5" />
              <span>Autonomous</span>
            </div>
            <div className="flex items-center space-x-2 text-white/80">
              <TreePine className="w-5 h-5" />
              <span>Coral</span>
            </div>
            <div className="flex items-center space-x-2 text-white/80">
              <Waves className="w-5 h-5" />
              <span>Algae</span>
            </div>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Button
              size="lg"
              onClick={() => signIn('discord')}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-lg px-8 py-4 rounded-lg"
            >
              Scout <ArrowRight className="ml-2 w-5 h-5" />
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
