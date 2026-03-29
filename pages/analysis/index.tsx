import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Card, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui';
import { BarChart3, TrendingUp, ArrowLeftRight, Database, Users, FileSpreadsheet, ClipboardList } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { cn } from '@/lib/utils';
import { getOrgCurrentEvent } from '@/lib/org-app-config';
import { Activity } from 'lucide-react';

const quickAccess = [
  {
    title: 'Teams',
    href: '/analysis/basic',
    description: 'Browse all scouted teams and view detailed per-team breakdowns.',
    icon: Users,
  },
  {
    title: 'Comparison',
    href: '/analysis/comparison',
    description: 'Compare multiple teams side-by-side across key performance metrics.',
    icon: ArrowLeftRight,
  },
  {
    title: 'Data Analysis',
    href: '/analysis/data',
    description: 'Full table of all match scouting records; expand rows for runs and fuel.',
    icon: Database,
  },
];

export default function AnalysisIndex() {
  const router = useRouter();
  const [teamDataOnly, setTeamDataOnly] = useState(false); // Default OFF
  const { user, supabase } = useSupabase();
  const [stats, setStats] = useState<{ teams: number; matchForms: number; pitForms: number } | null>(null);
  const [activeEventKey, setActiveEventKey] = useState<string>('');
  const [activeEventName, setActiveEventName] = useState<string>('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Fetch organization's active event
        let currentEventKey = '';
        if (user?.organization_id) {
          const { eventKey, eventName } = await getOrgCurrentEvent(supabase, user.organization_id);
          currentEventKey = eventKey;
          setActiveEventKey(eventKey);
          setActiveEventName(eventName);
        }

        let matchQuery = supabase.from('scouting_data').select('team_number, matches!inner(event_key)');
        let matchCountQuery = supabase.from('scouting_data').select('id, matches!inner(event_key)', { count: 'exact', head: true });
        let pitCountQuery = supabase.from('pit_scouting_data').select('id, roster:event_team_roster!inner(event_key)', { count: 'exact', head: true });

        // ALWAYS filter by active event if available to prevent data leakage from other competitions
        if (currentEventKey) {
          matchQuery = matchQuery.eq('matches.event_key', currentEventKey);
          matchCountQuery = matchCountQuery.eq('matches.event_key', currentEventKey);
          pitCountQuery = pitCountQuery.eq('roster.event_key', currentEventKey);
        }

        if (teamDataOnly && user?.organization_id) {
          matchQuery = matchQuery.eq('organization_id', user.organization_id);
          matchCountQuery = matchCountQuery.eq('organization_id', user.organization_id);
          pitCountQuery = pitCountQuery.eq('organization_id', user.organization_id);
        }

        const [teamsRes, matchRes, pitRes] = await Promise.all([
          matchQuery,
          matchCountQuery,
          pitCountQuery,
        ]);
        const teamNumbers = new Set((teamsRes.data || []).map((r: { team_number: number }) => r.team_number));
        setStats({
          teams: teamNumbers.size,
          matchForms: matchRes.count ?? 0,
          pitForms: pitRes.count ?? 0,
        });
      } catch {
        setStats({ teams: 0, matchForms: 0, pitForms: 0 });
      }
    };
    loadStats();
  }, [supabase, teamDataOnly, user?.organization_id]);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero — Polar Edge style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
                    Scouting Data
                  </h1>
                  {activeEventName && (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 mt-1">
                      <Activity className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary truncate max-w-[200px] uppercase tracking-wider">{activeEventName}</span>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground mt-1.5 text-base">
                  Analysis and metrics for the current competition.
                </p>
              </div>

              {/* Team Data Only Toggle */}
              <div className="flex items-center gap-3 p-2 rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Team Data Only</span>
                  <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">
                    Show only {user?.organization_id ? 'your organization' : 'Avalanche'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={teamDataOnly ? 'default' : 'outline'}
                  onClick={() => setTeamDataOnly(!teamDataOnly)}
                  className={cn(
                    "h-7 px-2.5 rounded-full transition-all text-[10px] font-bold",
                    teamDataOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {teamDataOnly ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>

          {/* Quick Access — their format, our colors */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickAccess.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="h-full"
                    >
                      <Card
                        className={`h-full transition-all border-2 cursor-pointer ${
                          isActive
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/30 hover:bg-muted/30'
                        }`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <CardTitle className="text-lg font-semibold text-foreground">
                              {item.title}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-sm text-muted-foreground leading-snug">
                            {item.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Stats row — Polar Edge style (Teams, Stand Forms, Pit Forms) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border bg-card/50 overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {stats ? stats.teams : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">Teams</p>
                </div>
              </div>
            </Card>
            <Card className="border-border bg-card/50 overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {stats ? stats.matchForms : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">Match Forms</p>
                </div>
              </div>
            </Card>
            <Card className="border-border bg-card/50 overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileSpreadsheet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {stats ? stats.pitForms : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">Pit Forms</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Extra: Advanced analysis link (our content) */}
          <Card className="border-primary/20 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Advanced analysis
              </CardTitle>
              <CardDescription className="text-sm">
                REBUILT KPIs, radar charts, CLANK, RPMAGIC, GOBLIN, climb, and uptime per team.
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-4">
              <Link href="/analysis/advanced">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  Open Advanced <BarChart3 className="w-4 h-4" />
                </motion.div>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
