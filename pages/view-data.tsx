/**
 * Competition data in Data Analysis format — for guests and logged-in users.
 * Query: ?event_key=XXX (live) or ?id=XXX (past). No auth required for viewing.
 */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Database,
  ArrowLeft,
  Target,
  Activity,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Layout from '@/components/layout/Layout';
import { useSupabase } from '@/pages/_app';
import { parseNotes, getClimbPoints, getUptimePct } from '@/lib/analytics';
import { BALL_CHOICE_OPTIONS } from '@/lib/types';

interface CompetitionInfo {
  id: string;
  competition_name: string;
  competition_key: string;
  competition_year: number;
  total_teams?: number;
  total_matches?: number;
}

interface ViewDataRow {
  id?: string;
  match_id?: string;
  match_number?: number;
  team_number: number;
  alliance_color?: string;
  autonomous_points?: number;
  teleop_points?: number;
  final_score?: number;
  defense_rating?: number;
  notes?: any;
  comments?: string;
  average_downtime?: number | null;
  broke?: boolean | null;
  created_at?: string;
  autonomous_cleansing?: number;
  teleop_cleansing?: number;
}

export default function ViewDataPage() {
  const router = useRouter();
  const { user } = useSupabase();
  const { event_key, id } = router.query;

  const [competition, setCompetition] = useState<CompetitionInfo | null>(null);
  const [scoutingData, setScoutingData] = useState<ViewDataRow[]>([]);
  const [teams, setTeams] = useState<Array<{ team_number: number; team_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('match_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!event_key && !id) return;
    loadData();
  }, [event_key, id]);

  useEffect(() => {
    if (!event_key && !id && router.isReady) {
      router.replace('/competition-history');
    }
  }, [event_key, id, router.isReady]);

  const loadData = async () => {
    if (!event_key && !id) return;
    setLoading(true);
    setError(null);
    try {
      const params = event_key
        ? `event_key=${encodeURIComponent(event_key as string)}`
        : `id=${encodeURIComponent(id as string)}`;
      const res = await fetch(`/api/past-competitions?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load (${res.status})`);
      }
      const data = await res.json();
      setCompetition(data.competition || null);
      setScoutingData(Array.isArray(data.scoutingData) ? data.scoutingData : []);
      setTeams(Array.isArray(data.teams) ? data.teams : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load competition data.');
      setCompetition(null);
      setScoutingData([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const getRowKey = (row: ViewDataRow, index: number) =>
    row.id ?? `${row.match_id ?? row.match_number}-${row.team_number}-${row.alliance_color}-${index}`;

  const toggleRowExpansion = (key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getTeamName = (teamNumber: number) => {
    const t = teams.find((x) => x.team_number === teamNumber);
    return t?.team_name || `Team ${teamNumber}`;
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else setSortField(field);
  };

  const sortedData = [...scoutingData].sort((a, b) => {
    let aVal = (a as any)[sortField];
    let bVal = (b as any)[sortField];
    if (sortField === 'match_id') {
      aVal = a.match_id ?? a.match_number ?? aVal;
      bVal = b.match_id ?? b.match_number ?? bVal;
    }
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
    if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const header = (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <Logo size="sm" />
          <span className="font-semibold">Avalanche Scouting</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/competition-history">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Competition History
            </Button>
          </Link>
          {user && (
            <Link href="/">
              <Button size="sm" className="gap-2">Dashboard</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!user && header}
        {user && <Layout><div className="flex-1" /></Layout>}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading competition data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!user && header}
        {user && <Layout><div className="flex-1" /></Layout>}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <p className="text-destructive mb-4">{error || 'Competition not found.'}</p>
            <Link href="/competition-history">
              <Button variant="outline">Back to Competition History</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const mainContent = (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {competition.competition_name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {competition.competition_key} · {competition.competition_year}
          {competition.total_teams != null && ` · ${competition.total_teams} teams · ${competition.total_matches ?? 0} matches`}
        </p>
      </div>

      <Card className="rounded-xl border border-white/10 bg-card/50 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/[0.02]">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5 text-primary" />
            Individual forms — Data Analysis view
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {scoutingData.length} scouting record{scoutingData.length !== 1 ? 's' : ''}. Click Details to expand form notes. 2026 Rebuilt format.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  <th className="text-left p-2 sm:p-3 w-[140px] cursor-pointer hover:text-foreground" onClick={() => handleSort('team_number')}>
                    Team {sortField === 'team_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-2 sm:p-3 w-[72px] cursor-pointer hover:text-foreground" onClick={() => handleSort('match_id')}>
                    Match {sortField === 'match_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-2 sm:p-3 w-[70px]">Alliance</th>
                  <th className="text-left p-2 sm:p-3 w-[56px] cursor-pointer hover:text-foreground" onClick={() => handleSort('autonomous_points')}>
                    Auto {sortField === 'autonomous_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-2 sm:p-3 w-[60px] cursor-pointer hover:text-foreground" onClick={() => handleSort('teleop_points')}>
                    Teleop {sortField === 'teleop_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-2 sm:p-3 w-[56px] cursor-pointer hover:text-foreground" onClick={() => handleSort('final_score')}>
                    Total {sortField === 'final_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-2 sm:p-3 w-[70px]">Defense</th>
                  <th className="text-left p-2 sm:p-3 w-[72px]">Downtime</th>
                  <th className="text-left p-2 sm:p-3 w-[52px]">Broke</th>
                  <th className="text-left p-2 sm:p-3 min-w-[100px] max-w-[180px]">Comments</th>
                  <th className="text-right p-2 sm:p-3 w-[72px]">Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((data, index) => {
                  const rowKey = getRowKey(data, index);
                  const formNotes = parseNotes(data.notes);
                  const autoRuns = formNotes.autonomous.runs || [];
                  const teleopRuns = formNotes.teleop.runs || [];
                  const matchDisplay = data.match_id ?? data.match_number ?? '—';
                  return (
                    <React.Fragment key={rowKey}>
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-2 sm:p-3">
                          <Link
                            href={
                              id
                                ? `/team/${data.team_number}?competition_id=${encodeURIComponent(id as string)}`
                                : event_key
                                  ? `/team/${data.team_number}?event_key=${encodeURIComponent(event_key as string)}`
                                  : `/team/${data.team_number}`
                            }
                            className="flex items-center gap-2 group"
                          >
                            <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[100px] sm:max-w-[120px]">{getTeamName(data.team_number)}</span>
                            <Badge variant="outline" className="font-mono text-[10px] shrink-0">#{data.team_number}</Badge>
                          </Link>
                        </td>
                        <td className="p-2 sm:p-3 font-mono font-bold text-primary text-sm">{matchDisplay}</td>
                        <td className="p-2 sm:p-3">
                          <Badge
                            variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                            className="uppercase text-[9px] tracking-widest"
                          >
                            {data.alliance_color || '—'}
                          </Badge>
                        </td>
                        <td className="p-2 sm:p-3 text-blue-400 font-bold text-sm">{data.autonomous_points ?? '—'}</td>
                        <td className="p-2 sm:p-3 text-orange-400 font-bold text-sm">{data.teleop_points ?? '—'}</td>
                        <td className="p-2 sm:p-3">
                          <span className="text-lg font-black text-foreground">{data.final_score ?? '—'}</span>
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="flex items-center gap-1.5">
                            {data.defense_rating != null ? (
                              <>
                                <div className="flex gap-0.5">
                                  {[...Array(10)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        'w-1 h-3 rounded-full',
                                        i < data.defense_rating! ? 'bg-red-500' : 'bg-white/5'
                                      )}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-bold text-muted-foreground">{data.defense_rating}</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-muted-foreground text-xs">
                          {data.average_downtime != null ? `${Number(data.average_downtime).toFixed(1)}s` : '—'}
                        </td>
                        <td className="p-2 sm:p-3 text-muted-foreground text-xs">
                          {data.broke === true ? 'Yes' : data.broke === false ? 'No' : '—'}
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="max-w-[160px] truncate italic text-xs text-muted-foreground" title={data.comments}>
                            {data.comments || '—'}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-white/10"
                            onClick={() => toggleRowExpansion(rowKey)}
                          >
                            {expandedRows.has(rowKey) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedRows.has(rowKey) && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white/[0.02] border-b border-white/5 overflow-hidden"
                          >
                            <td colSpan={11} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Target className="w-3 h-3" /> Autonomous
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">AVG AUTO (fuel)</span>
                                      <div className="text-xl font-bold text-blue-400">{formNotes.autonomous.auto_fuel_active_hub ?? 0}</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Climb pts</span>
                                      <div className="text-lg font-bold">{getClimbPoints(data.notes)}</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2">
                                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Level 1 Climb</span>
                                      <div className="flex items-center gap-2 mt-1">
                                        {formNotes.autonomous.auto_tower_level1 ? (
                                          <Badge className="bg-green-500/20 text-green-400 border-green-500/20 text-[10px]">SUCCESS</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] opacity-40">NONE</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {autoRuns.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Runs ({autoRuns.length})</span>
                                      <ul className="text-sm space-y-1">
                                        {autoRuns.map((r: any, i: number) => (
                                          <li key={i} className="flex justify-between">
                                            <span>Run {i + 1}: {r.duration_sec}s</span>
                                            <span>{BALL_CHOICE_OPTIONS[r.ball_choice]?.label ?? r.ball_choice} balls</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3" /> Teleop
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground">AVG TELEOP (fuel)</span>
                                      <span className="text-sm font-bold text-orange-400">{formNotes.teleop.teleop_fuel_active_hub ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground">Tower Level 1</span>
                                      {formNotes.teleop.teleop_tower_level1 ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-muted-foreground/20" />}
                                    </div>
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground">Tower Level 2</span>
                                      {formNotes.teleop.teleop_tower_level2 ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-muted-foreground/20" />}
                                    </div>
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground font-bold text-white">Tower Level 3</span>
                                      {formNotes.teleop.teleop_tower_level3 ? <Award className="w-5 h-5 text-yellow-400" /> : <XCircle className="w-4 h-4 text-muted-foreground/20" />}
                                    </div>
                                  </div>
                                  {teleopRuns.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Runs ({teleopRuns.length})</span>
                                      <ul className="text-sm space-y-1">
                                        {teleopRuns.map((r: any, i: number) => (
                                          <li key={i} className="flex justify-between">
                                            <span>Run {i + 1}: {r.duration_sec}s</span>
                                            <span>{BALL_CHOICE_OPTIONS[r.ball_choice]?.label ?? r.ball_choice} balls</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Match reliability
                                  </h4>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground">Downtime</span>
                                      <span className="text-sm font-medium">{data.average_downtime != null ? `${Number(data.average_downtime).toFixed(1)}s` : '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground">Uptime</span>
                                      <span className="text-sm font-medium">{getUptimePct(data.average_downtime) != null ? `${getUptimePct(data.average_downtime)}%` : '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground">Broke</span>
                                      <span className="text-sm font-medium">{data.broke === true ? 'Yes' : data.broke === false ? 'No' : '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                      <span className="text-xs text-muted-foreground">Climb pts</span>
                                      <span className="text-sm font-medium">{getClimbPoints(data.notes)}</span>
                                    </div>
                                  </div>
                                </div>
                                {autoRuns.length === 0 && teleopRuns.length === 0 && (
                                  <div className="text-xs text-muted-foreground text-center py-2 col-span-full">No runs recorded (legacy data)</div>
                                )}
                                {/* 2026 Rebuilt: Cleansing not used — score from fuel/tower/climb only */}
                                <div className="mt-4 pt-4 border-t border-white/5 col-span-full">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">2026 Rebuilt · Cleansing N/A (score from fuel, tower &amp; climb only)</p>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedData.length === 0 && (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Scouting Data</h3>
              <p className="text-muted-foreground">No match forms have been uploaded for this competition yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );

  if (user) {
    return <Layout>{mainContent}</Layout>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {header}
      {mainContent}
    </div>
  );
}
