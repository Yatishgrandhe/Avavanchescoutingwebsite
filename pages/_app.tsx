import type { AppProps } from 'next/app';
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { User as AppUser } from '@/lib/types';
import Head from 'next/head';
import { Toaster } from '@/components/ui/toaster';
import { handleRefreshResize } from '@/lib/refresh-handler';
import { getSupabaseClient } from '@/lib/supabase';
import RouteTransition from '@/components/ui/RouteTransition';
import { getScoutingTitle, OrganizationIdentity } from '@/lib/organization-branding';

import '@/styles/globals.css';

// Create Supabase context
const SupabaseContext = createContext<{
  supabase: any;
  user: AppUser | null;
  organization: OrganizationIdentity | null;
  authUser: User | null;
  session: Session | null;
  loading: boolean;
}>({
  supabase: null,
  user: null,
  organization: null,
  authUser: null,
  session: null,
  loading: true,
});

export const useSupabase = () => useContext(SupabaseContext);

export default function App({ Component, pageProps }: AppProps) {
  const [supabase] = useState(() => getSupabaseClient());
  const [user, setUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<OrganizationIdentity | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let authRevision = 0;
    let activeUserId: string | null = null;

    const fetchProfile = async (u: User | null) => {
      if (!u) {
        return { user: null, organization: null };
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();

      let effective = profile;

      if (!effective?.organization_id) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          try {
            const syncRes = await fetch('/api/auth/ensure-profile', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (syncRes.ok) {
              const body = (await syncRes.json()) as { profile?: AppUser };
              if (body.profile) {
                effective = body.profile as typeof profile;
              }
            }
          } catch (e) {
            console.warn('ensure-profile failed', e);
          }
        }
      }

      if (effective && u.id) {
        const { data: again } = await supabase
          .from('users')
          .select('*')
          .eq('id', u.id)
          .maybeSingle();
        if (again?.organization_id) {
          effective = again;
        }
      }

      let resolvedOrganization: OrganizationIdentity | null = null;
      if (effective?.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', effective.organization_id)
          .maybeSingle();
        if (orgError) console.warn('Organization lookup failed', orgError);
        if (org) resolvedOrganization = org;
      }

      if (effective) {
        return { user: {
          ...effective,
          name:
            effective.name ||
            u.user_metadata?.full_name ||
            u.user_metadata?.username ||
            u.email?.split('@')[0] ||
            'Unknown',
          email: u.email || effective.email,
          user_metadata: u.user_metadata,
        } as AppUser, organization: resolvedOrganization };
      } else {
        return { user: {
          id: u.id,
          name: u.user_metadata?.full_name || u.user_metadata?.username || u.email?.split('@')[0] || 'Unknown',
          email: u.email || '',
          role: 'user',
          user_metadata: u.user_metadata,
        } as AppUser, organization: null };
      }
    };

    /** Session + profile must finish before loading=false, or protected routes flash sign-in on refresh. */
    const syncAuth = async (session: Session | null) => {
      const revision = ++authRevision;
      setSession(session);
      const u = session?.user ?? null;
      setAuthUser(u);
      if ((u?.id ?? null) !== activeUserId) {
        activeUserId = u?.id ?? null;
        setUser(null);
        setOrganization(null);
        setLoading(true);
      }
      const resolved = await fetchProfile(u);
      if (!cancelled && revision === authRevision) {
        setUser(resolved.user);
        setOrganization(resolved.organization);
        setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!cancelled) {
        void syncAuth(session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }
      if (!cancelled) {
        void syncAuth(session);
      }
    });

    const cleanup = handleRefreshResize();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (cleanup) {
        cleanup();
      }
    };
  }, [supabase]);

  const scoutingTitle = authUser && !user ? 'Scouting' : getScoutingTitle(organization, user);

  return (
    <>
      <Head>
        <title>{scoutingTitle}</title>
        <meta name="description" content={`${scoutingTitle} Data Management System`} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-navbutton-color" content="#1A2B7C" />
        <meta name="apple-mobile-web-app-title" content={scoutingTitle} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/image.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/image.png" />
        <link rel="apple-touch-icon" href="/image.png" />
        <meta name="theme-color" content="#1A2B7C" />
      </Head>
      <SupabaseContext.Provider value={{ supabase, user, organization, authUser, session, loading }}>
        <Component {...pageProps} />
        <RouteTransition />
        <Toaster />
      </SupabaseContext.Provider>
    </>
  );
}
