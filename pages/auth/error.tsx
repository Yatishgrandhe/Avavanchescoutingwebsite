import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Home, RefreshCw, HelpCircle, Mail, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import Logo from '../../components/ui/Logo';

// Avalanche animation background
const AvalancheBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-background">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-destructive/10 via-background to-background" />

      {/* Floating geometric shapes */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-destructive/30 rounded-full"
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
            duration: 5 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

export default function AuthError() {
  const router = useRouter();
  const { message, error } = router.query;
  const [notificationStatus, setNotificationStatus] = useState<'pending' | 'sent' | 'failed'>('pending');

  useEffect(() => {
    // Simulate notification status check
    const timer = setTimeout(() => {
      setNotificationStatus('sent');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const getErrorIcon = () => {
    switch (error) {
      case 'access_denied':
        return <ShieldAlert className="w-12 h-12 text-orange-500" />;
      case 'server_error':
      case 'temporarily_unavailable':
        return <RefreshCw className="w-12 h-12 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-destructive" />;
    }
  };

  const getSuggestions = () => {
    switch (error) {
      case 'access_denied':
        return [
          'Authorize the application when prompted by Discord',
          'Verify you have the necessary permissions',
          'Try signing in with a different Discord account'
        ];
      case 'server_error':
      case 'temporarily_unavailable':
        return [
          'Discord servers may be experiencing issues',
          'Wait a few minutes and try again',
          'Check Discord status at status.discord.com'
        ];
      case 'session_error':
        return [
          'Your authentication session may have expired',
          'Try signing in again',
          'Clear your browser cookies and try again'
        ];
      default:
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ];
    }
  };

  const getNotificationIcon = () => {
    switch (notificationStatus) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotificationText = () => {
    switch (notificationStatus) {
      case 'sent':
        return 'Admin team has been notified';
      case 'failed':
        return 'Failed to notify admin team';
      default:
        return 'Notifying admin team...';
    }
  };

  const suggestions = getSuggestions();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center items-center p-4 sm:p-6 bg-background">
      <AvalancheBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="p-8 pb-0 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-destructive/20 shadow-lg shadow-destructive/5"
            >
              {getErrorIcon()}
            </motion.div>

            <h1 className="text-3xl font-bold text-foreground font-heading text-center mb-2 tracking-tight">
              Authentication Error
            </h1>

            <p className="text-muted-foreground text-center text-lg max-w-sm mx-auto leading-relaxed">
              {message || 'An unexpected error occurred during the sign-in process.'}
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Admin Notification Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm"
            >
              <div className="flex items-center space-x-3 mb-1">
                {getNotificationIcon()}
                <span className="text-sm font-semibold text-foreground">
                  {getNotificationText()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground pl-7">
                Our system automatically logs these errors for review.
              </p>
            </motion.div>

            {/* Error Details */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-destructive/5 border border-destructive/10 rounded-xl p-4"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <HelpCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">
                    Error Code: <span className="font-mono">{error}</span>
                  </span>
                </div>
              </motion.div>
            )}

            {/* Suggestions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider text-center sm:text-left">
                Troubleshooting Steps
              </h3>
              <ul className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (index * 0.1) }}
                    className="flex items-start space-x-3 text-sm text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 bg-destructive/60 rounded-full mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span>{suggestion}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 h-12 text-base font-semibold rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Signing In Again
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full border-white/10 hover:bg-white/5 h-11 rounded-xl"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full border-white/10 hover:bg-white/5 h-11 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Support Information */}
            <div className="text-center text-xs text-muted-foreground pt-2">
              <p className="flex items-center justify-center space-x-1 hover:text-foreground transition-colors cursor-pointer">
                <Mail className="w-3 h-3" />
                <span>Contact Support Team</span>
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 opacity-50">
          <Logo size="sm" />
        </div>
      </motion.div>
    </div>
  );
}