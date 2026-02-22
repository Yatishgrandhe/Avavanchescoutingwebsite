import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { BarChart3, TrendingUp, ArrowLeftRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const analysisModules = [
  {
    title: 'Overview',
    href: '/analysis/basic',
    description: 'Team list, charts, and basic stats.',
    icon: BarChart3,
  },
  {
    title: 'Advanced',
    href: '/analysis/advanced',
    description: 'REBUILT KPIs, radar charts, and deep dive.',
    icon: TrendingUp,
  },
  {
    title: 'Compare',
    href: '/analysis/comparison',
    description: 'Side-by-side team comparison.',
    icon: ArrowLeftRight,
  },
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
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
