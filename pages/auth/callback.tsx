import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabaseClient } from '@/lib/supabase';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (started.current) return;
      started.current = true;
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
      const code = router.query.code as string | undefined;

      const GUILD_ERR = "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again.";
      const PROVIDER_TOKEN_ERR = "Discord permissions could not be verified. Please sign in again and ensure you grant all requested permissions (including server list).";

      const VERIFY_TIMEOUT_MS = 15000;

      const runGuildCheck = async (session: { access_token: string; provider_token?: string | null }): Promise<true | false | 'timeout' | 'no_token'> => {
        if (!session?.provider_token) return 'no_token';
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), VERIFY_TIMEOUT_MS);
        const url = typeof window !== 'undefined' ? `${window.location.origin}/api/verify-guild` : '/api/verify-guild';
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ providerToken: session.provider_token }),
            signal: ac.signal,
          });
          clearTimeout(t);
          if (res.status === 504) return 'timeout';
          const data = await res.json().catch(() => ({}));
          return res.ok && data.inGuild === true ? true : false;
        } catch (e) {
          clearTimeout(t);
          if (e instanceof Error && e.name === 'AbortError') return 'timeout';
          return false;
        }
      };

      const finishWithGuildCheck = async (session: any) => {
        if (!session?.provider_token) {
          await supabase.auth.signOut();
          router.push(`/auth/error?message=${encodeURIComponent(PROVIDER_TOKEN_ERR)}&error=provider_token`);
          return;
        }
        const result = await runGuildCheck(session);
        if (result === true) {
          router.replace('/');
          return;
        }
        await supabase.auth.signOut();
        if (result === 'timeout') {
          router.push(`/auth/error?message=${encodeURIComponent('Verification timed out. Please try signing in again.')}&error=timeout`);
        } else {
          router.push(`/auth/error?message=${encodeURIComponent(GUILD_ERR)}&error=guild_check`);
        }
      };

      // PKCE: Supabase redirects with ?code=... — we must exchange it for a session. getSession() does NOT do this.
      if (code && typeof code === 'string') {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            let errorMessage = 'Failed to complete authentication';
            if (error.message?.toLowerCase().includes('code verifier') || error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('expired')) {
              errorMessage = 'Authentication link expired or invalid. Please try signing in again.';
            } else if (error.message) {
              errorMessage = error.message;
            }
            setError(errorMessage);
            setLoading(false);
            setTimeout(() => router.push(`/auth/error?message=${encodeURIComponent(errorMessage)}&error=session_error`), 2000);
            return;
          }
          if (data?.session) {
            await finishWithGuildCheck(data.session);
            return;
          }
          setError('Failed to complete authentication');
          setLoading(false);
          setTimeout(() => router.push(`/auth/error?message=${encodeURIComponent('Failed to complete authentication.')}&error=session_error`), 2000);
          return;
        } catch (err) {
          console.error('exchangeCodeForSession error:', err);
          const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
          setError(errMsg);
          setLoading(false);
          setTimeout(() => router.push(`/auth/error?message=${encodeURIComponent(errMsg)}&error=session_error`), 2000);
          return;
        }
      }

      // No code in URL: may already have a session (e.g. refresh) or legacy flow
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
          sessionReceived = true;
          subscription.unsubscribe();
          await finishWithGuildCheck(currentSession);
          return;
        }

        const waitMs = 15000;
        setTimeout(() => {
          subscription.unsubscribe();
          if (!sessionReceived) {
            setError('Authentication timed out. Please try signing in again.');
            setLoading(false);
            setTimeout(() => router.push('/auth/error?message=Authentication timed out. Please try signing in again.&error=timeout'), 2000);
          }
        }, waitMs);
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
