import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { BarChart3, TrendingUp, ArrowLeftRight, Info } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const analysisModules = [
  {
    title: 'Overview',
    href: '/analysis/basic',
    description: 'Team list, charts, and basic stats (AVG AUTO Fuel, AVG TELEOP Fuel, etc.).',
    icon: BarChart3,
  },
  {
    title: 'Advanced',
    href: '/analysis/advanced',
    description: 'REBUILT KPIs, radar charts, and deep dive (CLANK, RPMAGIC, GOBLIN, climb, uptime).',
    icon: TrendingUp,
  },
  {
    title: 'Compare',
    href: '/analysis/comparison',
    description: 'Side-by-side team comparison.',
    icon: ArrowLeftRight,
  },
];

const metricLocations = [
  { metric: 'AVG AUTO Fuel / AVG TELEOP Fuel', where: 'Overview & Advanced; also in Data Analysis table and per-team page.' },
  { metric: 'AVG CLIMB Pts', where: 'Advanced (single team) and Compare.' },
  { metric: 'AVG UPTIME %', where: 'Advanced and Compare.' },
  { metric: 'BROKE (reliability)', where: 'Overview, Advanced, Compare, and per-team page.' },
  { metric: 'CLANK, RPMAGIC, GOBLIN', where: 'Advanced (single team) and Compare.' },
  { metric: 'Per-team when scouted', where: 'Data Analysis → expand a row or click team number to open /team/[number]. Team Analysis → Advanced → search team.' },
];

export default function AnalysisIndex() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Team Analysis</h1>
            <p className="text-muted-foreground mt-1">Choose an analysis view below.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysisModules.map((mod, i) => {
              const Icon = mod.icon;
              const isActive = router.pathname === mod.href;
              return (
                <Link key={mod.href} href={mod.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="h-full"
                  >
                    <Card className={`h-full transition-colors ${isActive ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <CardTitle className="text-lg">{mod.title}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">{mod.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          <Card className="border-primary/20 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Where to find REBUILT metrics (per team)
              </CardTitle>
              <CardDescription className="text-sm">
                Based on Polar Edge–style analytics for 2026 REBUILT. All metrics use data from match scouting.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm">
                {metricLocations.map((item, i) => (
                  <li key={i} className="flex flex-col sm:flex-row sm:gap-2 sm:items-baseline">
                    <span className="font-medium text-foreground shrink-0">{item.metric}</span>
                    <span className="text-muted-foreground">{item.where}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Data Analysis</strong> (sidebar) = full table of all scouted matches; expand rows for runs/fuel. Click a team number to open that team’s page. <strong>Team Analysis → Advanced</strong> = search by team number for CLANK, RPMAGIC, GOBLIN, climb, and radar chart.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
