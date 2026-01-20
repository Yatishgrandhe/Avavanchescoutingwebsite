import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const { code, error: authError, error_description, error_code } = router.query;

      // Handle OAuth errors
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

      // Handle successful OAuth callback with code
      if (code && typeof code === 'string') {
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                flowType: 'pkce'
              }
            }
          );

          // Exchange code for session (this will use the code verifier from localStorage)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Session exchange error:', exchangeError);
            let errorMessage = 'Failed to complete authentication';
            
            if (exchangeError.message.includes('code verifier')) {
              errorMessage = 'Authentication session expired. Please try signing in again.';
            } else if (exchangeError.message.includes('Avalanche server') || 
                       exchangeError.message.includes('not allowed to login')) {
              errorMessage = "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again.";
            } else {
              errorMessage = exchangeError.message || 'Authentication failed. Please try again.';
            }
            
            setError(errorMessage);
            setLoading(false);
            setTimeout(() => {
              router.push(`/auth/error?message=${encodeURIComponent(errorMessage)}&error=session_error`);
            }, 2000);
            return;
          }

          if (data.session) {
            // Success! Redirect to homepage
            router.push('/');
          } else {
            setError('No session created. Please try again.');
            setLoading(false);
            setTimeout(() => {
              router.push('/auth/error?message=No session created. Please try again.&error=session_error');
            }, 2000);
          }
        } catch (err) {
          console.error('Unexpected error:', err);
          setError('An unexpected error occurred. Please try again.');
          setLoading(false);
          setTimeout(() => {
            router.push('/auth/error?message=An unexpected error occurred. Please try again.&error=unexpected_error');
          }, 2000);
        }
      } else {
        // No code and no error - redirect to sign in
        router.push('/auth/signin');
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
