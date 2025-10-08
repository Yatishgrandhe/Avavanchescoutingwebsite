import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { Button } from '../../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { useToast } from '../../hooks/use-toast';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Users,
  BarChart3,
  Sparkles,
  Mountain,
  Snowflake,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Logo from '../../components/ui/Logo';

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

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const notifyDiscordError = async (errorMessage: string, userInfo?: any) => {
    try {
      await fetch('/api/discord-login-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: errorMessage,
          userInfo,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (webhookError) {
      console.error('Failed to send Discord notification:', webhookError);
    }
  };

  const handleDiscordSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    console.log('🚀 Starting Discord OAuth flow...');
    console.log('📍 Current URL:', window.location.href);
    console.log('🎯 Redirect URL:', `${window.location.origin}/`);
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        }
      );

      console.log('🔧 Supabase client created');
      console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      console.log('📡 OAuth response:', { data, error });

      if (error) {
        console.error('❌ Discord sign in error:', error);
        const errorMessage = `Failed to initiate Discord sign in: ${error.message}`;
        setError(errorMessage);
        
        // Show error toast
        toast({
          title: "Discord Sign In Failed",
          description: error.message,
          variant: "destructive",
        });

        // Notify Discord channel
        await notifyDiscordError(errorMessage);
        
        // Show error for a few seconds, then redirect to error page
        setTimeout(() => {
          console.log('🔄 Redirecting to error page...');
          window.location.href = `/auth/error?message=${encodeURIComponent(error.message)}&error=initiation_error`;
        }, 5000);
      } else if (data.url) {
        console.log('✅ OAuth URL received, redirecting to Discord...');
        console.log('🔗 Discord URL:', data.url);
        
        // Show success message
        setSuccess('Redirecting to Discord...');
        toast({
          title: "Redirecting to Discord",
          description: "Please complete authentication in the new window",
          variant: "default",
        });
        
        // Redirect to Discord OAuth
        window.location.href = data.url;
      } else {
        console.error('❌ No authentication URL received from Discord');
        const errorMessage = 'No authentication URL received from Discord';
        setError(errorMessage);
        
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });

        // Notify Discord channel
        await notifyDiscordError(errorMessage);
      }
    } catch (error) {
      console.error('💥 Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Notify Discord channel
      await notifyDiscordError(errorMessage);
      
      // Show error for a few seconds, then redirect to error page
      setTimeout(() => {
        console.log('🔄 Redirecting to error page...');
        window.location.href = `/auth/error?message=${encodeURIComponent(errorMessage)}&error=unexpected_error`;
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };
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
          <Card className="bg-card/90 backdrop-blur-lg border-border shadow-2xl">
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
              
              <CardTitle className="text-3xl font-bold text-white mb-2 font-display">
                Welcome to Avalanche
              </CardTitle>
              <CardDescription className="text-white/80 text-lg">
                Advanced FRC scouting data platform
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Success Display */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/20 border border-green-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Success</span>
                  </div>
                  <p className="text-green-300 text-sm mt-1">{success}</p>
                </motion.div>
              )}

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center space-x-2 text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Sign In Error</span>
                  </div>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                  <p className="text-red-400/80 text-xs mt-2">
                    Redirecting to error page in a few seconds...
                  </p>
                </motion.div>
              )}

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
                <Button
                  onClick={handleDiscordSignIn}
                  disabled={isLoading}
                  variant="avalanche"
                  size="lg"
                  className="w-full py-4 px-6 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Snowflake className="w-6 h-6" />
                    </motion.div>
                    <span className="text-lg">
                      {isLoading ? 'Signing in...' : 'Sign in with Discord'}
                    </span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>
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

// No server-side props needed for Supabase auth
