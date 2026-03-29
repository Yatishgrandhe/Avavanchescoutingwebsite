/**
 * Layout for view-data and team page in competition context: sidebar with Back to Competition History, Home, tabs.
 * Shows user avatar and sign-out in header when logged in.
 */
import React from 'react';
import Link from 'next/link';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar';
import CompetitionDataSidebar, { type CompetitionViewTab } from './CompetitionDataSidebar';
import { Button, Avatar, AvatarFallback, AvatarImage, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui';
import { ArrowLeft, Home, User, LogOut, Settings } from 'lucide-react';
import Logo from '../ui/Logo';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';

interface CompetitionDataLayoutProps {
  children: React.ReactNode;
  activeTab: CompetitionViewTab;
  onTabChange?: (tab: CompetitionViewTab) => void;
  backHref?: string;
  queryString?: string;
  showPitTab?: boolean;
  /** Show Scouting Stats tab (default true) */
  showStatsTab?: boolean;
}

export default function CompetitionDataLayout({
  children,
  activeTab,
  onTabChange,
  backHref = '/competition-history',
  queryString = '',
  showPitTab = false,
  showStatsTab = true,
}: CompetitionDataLayoutProps) {
  const backUrl = backHref;
  const { user, supabase } = useSupabase();
  const { isAdmin } = useAdmin();
  const isLoggedIn = !!user;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/signin';
  };

  return (
    <SidebarProvider>
      <CompetitionDataSidebar
        activeTab={activeTab}
        onTabChange={onTabChange ?? undefined}
        backHref={backHref}
        queryString={queryString}
        showPitTab={showPitTab}
        showStatsTab={showStatsTab}
        isLoggedIn={isLoggedIn}
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
              <div className="flex items-center gap-2">
                {isLoggedIn && (
                  <Link href="/">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Home className="h-4 w-4" /> Home
                    </Button>
                  </Link>
                )}
                {!isLoggedIn && (
                  <Link href={backUrl}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ArrowLeft className="h-4 w-4" /> Back to Competition History
                    </Button>
                  </Link>
                )}
                {user && (
                  <div className="flex items-center gap-2 pl-2 border-l border-border">
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-medium leading-none text-foreground">{user.user_metadata?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Team Member'}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-border hover:ring-primary/50 transition-all p-0 overflow-hidden">
                          <Avatar className="h-full w-full">
                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || 'User'} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {(user.user_metadata?.full_name || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 glass border-border mt-2" align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Sign Out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
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
