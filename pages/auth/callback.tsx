import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabaseClient } from '@/lib/supabase';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const { error: authError, error_description, error_code } = router.query;

      // Handle OAuth errors first
      if (authError || error_code) {
        console.error('OAuth error detected:', { authError, error_code, error_description });
        
        let errorMessage = 'Authentication failed';
        
        const errorDesc = error_description as string || '';
        const decodedErrorDesc = errorDesc ? decodeURIComponent(errorDesc) : '';
        
        console.log('Decoded error description:', decodedErrorDesc);
        
        // Check for hook-specific errors first (these are more specific than generic server_error)
        if (decodedErrorDesc.includes('404') || decodedErrorDesc.includes('status code returned from hook')) {
          errorMessage = "Authentication service is not properly configured. The Discord server verification function is not available. Please contact an administrator.";
        } else if (decodedErrorDesc.includes('500') || decodedErrorDesc.includes('Internal Server Error') || decodedErrorDesc.includes('hook failed')) {
          errorMessage = "The authentication verification service encountered an error. Please contact an administrator or try again later.";
        } else if (decodedErrorDesc.includes('timeout') || decodedErrorDesc.includes('timed out')) {
          errorMessage = "Authentication verification timed out. Please try again.";
        } else if (decodedErrorDesc.includes('Avalanche server') || decodedErrorDesc.includes('not allowed to login') || decodedErrorDesc.includes('guild membership')) {
          errorMessage = "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again.";
        } else if (decodedErrorDesc) {
          // Use the decoded error description if available (it's usually more specific)
          errorMessage = decodedErrorDesc;
        } else if (authError) {
          // Fallback to generic error messages if no description
          switch (authError) {
            case 'server_error':
              // server_error could be from Discord, Supabase, or our hook
              // Check if we have more context
              if (error_code === 'unexpected_failure') {
                errorMessage = "Authentication verification failed. This may be due to a configuration issue. Please contact an administrator.";
              } else {
                errorMessage = 'Discord authentication server error. Please try again in a few minutes.';
              }
              break;
            case 'access_denied':
              errorMessage = 'You denied access to your Discord account. Please try again and grant permission.';
              break;
            default:
              errorMessage = `Authentication failed: ${authError}. Please try again.`;
          }
        }
        
        setError(errorMessage);
        setLoading(false);
        setTimeout(() => {
          router.push(`/auth/error?message=${encodeURIComponent(errorMessage)}&error=${authError || error_code || 'unknown'}`);
        }, 2000);
        return;
      }

      const supabase = getSupabaseClient();

      const GUILD_ERR = "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again.";

      const runGuildCheck = async (session: { access_token: string; provider_token?: string | null }): Promise<boolean> => {
        if (!session?.provider_token) return false;
        try {
          const res = await fetch('/api/verify-guild', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ providerToken: session.provider_token }),
          });
          const data = await res.json().catch(() => ({}));
          return res.ok && data.inGuild === true;
        } catch {
          return false;
        }
      };

      const finishWithGuildCheck = async (session: any) => {
        const ok = await runGuildCheck(session);
        if (ok) {
          router.replace('/');
        } else {
          await supabase.auth.signOut();
          router.push(`/auth/error?message=${encodeURIComponent(GUILD_ERR)}&error=guild_check`);
        }
      };

      try {
        let sessionReceived = false;
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
          console.log('Auth state changed:', event, session ? 'Session received' : 'No session');
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
            sessionReceived = true;
            subscription.unsubscribe();
            await finishWithGuildCheck(session);
          }
        });

        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          subscription.unsubscribe();
          let errorMessage = 'Failed to complete authentication';
          if (sessionError.message.includes('code verifier') || sessionError.message.includes('non-empty')) {
            errorMessage = 'Authentication session expired or invalid. Please try signing in again.';
          } else if (sessionError.message.includes('Avalanche server') || sessionError.message.includes('not allowed to login')) {
            errorMessage = GUILD_ERR;
          } else {
            errorMessage = sessionError.message || 'Authentication failed. Please try again.';
          }
          setError(errorMessage);
          setLoading(false);
          setTimeout(() => router.push(`/auth/error?message=${encodeURIComponent(errorMessage)}&error=session_error`), 2000);
          return;
        }

        if (currentSession) {
          subscription.unsubscribe();
          await finishWithGuildCheck(currentSession);
          return;
        }

        setTimeout(() => {
          subscription.unsubscribe();
          if (!sessionReceived) {
            setError('Authentication timed out. Please try signing in again.');
            setLoading(false);
            setTimeout(() => router.push('/auth/error?message=Authentication timed out. Please try signing in again.&error=timeout'), 2000);
          }
        }, 5000);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
        setTimeout(() => {
          router.push('/auth/error?message=An unexpected error occurred. Please try again.&error=unexpected_error');
        }, 2000);
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground mb-6">Redirecting to error page...</p>
          <Button onClick={() => router.push('/auth/signin')} variant="outline">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
