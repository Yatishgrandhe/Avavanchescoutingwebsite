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
  FileText,
  List,
  Eye,
  BookOpen
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
  isAdmin?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  onToggle, 
  user, 
  isDarkMode = false,
  isMobile = false,
  isAdmin = false
}) => {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Learn',
      items: [
        {
          label: 'Game Rules',
          href: '/learn-game',
          icon: BookOpen,
        },
      ],
    },
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
        {
          label: 'Pit Data Viewer',
          href: '/pit-scouting-data',
          icon: Eye,
        },
      ],
    },
    ...(isAdmin ? [{
      title: 'Strategy',
      items: [
        {
          label: 'Pick Lists',
          href: '/pick-list',
          icon: List,
        },
      ],
    }] : []),
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

  // Mobile navigation - horizontal scrollable layout with Dashboard
  if (isMobile) {
    return (
      <>
        <style jsx>{`
          .mobile-nav-scroll {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
          }
          
          .mobile-nav-item {
            min-height: 60px;
            max-height: 60px;
          }
          
          @media screen and (orientation: portrait) {
            .mobile-nav-scroll {
              padding-left: 12px;
              padding-right: 12px;
            }
            
            .mobile-nav-item {
              min-width: 65px !important;
              max-width: 80px !important;
              padding: 8px 4px !important;
            }
            
            .mobile-nav-item span {
              font-size: 10px !important;
              line-height: 1.2 !important;
              max-width: 100% !important;
            }
            
            .mobile-nav-item svg {
              width: 16px !important;
              height: 16px !important;
              margin-bottom: 2px !important;
            }
          }
          
          @media screen and (max-width: 480px) {
            .mobile-nav-scroll {
              padding-left: 8px;
              padding-right: 8px;
            }
            
            .mobile-nav-item {
              min-width: 60px !important;
              max-width: 75px !important;
              padding: 6px 3px !important;
            }
            
            .mobile-nav-item span {
              font-size: 9px !important;
              line-height: 1.1 !important;
            }
            
            .mobile-nav-item svg {
              width: 14px !important;
              height: 14px !important;
            }
          }
        `}</style>
        {(() => {
          const mobileItems = [
            {
              label: 'Dashboard',
              href: '/mobile-dashboard',
              icon: Home,
            },
            {
              label: 'Scout',
              href: '/mobile-scout',
              icon: ClipboardList,
            },
            ...menuItems.flatMap(section => section.items).filter(item => item.href !== '/scout')
          ];

          return (
            <div className="w-full bg-card border-b border-border">
              <nav className="flex items-center space-x-3 mobile-nav-scroll scrollbar-hide px-3 py-3 overflow-x-auto">
                {mobileItems.map((item) => {
              const isActive = router.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Close mobile nav when clicking on a link
                      if (isMobile) {
                        // Add a small delay to ensure the navigation happens first
                        setTimeout(() => {
                          onToggle();
                        }, 100);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center mobile-nav-item rounded-lg transition-all duration-200 px-2 py-2 min-w-[70px] max-w-[85px] flex-shrink-0",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                    )}
                  >
                    <Icon size={18} className="mb-1 flex-shrink-0" />
                    <span className="font-medium text-center text-xs leading-tight break-words max-w-full">
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
              </nav>
            </div>
          );
        })()}
      </>
    );
  }

  // Desktop sidebar - vertical layout
  return (
    <motion.div
      initial={{ width: isCollapsed ? 64 : 256 }}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="sidebar-modern h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border min-h-[90px]">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
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
                <h2 className="font-heading font-bold text-card-foreground leading-tight">
                  Avalanche
                </h2>
                <p className="text-muted-foreground text-sm leading-tight mt-2">
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
      <nav className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Dashboard Button */}
        <div className="mb-6">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                // Close mobile nav when clicking on dashboard link
                if (isMobile) {
                  setTimeout(() => {
                    onToggle();
                  }, 100);
                }
              }}
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
                    className="flex-1 font-medium leading-tight break-words"
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
                  className="font-semibold text-muted-foreground uppercase tracking-wider mb-4 mt-6 px-2 text-xs"
                >
                  {section.title}
                </motion.h3>
              )}
            </AnimatePresence>
            
            <div className="space-y-2 px-2">
              {section.items.map((item, itemIndex) => (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                    onClick={() => {
                      // Close mobile nav when clicking on any link
                      if (isMobile) {
                        setTimeout(() => {
                          onToggle();
                        }, 100);
                      }
                    }}
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
                          className="flex-1 font-medium leading-tight break-words"
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
          className="p-6 border-t border-border"
        >
          <div className="flex items-center space-x-4 min-w-0">
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
                  <p className="font-medium text-card-foreground leading-tight break-words">
                    {user.name}
                  </p>
                  <p className="text-muted-foreground text-sm leading-tight mt-2 break-words">
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