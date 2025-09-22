import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun } from 'lucide-react';
import Sidebar from './Sidebar';
import Logo from '@/components/ui/Logo';

interface LayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    username?: string;
    image?: string;
  };
}

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-dark-900">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        user={user}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <Logo size="sm" />
            <h1 className="text-xl font-semibold text-white">
              Avalanche Scouting Data
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-md hover:bg-dark-700 text-gray-400 hover:text-white transition-colors">
              <Sun size={20} />
            </button>
          </div>
        </motion.header>
        
        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 overflow-auto bg-dark-900"
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
