import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatDurationSec } from '@/lib/utils';
import { ScoutingRunsBreakdown } from '@/components/data/ScoutingRunsBreakdown';
import { Badge } from '@/components/ui/badge';

interface FormRow {
  id: string;
  match_id?: string;
  match_number?: number;
  team_number: number;
  alliance_color?: string | null;
  autonomous_points?: number | null;
  teleop_points?: number | null;
  final_score?: number | null;
  notes?: unknown;
  defense_rating?: number | null;
  comments?: string | null;
  average_downtime?: number | null;
  broke?: boolean | null;
  shuttling?: boolean | null;
  shuttling_consistency?: string | null;
  created_at?: string;
}

interface PitFormRow {
  id: string;
  team_number: number;
  robot_name?: string | null;
  overall_rating?: number | null;
  notes?: string | null;
  created_at?: string;
}

interface FormsResponse {
  name: string;
  forms: FormRow[];
  pitForms: PitFormRow[];
  teams: Record<number, string>;
}

export default function AdminScoutingFormsPage() {
  return (
    <ProtectedRoute>
      <AdminScoutingFormsInner />
    </ProtectedRoute>
  );
}

function AdminScoutingFormsInner() {
  const { supabase } = useSupabase();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const { name } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FormsResponse | null>(null);
  const [sortField, setSortField] = useState<string>('match_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const loadForms = async () => {
    if (typeof name !== 'string' || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Not authenticated');
        return;
      }
      const res = await fetch(`/api/admin/scouting-forms?name=${encodeURIComponent(name.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load (${res.status})`);
      }
      const result: FormsResponse = await res.json();
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load forms');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLoading && isAdmin && name) loadForms();
  }, [adminLoading, isAdmin, name]);

  const getTeamName = (teamNumber: number) => {
    return data?.teams?.[teamNumber] ?? `Team ${teamNumber}`;
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else setSortField(field);
  };

  const sortedForms = data?.forms
    ? [...data.forms].sort((a, b) => {
        let aVal: unknown = (a as unknown as Record<string, unknown>)[sortField];
        let bVal: unknown = (b as unknown as Record<string, unknown>)[sortField];
        if (sortField === 'match_id') {
          aVal = a.match_id ?? a.match_number ?? aVal;
          bVal = b.match_id ?? b.match_number ?? bVal;
        }
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? cmp : -cmp;
      })
    : [];

  if (adminLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Shield className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Admin access required</h2>
          <p className="text-muted-foreground text-center mb-6">
            You need administrator privileges to view this page.
          </p>
          <Button variant="outline" onClick={() => router.push('/admin/scouting-stats')}>
            Back to Scouting Stats
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
        <div className="max-w-7xl mx-auto space-y-6 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/scouting-stats')}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Database className="w-6 h-6 text-primary" />
                  Match forms by {typeof name === 'string' ? decodeURIComponent(name) : ''}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  All match scouting forms submitted by this person (live data). Click Team to view full analysis.
                </p>
              </div>
            </div>
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
              <Card className="border border-white/10 bg-card/50 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="w-5 h-5 text-primary" />
                    Individual forms — Data Analysis view
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {data.forms.length} scouting record{data.forms.length !== 1 ? 's' : ''}. Click Team to view full analysis.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full border-collapse min-w-[880px]">
                      <thead>
                        <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                          <th className="text-left py-3 px-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('team_number')}>
                            Team {sortField === 'team_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="text-left py-3 px-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('match_id')}>
                            Match {sortField === 'match_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="text-left py-3 px-4 whitespace-nowrap">Alliance</th>
                          <th className="text-left py-3 px-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('autonomous_points')}>
                            Auto {sortField === 'autonomous_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="text-left py-3 px-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('teleop_points')}>
                            Teleop {sortField === 'teleop_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="text-left py-3 px-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('final_score')}>
                            Total {sortField === 'final_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="text-left py-3 px-4 whitespace-nowrap">Defense</th>
                          <th className="text-left py-3 px-4 whitespace-nowrap">Downtime</th>
                          <th className="text-left py-3 px-4 whitespace-nowrap">Broke</th>
                          <th className="text-left py-3 px-4 whitespace-nowrap">Shuttle</th>
                          <th className="text-left py-3 px-4 min-w-[120px]">Comments</th>
                          <th className="text-right py-3 px-4 whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedForms.map((row, index) => {
                          const rowKey = row.id || `${row.match_id ?? ''}-${row.team_number}-${index}`;
                          const isExpanded = expandedRowKey === rowKey;
                          const matchDisplay = row.match_id ?? row.match_number ?? '—';
                          const teamUrl = `/team/${row.team_number}`;
                          return (
                            <React.Fragment key={rowKey}>
                              <motion.tr
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.02 }}
                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="py-3 px-4 align-middle">
                                  <Link href={teamUrl} className="flex items-center gap-2 group">
                                    <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[140px]">
                                      {getTeamName(row.team_number)}
                                    </span>
                                    <span className="font-mono text-[10px] shrink-0 text-muted-foreground">#{row.team_number}</span>
                                  </Link>
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-primary align-middle">{matchDisplay}</td>
                                <td className="py-3 px-4 align-middle">
                                  <span
                                    className={cn(
                                      'uppercase text-[9px] tracking-widest px-2 py-0.5 rounded',
                                      row.alliance_color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                    )}
                                  >
                                    {row.alliance_color || '—'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-blue-400 font-bold align-middle">{row.autonomous_points ?? '—'}</td>
                                <td className="py-3 px-4 text-orange-400 font-bold align-middle">{row.teleop_points ?? '—'}</td>
                                <td className="py-3 px-4 align-middle">
                                  <span className="text-lg font-black text-foreground">{row.final_score ?? '—'}</span>
                                </td>
                                <td className="py-3 px-4 align-middle">
                                  <div className="flex items-center gap-2">
                                    {row.defense_rating != null ? (
                                      <>
                                        <div className="flex gap-0.5">
                                          {[...Array(10)].map((_, i) => (
                                            <div
                                              key={i}
                                              className={cn(
                                                'w-1.5 h-3 rounded-full',
                                                i < row.defense_rating! ? 'bg-red-500' : 'bg-white/5'
                                              )}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground">{row.defense_rating}</span>
                                      </>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground text-sm align-middle">
                                  {row.average_downtime != null ? formatDurationSec(Number(row.average_downtime)) : '—'}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground text-sm align-middle">
                                  {row.broke === true ? (
                                    <span className="text-red-400 font-bold uppercase text-[10px]">Yes</span>
                                  ) : row.broke === false ? (
                                    <span className="text-muted-foreground opacity-50 uppercase text-[10px]">No</span>
                                  ) : '—'}
                                </td>
                                <td className="py-3 px-4 align-middle">
                                  {row.shuttling ? (
                                    <Badge variant="outline" className={cn(
                                      "text-[10px] uppercase font-bold tracking-tight px-2 py-0.5",
                                      row.shuttling_consistency === 'consistent' 
                                        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/20" 
                                        : "bg-amber-500/20 text-amber-400 border-amber-500/20"
                                    )}>
                                      {row.shuttling_consistency || 'Yes'}
                                    </Badge>
                                  ) : row.shuttling === false ? (
                                    <span className="text-muted-foreground opacity-50 uppercase text-[10px]">No</span>
                                  ) : '—'}
                                </td>
                                <td className="py-3 px-4 align-middle">
                                  <div className="max-w-[180px] truncate italic text-sm text-muted-foreground" title={row.comments ?? undefined}>
                                    {row.comments || '—'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right align-middle">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                      onClick={() => setExpandedRowKey(isExpanded ? null : rowKey)}
                                      title={isExpanded ? 'Hide runs' : 'Show shooting runs'}
                                    >
                                      {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                    <Link href={teamUrl}>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-[10px] uppercase font-bold tracking-tight px-3 hover:bg-primary/10 hover:text-primary border-white/10"
                                      >
                                        Team
                                      </Button>
                                    </Link>
                                  </div>
                                </td>
                              </motion.tr>
                              <AnimatePresence>
                                {isExpanded && row.notes != null ? (
                                  <motion.tr
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-white/[0.02] border-b border-white/5"
                                  >
                                    <td colSpan={11} className="py-4 px-6">
                                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                                        2026 Rebuilt · Shooting runs &amp; estimated score
                                      </h4>
                                      <ScoutingRunsBreakdown notes={row.notes} shuttleRow={row} />
                                    </td>
                                  </motion.tr>
                                ) : null}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {sortedForms.length === 0 && (
                    <div className="text-center py-12">
                      <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No forms found</h3>
                      <p className="text-muted-foreground text-sm">No match scouting forms for this person.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {data.pitForms && data.pitForms.length > 0 && (
                <Card className="border border-white/10 bg-card/50 overflow-hidden">
                  <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Database className="w-5 h-5 text-primary" />
                      Pit Scouting forms
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {data.pitForms.length} pit scouting record{data.pitForms.length !== 1 ? 's' : ''}.
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse min-w-[600px]">
                        <thead>
                          <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                            <th className="text-left py-3 px-4">Team</th>
                            <th className="text-left py-3 px-4">Robot Name</th>
                            <th className="text-left py-3 px-4 text-center">Rating</th>
                            <th className="text-left py-3 px-4">Notes</th>
                            <th className="text-left py-3 px-4">Date</th>
                            <th className="text-right py-3 px-4">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.pitForms.map((row) => (
                            <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 align-middle">
                                <Link href={`/team/${row.team_number}`} className="flex items-center gap-2 group">
                                  <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[140px]">
                                    {getTeamName(row.team_number)}
                                  </span>
                                  <span className="font-mono text-[10px] shrink-0 text-muted-foreground">#{row.team_number}</span>
                                </Link>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground align-middle">{row.robot_name || '—'}</td>
                              <td className="py-3 px-4 align-middle text-center">
                                {row.overall_rating ? (
                                  <span className="font-bold text-primary">{row.overall_rating}/10</span>
                                ) : '—'}
                              </td>
                              <td className="py-3 px-4 align-middle">
                                <div className="max-w-[180px] truncate italic text-sm text-muted-foreground" title={row.notes ?? undefined}>
                                  {row.notes || '—'}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground text-xs align-middle">
                                {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="py-3 px-4 text-right align-middle">
                                <Link href={`/team/${row.team_number}`}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-[10px] uppercase font-bold tracking-tight px-3 hover:bg-primary/10 hover:text-primary border-white/10"
                                  >
                                    View
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </div>
      </Layout>
  );
}
