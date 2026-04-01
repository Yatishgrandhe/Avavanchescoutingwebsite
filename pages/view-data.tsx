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
  ArrowLeft,
  Database,
  FileSpreadsheet,
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
  LayoutDashboard,
  Wrench,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Edit,
  Trash2,
} from 'lucide-react';
import CompetitionDataLayout from '@/components/layout/CompetitionDataLayout';
import type { CompetitionViewTab } from '@/components/layout/CompetitionDataSidebar';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { loadViewDataFilters, saveViewDataFilters } from '@/lib/view-data-filter-storage';
import { hasCompetitionPitSidebarRows } from '@/lib/pit-scouting-visibility';
import { SuperadminScoutingChat } from '@/components/superadmin/SuperadminScoutingChat';
import { parseNotes, computeRebuiltMetrics } from '@/lib/analytics';
import { formatDurationSec, roundToTenth } from '@/lib/utils';
import { ScoutingRunsBreakdown } from '@/components/data/ScoutingRunsBreakdown';
import { TeamComparisonPanel } from '@/components/data/TeamComparisonPanel';
import { Input } from '@/components/ui/Input';

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
  organization_id?: string | null;
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
  shuttling?: boolean | null;
  shuttling_consistency?: string | null;
  created_at?: string;
  submitted_at?: string;
  submitted_by_name?: string | null;
}

type PitRow = { id?: string; team_number: number; robot_name?: string | null; photos?: string[] | null; auto_fuel_count?: number; [key: string]: unknown };

type TeamStatSortKey =
  | 'avg_total_score'
  | 'total_matches'
  | 'avg_autonomous_points'
  | 'avg_teleop_points'
  | 'endgame_epa'
  | 'epa'
  | 'consistency_score'
  | 'team_number'
  | 'team_name'
  | 'starter_epa';

