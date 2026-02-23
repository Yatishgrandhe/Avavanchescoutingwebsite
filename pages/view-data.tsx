/**
 * Competition data in Data Analysis format — for guests and logged-in users.
 * Query: ?event_key=XXX (live) or ?id=XXX (past). No auth required for viewing.
 * When guest: shows sidebar with Overview, Comparison, Data Analysis (Teams) and Back to Competition History.
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
  Target,
  Activity,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Users,
  BarChart3,
  GitCompare,
  LayoutDashboard,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import CompetitionDataLayout from '@/components/layout/CompetitionDataLayout';
import type { CompetitionViewTab } from '@/components/layout/CompetitionDataSidebar';
import { useSupabase } from '@/pages/_app';
import { parseNotes, getClimbPoints, getUptimePct } from '@/lib/analytics';
import { BALL_CHOICE_OPTIONS } from '@/lib/types';
import { ScoutingRunsBreakdown } from '@/components/data/ScoutingRunsBreakdown';

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
  const [sortField, setSortField] = useState<string>('match_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<CompetitionViewTab>('teams');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

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

  const guestBackLink = { href: '/competition-history', label: 'Back to Competition History' };
  const queryString = id ? `id=${encodeURIComponent(id as string)}` : event_key ? `event_key=${encodeURIComponent(event_key as string)}` : '';
  const queryPrefix = queryString ? '?' + queryString : '';

  if (loading) {
    return (
      user ? (
        <Layout><div className="flex-1" /></Layout>
      ) : (
        <CompetitionDataLayout activeTab="teams" onTabChange={() => {}} backHref="/competition-history" queryString={queryString}>
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-muted-foreground">Loading competition data...</p>
            </div>
          </div>
        </CompetitionDataLayout>
      )
    );
  }

  if (error || !competition) {
    return (
      user ? (
        <Layout><div className="flex-1" /></Layout>
      ) : (
        <CompetitionDataLayout activeTab="teams" onTabChange={() => {}} backHref="/competition-history" queryString={queryString}>
          <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
            <Card className="max-w-md w-full p-6">
              <p className="text-destructive mb-4">{error || 'Competition not found.'}</p>
              <Link href="/competition-history">
                <Button variant="outline">Back to Competition History</Button>
              </Link>
            </Card>
          </div>
        </CompetitionDataLayout>
      )
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
            {scoutingData.length} scouting record{scoutingData.length !== 1 ? 's' : ''}. Click Team to view full analysis. 2026 Rebuilt format.
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
                  <th className="text-left py-3 px-4 min-w-[120px]">Comments</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((data, index) => {
                  const rowKey = data.id || `${data.match_id ?? ''}-${data.team_number}-${index}`;
                  const isExpanded = expandedRowKey === rowKey;
                  const teamUrl = id
                    ? `/team/${data.team_number}?competition_id=${encodeURIComponent(id as string)}`
                    : event_key
                      ? `/team/${data.team_number}?event_key=${encodeURIComponent(event_key as string)}`
                      : `/team/${data.team_number}`;
                  const matchDisplay = data.match_id ?? data.match_number ?? '—';
                  return (
                    <React.Fragment key={rowKey}>
                    <motion.tr
                      key={data.id || `${matchDisplay}-${data.team_number}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 align-middle">
                        <Link
                          href={teamUrl}
                          className="flex items-center gap-2 group"
                        >
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[110px] sm:max-w-[140px]">{getTeamName(data.team_number)}</span>
                          <Badge variant="outline" className="font-mono text-[10px] shrink-0">#{data.team_number}</Badge>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-primary align-middle">{matchDisplay}</td>
                      <td className="py-3 px-4 align-middle">
                        <Badge
                          variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                          className="uppercase text-[9px] tracking-widest"
                        >
                          {data.alliance_color || '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-blue-400 font-bold align-middle">{data.autonomous_points ?? '—'}</td>
                      <td className="py-3 px-4 text-orange-400 font-bold align-middle">{data.teleop_points ?? '—'}</td>
                      <td className="py-3 px-4 align-middle">
                        <span className="text-lg font-black text-foreground">{data.final_score ?? '—'}</span>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          {data.defense_rating != null ? (
                            <>
                              <div className="flex gap-0.5">
                                {[...Array(10)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'w-1.5 h-3 rounded-full',
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
                      <td className="py-3 px-4 text-muted-foreground text-sm align-middle">
                        {data.average_downtime != null ? `${Number(data.average_downtime).toFixed(1)}s` : '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm align-middle">
                        {data.broke === true ? 'Yes' : data.broke === false ? 'No' : '—'}
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="max-w-[180px] truncate italic text-sm text-muted-foreground" title={data.comments}>
                          {data.comments || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            onClick={(e) => { e.preventDefault(); setExpandedRowKey(isExpanded ? null : rowKey); }}
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
                      {isExpanded && data.notes && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-white/[0.02] border-b border-white/5"
                        >
                          <td colSpan={11} className="py-4 px-6">
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">2026 Rebuilt · Shooting runs &amp; estimated score</h4>
                            <ScoutingRunsBreakdown notes={data.notes} />
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
          <div className="p-4 border-t border-white/5 bg-black/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">2026 Rebuilt · Scoring from fuel, tower &amp; climb</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );

  if (user) {
    return <Layout>{mainContent}</Layout>;
  }

  const overviewContent = (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">{competition.competition_name}</h1>
        <p className="text-muted-foreground text-sm">
          {competition.competition_key} · {competition.competition_year}
          {competition.total_teams != null && ` · ${competition.total_teams} teams · ${competition.total_matches ?? 0} matches`}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border border-white/10 bg-card/50">
          <Users className="h-8 w-8 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{teams.length}</p>
          <p className="text-sm text-muted-foreground">Teams</p>
        </Card>
        <Card className="p-6 border border-white/10 bg-card/50">
          <Database className="h-8 w-8 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{scoutingData.length}</p>
          <p className="text-sm text-muted-foreground">Scouting records</p>
        </Card>
        <Card className="p-6 border border-white/10 bg-card/50">
          <Target className="h-8 w-8 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {scoutingData.length ? Math.round(scoutingData.reduce((s, r) => s + (r.final_score ?? 0), 0) / scoutingData.length) : 0}
          </p>
          <p className="text-sm text-muted-foreground">Avg score</p>
        </Card>
        <Card className="p-6 border border-white/10 bg-card/50">
          <TrendingUp className="h-8 w-8 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {scoutingData.length ? Math.max(...scoutingData.map(r => r.final_score ?? 0)) : '—'}
          </p>
          <p className="text-sm text-muted-foreground">Best score</p>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground mt-6">Use the sidebar to switch to Comparison or Data Analysis (Teams).</p>
    </main>
  );

  const comparisonContent = (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Comparison</h1>
        <p className="text-muted-foreground text-sm">Compare teams and matches for {competition.competition_name}.</p>
      </div>
      <Card className="p-12 border border-white/10 bg-card/50 text-center">
        <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Comparison view</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">Compare team performance across matches. Use Data Analysis to see the full table and open individual teams.</p>
      </Card>
    </main>
  );

  const tabContent = activeTab === 'overview' ? overviewContent : activeTab === 'comparison' ? comparisonContent : mainContent;

  return (
    <CompetitionDataLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      backHref="/competition-history"
      queryString={queryPrefix}
    >
      {tabContent}
    </CompetitionDataLayout>
  );
}
