import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
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
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  onToggle, 
  user, 
  isDarkMode = false,
  isMobile = false 
}) => {
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
      initial={{ width: isCollapsed ? 64 : 256 }}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={cn(
        "sidebar-modern h-full flex flex-col",
        isMobile && "fixed inset-y-0 left-0 z-50"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3 min-w-0">
          <Logo size="sm" />
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: 0.1 }}
                className="min-w-0"
              >
                <h2 className="text-lg font-heading font-bold text-card-foreground truncate">
                  Avalanche
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  Scouting Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2 hover:bg-accent text-muted-foreground hover:text-accent-foreground flex-shrink-0"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <X size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Dashboard Button */}
        <div className="mb-6">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "nav-item",
                router.pathname === "/" && "active"
              )}
            >
              <Home size={20} className="flex-shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 font-medium truncate"
                  >
                    Dashboard
                  </motion.span>
                )}
              </AnimatePresence>
              {router.pathname === "/" && !isCollapsed && (
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  Active
                </Badge>
              )}
            </motion.div>
          </Link>
        </div>

        {menuItems.map((section, sectionIndex) => (
          <div key={section.title}>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.h3
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.1 + sectionIndex * 0.1 }}
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-4"
                >
                  {section.title}
                </motion.h3>
              )}
            </AnimatePresence>
            
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                    className={cn(
                      "nav-item",
                      router.pathname === item.href && "active"
                    )}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex-1 font-medium truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {router.pathname === item.href && !isCollapsed && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary">
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
          className="p-4 border-t border-border"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.username}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Sidebar;