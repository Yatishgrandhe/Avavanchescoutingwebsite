import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/pages/_app';

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
      const res = await fetch('/api/scouting-locks');
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
  }, []);

  useEffect(() => {
    fetchLocks();
  }, [fetchLocks]);

  const setMatchScoutingLocked = useCallback(
    async (locked: boolean) => {
      if (!session?.access_token) return;
      try {
        const res = await fetch('/api/scouting-locks', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ matchScoutingLocked: locked }),
        });
        if (!res.ok) throw new Error('Failed to update');
        const data = await res.json();
        setLocks((prev) => ({ ...prev, matchScoutingLocked: !!data.matchScoutingLocked }));
      } catch (err) {
        console.error('Failed to set match scouting lock:', err);
      }
    },
    [session?.access_token]
  );

  const setPitScoutingLocked = useCallback(
    async (locked: boolean) => {
      if (!session?.access_token) return;
      try {
        const res = await fetch('/api/scouting-locks', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pitScoutingLocked: locked }),
        });
        if (!res.ok) throw new Error('Failed to update');
        const data = await res.json();
        setLocks((prev) => ({ ...prev, pitScoutingLocked: !!data.pitScoutingLocked }));
      } catch (err) {
        console.error('Failed to set pit scouting lock:', err);
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
