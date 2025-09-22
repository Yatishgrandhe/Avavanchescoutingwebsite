import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  BarChart3, 
  Sparkles, 
  ArrowLeftRight, 
  ChevronRight,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/ui/Logo';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  user?: {
    name: string;
    username?: string;
    image?: string;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, user }) => {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Scout',
      items: [
        {
          label: 'Stand Form',
          href: '/scout',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Analysis',
      items: [
        {
          label: 'Basic',
          href: '/analysis/basic',
          icon: BarChart3,
        },
        {
          label: 'Advanced',
          href: '/analysis/advanced',
          icon: Sparkles,
        },
        {
          label: 'Comparison',
          href: '/analysis/comparison',
          icon: ArrowLeftRight,
        },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ width: isCollapsed ? 80 : 280 }}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-dark-800 border-r border-dark-700 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white font-semibold text-lg"
            >
              Avalanche Scouting
            </motion.div>
          )}
        </div>
        
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
        >
          {isCollapsed ? <Menu size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {menuItems.map((section, sectionIndex) => (
          <div key={section.title}>
            {!isCollapsed && (
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + sectionIndex * 0.1 }}
                className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3"
              >
                {section.title}
              </motion.h3>
            )}
            
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const isActive = router.pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors cursor-pointer group',
                        isActive
                          ? 'bg-avalanche-600 text-white'
                          : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                      )}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                      {!isCollapsed && isActive && (
                        <ChevronRight size={16} className="flex-shrink-0" />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 min-w-0"
              >
                <p className="text-white font-medium text-sm truncate">
                  {user.name}
                </p>
                {user.username && (
                  <p className="text-gray-400 text-xs truncate">
                    {user.username}
                  </p>
                )}
              </motion.div>
            )}
            
            {!isCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-1 rounded-md hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight size={16} />
              </motion.button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Sidebar;
