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
  ChevronLeft,
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
  BookOpen,
  Archive,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen
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
          label: 'Match Scouting',
          href: '/scout',
          icon: ClipboardList,
        },
        {
          label: 'Pit Scouting',
          href: '/pit-scouting',
          icon: Wrench,
        },
        {
          label: 'Pit Data',
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
        {
          label: 'Past Competitions',
          href: '/past-competitions',
          icon: Archive,
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
          label: 'Basic Analysis',
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

  // Mobile navigation - Glass morphism bottom bar or scrollable top bar
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
        `}</style>
        <div className="w-full bg-background/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
          <nav className="mobile-nav-scroll overflow-x-auto py-2 px-4 flex items-center space-x-2">
            <Link href="/" passHref>
              <div className={cn(
                "flex flex-col items-center justify-center min-w-[70px] p-2 rounded-xl transition-all",
                router.pathname === "/" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
              )}>
                <Home size={20} />
                <span className="text-[10px] font-medium mt-1">Home</span>
              </div>
            </Link>

            {menuItems.flatMap(section => section.items).map((item) => {
              const isActive = router.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} passHref>
                  <div className={cn(
                    "flex flex-col items-center justify-center min-w-[70px] p-2 rounded-xl transition-all",
                    isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                  )}>
                    <Icon size={20} />
                    <span className="text-[10px] font-medium mt-1 truncate max-w-[80px] text-center">{item.label.split(' ')[0]}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </>
    );
  }

  // Desktop sidebar - Glass container
  return (
    <motion.div
      initial={{ width: isCollapsed ? 80 : 260 }}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 120, damping: 20 }}
      className="h-full flex flex-col bg-background/60 backdrop-blur-xl border-r border-white/10 shadow-2xl z-50 relative overflow-hidden"
    >
      {/* Decorative gradient blob */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className={cn("flex items-center p-4 mb-2 relative z-10", isCollapsed ? "justify-center flex-col gap-4" : "justify-between")}>
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex-shrink-0">
            <Logo size="sm" />
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap"
              >
                <h2 className="font-heading font-bold text-lg tracking-tight text-white">
                  Avalanche
                </h2>
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                  Scouting 2025
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("text-muted-foreground hover:text-white rounded-lg hover:bg-white/10 transition-all", isCollapsed ? "w-8 h-8" : "")}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto scrollbar-hide relative z-10 py-2">
        {/* Dashboard Button */}
        <div>
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center p-3 rounded-xl transition-all duration-200 group cursor-pointer",
                router.pathname === "/"
                  ? "bg-primary text-white shadow-lg shadow-primary/25 border border-primary/20"
                  : "text-muted-foreground hover:text-white border border-transparent"
              )}
            >
              <Home size={20} className={cn("flex-shrink-0", isCollapsed ? "mx-auto" : "mr-3")} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-medium text-sm"
                  >
                    Dashboard
                  </motion.span>
                )}
              </AnimatePresence>

              {router.pathname === "/" && !isCollapsed && (
                <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </motion.div>
          </Link>
        </div>

        {menuItems.map((section, sectionIndex) => (
          <div key={section.title}>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.h3
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1 }}
                  className="px-3 mb-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest"
                >
                  {section.title}
                </motion.h3>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center p-3 rounded-xl transition-all duration-200 group cursor-pointer relative",
                        isActive
                          ? "bg-primary/90 text-white shadow-lg shadow-primary/20 border border-primary/20"
                          : "text-muted-foreground hover:text-white border border-transparent"
                      )}
                    >
                      <item.icon size={20} className={cn("flex-shrink-0 transition-colors", isActive ? "text-white" : "group-hover:text-white", isCollapsed ? "mx-auto" : "mr-3")} />

                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="font-medium text-sm whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-white/5 relative z-10 bg-black/10">
        <div className={cn("flex items-center rounded-xl p-2", isCollapsed ? "justify-center" : "space-x-3")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 shadow-lg shadow-primary/20">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate text-white">{user?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">Team Member</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;