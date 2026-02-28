import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  ClipboardList,
  Users,
  BarChart3,
  RefreshCw,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ScoutingStatsByPerson {
  name: string;
  formCount: number;
}

interface ScoutingStatsResponse {
  totalForms: number;
  byPerson: ScoutingStatsByPerson[];
}

export default function AdminScoutingStatsPage() {
  const { user, supabase } = useSupabase();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScoutingStatsResponse | null>(null);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Not authenticated');
        return;
      }
      const res = await fetch('/api/admin/scouting-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load (${res.status})`);
      }
      const result: ScoutingStatsResponse = await res.json();
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load scouting stats');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  if (adminLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Admin access required</h2>
            <p className="text-muted-foreground text-center mb-6">
              You need administrator privileges to view scouting stats.
            </p>
            <Button variant="outline" onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-primary" />
                Match Scouting Stats
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Forms submitted per person (name, not username)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </motion.div>
          )}

          {loading && !data && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {data && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="border border-white/10 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Total Match Scouting Forms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-primary">{data.totalForms}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Combined from live and past competitions
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-white/10 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    Forms by Person
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Display name (not username) and number of match scouting forms submitted
                  </p>
                </CardHeader>
                <CardContent>
                  {data.byPerson.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center">No scouting data yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Name</TableHead>
                          <TableHead className="text-muted-foreground text-right">Forms</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byPerson.map((row, i) => (
                          <TableRow
                            key={row.name}
                            className="border-white/5"
                          >
                            <TableCell className="font-medium text-foreground">
                              {row.name}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-primary">
                              {row.formCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
