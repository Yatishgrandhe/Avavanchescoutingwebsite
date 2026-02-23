/**
 * Sidebar for guest-accessible pages. Shown on view-data, competition-history, team (guest), history/team.
 */
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Database, Archive, LogIn } from 'lucide-react';
import { Badge, Logo } from '../ui';
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
  SidebarRail,
  useSidebar,
} from '../ui/sidebar';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

const guestNavItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Competition History', href: '/competition-history', icon: Database },
  { label: 'Archive', href: '/history', icon: Archive },
];

export default function GuestSidebar() {
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-sidebar-border bg-background/60 backdrop-blur-xl"
    >
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0" />

      <SidebarHeader className="border-b border-sidebar-border relative z-10">
        <div className="flex items-center gap-2 px-2 py-1.5">
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
                className="flex items-center gap-2"
              >
                <h2 className="font-heading font-bold text-lg tracking-tight text-sidebar-foreground">
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

      <SidebarContent className="relative z-10">
        {!isCollapsed && (
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-2 pt-2">
            Public
          </SidebarGroupLabel>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {guestNavItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? router.pathname === '/'
                    : router.pathname === item.href || router.pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={isCollapsed ? item.label : undefined}
                    >
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border relative z-10">
        <div className={cn('flex items-center rounded-lg p-2', isCollapsed ? 'justify-center' : 'space-x-3')}>
          <SidebarMenuButton asChild tooltip={isCollapsed ? 'Sign in' : undefined}>
            <Link href="/auth/signin" className="text-muted-foreground hover:text-foreground">
              <LogIn className={cn('flex-shrink-0', isCollapsed ? 'h-5 w-5 mx-auto' : 'h-5 w-5')} />
              {!isCollapsed && <span className="text-sm font-medium">Sign in</span>}
            </Link>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
