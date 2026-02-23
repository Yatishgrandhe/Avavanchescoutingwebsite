/**
 * Sidebar shown only on view-data (after clicking a competition).
 * Has: Back to Competition History + Overview, Comparison, Data Analysis (Teams).
 */
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart3, LayoutDashboard, GitCompare } from 'lucide-react';
import { Badge, Logo } from '../ui';
import {
  Sidebar,
  SidebarContent,
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
import { Sparkles } from 'lucide-react';

export type CompetitionViewTab = 'overview' | 'comparison' | 'teams';

interface CompetitionDataSidebarProps {
  /** Current tab (overview | comparison | teams) */
  activeTab: CompetitionViewTab;
  /** Called when user selects a tab (for in-page switching without nav) */
  onTabChange?: (tab: CompetitionViewTab) => void;
  /** e.g. /competition-history */
  backHref: string;
  /** Query string to preserve e.g. ?event_key=xxx or ?id=xxx */
  queryString?: string;
}

const tabs: { id: CompetitionViewTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'comparison', label: 'Comparison', icon: GitCompare },
  { id: 'teams', label: 'Data Analysis', icon: BarChart3 },
];

export default function CompetitionDataSidebar({
  activeTab,
  onTabChange,
  backHref,
  queryString = '',
}: CompetitionDataSidebarProps) {
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
        {/* Back to Competition History */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? 'Back to Competition History' : undefined}>
                  <Link href={backHref}>
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Competition History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isCollapsed && (
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-2 pt-2">
            Competition
          </SidebarGroupLabel>
        )}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <SidebarMenuItem key={tab.id}>
                    {onTabChange ? (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={isCollapsed ? tab.label : undefined}
                        onClick={() => onTabChange(tab.id)}
                      >
                        <Icon />
                        <span>{tab.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={isCollapsed ? tab.label : undefined}
                      >
                        <Link href={`/view-data${queryString ? '?' + queryString.replace(/^\?/, '') : ''}#${tab.id}`}>
                          <Icon />
                          <span>{tab.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
