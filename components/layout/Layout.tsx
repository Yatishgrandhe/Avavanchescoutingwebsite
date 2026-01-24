import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Menu, X, Bell, Settings, Search } from 'lucide-react';
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
  Badge,
  Logo,
  Input
} from '../ui';
import Sidebar from './Sidebar';
import { useSupabase } from '@/pages/_app';
import { useResponsive } from '@/lib/screen-detector';
import { useAdmin } from '@/hooks/use-admin';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, supabase } = useSupabase();
  const screenInfo = useResponsive();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Always dark mode
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Auto-collapse sidebar on mobile/tablet
  useEffect(() => {
    if (screenInfo.isMobile || screenInfo.isTablet) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [screenInfo.isMobile, screenInfo.isTablet]);

  // Close mobile nav when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (isMobileNavOpen && screenInfo.isMobile) {
        const target = event.target as Element;
        // Close if clicking outside the mobile nav container (Sidebar w/ mobile class) or trigger
        // Note: The Sidebar container doesn't strictly have a class 'mobile-nav-container' unless we add it
        // But clicking main content (outside the drawer) should close it.
        // We can check if the click target is within the specialized Sidebar drawer.
        // However, standard drawer behavior is often overlay + click outside.

        // Simpler check: if we are open, and click is NOT in the header menu button...
        // We need to be careful not to close it immediately if we click inside the menu.
        // For now, let's rely on the route change for link clicks, and this for background clicks.

        const sidebarEl = document.getElementById('mobile-sidebar-container');
        if (sidebarEl && !sidebarEl.contains(target) && !target.closest('.mobile-nav-trigger')) {
          setIsMobileNavOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileNavOpen, screenInfo.isMobile]);

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [router.asPath]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/signin';
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileNav = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  return (
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
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileNav}
                className="h-9 w-9 mobile-nav-trigger flex-shrink-0"
              >
                {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
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
              )}
            </div>
          </motion.header>

          {/* Collapsible Mobile Navigation Bar */}
          <AnimatePresence>
            {isMobileNavOpen && (
              <motion.div
                id="mobile-sidebar-container"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-background/95 backdrop-blur-xl border-b border-border w-full overflow-hidden z-30 shadow-sm"
              >
                <div className="p-2">
                  <Sidebar
                    isCollapsed={false}
                    onToggle={() => {
                      toggleSidebar();
                      setIsMobileNavOpen(false);
                    }}
                    user={user ? {
                      name: user.user_metadata?.full_name || user.email || 'User',
                      username: user.user_metadata?.username || user.email,
                      image: user.user_metadata?.avatar_url
                    } : undefined}
                    isDarkMode={isDarkMode}
                    isMobile={true}
                    isAdmin={isAdmin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full p-4 relative z-0">
            {children}
          </div>
        </div>
      ) : (
        /* Desktop Layout - Side by side */
        <div className="flex h-screen overflow-hidden relative z-10">
          {/* Sidebar */}
          <div className={cn(
            "relative z-50 h-full transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "w-[80px]" : "w-[260px]"
          )}>
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onToggle={toggleSidebar}
              user={user ? {
                name: user.user_metadata?.full_name || user.email || 'User',
                username: user.user_metadata?.username || user.email,
                image: user.user_metadata?.avatar_url
              } : undefined}
              isDarkMode={isDarkMode}
              isMobile={false}
              isAdmin={isAdmin}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/30 relative">
            {/* Top Bar - Enhanced with Search and Notifications */}
            <motion.header
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-6 py-4 glass border-b border-border mx-6 mt-4 rounded-2xl sticky top-4 z-40 shadow-lg"
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <h1 className="text-lg font-heading font-semibold text-foreground/90 hidden lg:block">
                  Avalanche Scouting
                </h1>
                {/* Search Bar - Desktop Only */}
                <div className="hidden md:flex items-center flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search teams, matches..."
                      className="pl-9 w-full bg-background/50 border-border"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive">
                        3
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 glass border-border" align="end">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="p-2 text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

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
              className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-hide"
            >
              <div className="max-w-7xl mx-auto space-y-6 pb-10">
                {children}
              </div>
            </motion.main>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;