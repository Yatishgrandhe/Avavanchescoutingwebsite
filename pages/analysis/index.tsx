import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { BarChart3, TrendingUp, ArrowLeftRight, Database, Users, FileSpreadsheet, ClipboardList } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';

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
  const { supabase } = useSupabase();
  const [stats, setStats] = useState<{ teams: number; matchForms: number; pitForms: number } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [teamsRes, matchRes, pitRes] = await Promise.all([
          supabase.from('scouting_data').select('team_number'),
          supabase.from('scouting_data').select('*', { count: 'exact', head: true }),
          supabase.from('pit_scouting_data').select('*', { count: 'exact', head: true }),
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
  }, [supabase]);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero — Polar Edge style */}
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
              Scouting Data
            </h1>
            <p className="text-muted-foreground mt-1.5 text-base">
              Match and team data collected across all events.
            </p>
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
