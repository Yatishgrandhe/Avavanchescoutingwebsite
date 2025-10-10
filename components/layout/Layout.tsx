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

  // Set dark mode as default and remove theme switching
  useEffect(() => {
    // Always set dark mode
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-400 overflow-x-hidden overflow-y-auto max-w-full">
      {/* Mobile Layout - Stack vertically */}
      {screenInfo.isMobile ? (
        <div className="flex flex-col h-screen w-full max-w-full overflow-x-hidden overflow-y-auto">
          {/* Mobile Header with Navigation */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="header-modern flex items-center justify-between px-4 py-3 bg-card border-b border-border w-full max-w-full overflow-x-hidden"
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
              <h1 className="text-lg lg:text-xl xl:text-2xl font-heading font-bold text-foreground">
                Avalanche Scouting
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="p-2">
                <Bell size={18} />
              </Button>

              {/* User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                          alt={user.user_metadata?.full_name || user.email}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (user.user_metadata?.avatar_url && !target.src.includes('discord')) {
                              target.src = `https://cdn.discordapp.com/avatars/${user.user_metadata?.sub}/${user.user_metadata?.avatar_url}.png?size=32`;
                            }
                          }}
                        />
                        <AvatarFallback>
                          {(user.user_metadata?.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
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
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                      <Badge variant="secondary" className="ml-auto">3</Badge>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
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
                transition={{ duration: 0.3 }}
                className="mobile-nav-container bg-card border-b border-border w-full max-w-full overflow-x-hidden"
              >
                <div className="px-2 py-2">
                  <Sidebar
                    isCollapsed={false}
                    onToggle={() => {
                      toggleSidebar();
                      setIsMobileNavOpen(false); // Close mobile nav when toggling
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
            <div className="container-main py-4 px-4 w-full max-w-full overflow-x-hidden">
              <div className="content-spacing w-full max-w-full">
                {children}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Layout - Side by side */
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <div className={`transition-all duration-400 ${isSidebarCollapsed ? 'w-16' : 'w-64'} relative`}>
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
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Bar */}
            <motion.header
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="header-modern flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10"
            >
              <div className="flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
                <Logo size="md" />
                <motion.h1 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl lg:text-2xl xl:text-3xl font-heading font-bold tracking-wide text-foreground"
                >
                  Avalanche Scouting
                </motion.h1>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Notifications */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-xl transition-all duration-400 hover:bg-accent text-muted-foreground hover:text-accent-foreground"
                >
                  <Bell size={20} />
                </motion.button>

                {/* User Menu */}
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                            alt={user.user_metadata?.full_name || user.email}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (user.user_metadata?.avatar_url && !target.src.includes('discord')) {
                                target.src = `https://cdn.discordapp.com/avatars/${user.user_metadata?.sub}/${user.user_metadata?.avatar_url}.png?size=32`;
                              }
                            }}
                          />
                          <AvatarFallback>
                            {(user.user_metadata?.full_name || user.email || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
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
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Notifications</span>
                        <Badge variant="secondary" className="ml-auto">3</Badge>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </motion.header>
            
            {/* Main Content Area */}
            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex-1 overflow-y-auto overflow-x-hidden"
            >
              <div className="container-main py-6">
                <div className="content-spacing">
                  {children}
                </div>
              </div>
            </motion.main>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;