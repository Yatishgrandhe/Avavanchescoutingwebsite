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
        let errorMessage = 'Authentication failed';
        
        const errorDesc = error_description as string || '';
        const decodedErrorDesc = errorDesc ? decodeURIComponent(errorDesc) : '';
        
        // Check for hook 404 error
        if (decodedErrorDesc.includes('404') || decodedErrorDesc.includes('status code returned from hook')) {
          errorMessage = "Authentication service is not properly configured. The Discord server verification function is not available. Please contact an administrator.";
        } else if (decodedErrorDesc.includes('Avalanche server') || decodedErrorDesc.includes('not allowed to login')) {
          errorMessage = "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again.";
        } else if (decodedErrorDesc) {
          errorMessage = decodedErrorDesc;
        } else if (authError) {
          switch (authError) {
            case 'server_error':
              errorMessage = 'Authentication server error. Please try again in a few moments.';
              break;
            case 'access_denied':
              errorMessage = 'You denied access to your Discord account. Please try again and grant permission.';
              break;
            default:
              errorMessage = 'Authentication failed. Please try again.';
          }
        }
        
        setError(errorMessage);
        setLoading(false);
        setTimeout(() => {
          router.push(`/auth/error?message=${encodeURIComponent(errorMessage)}&error=${authError || error_code || 'unknown'}`);
        }, 2000);
        return;
      }

      // Use the same Supabase client instance that has access to the stored code verifier
      const supabase = getSupabaseClient();

      try {
        // With detectSessionInUrl: true, Supabase automatically detects the code in the URL
        // and exchanges it for a session. We'll listen for the auth state change.
        let sessionReceived = false;
        let authError: any = null;

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
          console.log('Auth state changed:', event, session ? 'Session received' : 'No session');
          
          if (event === 'SIGNED_IN' && session) {
            sessionReceived = true;
            subscription.unsubscribe();
            // Clear URL params and redirect
            router.replace('/');
          } else if (event === 'TOKEN_REFRESHED' && session) {
            sessionReceived = true;
            subscription.unsubscribe();
            router.replace('/');
          }
        });

        // Also try to get session immediately (in case it's already processed)
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          subscription.unsubscribe();
          let errorMessage = 'Failed to complete authentication';
          
          if (sessionError.message.includes('code verifier') || sessionError.message.includes('non-empty')) {
            errorMessage = 'Authentication session expired or invalid. Please try signing in again.';
          } else if (sessionError.message.includes('Avalanche server') || 
                     sessionError.message.includes('not allowed to login')) {
            errorMessage = "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again.";
          } else {
            errorMessage = sessionError.message || 'Authentication failed. Please try again.';
          }
          
          setError(errorMessage);
          setLoading(false);
          setTimeout(() => {
            router.push(`/auth/error?message=${encodeURIComponent(errorMessage)}&error=session_error`);
          }, 2000);
          return;
        }

        if (currentSession) {
          subscription.unsubscribe();
          router.replace('/');
          return;
        }

        // Wait for auth state change (max 5 seconds)
        setTimeout(() => {
          subscription.unsubscribe();
          if (!sessionReceived) {
            setError('Authentication timed out. Please try signing in again.');
            setLoading(false);
            setTimeout(() => {
              router.push('/auth/error?message=Authentication timed out. Please try signing in again.&error=timeout');
            }, 2000);
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
