import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { useToast } from '../../hooks/use-toast';
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
  Users,
  BarChart3,
  Sparkles,
  Mountain,
  Snowflake,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play
} from 'lucide-react';
import Logo from '../../components/ui/Logo';
import Link from 'next/link';

// Avalanche animation background
const AvalancheBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-background">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/30 via-background to-background" />

      {/* Floating geometric shapes */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/40 rounded-full"
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
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Large floating elements */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl opacity-10"
          style={{
            width: `${300 + Math.random() * 200}px`,
            height: `${300 + Math.random() * 200}px`,
            background: i % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeInOut"
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

    try {
      // Use the shared Supabase client instance to avoid multiple GoTrueClient instances
      // This ensures the code verifier is stored and accessible across the OAuth flow
      const { getSupabaseClient } = await import('@/lib/supabase');
      const supabase = getSupabaseClient();

      const callbackOrigin =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ?? 'https://avalanchescouting.vercel.app';
      const redirectTo = `${callbackOrigin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo,
          scopes: 'identify email guilds',
        },
      });

      if (error) {
        const errorMessage = `Failed to initiate Discord sign in: ${error.message}`;
        setError(errorMessage);
        toast({
          title: "Discord Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
        await notifyDiscordError(errorMessage);
      } else if (data.url) {
        setSuccess('Redirecting to Discord...');
        toast({
          title: "Redirecting to Discord",
          description: "Please complete authentication in the new window",
          variant: "default",
        });
        // Defer redirect so WebView (iOS/Android) reliably follows the navigation
        const url = data.url;
        setTimeout(() => {
          window.location.assign(url);
        }, 100);
      } else {
        const errorMessage = 'No authentication URL received from Discord';
        setError(errorMessage);
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
        await notifyDiscordError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });
      await notifyDiscordError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center items-center">
      <AvalancheBackground />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-6 py-6 border-b border-white/5 bg-background/20 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Logo size="md" />
            <div className="text-foreground font-heading font-bold text-xl tracking-tight">
              Avalanche Scouting
            </div>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
          <div className="text-muted-foreground text-xs uppercase tracking-widest font-semibold hidden sm:block">
            FRC 2026 Rebuilt
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-primary/10"
        >
          <div className="p-8 pb-6 text-center space-y-4">
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{
                  boxShadow: ["0 0 0 0px rgba(59, 130, 246, 0)", "0 0 0 10px rgba(59, 130, 246, 0.1)", "0 0 0 20px rgba(59, 130, 246, 0)"]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="rounded-full"
              >
                <Logo size="xl" />
              </motion.div>
            </div>

            <h1 className="text-3xl font-heading font-bold text-foreground">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Sign in to access the Avalanche Scouting platform and real-time data analysis.
            </p>
          </div>

          <div className="px-8 pb-8 space-y-6">
            <Button
              onClick={handleDiscordSignIn}
              disabled={isLoading}
              className="w-full h-14 text-base font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl shadow-lg shadow-[#5865F2]/20 hover:shadow-[#5865F2]/40 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Users size={20} />
              )}
              <span>{isLoading ? 'Connecting...' : 'Continue with Discord'}</span>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
            </Button>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BarChart3, label: "Analytics" },
                { icon: Shield, label: "Secure" },
                { icon: Zap, label: "Real-time" },
                { icon: Snowflake, label: "Reefscape" }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col items-center justify-center text-center gap-1 group hover:bg-white/10 transition-colors cursor-default">
                  <item.icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-500/10 border-t border-red-500/20 p-4"
              >
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-green-500/10 border-t border-green-500/20 p-4"
              >
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle size={16} />
                  <span>{success}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Authorized personnel only. Contact admin for access.
        </p>
      </div>
    </div>
  );
}
