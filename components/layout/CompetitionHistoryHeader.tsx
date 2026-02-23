/**
 * Simple header for Competition History page only. No sidebar.
 * Guests see: Logo + "Avalanche Scouting" + Back to Home.
 */
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function CompetitionHistoryHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <Logo size="sm" />
          <span className="font-semibold">Avalanche Scouting</span>
        </Link>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>
      </div>
    </header>
  );
}
