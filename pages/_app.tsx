import type { AppProps } from 'next/app';
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, Session } from '@supabase/supabase-js';
import Head from 'next/head';

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
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  ));
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <>
      <Head>
        <title>Avalanche Scouting</title>
        <meta name="description" content="Avalanche Scouting Data Management System" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/image.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/image.png" />
        <link rel="apple-touch-icon" href="/image.png" />
        <meta name="theme-color" content="#1A2B7C" />
      </Head>
      <SupabaseContext.Provider value={{ supabase, user, session, loading }}>
        <Component {...pageProps} />
      </SupabaseContext.Provider>
    </>
  );
}
