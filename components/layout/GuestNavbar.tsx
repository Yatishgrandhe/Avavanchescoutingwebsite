/**
 * Shared navbar for guest-accessible pages (view-data, competition-history, team page when not logged in).
 * Keeps styling and navigation consistent across all public pages.
 */
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useSupabase } from '@/pages/_app';

export interface GuestNavbarBackLink {
  href: string;
  label: string;
}

interface GuestNavbarProps {
  /** e.g. { href: '/competition-history', label: 'Back to Competition History' } or { href: '/', label: 'Back to Home' } */
  backLink?: GuestNavbarBackLink;
  /** If true, always render this navbar (e.g. when page is used as guest view). If false, only used when !user. */
  forceShow?: boolean;
  /** Optional left-side content (e.g. SidebarTrigger when inside GuestLayout). */
  leftElement?: React.ReactNode;
}

export default function GuestNavbar({ backLink, forceShow = false, leftElement }: GuestNavbarProps) {
  const { user } = useSupabase();
  const showNavbar = forceShow || !user;

  if (!showNavbar) return null;

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {leftElement}
          <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors shrink-0">
            <Logo size="sm" />
            <span className="font-semibold hidden sm:inline">Avalanche Scouting</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {backLink && (
            <Link href={backLink.href}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {backLink.label}
              </Button>
            </Link>
          )}
          {user && (
            <Link href="/">
              <Button size="sm" className="gap-2">Dashboard</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
