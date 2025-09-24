import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔄 OAuth callback received');
  console.log('📋 Method:', req.method);
  console.log('🔗 URL:', req.url);
  console.log('📊 Query params:', req.query);
  console.log('🌐 Headers:', req.headers);

  if (req.method !== 'GET') {
    console.error('❌ Invalid method:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { code, error: authError, error_description, next = '/' } = req.query;

  console.log('🔍 Processing callback with:', { code: !!code, authError, error_description, next });

  // Handle OAuth errors with detailed messages
  if (authError) {
    console.error('❌ OAuth error received:', authError, error_description);
    
    let errorMessage = 'Authentication failed';
    
    // Provide specific error messages based on the error type
    switch (authError) {
      case 'access_denied':
        errorMessage = 'You denied access to your Discord account. Please try again and grant permission.';
        break;
      case 'invalid_request':
        errorMessage = 'Invalid authentication request. Please try signing in again.';
        break;
      case 'unauthorized_client':
        errorMessage = 'Discord application is not properly configured. Please contact support.';
        break;
      case 'unsupported_response_type':
        errorMessage = 'Authentication method not supported. Please contact support.';
        break;
      case 'invalid_scope':
        errorMessage = 'Invalid permissions requested. Please contact support.';
        break;
      case 'server_error':
        errorMessage = 'Discord server error. Please try again in a few minutes.';
        break;
      case 'temporarily_unavailable':
        errorMessage = 'Discord authentication is temporarily unavailable. Please try again later.';
        break;
      default:
        errorMessage = error_description as string || 'Authentication failed. Please try again.';
    }
    
    res.redirect(302, `/auth/error?message=${encodeURIComponent(errorMessage)}&error=${authError}`);
    return;
  }

  if (code) {
    console.log('✅ Authorization code received, exchanging for session...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      console.log('🔧 Supabase client created for session exchange');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code as string);
      
      console.log('📡 Session exchange result:', { 
        hasSession: !!data.session, 
        hasUser: !!data.user, 
        error: error?.message 
      });
      
      if (!error && data.session) {
        console.log('✅ Authentication successful, redirecting to dashboard');
        // Successful authentication - redirect to dashboard
        res.redirect(302, '/');
        return;
      } else {
        console.error('❌ Auth callback error:', error);
        
        let errorMessage = 'Failed to complete authentication';
        
        // Provide specific error messages for common issues
        if (error?.message) {
          if (error.message.includes('Invalid code')) {
            errorMessage = 'Authentication code expired. Please try signing in again.';
          } else if (error.message.includes('User not found')) {
            errorMessage = 'Your Discord account could not be found. Please try again.';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please confirm your Discord email address and try again.';
          } else {
            errorMessage = error.message;
          }
        }
        
        res.redirect(302, `/auth/error?message=${encodeURIComponent(errorMessage)}&error=session_error`);
        return;
      }
    } catch (error) {
      console.error('💥 Unexpected error in auth callback:', error);
      res.redirect(302, `/auth/error?message=${encodeURIComponent('An unexpected error occurred during authentication. Please try again.')}&error=unexpected_error`);
      return;
    }
  }

  // If no code and no error, redirect to home page
  console.log('⚠️ No code or error received, redirecting to home page');
  res.redirect(302, '/');
}
