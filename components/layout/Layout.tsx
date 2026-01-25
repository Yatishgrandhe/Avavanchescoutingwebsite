import React from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, Settings } from 'lucide-react';
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
import AppSidebar from './Sidebar';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, supabase } = useSupabase();
  const { isAdmin } = useAdmin();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/signin';
  };

  return (
    <SidebarProvider>
      {/* Sidebar */}
      <AppSidebar
        user={user ? {
          name: user.user_metadata?.full_name || user.email || 'User',
          username: user.user_metadata?.username || user.email,
          image: user.user_metadata?.avatar_url
        } : undefined}
        isAdmin={isAdmin}
      />

      {/* Main Content Area - SidebarInset handles the proper spacing */}
      <SidebarInset>
        {/* Global Background Gradient */}
        <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

        <div className="flex flex-col min-h-screen relative z-10">
          {/* Top Bar */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40"
          >
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center space-x-2">
                <Logo size="sm" className="md:hidden" />
                <h1 className="text-lg font-heading font-semibold text-foreground/90 hidden md:block">
                  Avalanche Scouting
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {user && (
                <div className="flex items-center space-x-3 pl-3 border-l border-border">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-medium leading-none text-foreground">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAdmin ? 'Administrator' : 'Team Member'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary/50 transition-all p-0 overflow-hidden">
                        <Avatar className="h-full w-full">
                          <AvatarImage
                            src={user.user_metadata?.avatar_url}
                            alt={user.user_metadata?.full_name || 'User'}
                          />
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
          </motion.header>

          {/* Main Content Area */}
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6"
          >
            <div className="max-w-7xl mx-auto space-y-6 pb-10">
              {children}
            </div>
          </motion.main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;