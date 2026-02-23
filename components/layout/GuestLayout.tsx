/**
 * Layout for guest-accessible pages: sidebar + top navbar + content.
 * Use on view-data, competition-history, team (guest), history/team so the guest sidebar shows on all of them.
 */
import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar';
import GuestSidebar from './GuestSidebar';
import GuestNavbar, { type GuestNavbarBackLink } from './GuestNavbar';

interface GuestLayoutProps {
  children: React.ReactNode;
  /** Top bar back link e.g. { href: '/competition-history', label: 'Back to Competition History' } */
  backLink?: GuestNavbarBackLink;
  /** If true, top navbar is always shown (e.g. competition-history). If false, only when !user. */
  forceShowNavbar?: boolean;
}

export default function GuestLayout({ children, backLink, forceShowNavbar = false }: GuestLayoutProps) {
  return (
    <SidebarProvider>
      <GuestSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <GuestNavbar backLink={backLink} forceShow={forceShowNavbar} leftElement={<SidebarTrigger className="-ml-1" />} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