export default function ViewDataPage() {
  const router = useRouter();
  const { user, supabase, session } = useSupabase();
  const { isAdmin, isSuperAdmin } = useAdmin();
  const { event_key, id, competition_key, year } = router.query;

  const [competition, setCompetition] = useState<CompetitionInfo | null>(null);
  const [scoutingData, setScoutingData] = useState<ViewDataRow[]>([]);
  const [teams, setTeams] = useState<Array<{ team_number: number; team_name: string; starter_epa?: number }>>([]);
  const [pitScoutingData, setPitScoutingData] = useState<PitRow[]>([]);
  const [deletingPitRow, setDeletingPitRow] = useState<PitRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('match_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<CompetitionViewTab>('overview');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [dataViewMode, setDataViewMode] = useState<'teams' | 'individual'>('teams');
  const [teamStatsSortField, setTeamStatsSortField] = useState<TeamStatSortKey>('avg_total_score');
  const [teamStatsSortDirection, setTeamStatsSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minMatchesFilter, setMinMatchesFilter] = useState<number | ''>('');
  const [minAvgScoreFilter, setMinAvgScoreFilter] = useState<number | ''>('');
  /** Live + archived: OFF = org-scoped data; ON = merge all organizations for this event/archive group. */
  const [seeAllOrgsData, setSeeAllOrgsData] = useState(false);
  /** Live event only: show pit from every org that scouted these teams. */
  const [pitAllOrgs, setPitAllOrgs] = useState(false);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const f = loadViewDataFilters();
    if (router.query.see_all_orgs === '1') {
      setSeeAllOrgsData(true);
    } else if (router.query.see_all_orgs === '0') {
      setSeeAllOrgsData(false);
    } else {
      setSeeAllOrgsData(f.seeAllOrgs);
    }
    if (router.query.pit_all_orgs === '1') {
      setPitAllOrgs(true);
    } else {
      setPitAllOrgs(f.pitAllOrgs);
    }
    setMinMatchesFilter(f.minMatchesFilter);
    setMinAvgScoreFilter(f.minAvgScoreFilter);
    setDataViewMode(f.dataViewMode);
    setSortField(f.sortField);
    setSortDirection(f.sortDirection);
    setTeamStatsSortField(f.teamStatsSortField as TeamStatSortKey);
    setTeamStatsSortDirection(f.teamStatsSortDirection);
    setFiltersHydrated(true);
  }, [router.isReady, router.query.see_all_orgs, router.query.pit_all_orgs]);

  useEffect(() => {
    if (!filtersHydrated) return;
    saveViewDataFilters({
      seeAllOrgs: seeAllOrgsData,
      pitAllOrgs,
      minMatchesFilter,
      minAvgScoreFilter,
      dataViewMode,
      sortField,
      sortDirection,
      teamStatsSortField,
      teamStatsSortDirection,
    });
  }, [
    filtersHydrated,
    seeAllOrgsData,
    pitAllOrgs,
    minMatchesFilter,
    minAvgScoreFilter,
    dataViewMode,
    sortField,
    sortDirection,
    teamStatsSortField,
    teamStatsSortDirection,
  ]);

  useEffect(() => {
    if (!router.isReady || !filtersHydrated) return;
    if (!event_key && !id && !competition_key) return;
    loadData();
  }, [
    router.isReady,
    filtersHydrated,
    event_key,
    id,
    competition_key,
    year,
    seeAllOrgsData,
    pitAllOrgs,
    router.query.see_all_orgs,
    router.query.pit_all_orgs,
  ]);

  useEffect(() => {
    if (!event_key && !id && !competition_key && router.isReady) {
      router.replace('/competition-history');
    }
  }, [event_key, id, competition_key, router.isReady]);

  useEffect(() => {
    if (!user && activeTab === 'stats') {
      setActiveTab('overview');
    }
  }, [user, activeTab]);

  const showPitTab = React.useMemo(
    () => hasCompetitionPitSidebarRows(pitScoutingData),
    [pitScoutingData],
  );

  useEffect(() => {
    if (!showPitTab && activeTab === 'pit') {
      setActiveTab('overview');
    }
  }, [showPitTab, activeTab]);

  const statsByPerson = React.useMemo(() => {
    const map = new Map<string, number>();
    const orgId = user?.organization_id;
    const rows =
      orgId != null && orgId !== ''
        ? scoutingData.filter((r) => (r.organization_id ?? null) === orgId)
        : [];
    rows.forEach((r: ViewDataRow) => {
      const name = (r.submitted_by_name != null && String(r.submitted_by_name).trim()) ? String(r.submitted_by_name).trim() : 'Unknown';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [scoutingData, user?.organization_id]);

  const pitDisplayList = React.useMemo(() => {
    const byTeam = new Map<number, typeof pitScoutingData[0]>();
    const hasImage = (row: typeof pitScoutingData[0]) => {
      const url = row.robot_image_url != null && String(row.robot_image_url).trim();
      if (url) return true;
      let arr: unknown[] = [];
      if (Array.isArray(row.photos)) arr = row.photos;
      else if (typeof row.photos === 'string') {
        try {
          const parsed = JSON.parse(row.photos);
          arr = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          if (String(row.photos).trim()) arr = [row.photos];
        }
      }
      return arr.some((u: unknown) => typeof u === 'string' && (u as string).trim());
    };
    pitScoutingData.forEach((row) => {
      const teamNum = row.team_number;
      const existing = byTeam.get(teamNum);
      if (!existing) {
        byTeam.set(teamNum, row);
        return;
      }
      if (hasImage(row) && !hasImage(existing)) byTeam.set(teamNum, row);
    });
    return Array.from(byTeam.values());
  }, [pitScoutingData]);

  type ViewDataTeamStat = {
    team_number: number;
    team_name: string;
    total_matches: number;
    avg_autonomous_points: number;
    avg_teleop_points: number;
    avg_total_score: number;
    avg_defense_rating: number;
    best_score: number;
    worst_score: number;
    consistency_score: number;
    endgame_epa?: number;
    avg_climb_pts?: number;
    epa?: number;
    starter_epa?: number;
    [key: string]: unknown;
  };

  const teamStats = React.useMemo(() => {
    const teamNameMap = new Map<number, string>();
    teams.forEach((t) => { teamNameMap.set(t.team_number, t.team_name); });
    const teamToRecords = new Map<number, ViewDataRow[]>();
    scoutingData.forEach((data) => {
      if (!teamToRecords.has(data.team_number)) teamToRecords.set(data.team_number, []);
      teamToRecords.get(data.team_number)!.push(data);
    });
    const result: ViewDataTeamStat[] = [];
    teamToRecords.forEach((records, teamNumber) => {
      const teamName = teamNameMap.get(teamNumber) || `Team ${teamNumber}`;
      const uniqueMatchIds = new Set(records.map((r) => r.match_id ?? '').filter(Boolean));
      const total_matches = uniqueMatchIds.size;
      const broke_count = new Set(records.filter((r) => r.broke === true).map((r) => r.match_id ?? '')).size;
      const autonomous_points: number[] = [];
      const teleop_points: number[] = [];
      const total_scores: number[] = [];
      const defense_ratings: number[] = [];
      const downtime_values: (number | null)[] = [];
      records.forEach((data) => {
        autonomous_points.push(data.autonomous_points ?? 0);
        teleop_points.push(data.teleop_points ?? 0);
        total_scores.push(data.final_score ?? 0);
        defense_ratings.push(data.defense_rating ?? 0);
        if (data.average_downtime != null && !Number.isNaN(Number(data.average_downtime))) {
          downtime_values.push(Number(data.average_downtime));
        }
      });
      const n = total_scores.length || 1;
      const avgAutonomous = autonomous_points.reduce((s, v) => s + v, 0) / n;
      const avgTeleop = teleop_points.reduce((s, v) => s + v, 0) / n;
      const avgTotal = total_scores.reduce((s, v) => s + v, 0) / n;
      const avgDefense = defense_ratings.reduce((s, v) => s + v, 0) / n;
      const downtimeVals = downtime_values.filter((v): v is number => v != null);
      const avgDowntime = downtimeVals.length > 0 ? downtimeVals.reduce((s, v) => s + v, 0) / downtimeVals.length : null;
      const bestScore = total_scores.length ? Math.max(...total_scores) : 0;
      const worstScore = total_scores.length ? Math.min(...total_scores) : 0;
      const variance = total_scores.length > 1
        ? total_scores.reduce((sum, score) => sum + Math.pow(score - avgTotal, 2), 0) / total_scores.length
        : 0;
      const stdDev = Math.sqrt(variance);
      const consistency_score = (avgTotal > 0 && total_scores.length > 0)
        ? Math.max(0, Math.min(100, 100 - (stdDev / avgTotal) * 100))
        : 0;
      
      const teamObj = teams.find(t => t.team_number === teamNumber);
      const rebuilt = computeRebuiltMetrics(
        records as unknown as Parameters<typeof computeRebuiltMetrics>[0],
        teamObj?.starter_epa
      );
      result.push({
        team_number: teamNumber,
        team_name: teamName,
        total_matches,
        ...rebuilt,
        starter_epa: teamObj?.starter_epa,
      });
    });
    return result.filter((s) => s.total_matches > 0);
  }, [scoutingData, teams]);

  const pitByTeam = React.useMemo(() => {
    const map: Record<number, { robot_name?: string | null; drive_type?: string | null; weight?: number | null; overall_rating?: number | null }> = {};
    pitScoutingData.forEach((row) => {
      if (!map[row.team_number]) {
        map[row.team_number] = {
          robot_name: row.robot_name ?? null,
          drive_type: (row.drive_type as string) ?? null,
          weight: row.weight != null ? Number(row.weight) : null,
          overall_rating: row.overall_rating != null ? Number(row.overall_rating) : null,
        };
      }
    });
    return map;
  }, [pitScoutingData]);

  const filteredTeamStats = React.useMemo(() => {
    return teamStats.filter((team) => {
      const matchesMinMatches = minMatchesFilter === '' || team.total_matches >= Number(minMatchesFilter);
      const matchesMinAvgScore = minAvgScoreFilter === '' || (team.avg_total_score ?? 0) >= Number(minAvgScoreFilter);
      return matchesMinMatches && matchesMinAvgScore;
    });
  }, [teamStats, minMatchesFilter, minAvgScoreFilter]);

  const sortedTeamStats = React.useMemo(() => {
    return [...filteredTeamStats].sort((a, b) => {
      type K = keyof ViewDataTeamStat;
      const key = teamStatsSortField as K;
      let aVal: number | string = a[key] as number | string;
      let bVal: number | string = b[key] as number | string;
      if (key === 'team_name') {
        aVal = String(aVal ?? '').toLowerCase();
        bVal = String(bVal ?? '').toLowerCase();
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return teamStatsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return teamStatsSortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredTeamStats, teamStatsSortField, teamStatsSortDirection]);

  const handleTeamStatsSort = (field: TeamStatSortKey) => {
    if (teamStatsSortField === field) {
      setTeamStatsSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTeamStatsSortField(field);
      setTeamStatsSortDirection('desc');
    }
  };

  const loadData = async () => {
    if (!event_key && !id && !competition_key) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (event_key) params.set('event_key', event_key as string);
      if (id) params.set('id', id as string);
      if (competition_key) params.set('competition_key', competition_key as string);
      if (year) params.set('year', year as string);

      const effectiveSeeAll = router.query.see_all_orgs === '1' || seeAllOrgsData;
      const effectivePitAll = router.query.pit_all_orgs === '1' || pitAllOrgs;
      if (effectiveSeeAll && (event_key || competition_key || id)) {
        params.set('see_all_orgs', '1');
      }
      if (effectivePitAll && event_key) {
        params.set('pit_all_orgs', '1');
      }

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/past-competitions?${params.toString()}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load (${res.status})`);
      }
      const data = await res.json();
      setCompetition(data.competition || null);
      setScoutingData(Array.isArray(data.scoutingData) ? data.scoutingData : []);
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setPitScoutingData(Array.isArray(data.pitScoutingData) ? data.pitScoutingData : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load competition data.');
      setCompetition(null);
      setScoutingData([]);
      setTeams([]);
      setPitScoutingData([]);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamNumber: number) => {
    const t = teams.find((x) => x.team_number === teamNumber);
    return t?.team_name || `Team ${teamNumber}`;
  };

  const confirmPitDelete = async () => {
    if (!deletingPitRow?.id) return;
    const rowId = deletingPitRow.id;
    const table = id ? 'past_pit_scouting_data' : 'pit_scouting_data';
    try {
      const { error } = await supabase.from(table).delete().eq('id', rowId);
      if (error) throw error;
      setPitScoutingData((prev) => prev.filter((r) => r.id !== rowId));
      setDeletingPitRow(null);
    } catch (e: any) {
      console.error('Pit delete error:', e);
      alert(e?.message || 'Failed to delete pit record.');
    }
  };

  const cancelPitDelete = () => setDeletingPitRow(null);

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
  const competitionQueryString = React.useMemo(() => {
    const p = new URLSearchParams();
    if (competition_key && year) {
      p.set('competition_key', String(competition_key));
      p.set('year', String(year));
    } else if (id) {
      p.set('id', String(id));
    } else if (event_key) {
      p.set('event_key', String(event_key));
    } else {
      return '';
    }
    if (seeAllOrgsData) p.set('see_all_orgs', '1');
    if (event_key && pitAllOrgs) p.set('pit_all_orgs', '1');
    return p.toString();
  }, [competition_key, year, id, event_key, seeAllOrgsData, pitAllOrgs]);

  const queryString = competitionQueryString;
  const queryPrefix = queryString ? `?${queryString}` : '';

  const getTeamPageUrl = React.useCallback(
    (teamNumber: number, tab?: string) => {
      const p = new URLSearchParams();
      if (competition_key && year) {
        p.set('competition_key', String(competition_key));
        p.set('year', String(year));
      } else if (id) {
        p.set('competition_id', String(id));
      }
      if (event_key) {
        p.set('event_key', String(event_key));
      }
      if (seeAllOrgsData) p.set('see_all_orgs', '1');
      if (event_key && pitAllOrgs) p.set('pit_all_orgs', '1');
      if (tab) p.set('tab', tab);
      const qs = p.toString();
      return qs ? `/team/${teamNumber}?${qs}` : `/team/${teamNumber}`;
    },
    [competition_key, year, id, event_key, seeAllOrgsData, pitAllOrgs]
  );

  if (loading) {
    return (
      <CompetitionDataLayout activeTab="overview" backHref="/competition-history" queryString={queryString}>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading competition data...</p>
          </div>
        </div>
      </CompetitionDataLayout>
    );
  }

  if (error || !competition) {
    return (
      <CompetitionDataLayout activeTab="overview" backHref="/competition-history" queryString={queryString}>
        <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
          <Card className="max-w-md w-full p-6">
            <p className="text-destructive mb-4">{error || 'Competition not found.'}</p>
            <Link href="/competition-history">
              <Button variant="outline">Back to Competition History</Button>
            </Link>
          </Card>
        </div>
      </CompetitionDataLayout>
    );
  }

  const personName = typeof router.query.name === 'string' ? router.query.name.trim() : undefined;
  const backToStatsHref = competitionQueryString ? `/view-data?${competitionQueryString}` : '/view-data';

  if (personName) {
    if (!user) {
      return (
        <CompetitionDataLayout activeTab="overview" backHref="/competition-history" queryString={queryString} showStatsTab={false}>
          <main className="flex-1 w-full max-w-lg mx-auto px-4 py-16 text-center">
            <p className="text-muted-foreground mb-4">Sign in to view per-scout form breakdowns.</p>
            <Link href="/auth/signin">
              <Button>Sign in</Button>
            </Link>
          </main>
        </CompetitionDataLayout>
      );
    }
    const orgId = user.organization_id;
    const personForms = scoutingData.filter(
      (r: ViewDataRow) =>
        orgId != null &&
        (r.organization_id ?? null) === orgId &&
        (r.submitted_by_name != null && String(r.submitted_by_name).trim() === personName)
    );
    const sortedPersonForms = [...personForms].sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (sortField === 'match_id') {
        const aM = a.match_id ?? a.match_number ?? aVal;
        const bM = b.match_id ?? b.match_number ?? bVal;
        return sortDirection === 'asc' ? String(aM).localeCompare(String(bM)) : String(bM).localeCompare(String(aM));
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      const cmp = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    const personFormsContent = (
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <Link href={backToStatsHref}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Scouting Stats
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Forms by {personName}</h1>
          <span className="text-muted-foreground text-sm">{personForms.length} form{personForms.length !== 1 ? 's' : ''}</span>
        </div>
        <Card className="rounded-xl border border-white/10 bg-card/50 overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  <th className="text-left py-3 px-4">Team</th>
                  <th className="text-left py-3 px-4">Match</th>
                  <th className="text-left py-3 px-4">Alliance</th>
                  <th className="text-left py-3 px-4">Auto</th>
                  <th className="text-left py-3 px-4">Teleop</th>
                  <th className="text-left py-3 px-4">Total</th>
                  <th className="text-left py-3 px-4">Defense</th>
                  <th className="text-left py-3 px-4">Comments</th>
                </tr>
              </thead>
              <tbody>
                {sortedPersonForms.map((data, index) => {
                  const teamUrl = getTeamPageUrl(data.team_number);
                  return (
                    <tr key={data.id || `${data.match_id}-${data.team_number}-${index}`} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <Link href={teamUrl} className="font-bold text-foreground hover:text-primary">
                          {getTeamName(data.team_number)} #{data.team_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono">{data.match_id ?? data.match_number ?? '—'}</td>
                      <td className="py-3 px-4">
                        <Badge variant={data.alliance_color === 'red' ? 'destructive' : 'default'} className="text-[9px]">
                          {data.alliance_color || '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-blue-400 font-bold">{data.autonomous_points ?? '—'}</td>
                      <td className="py-3 px-4 text-orange-400 font-bold">{data.teleop_points ?? '—'}</td>
                      <td className="py-3 px-4 font-black">{data.final_score ?? '—'}</td>
                      <td className="py-3 px-4">{data.defense_rating ?? '—'}</td>
                      <td className="py-3 px-4 max-w-[180px] truncate italic text-sm text-muted-foreground" title={data.comments}>{data.comments || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedPersonForms.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No forms found for this person in this competition.</div>
          )}
        </Card>
      </main>
    );
    return (
      <CompetitionDataLayout activeTab="stats" backHref="/competition-history" queryString={queryString} showStatsTab={!!user}>
        {personFormsContent}
      </CompetitionDataLayout>
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

      {/* Controls: view mode + filters + refresh */}
      <Card className="rounded-xl border border-white/10 bg-card/50 overflow-hidden mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-foreground">View:</span>
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  size="sm"
                  variant={dataViewMode === 'teams' ? 'default' : 'ghost'}
                  onClick={() => setDataViewMode('teams')}
                  className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs sm:text-sm"
                >
                  Team Stats
                </Button>
                <Button
                  size="sm"
                  variant={dataViewMode === 'individual' ? 'default' : 'ghost'}
                  onClick={() => setDataViewMode('individual')}
                  className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs sm:text-sm"
                >
                  Individual Forms
                </Button>
              </div>
              {dataViewMode === 'teams' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Min matches</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Any"
                      value={minMatchesFilter === '' ? '' : minMatchesFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMinMatchesFilter(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="h-9 w-24"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Min avg score</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="Any"
                      value={minAvgScoreFilter === '' ? '' : minAvgScoreFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMinAvgScoreFilter(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="h-9 w-24"
                    />
                  </div>
                </div>
              )}

              {/* Live + archived: OFF = org-scoped; ON = all orgs for this event / archive group. Pit merge: live only. */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:ml-4">
                {(event_key || competition_key || id) && (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col max-w-[220px]">
                      <span className="text-xs font-medium">See all orgs</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        Off: your org only. On: every org&apos;s data for this competition (guests: reference org).
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={seeAllOrgsData ? 'default' : 'outline'}
                      onClick={() => setSeeAllOrgsData(!seeAllOrgsData)}
                      className={cn(
                        'h-7 px-2.5 rounded-full transition-all text-[10px]',
                        seeAllOrgsData ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {seeAllOrgsData ? 'ON' : 'OFF'}
                    </Button>
                  </div>
                )}
              </div>

              <Button onClick={loadData} variant="outline" size="sm" className="sm:ml-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-white/10 bg-card/50 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/[0.02]">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            {dataViewMode === 'teams'
              ? `Team Statistics (${sortedTeamStats.length} teams)`
              : `Scouting Data (${scoutingData.length} record${scoutingData.length !== 1 ? 's' : ''})`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {dataViewMode === 'teams'
              ? 'Aggregated stats from match scouting. Click team for details.'
              : 'Click Team to view full analysis. 2026 Rebuilt format.'}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {dataViewMode === 'teams' ? (
            <div className="space-y-4 p-4">
              {/* Mobile cards - Team Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                {sortedTeamStats.map((team, index) => (
                  <motion.div
                    key={team.team_number}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-white/5 hover:border-primary/20 transition-all p-5 bg-white/[0.02]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-lg font-bold text-foreground truncate">{team.team_name}</h3>
                        <Badge variant="secondary" className="mt-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
                          #{team.team_number}
                        </Badge>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest block">Avg Score</span>
                        <span className="text-2xl font-bold text-primary">{team.avg_total_score}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Matches scouted</span>
                        <span className="text-sm font-semibold">{team.total_matches}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Avg Score</span>
                        <span className="text-sm font-semibold text-primary">{team.avg_total_score}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Starter EPA</span>
                        <span className="text-sm font-semibold text-muted-foreground">{team.starter_epa ?? '—'}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Auto EPA</span>
                        <span className="text-sm font-semibold text-blue-400">{team.avg_autonomous_points ?? '—'}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Teleop EPA</span>
                        <span className="text-sm font-semibold text-orange-400">{team.avg_teleop_points ?? '—'}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Endgame EPA</span>
                        <span className="text-sm font-semibold text-green-400">{team.endgame_epa ?? team.avg_climb_pts ?? '—'}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Consistency</span>
                        <span className={cn('text-sm font-semibold', team.consistency_score >= 80 ? 'text-green-400' : team.consistency_score >= 60 ? 'text-yellow-400' : 'text-red-400')}>
                          {team.consistency_score}%
                        </span>
                      </div>
                    </div>
                    {pitByTeam[team.team_number] && (
                      <div className="mb-4 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Pit</span>
                        <span className="text-sm font-medium text-foreground">{pitByTeam[team.team_number].robot_name || '—'}</span>
                        {pitByTeam[team.team_number].drive_type && (
                          <span className="text-sm text-muted-foreground"> · {pitByTeam[team.team_number].drive_type}</span>
                        )}
                        {pitByTeam[team.team_number].weight != null && pitByTeam[team.team_number].weight! > 0 && (
                          <span className="text-sm text-muted-foreground"> · {pitByTeam[team.team_number].weight} lbs</span>
                        )}
                        {pitByTeam[team.team_number].overall_rating != null && pitByTeam[team.team_number].overall_rating! > 0 && (
                          <span className="text-sm text-muted-foreground"> ★{pitByTeam[team.team_number].overall_rating}/10</span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-white/5">
                      <Link href={getTeamPageUrl(team.team_number)} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full text-xs h-9 border-white/10">
                          View Forms
                        </Button>
                      </Link>
                      <Link href={getTeamPageUrl(team.team_number)} className="flex-1">
                        <Button size="sm" className="w-full text-xs h-9">
                          Team Details
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
              {/* Desktop table - Team Stats */}
              <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      <th className="text-left p-4 cursor-pointer hover:text-foreground" onClick={() => handleTeamStatsSort('team_number')}>
                        Team {teamStatsSortField === 'team_number' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 cursor-pointer hover:text-foreground" onClick={() => handleTeamStatsSort('total_matches')}>
                        Matches {teamStatsSortField === 'total_matches' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 cursor-pointer hover:text-foreground" onClick={() => handleTeamStatsSort('avg_total_score')}>
                        Avg Score {teamStatsSortField === 'avg_total_score' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 cursor-pointer hover:text-foreground text-[9px]" onClick={() => handleTeamStatsSort('starter_epa')}>
                        Starter {teamStatsSortField === 'starter_epa' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 cursor-pointer hover:text-foreground text-[9px]" onClick={() => handleTeamStatsSort('avg_autonomous_points')}>
                        Auto EPA {teamStatsSortField === 'avg_autonomous_points' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 cursor-pointer hover:text-foreground text-[9px]" onClick={() => handleTeamStatsSort('avg_teleop_points')}>
                        Teleop EPA {teamStatsSortField === 'avg_teleop_points' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 cursor-pointer hover:text-foreground text-[9px]" onClick={() => handleTeamStatsSort('endgame_epa')}>
                        Endgame EPA {teamStatsSortField === 'endgame_epa' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 cursor-pointer hover:text-foreground text-[9px]" onClick={() => handleTeamStatsSort('epa')}>
                        EPA {teamStatsSortField === 'epa' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}
                      </th>
                      <th className="text-left p-4 text-[11px]">Pit</th>
                      <th className="text-right p-4 text-[11px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeamStats.map((team, index) => {
                      const pit = pitByTeam[team.team_number];
                      return (
                        <motion.tr
                          key={team.team_number}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="bg-blue-500/10 p-2 rounded-lg">
                                <Users className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{team.team_name}</span>
                                <span className="text-xs text-muted-foreground font-mono">#{team.team_number}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-medium">{team.total_matches}</td>
                          <td className="p-4">
                            <span className="font-bold text-primary text-lg">{team.avg_total_score}</span>
                          </td>
                          <td className="p-4 text-muted-foreground font-medium text-xs">{team.starter_epa ?? '—'}</td>
                          <td className="p-4 text-blue-400 font-semibold text-sm">{team.avg_autonomous_points ?? '—'}</td>
                          <td className="p-4 text-orange-400 font-semibold text-sm">{team.avg_teleop_points ?? '—'}</td>
                          <td className="p-4 text-green-400 font-semibold text-sm">{team.endgame_epa ?? team.avg_climb_pts ?? '—'}</td>
                          <td className="p-4 text-primary font-bold text-sm">{team.epa ?? team.avg_total_score ?? '—'}</td>
                          <td className="p-4">
                            <span className={cn('font-bold text-sm', team.consistency_score >= 80 ? 'text-green-400' : team.consistency_score >= 60 ? 'text-yellow-400' : 'text-red-400')}>
                              {team.consistency_score}%
                            </span>
                          </td>
                          <td className="p-4">
                            {pit ? (
                              <Link href={getTeamPageUrl(team.team_number)} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                                <span className="font-medium text-foreground">{pit.robot_name || '—'}</span>
                                {pit.drive_type && <span className="ml-1 text-xs"> · {pit.drive_type}</span>}
                                {pit.weight != null && pit.weight > 0 && <span className="ml-1 text-xs"> · {pit.weight} lbs</span>}
                                {pit.overall_rating != null && pit.overall_rating > 0 && <span className="ml-1 text-xs"> ★{pit.overall_rating}/10</span>}
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={getTeamPageUrl(team.team_number)}>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Team Details">
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {sortedTeamStats.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No team stats (need scouting data).</div>
              )}
            </div>
          ) : (
          <>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full border-collapse min-w-[880px]">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                  <th className="text-left p-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('team_number')}>
                    Team {sortField === 'team_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('match_id')}>
                    Match {sortField === 'match_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 whitespace-nowrap">Alliance</th>
                  <th className="text-left p-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('autonomous_points')}>
                    Auto {sortField === 'autonomous_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('teleop_points')}>
                    Teleop {sortField === 'teleop_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('final_score')}>
                    Total {sortField === 'final_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('defense_rating')}>
                    Defense {sortField === 'defense_rating' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 whitespace-nowrap">Downtime</th>
                  <th className="text-left p-4 whitespace-nowrap">Broke</th>
                  <th className="text-left p-4 whitespace-nowrap">Uploaded By</th>
                  <th className="text-left p-4 cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort('created_at')}>
                    Date {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 min-w-[120px]">Comments</th>
                  <th className="text-left p-4 whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((data, index) => {
                  const rowKey = data.id || `${data.match_id ?? ''}-${data.team_number}-${index}`;
                  const isExpanded = expandedRowKey === rowKey;
                  const teamUrl = getTeamPageUrl(data.team_number);
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
                        {data.average_downtime != null ? formatDurationSec(Number(data.average_downtime)) : '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm align-middle">
                        {data.broke === true ? 'Yes' : data.broke === false ? 'No' : '—'}
                      </td>
                      <td className="py-3 px-4 align-middle text-sm text-muted-foreground">
                        {(data as ViewDataRow).submitted_by_name ? String((data as ViewDataRow).submitted_by_name).trim() : '—'}
                      </td>
                      <td className="py-3 px-4 align-middle text-sm text-muted-foreground">
                        {(data as ViewDataRow).created_at
                          ? new Date((data as ViewDataRow).created_at!).toLocaleDateString()
                          : (data as ViewDataRow).submitted_at
                            ? new Date((data as ViewDataRow).submitted_at!).toLocaleDateString()
                            : '—'}
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="max-w-[180px] truncate italic text-sm text-muted-foreground" title={data.comments}>
                          {data.comments || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle">
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
                          <td colSpan={13} className="py-4 px-6">
                            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">2026 Rebuilt · Shooting runs &amp; estimated score</h4>
                            <ScoutingRunsBreakdown notes={data.notes} shuttleRow={data} />
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
          </>
          )}
        </CardContent>
      </Card>
    </main>
  );

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
            {scoutingData.length ? roundToTenth(scoutingData.reduce((s, r) => s + (r.final_score ?? 0), 0) / scoutingData.length) : 0}
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

  const getPitImageUrl = (row: { photos?: string[] | null; robot_image_url?: string | null; [key: string]: unknown }) => {
    const robotUrl = row.robot_image_url != null && String(row.robot_image_url).trim();
    if (robotUrl) return String(row.robot_image_url).trim();
    let arr: unknown[] = [];
    if (Array.isArray(row.photos)) arr = row.photos;
    else if (typeof row.photos === 'string') {
      const str: string = row.photos;
      try {
        const parsed = JSON.parse(str);
        arr = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        if (String(str).trim()) arr = [str];
      }
    }
    const first = arr.find((u: unknown) => typeof u === 'string' && (u as string).trim());
    return first ? (first as string).trim() : null;
  };

  const pitContent = (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Pit Scouting</h1>
        <p className="text-muted-foreground text-sm">
          Teams with pit scouting data for {competition?.competition_name ?? 'this competition'}. Click a team to view details and robot images.
        </p>
      </div>
      {event_key && (
        <Card className="rounded-xl border border-white/10 bg-card/50 overflow-hidden mb-6">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 p-2 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="flex flex-col max-w-[200px]">
                  <span className="text-xs font-medium">All orgs pit</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Off: pit from an org that has data (prefers yours when signed in).
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={pitAllOrgs ? 'default' : 'outline'}
                  onClick={() => setPitAllOrgs(!pitAllOrgs)}
                  className={cn(
                    'h-7 px-2.5 rounded-full transition-all text-[10px]',
                    pitAllOrgs ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  {pitAllOrgs ? 'ON' : 'OFF'}
                </Button>
              </div>
              <Button onClick={loadData} variant="outline" size="sm" className="sm:ml-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pitDisplayList.map((row, idx) => {
          const teamName = getTeamName(row.team_number);
          const imgUrl = getPitImageUrl(row);
          const teamUrl = getTeamPageUrl(row.team_number, 'pit');
          const rowId = (row as PitRow).id;
          const isLive = !!event_key;
          return (
            <Card key={rowId ?? `pit-${row.team_number}-${idx}`} className="overflow-hidden border border-white/10 bg-card/50 hover:border-primary/30 hover:bg-white/5 transition-all h-full flex flex-col">
              <Link href={teamUrl} className="block flex-1 min-w-0">
                <div className="aspect-[4/3] bg-muted/20 flex items-center justify-center overflow-hidden relative">
                  {imgUrl ? (
                    <>
                      <img
                        src={imgUrl}
                        alt={row.robot_name || teamName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          const wrap = el.parentElement;
                          const fallback = wrap?.querySelector('.pit-img-fallback');
                          if (fallback instanceof HTMLElement) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="pit-img-fallback absolute inset-0 flex items-center justify-center bg-muted/20" style={{ display: 'none' }}>
                        <Wrench className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                    </>
                  ) : (
                    <Wrench className="w-12 h-12 text-muted-foreground/50" />
                  )}
                </div>
                <CardContent className="p-3 space-y-1.5">
                  <p className="font-bold text-foreground truncate">#{row.team_number} · {teamName}</p>
                  <p className="text-sm text-muted-foreground truncate">{row.robot_name || '—'}</p>
                  {(row.drive_type || (row.weight != null && Number(row.weight) > 0) || (row.overall_rating != null && Number(row.overall_rating) > 0)) && (
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-muted-foreground">
                      {row.drive_type ? <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0">{String(row.drive_type)}</Badge> : null}
                      {row.weight != null && Number(row.weight) > 0 && <span>{Number(row.weight)} lbs</span>}
                      {row.overall_rating != null && Number(row.overall_rating) > 0 && <span>★ {Number(row.overall_rating)}/10</span>}
                      {row.auto_fuel_count != null && Number(row.auto_fuel_count) > 0 && <span>Auto Fuel: {Number(row.auto_fuel_count)}</span>}
                    </div>
                  )}
                </CardContent>
              </Link>
              {isAdmin && rowId && (
                <div className="flex items-center gap-2 p-2 border-t border-white/10 bg-background/30" onClick={(e) => e.stopPropagation()}>
                  {isLive && (
                    <Link href={`/pit-scouting?id=${encodeURIComponent(rowId)}&edit=true`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn('h-8 text-xs text-destructive hover:text-destructive', isLive ? 'flex-1' : 'w-full')}
                    onClick={() => setDeletingPitRow(row as PitRow)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {pitDisplayList.length === 0 && (
        <Card className="p-12 border border-white/10 bg-card/50 text-center">
          <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Pit Scouting Data</h3>
          <p className="text-muted-foreground text-sm">No pit scouting records for this competition.</p>
        </Card>
      )}
    </main>
  );

  const comparisonContent = (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <TeamComparisonPanel
        teams={teams}
        scoutingData={scoutingData}
        competitionName={competition?.competition_name ?? undefined}
        dark={true}
      />
    </main>
  );

  const statsContent = (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Scouting Stats</h1>
        <p className="text-muted-foreground text-sm">
          Match scouting forms by person for {competition?.competition_name ?? 'this competition'}.
        </p>
      </div>
      <Card className="border border-white/10 bg-card/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-muted-foreground text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Person</th>
              <th className="p-4 font-medium text-right">Forms</th>
            </tr>
          </thead>
          <tbody>
            {statsByPerson.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-8 text-center text-muted-foreground">
                  No scouting forms in this competition yet.
                </td>
              </tr>
            ) : (
              statsByPerson.map(({ name, count }) => {
                const formsP = new URLSearchParams(competitionQueryString || undefined);
                formsP.set('name', name);
                const formsHref = competitionQueryString ? `/view-data?${formsP.toString()}` : '#';
                return (
                  <tr key={name} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <Link href={formsHref} className="font-medium text-foreground hover:text-primary transition-colors">
                        {name}
                      </Link>
                    </td>
                    <td className="p-4 text-right font-mono">{count}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );

  const tabContent =
    activeTab === 'overview'
      ? overviewContent
      : activeTab === 'comparison'
        ? comparisonContent
        : activeTab === 'pit'
          ? pitContent
          : activeTab === 'stats'
            ? statsContent
            : mainContent;

  return (
    <>
      <CompetitionDataLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backHref="/competition-history"
        queryString={queryPrefix}
        showPitTab={showPitTab}
        showStatsTab={!!user}
      >
        {tabContent}
      </CompetitionDataLayout>
      {isSuperAdmin && session && (
        <SuperadminScoutingChat
          session={session}
          context={{
            competitionName: competition?.competition_name,
            competitionKey: typeof competition_key === 'string' ? competition_key : undefined,
            year: typeof year === 'string' ? year : undefined,
            eventKey: typeof event_key === 'string' ? event_key : undefined,
            pastId: typeof id === 'string' ? id : undefined,
            seeAllOrgs: seeAllOrgsData,
            organizationId: user?.organization_id ?? null,
          }}
          teams={teams}
          scoutingRows={scoutingData}
        />
      )}
      {deletingPitRow && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete pit record</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Delete pit scouting for Team {deletingPitRow.team_number} ({deletingPitRow.robot_name || '—'})? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelPitDelete}>Cancel</Button>
              <Button variant="destructive" onClick={confirmPitDelete}>Delete</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
