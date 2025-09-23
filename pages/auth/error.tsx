import React from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import Logo from '../../components/ui/Logo';

export default function AuthError() {
  const router = useRouter();
  const { message } = router.query;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-red-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-900">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-red-700">
              {message || 'An error occurred during authentication'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>Please try signing in again or contact support if the problem persists.</p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={() => router.push('/auth/signin')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
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