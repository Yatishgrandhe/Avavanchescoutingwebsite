import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyDiscordServerMembership, notifyDiscordServerVerification } from '@/lib/discord-server-verification';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const notifyDiscordError = async (errorMessage: string, errorType: string, userInfo?: any) => {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('DISCORD_WEBHOOK_URL not configured - skipping Discord notification');
      return;
    }

    const embed = {
      embeds: [
        {
          title: '⚠️ Discord OAuth Callback Error',
          description: 'An error occurred during the Discord OAuth callback process.',
          color: 0xff4444, // Red color
          fields: [
            {
              name: 'Error Type',
              value: `\`${errorType}\``,
              inline: true,
            },
            {
              name: 'Error Message',
              value: `\`\`\`${errorMessage}\`\`\``,
              inline: false,
            },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
            {
              name: 'Callback URL',
              value: `\`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback\``,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    if (userInfo) {
      embed.embeds[0].fields.push({
        name: 'User Information',
        value: `**Discord ID:** ${userInfo.id || 'Unknown'}\n**Username:** ${userInfo.username || 'Unknown'}\n**Email:** ${userInfo.email || 'Not provided'}`,
        inline: false,
      });
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed),
    });

    console.log('Discord callback error notification sent successfully');
  } catch (webhookError) {
    console.error('Failed to send Discord callback error notification:', webhookError);
  }
};

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
    
    // Notify Discord about the OAuth error
    await notifyDiscordError(errorMessage, authError as string);
    
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
        console.log('✅ Authentication successful, verifying Discord server membership...');
        
        // Get the Discord server ID from environment variables
        const discordServerId = process.env.DISCORD_SERVER_ID;
        
        console.log('🔍 Checking Discord server verification...');
        console.log('🏠 Server ID from environment:', discordServerId);
        
        if (!discordServerId) {
          console.error('❌ DISCORD_SERVER_ID not configured in environment variables');
          const errorMessage = 'Server configuration error. Please contact support.';
          await notifyDiscordError(errorMessage, 'server_config_error', data.user);
          res.redirect(302, `/auth/error?message=${encodeURIComponent(errorMessage)}&error=server_config_error`);
          return;
        }

        // Verify Discord server membership
        const isServerMember = await verifyDiscordServerMembership(
          data.session.access_token,
          discordServerId
        );

        // Notify Discord about the verification result
        await notifyDiscordServerVerification(isServerMember, data.user, discordServerId);

        if (isServerMember) {
          console.log('✅ User is a member of the Avalanche Discord server, redirecting to dashboard');
          // Successful authentication and server verification - redirect to dashboard
          res.redirect(302, '/');
          return;
        } else {
          console.log('❌ User is NOT a member of the Avalanche Discord server, redirecting to homepage');
          // User is not a member of the server - redirect to homepage with message
          const errorMessage = 'You must be a member of the Avalanche Discord server to access this platform.';
          res.redirect(302, `/?message=${encodeURIComponent(errorMessage)}&error=not_server_member`);
          return;
        }
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
        
        // Notify Discord about the session exchange error
        await notifyDiscordError(errorMessage, 'session_error', data?.user);
        
        res.redirect(302, `/auth/error?message=${encodeURIComponent(errorMessage)}&error=session_error`);
        return;
      }
    } catch (error) {
      console.error('💥 Unexpected error in auth callback:', error);
      const errorMessage = 'An unexpected error occurred during authentication. Please try again.';
      
      // Notify Discord about the unexpected error
      await notifyDiscordError(errorMessage, 'unexpected_error');
      
      res.redirect(302, `/auth/error?message=${encodeURIComponent(errorMessage)}&error=unexpected_error`);
      return;
    }
  }

  // If no code and no error, redirect to home page
  console.log('⚠️ No code or error received, redirecting to home page');
  res.redirect(302, '/');
}
