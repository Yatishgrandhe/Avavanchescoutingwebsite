import React, { useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Quick latency check to /api/health-check for upload readiness (shown near profile).
 */
export default function NetworkSpeedIndicator() {
  const [ms, setMs] = useState<number | null>(null);
  const [bad, setBad] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      try {
        const res = await fetch('/api/health-check', { method: 'GET', cache: 'no-store' });
        const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsed = Math.round(t1 - t0);
        if (!cancelled) {
          setMs(elapsed);
          setBad(!res.ok || elapsed > 2500);
        }
      } catch {
        if (!cancelled) {
          setMs(null);
          setBad(true);
        }
      }
    };
    void run();
    const id = setInterval(run, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      className={cn(
        'hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground border border-border/60 rounded-md px-2 py-1',
        bad && 'text-amber-600 border-amber-500/40'
      )}
      title="Time to reach the server (lower is better for uploads)"
    >
      <Wifi className="w-3 h-3 shrink-0" />
      <span>{ms != null ? `${ms} ms` : '…'}</span>
    </div>
  );
}
