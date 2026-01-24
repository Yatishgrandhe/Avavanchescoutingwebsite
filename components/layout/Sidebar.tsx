import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  BarChart3,
  TrendingUp,
  ArrowLeftRight,
  Wrench,
  Home,
  Database,
  List,
  Eye,
  BookOpen,
  Archive,
  Sparkles
} from 'lucide-react';
import { Badge, Logo, Avatar, AvatarFallback, AvatarImage } from '../ui';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar';
import { cn } from '@/lib/utils';

interface SidebarProps {
  user?: {
    name: string;
    username?: string;
    image?: string;
  };
  isAdmin?: boolean;
}

const AppSidebar: React.FC<SidebarProps> = ({
  user,
  isAdmin = false
}) => {
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

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

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Logo size="sm" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <h2 className="font-heading font-bold text-lg tracking-tight">
                  Avalanche
                </h2>
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  2026
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={router.pathname === "/"}>
                  <Link href="/">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {menuItems.map((section) => (
          <SidebarGroup key={section.title}>
            {!isCollapsed && (
              <SidebarGroupLabel>
                {section.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = router.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className={cn("flex items-center rounded-lg p-2", isCollapsed ? "justify-center" : "space-x-3")}>
          {user?.image ? (
            <Avatar className={cn("flex-shrink-0", isCollapsed ? "h-8 w-8 mx-auto" : "h-8 w-8")}>
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={cn("w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-xs text-primary-foreground font-bold flex-shrink-0 shadow-lg shadow-primary/20", isCollapsed && "mx-auto")}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">Team Member</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;