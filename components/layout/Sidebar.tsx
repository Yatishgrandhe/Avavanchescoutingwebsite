import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  BarChart3, 
  TrendingUp, 
  ArrowLeftRight, 
  ChevronRight,
  Settings,
  Menu,
  X,
  Wrench,
  Home,
  Target,
  Users,
  Database,
  FileText
} from 'lucide-react';
import { Button, Badge, Logo } from '../ui';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  user?: {
    name: string;
    username?: string;
    image?: string;
  };
  isDarkMode?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle, user, isDarkMode = true }) => {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Scout',
      items: [
        {
          label: 'Avalanche Form',
          href: '/scout',
          icon: ClipboardList,
        },
        {
          label: 'Pit Scouting',
          href: '/pit-scouting',
          icon: Wrench,
        },
      ],
    },
    {
      title: 'Analysis',
      items: [
        {
          label: 'Data Analysis',
          href: '/analysis/data',
          icon: Database,
        },
        {
          label: 'Basic',
          href: '/analysis/basic',
          icon: BarChart3,
        },
        {
          label: 'Advanced',
          href: '/analysis/advanced',
          icon: TrendingUp,
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
      className="h-screen border-r border-gray-200 flex flex-col bg-white shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-heading font-bold text-gray-900">
                Avalanche
              </h2>
              <p className="text-xs text-gray-500">
                Scouting Platform
              </p>
            </motion.div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 text-gray-600 hover:text-blue-600"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <X size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {/* Dashboard Button */}
        <div className="mb-6">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-xl transition-all duration-200",
                router.pathname === "/"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
              )}
            >
              <Home size={20} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="flex-1 font-medium">Dashboard</span>
              )}
              {router.pathname === "/" && !isCollapsed && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Active
                </Badge>
              )}
            </motion.div>
          </Link>
        </div>

        {menuItems.map((section, sectionIndex) => (
          <div key={section.title}>
            {!isCollapsed && (
              <motion.h3
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + sectionIndex * 0.1 }}
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3"
              >
                {section.title}
              </motion.h3>
            )}
            
            <div className="space-y-1">
              {section.title === 'Analysis' && (
                <Link key="/analysis/data" href="/analysis/data">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-xl transition-all duration-200",
                      router.pathname === "/analysis/data"
                        ? "bg-red-500 text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-100 hover:text-red-500"
                    )}
                  >
                    <Database size={20} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 font-medium">Data Analysis</span>
                    )}
                    {router.pathname === "/analysis/data" && !isCollapsed && (
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        New
                      </Badge>
                    )}
                  </motion.div>
                </Link>
              )}
              
              {section.items.map((item, itemIndex) => (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-xl transition-all duration-200",
                      router.pathname === item.href
                        ? "bg-yellow-500 text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-100 hover:text-yellow-600"
                    )}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 font-medium">{item.label}</span>
                    )}
                    {router.pathname === item.href && !isCollapsed && (
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        Active
                      </Badge>
                    )}
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 border-t border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.username}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Sidebar;