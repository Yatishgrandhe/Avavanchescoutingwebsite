/**
 * Layout for view-data page only: sidebar with Back to Competition History + Overview, Comparison, Data Analysis.
 */
import React from 'react';
import Link from 'next/link';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar';
import CompetitionDataSidebar, { type CompetitionViewTab } from './CompetitionDataSidebar';
import { Button } from '../ui/Button';
import { ArrowLeft } from 'lucide-react';
import Logo from '../ui/Logo';

interface CompetitionDataLayoutProps {
  children: React.ReactNode;
  activeTab: CompetitionViewTab;
  onTabChange: (tab: CompetitionViewTab) => void;
  /** e.g. /competition-history */
  backHref?: string;
  /** e.g. ?event_key=avalanche_2026 or ?id=xxx */
  queryString?: string;
}

export default function CompetitionDataLayout({
  children,
  activeTab,
  onTabChange,
  backHref = '/competition-history',
  queryString = '',
}: CompetitionDataLayoutProps) {
  const backUrl = backHref;

  return (
    <SidebarProvider>
      <CompetitionDataSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        backHref={backHref}
        queryString={queryString}
      />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <SidebarTrigger className="-ml-1" />
                <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors shrink-0">
                  <Logo size="sm" />
                  <span className="font-semibold hidden sm:inline">Avalanche Scouting</span>
                </Link>
              </div>
              <Link href={backUrl}>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Competition History
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
