import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Home, RefreshCw, HelpCircle, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import Logo from '../../components/ui/Logo';

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
        return <HelpCircle className="w-8 h-8 text-orange-600" />;
      case 'server_error':
      case 'temporarily_unavailable':
        return <RefreshCw className="w-8 h-8 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
    }
  };

  const getErrorColor = () => {
    switch (error) {
      case 'access_denied':
        return 'orange';
      case 'server_error':
      case 'temporarily_unavailable':
        return 'yellow';
      default:
        return 'red';
    }
  };

  const getSuggestions = () => {
    switch (error) {
      case 'access_denied':
        return [
          'Make sure to click "Authorize" when prompted by Discord',
          'Check that you have the necessary permissions',
          'Try signing in again with a different Discord account'
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
        return <XCircle className="w-4 h-4 text-red-500" />;
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

  const errorColor = getErrorColor();
  const suggestions = getSuggestions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="border-red-200 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                {getErrorIcon()}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-900 font-display">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-red-700 text-lg">
              {message || 'An error occurred during authentication'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Admin Notification Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {getNotificationIcon()}
                <span className="text-sm font-medium text-blue-800">
                  {getNotificationText()}
                </span>
              </div>
              <p className="text-sm text-blue-700">
                Our admin team has been automatically notified about this error and will investigate if needed.
              </p>
            </div>

            {/* Error Details */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    Error Code: {error}
                  </span>
                </div>
                <p className="text-sm text-red-700">
                  This helps our support team identify the issue if you need assistance.
                </p>
              </div>
            )}

            {/* Suggestions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-red-800">
                What you can try:
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-red-700">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              <Button 
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Signing In Again
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Support Information */}
            <div className="text-center text-sm text-red-600 border-t border-red-200 pt-4">
              <p className="flex items-center justify-center space-x-1">
                <Mail className="w-4 h-4" />
                <span>Need help? Contact our support team</span>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <Logo size="sm" />
        </div>
      </motion.div>
    </div>
  );
}