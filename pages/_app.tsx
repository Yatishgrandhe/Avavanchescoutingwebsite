import type { AppProps } from 'next/app';
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import Head from 'next/head';
import { Toaster } from '@/components/ui/toaster';
import { handleRefreshResize } from '@/lib/refresh-handler';
import { getSupabaseClient } from '@/lib/supabase';

import '@/styles/globals.css';

// Create Supabase context
const SupabaseContext = createContext<{
  supabase: any;
  user: User | null;
  session: Session | null;
  loading: boolean;
}>({
  supabase: null,
  user: null,
  session: null,
  loading: true,
});

export const useSupabase = () => useContext(SupabaseContext);

export default function App({ Component, pageProps }: AppProps) {
  const [supabase] = useState(() => getSupabaseClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle refresh and resize
    const cleanup = handleRefreshResize();

    return () => {
      subscription.unsubscribe();
      if (cleanup) {
        cleanup();
      }
    };
  }, [supabase.auth]);

  return (
    <>
      <Head>
        <title>Avalanche Scouting</title>
        <meta name="description" content="Avalanche Scouting Data Management System" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-navbutton-color" content="#1A2B7C" />
        <meta name="apple-mobile-web-app-title" content="Avalanche Scouting" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/image.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/image.png" />
        <link rel="apple-touch-icon" href="/image.png" />
        <meta name="theme-color" content="#1A2B7C" />
      </Head>
      <SupabaseContext.Provider value={{ supabase, user, session, loading }}>
        <Component {...pageProps} />
        <Toaster />
      </SupabaseContext.Provider>
    </>
  );
}
