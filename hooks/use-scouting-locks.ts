import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/pages/_app';
import { toast } from '@/hooks/use-toast';

export interface ScoutingLocks {
  matchScoutingLocked: boolean;
  pitScoutingLocked: boolean;
}

export function useScoutingLocks() {
  const { session } = useSupabase();
  const [locks, setLocks] = useState<ScoutingLocks>({
    matchScoutingLocked: false,
    pitScoutingLocked: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchLocks = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch('/api/scouting-locks', { headers });
      if (!res.ok) return;
      const data = await res.json();
      setLocks({
        matchScoutingLocked: !!data.matchScoutingLocked,
        pitScoutingLocked: !!data.pitScoutingLocked,
      });
    } catch (err) {
      console.error('Failed to fetch scouting locks:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    setLoading(true);
    fetchLocks();
  }, [fetchLocks]);

  const setMatchScoutingLocked = useCallback(
    async (locked: boolean) => {
      if (!session?.access_token) {
        toast({
          title: 'Sign in required',
          description: 'You need to be signed in to change scouting locks.',
          variant: 'destructive',
        });
        return;
      }
      try {
        const res = await fetch('/api/scouting-locks', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ matchScoutingLocked: locked }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          matchScoutingLocked?: boolean;
          error?: string;
        };
        if (!res.ok) {
          const msg =
            typeof data?.error === 'string' ? data.error : 'Failed to update match scouting lock';
          throw new Error(msg);
        }
        setLocks((prev) => ({ ...prev, matchScoutingLocked: !!data.matchScoutingLocked }));
        toast({
          title: locked ? 'Match scouting locked' : 'Match scouting unlocked',
        });
      } catch (err) {
        console.error('Failed to set match scouting lock:', err);
        toast({
          title: 'Could not update lock',
          description: err instanceof Error ? err.message : 'Failed to update match scouting lock',
          variant: 'destructive',
        });
      }
    },
    [session?.access_token]
  );

  const setPitScoutingLocked = useCallback(
    async (locked: boolean) => {
      if (!session?.access_token) {
        toast({
          title: 'Sign in required',
          description: 'You need to be signed in to change scouting locks.',
          variant: 'destructive',
        });
        return;
      }
      try {
        const res = await fetch('/api/scouting-locks', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pitScoutingLocked: locked }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          pitScoutingLocked?: boolean;
          error?: string;
        };
        if (!res.ok) {
          const msg =
            typeof data?.error === 'string' ? data.error : 'Failed to update pit scouting lock';
          throw new Error(msg);
        }
        setLocks((prev) => ({ ...prev, pitScoutingLocked: !!data.pitScoutingLocked }));
        toast({
          title: locked ? 'Pit scouting locked' : 'Pit scouting unlocked',
        });
      } catch (err) {
        console.error('Failed to set pit scouting lock:', err);
        toast({
          title: 'Could not update lock',
          description: err instanceof Error ? err.message : 'Failed to update pit scouting lock',
          variant: 'destructive',
        });
      }
    },
    [session?.access_token]
  );

  return {
    ...locks,
    loading,
    setMatchScoutingLocked,
    setPitScoutingLocked,
    refetch: fetchLocks,
  };
}
