import React from 'react';
import { motion } from 'framer-motion';
import { signIn, getProviders } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Users,
  BarChart3,
  Sparkles,
  Mountain,
  Snowflake
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

// Avalanche animation background
const AvalancheBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900"></div>
      
      {/* Floating geometric shapes */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* Large floating triangles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`triangle-${i}`}
          className="absolute w-8 h-8 border-l-4 border-r-4 border-b-4 border-transparent border-b-white/10"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 2) * 40}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0.1, 0.3, 0.1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 6 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.8,
          }}
        />
      ))}
    </div>
  );
};

interface SignInProps {
  providers: any;
}

export default function SignIn({ providers }: SignInProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Avalanche Background */}
      <AvalancheBackground />
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-6 py-4">
        <div className="flex items-center space-x-4">
          <Logo size="lg" />
          <div className="text-white font-bold text-2xl tracking-wide">
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
          className="w-full max-w-md"
        >
          {/* Welcome Card */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <Logo size="xl" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-2 border-white/20 rounded-full"
                  />
                </div>
              </motion.div>
              
              <CardTitle className="text-3xl font-bold text-white mb-2">
                Welcome to Avalanche
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                Advanced FRC scouting data platform
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Features Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-2 gap-4 mb-8"
              >
                <div className="flex items-center space-x-2 text-white/70">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm">Analytics</span>
                </div>
                <div className="flex items-center space-x-2 text-white/70">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Team Data</span>
                </div>
                <div className="flex items-center space-x-2 text-white/70">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Real-time</span>
                </div>
                <div className="flex items-center space-x-2 text-white/70">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Secure</span>
                </div>
              </motion.div>

              {/* Discord Sign In Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {Object.values(providers).map((provider: any) => (
                  <Button
                    key={provider.name}
                    onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg group"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Snowflake className="w-6 h-6" />
                      </motion.div>
                      <span className="text-lg">Sign in with {provider.name}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Button>
                ))}
              </motion.div>

              {/* Additional Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="text-center text-white/60 text-sm"
              >
                <p>Join the Avalanche scouting team</p>
                <p className="mt-1">Secure • Fast • Professional</p>
              </motion.div>
            </CardContent>
          </Card>

          {/* Bottom Branding */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-center mt-8"
          >
            <div className="flex items-center justify-center space-x-2 text-white/40">
              <Mountain className="w-4 h-4" />
              <span className="text-sm">Powered by Avalanche Robotics</span>
              <Sparkles className="w-4 h-4" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const providers = await getProviders();

  return {
    props: {
      providers: providers ?? [],
    },
  };
};