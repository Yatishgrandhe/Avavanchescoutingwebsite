import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { useScoutingLocks } from '@/hooks/use-scouting-locks';
import { motion } from 'framer-motion';
import {
  Building2,
  ClipboardList,
  Lock,
  Unlock,
  Users,
  FileSpreadsheet,
  Database,
  Loader2,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function TeamManagementPage() {
  const { user, supabase } = useSupabase();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin();
  const {
    matchScoutingLocked,
    pitScoutingLocked,
    loading: locksLoading,
    setMatchScoutingLocked,
    setPitScoutingLocked,
  } = useScoutingLocks();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadOrg() {
      if (!user?.organization_id) {
        setOrgName(null);
        setOrgLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', user.organization_id)
        .maybeSingle();
      if (!cancelled && !error && data?.name) setOrgName(data.name);
      else if (!cancelled) setOrgName(null);
      if (!cancelled) setOrgLoading(false);
    }
    loadOrg();
    return () => {
      cancelled = true;
    };
  }, [user?.organization_id, supabase]);

  if (adminLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <Card className="max-w-md w-full text-center p-8 border-destructive/20">
              <Shield className="w-14 h-14 text-muted-foreground mx-auto mb-4 opacity-60" />
              <h2 className="text-xl font-bold mb-2">Access denied</h2>
              <p className="text-muted-foreground text-sm">Team Management is only available to organization admins.</p>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Head>
          <title>Team Management | Avalanche Scouting</title>
        </Head>

        <div className="max-w-4xl mx-auto space-y-8 pb-16 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
              Locks, scouting administration, and shortcuts for your organization.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium">
                Organization:{' '}
                {orgLoading ? (
                  <span className="text-muted-foreground">Loading…</span>
                ) : (
                  <span className="text-foreground">{orgName ?? 'Unknown'}</span>
                )}
              </span>
            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Current competition locks
                </CardTitle>
                <CardDescription>
                  Block or allow match and pit scouting forms for everyone in your org.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={locksLoading}
                  onClick={() => setMatchScoutingLocked(!matchScoutingLocked)}
                >
                  <span className="flex items-center gap-2">
                    {matchScoutingLocked ? (
                      <Unlock className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {matchScoutingLocked ? 'Unlock match scouting' : 'Lock match scouting'}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={locksLoading}
                  onClick={() => setPitScoutingLocked(!pitScoutingLocked)}
                >
                  <span className="flex items-center gap-2">
                    {pitScoutingLocked ? (
                      <Unlock className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {pitScoutingLocked ? 'Unlock pit scouting' : 'Lock pit scouting'}
                  </span>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Scouting admin
                </CardTitle>
                <CardDescription>Review submissions and per-scout forms.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Link href="/admin/scouting-stats" className={cn('block')}>
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Scouting stats
                  </Button>
                </Link>
                <Link href="/admin/scouting-stats/forms" className={cn('block')}>
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Forms by scout
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data & backups
              </CardTitle>
              <CardDescription>Export and competition tools (see also Past Competitions in the sidebar).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/admin/competition-settings">
                <Button variant="default" size="sm">
                  Competition settings
                </Button>
              </Link>
              <Link href="/past-competitions">
                <Button variant="outline" size="sm">
                  Past competitions
                </Button>
              </Link>
              <Link href="/competition-history">
                <Button variant="outline" size="sm">
                  Competition history
                </Button>
              </Link>
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Superadmin
                </CardTitle>
                <CardDescription>Manage organizations and invite links.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/org-manager">
                  <Button className="gap-2">
                    <Building2 className="w-4 h-4" />
                    Open Org Manager
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
