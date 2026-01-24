import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, LogOut } from 'lucide-react';
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Logo
} from '../ui';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '../ui/sidebar';
import { Separator } from '../ui';
import AppSidebar from './Sidebar';
import { useSupabase } from '@/pages/_app';
import { useResponsive } from '@/lib/screen-detector';
import { useAdmin } from '@/hooks/use-admin';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, supabase } = useSupabase();
  const screenInfo = useResponsive();
  const { isAdmin } = useAdmin();
  const [isDarkMode] = useState(true); // Always dark mode

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/signin';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-400 overflow-x-hidden overflow-y-auto max-w-full relative selection:bg-primary/30">
        {/* Global Background Gradient */}
        <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

        {/* Mobile Layout - Stack vertically */}
        {screenInfo.isMobile ? (
          <div className="flex flex-col h-screen w-full max-w-full overflow-x-hidden overflow-y-auto relative z-10">
            {/* Mobile Header with Navigation */}
            <motion.header
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-sm"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <SidebarTrigger className="mobile-nav-trigger flex-shrink-0" />
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <Logo size="sm" />
                  <h1 className="text-sm sm:text-base font-heading font-bold text-foreground truncate">
                    Avalanche Scouting
                  </h1>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 p-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={user.user_metadata?.avatar_url}
                            alt={user.user_metadata?.full_name || 'User'}
                          />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {(user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass border-border" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.user_metadata?.full_name || user.email}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.user_metadata?.username || user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </motion.header>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full p-4 relative z-0">
              {children}
            </div>
          </div>
        ) : (
          /* Desktop Layout - Side by side */
          <>
            <AppSidebar
              user={user ? {
                name: user.user_metadata?.full_name || user.email || 'User',
                username: user.user_metadata?.username || user.email,
                image: user.user_metadata?.avatar_url
              } : undefined}
              isAdmin={isAdmin}
            />
            <SidebarInset>
              {/* Header with Sidebar Trigger */}
              <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                <SidebarTrigger className="-ml-1" />
                <div className="flex flex-1 items-center gap-2 px-3">
                  <Separator orientation="vertical" className="h-4" />
                </div>
              </header>
              {/* Main Content Area */}
              <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-hide"
              >
                <div className="max-w-7xl mx-auto space-y-6 pb-10">
                  {children}
                </div>
              </motion.main>
            </SidebarInset>
          </>
        )}
      </div>
    </SidebarProvider>
  );
};

export default Layout;