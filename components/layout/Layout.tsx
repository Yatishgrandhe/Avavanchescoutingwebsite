import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Bell, User, LogOut } from 'lucide-react';
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/signin';
  };

  return (
    <div className="flex h-screen transition-colors duration-300 bg-gray-50">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        user={user ? {
          name: user.user_metadata?.full_name || user.email || 'User',
          username: user.user_metadata?.username || user.email,
          image: user.user_metadata?.avatar_url
        } : undefined}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="header-avalanche bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center space-x-4">
            <Logo size="md" />
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl font-heading font-bold tracking-wide text-gray-900"
            >
              Avalanche Scouting
            </motion.h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 hover:text-blue-600"
            >
              <Bell size={20} />
            </motion.button>

            {/* Theme Toggle */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 hover:text-blue-600"
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
                      <p className="text-xs leading-none text-gray-500">
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
        
        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 overflow-auto bg-gray-50"
        >
          <div className="p-6">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default Layout;
