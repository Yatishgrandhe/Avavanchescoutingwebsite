import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Redirect /history to /competition-history (public competition history page).
 */
export default function HistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/competition-history');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecting to Competition History…</p>
    </div>
  );
}
