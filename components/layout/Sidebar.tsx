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
            scrollbar-width: none; /* For Firefox */
            -ms-overflow-style: none; /* For Internet Explorer and Edge */
          }

          .mobile-nav-scroll::-webkit-scrollbar {
            display: none; /* For Chrome, Safari, and Opera */
          }

          .mobile-nav-container {
            display: flex;
            align-items: center;
            padding: 0 16px; /* Add horizontal padding to the container */
            gap: 24px; /* Increased gap for more spacing */
          }
          
          .mobile-nav-item {
            flex-shrink: 0; /* Prevent items from shrinking */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 75px;
            max-height: 75px;
            min-width: 95px;
            max-width: 115px;
            padding: 12px 8px;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            cursor: pointer;
            border-radius: 12px;
          }
          
          /* Phone-specific styles - only apply to actual phones */
          @media screen and (max-width: 767px) {
            /* Portrait orientation for phones */
            @media (orientation: portrait) {
              .mobile-nav-container {
                padding: 12px 20px;
                gap: 28px;
              }

              .mobile-nav-item {
                min-width: 90px;
                max-width: 105px;
                min-height: 70px;
                max-height: 70px;
              }
              
              .mobile-nav-item span {
                font-size: 12px;
                font-weight: 500;
              }
              
              .mobile-nav-item svg {
                width: 20px;
                height: 20px;
                margin-bottom: 5px;
              }
            }

            /* Landscape orientation for phones */
            @media (orientation: landscape) {
              .mobile-nav-container {
                padding: 8px 16px;
                gap: 20px;
              }

              .mobile-nav-item {
                min-width: 85px;
                max-width: 100px;
                min-height: 60px;
                max-height: 60px;
              }
              
              .mobile-nav-item span {
                font-size: 11px;
              }
              
              .mobile-nav-item svg {
                width: 18px;
                height: 18px;
                margin-bottom: 3px;
              }
            }
          }
          
          /* Small phones in portrait */
          @media screen and (max-width: 480px) and (orientation: portrait) {
            .mobile-nav-container {
              padding: 10px 16px;
              gap: 22px;
            }

            .mobile-nav-item {
              min-width: 80px;
              max-width: 95px;
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
              <nav className="mobile-nav-scroll overflow-x-auto">
                <div className="mobile-nav-container">
                  {mobileItems.map((item) => {
                    const isActive = router.pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                      <Link key={item.href} href={item.href} passHref>
                        <motion.div
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (isMobile) {
                              setTimeout(() => onToggle(), 100);
                            }
                          }}
                          className={cn(
                            "mobile-nav-item transition-all duration-200",
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-md" 
                              : "text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                          )}
                        >
                          <Icon size={20} className="flex-shrink-0" />
                          <span className="font-medium text-center leading-tight max-w-full truncate mt-1">
                            {item.label}
                          </span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
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