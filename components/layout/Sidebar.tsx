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
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .mobile-nav-scroll::-webkit-scrollbar {
            display: none;
          }
          
          .mobile-nav-item {
            min-height: 70px;
            max-height: 70px;
            min-width: 90px;
            max-width: 110px;
            padding: 12px 8px;
            margin-right: 16px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
          
          .mobile-nav-item:last-child {
            margin-right: 24px;
          }
          
          /* Phone-specific styles - only apply to actual phones */
          @media screen and (max-width: 767px) and (orientation: portrait) {
            .mobile-nav-scroll {
              padding-left: 16px;
              padding-right: 16px;
              padding-top: 8px;
              padding-bottom: 8px;
            }
            
            .mobile-nav-item {
              min-width: 85px !important;
              max-width: 100px !important;
              padding: 10px 6px !important;
              margin-right: 20px !important;
              min-height: 65px !important;
              max-height: 65px !important;
            }
            
            .mobile-nav-item span {
              font-size: 11px !important;
              line-height: 1.2 !important;
              max-width: 100% !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              font-weight: 500 !important;
            }
            
            .mobile-nav-item svg {
              width: 18px !important;
              height: 18px !important;
              margin-bottom: 4px !important;
            }
          }
          
          /* Small phones in portrait */
          @media screen and (max-width: 480px) and (orientation: portrait) {
            .mobile-nav-scroll {
              padding-left: 12px;
              padding-right: 12px;
            }
            
            .mobile-nav-item {
              min-width: 75px !important;
              max-width: 90px !important;
              padding: 8px 4px !important;
              margin-right: 16px !important;
              min-height: 60px !important;
              max-height: 60px !important;
            }
            
            .mobile-nav-item span {
              font-size: 10px !important;
              line-height: 1.1 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            
            .mobile-nav-item svg {
              width: 16px !important;
              height: 16px !important;
              margin-bottom: 3px !important;
            }
          }
          
          /* Landscape orientation for phones */
          @media screen and (max-width: 767px) and (orientation: landscape) {
            .mobile-nav-scroll {
              padding-left: 12px;
              padding-right: 12px;
              padding-top: 6px;
              padding-bottom: 6px;
            }
            
            .mobile-nav-item {
              min-width: 80px !important;
              max-width: 95px !important;
              padding: 8px 4px !important;
              margin-right: 12px !important;
              min-height: 55px !important;
              max-height: 55px !important;
            }
            
            .mobile-nav-item span {
              font-size: 10px !important;
              line-height: 1.1 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
            }
            
            .mobile-nav-item svg {
              width: 16px !important;
              height: 16px !important;
              margin-bottom: 2px !important;
            }
          }
          
          /* Ensure tablets and larger don't get mobile nav styles */
          @media screen and (min-width: 768px) {
            .mobile-nav-scroll {
              display: none !important;
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
              <nav className="flex items-center mobile-nav-scroll overflow-x-auto">
                {mobileItems.map((item) => {
              const isActive = router.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                      "flex flex-col items-center justify-center mobile-nav-item rounded-lg transition-all duration-200 flex-shrink-0 cursor-pointer",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                    )}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="font-medium text-center leading-tight max-w-full truncate">
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
      <div className="flex items-center justify-between p-4 lg:p-5 border-b border-border min-h-[70px] lg:min-h-[80px]">
        <div className="flex items-center space-x-3 lg:space-x-4 min-w-0 flex-1">
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
                <h2 className="font-heading font-bold text-card-foreground leading-tight text-base lg:text-lg">
                  Avalanche
                </h2>
                <p className="text-muted-foreground text-xs lg:text-sm leading-tight mt-1 lg:mt-2">
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
      <nav className="flex-1 p-4 lg:p-5 space-y-4 lg:space-y-5 overflow-y-auto">
        {/* Dashboard Button */}
        <div className="mb-4 lg:mb-5">
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
              <Home size={18} className="flex-shrink-0 lg:w-5 lg:h-5" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 font-medium leading-tight break-words text-sm lg:text-sm"
                  >
                    Dashboard
                  </motion.span>
                )}
              </AnimatePresence>
              {router.pathname === "/" && !isCollapsed && (
                <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
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
                  className="font-semibold text-muted-foreground uppercase tracking-wider mb-3 lg:mb-4 mt-4 lg:mt-5 px-2 text-xs"
                >
                  {section.title}
                </motion.h3>
              )}
            </AnimatePresence>
            
            <div className="space-y-1 lg:space-y-2 px-2">
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
                    <item.icon size={18} className="flex-shrink-0 lg:w-5 lg:h-5" />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="flex-1 font-medium leading-tight break-words text-sm"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {router.pathname === item.href && !isCollapsed && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
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
          className="p-4 lg:p-5 border-t border-border"
        >
          <div className="flex items-center space-x-3 lg:space-x-4 min-w-0">
            <div className="w-7 h-7 lg:w-8 lg:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-xs lg:text-sm font-medium">
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
                  <p className="font-medium text-card-foreground leading-tight break-words text-xs lg:text-sm">
                    {user.name}
                  </p>
                  <p className="text-muted-foreground text-xs leading-tight mt-1 break-words">
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