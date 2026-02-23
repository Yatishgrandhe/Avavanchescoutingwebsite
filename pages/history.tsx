import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirect /history to /past-competitions (Competition History page).
 * Competition history (live + past) is now shown on the Past Competitions page.
 */
export default function HistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/past-competitions');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecting to Competition History…</p>
    </div>
  );
}
