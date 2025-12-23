import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, LogOut, Menu, X } from 'lucide-react';
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
  Logo
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

  // Close mobile nav when clicking outside or on navigation links
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (isMobileNavOpen && screenInfo.isMobile) {
        const target = event.target as Element;
        // Close if clicking outside the mobile nav container
        if (!target.closest('.mobile-nav-container') && !target.closest('.mobile-nav-trigger')) {
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
            className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40"
          >
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileNav}
                className="p-2 md:hidden mobile-nav-trigger"
              >
                {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
              <Logo size="sm" />
              <h1 className="text-base font-heading font-bold text-foreground">
                Avalanche Scouting
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="p-2 relative">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Button>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-primary/20">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.user_metadata?.avatar_url}
                          alt={user.user_metadata?.full_name}
                        />
                        <AvatarFallback>
                          {(user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 glass border-white/10" align="end" forceMount>
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
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem className="focus:bg-white/10">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="focus:bg-white/10">
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                      <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary">3</Badge>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={handleSignOut} className="focus:bg-destructive/20 text-red-400">
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
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-background/95 backdrop-blur-xl border-b border-white/10 w-full overflow-hidden z-30"
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
            {/* Top Bar - Glass Effect */}
            <motion.header
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between px-6 py-4 glass border-b-0 border-white/5 mx-6 mt-4 rounded-2xl sticky top-4 z-40"
            >
              <div className="flex items-center space-x-3 lg:space-x-4">
                {/* Breadcrumbs or Page Title could go here */}
                <h1 className="text-lg font-heading font-semibold text-foreground/90">
                  Avalanche Scouting
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl transition-all duration-200 hover:bg-white/5 text-muted-foreground hover:text-white relative"
                >
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background" />
                </motion.button>

                {user && (
                  <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-medium leading-none text-white">{user.user_metadata?.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Team Member</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-white/10 hover:ring-primary/50 transition-all p-0 overflow-hidden">
                          <Avatar className="h-full w-full">
                            <AvatarImage
                              src={user.user_metadata?.avatar_url}
                              alt={user.user_metadata?.full_name}
                            />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {(user.user_metadata?.full_name || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 glass border-white/10 mt-2" align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSignOut} className="focus:bg-destructive/20 text-red-400 cursor-pointer">
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