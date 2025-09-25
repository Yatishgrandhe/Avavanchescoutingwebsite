import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Bell, User, LogOut, Menu, X } from 'lucide-react';
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

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, supabase } = useSupabase();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize dark mode from system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/signin';
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-400">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`transition-all duration-400 ${isSidebarCollapsed ? 'w-16' : 'w-64'} ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}`}>
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebar}
            user={user ? {
              name: user.user_metadata?.full_name || user.email || 'User',
              username: user.user_metadata?.username || user.email,
              image: user.user_metadata?.avatar_url
            } : undefined}
            isDarkMode={isDarkMode}
            isMobile={isMobile}
          />
        </div>

        {/* Mobile overlay */}
        {isMobile && !isSidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="header-modern flex items-center justify-between px-4 sm:px-6 lg:px-8"
          >
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-accent"
                >
                  <Menu size={20} />
                </Button>
              )}
              
              <Logo size="md" />
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-heading font-bold tracking-wide text-foreground"
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

              {/* Theme Toggle */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleDarkMode}
                className="p-2 rounded-xl transition-all duration-400 hover:bg-accent text-muted-foreground hover:text-accent-foreground"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              {/* User Menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
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
            className="flex-1 overflow-auto"
          >
            <div className="container-main py-6">
              <div className="content-spacing">
                {children}
              </div>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
};

export default Layout;