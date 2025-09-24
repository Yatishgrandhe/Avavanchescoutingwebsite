import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';
import { AlertTriangle, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function DebugOAuth() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testOAuthFlow = async () => {
    setIsTestRunning(true);
    setLogs([]);
    
    addLog('🚀 Starting OAuth flow test...');
    
    try {
      // Test environment variables
      addLog(`🌐 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
      addLog(`🔑 Supabase Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
      
      // Test current URL
      addLog(`📍 Current URL: ${window.location.href}`);
      addLog(`🎯 Redirect URL: ${window.location.origin}/`);
      
      // Test Supabase client creation
      const { createClient } = await import('@supabase/supabase-js');
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
      
      addLog('✅ Supabase client created successfully');
      
      // Test OAuth initiation
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        addLog(`❌ OAuth error: ${error.message}`);
        addLog(`🔍 Error details: ${JSON.stringify(error)}`);
      } else if (data.url) {
        addLog(`✅ OAuth URL generated: ${data.url}`);
        addLog('🔗 Ready to redirect to Discord...');
        
        // Don't actually redirect in debug mode
        addLog('⚠️ Debug mode: Not redirecting to Discord');
      } else {
        addLog('❌ No OAuth URL received');
      }
      
    } catch (error) {
      addLog(`💥 Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  const checkCallbackURL = () => {
    addLog('🔍 Checking callback URL configuration...');
    addLog(`📞 Callback URL should be: ${window.location.origin}/api/auth/callback`);
    addLog('📋 Make sure this URL is added to your Discord application settings');
    addLog('🔗 Discord Developer Portal: https://discord.com/developers/applications');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 font-display mb-2">
            OAuth Debug Tool
          </h1>
          <p className="text-gray-600">
            Debug Discord OAuth flow and check configuration
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5" />
                <span>Test Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={testOAuthFlow}
                disabled={isTestRunning}
                className="w-full"
              >
                {isTestRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing OAuth Flow...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Test OAuth Flow
                  </>
                )}
              </Button>

              <Button
                onClick={checkCallbackURL}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Check Callback URL
              </Button>

              <Button
                onClick={clearLogs}
                variant="outline"
                className="w-full"
              >
                Clear Logs
              </Button>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">
                  Quick Links:
                </h3>
                <div className="space-y-2 text-sm">
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800"
                  >
                    Discord Developer Portal
                  </a>
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800"
                  >
                    Vercel Function Logs
                  </a>
                  <a
                    href="/auth/signin"
                    className="block text-blue-600 hover:text-blue-800"
                  >
                    Sign In Page
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debug Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Debug Logs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">
                    No logs yet. Click "Test OAuth Flow" to start debugging.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Debug OAuth Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Check Vercel Function Logs</h3>
              <p className="text-gray-600 text-sm">
                Go to Vercel Dashboard → Your Project → Functions → /api/auth/callback
                Look for console.log messages with emojis (🔄, ❌, ✅, etc.)
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Check Browser Console</h3>
              <p className="text-gray-600 text-sm">
                Open Developer Tools (F12) → Console tab
                Look for messages starting with 🚀, 📡, ❌, etc.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Check Discord Application Settings</h3>
              <p className="text-gray-600 text-sm">
                Make sure your Discord app has the correct redirect URI:
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  https://avavanchescoutingwebsite.vercel.app/api/auth/callback
                </code>
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. Common Issues</h3>
              <ul className="text-gray-600 text-sm space-y-1 ml-4">
                <li>• Wrong redirect URI in Discord settings</li>
                <li>• Missing environment variables</li>
                <li>• Discord app not properly configured</li>
                <li>• User denying permissions</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
