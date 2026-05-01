import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  Database,
  Calendar,
  User,
  Activity,
  Shield,
  MessageSquare,
  Clock,
  Zap,
  Award,
  CheckCircle,
  XCircle,
  BarChart3,
  TrendingUp,
  Wrench,
  AlertCircle,
  Target,
  Route,
  X,
  Loader2,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import GuestLayout from '@/components/layout/GuestLayout';
import CompetitionDataLayout from '@/components/layout/CompetitionDataLayout';
import type { CompetitionViewTab } from '@/components/layout/CompetitionDataSidebar';
import { useAdmin } from '@/hooks/use-admin';
import { ScoutingData, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  computeRebuiltMetrics,
  formatScoreRange,
  getClimbAchieved,
  getAutoFuelCount,
  getTeleopFuelCount,
  getUptimePct,
  parseNotes,
} from '@/lib/analytics';
import { generateScoutingSummary } from '@/lib/scouting-summarizer';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { PitScoutingData } from '@/pages/pit-scouting-data';
import { hasCompetitionPitSidebarRows } from '@/lib/pit-scouting-visibility';
import { ScoutingRunsBreakdown } from '@/components/data/ScoutingRunsBreakdown';
import { mergePitDriveTrainDetails, formatPitBallCapacity, getPitBallHoldAmount } from '@/lib/pit-drive-train';
import { getOrgCurrentEvent } from '@/lib/org-app-config';

// Helper component for stat cards
const StatCard = ({ label, value, color, icon: Icon, subLabel }: any) => (
  <div className="glass-card p-4 rounded-xl flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors border border-white/5">
    <div className={`p-3 rounded-full mb-3 bg-${color}-500/10`}>
      <Icon className={`w-5 h-5 text-${color}-500`} />
    </div>
    <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{label}</div>
    {subLabel && <div className="text-[10px] text-muted-foreground/60 mt-1">{subLabel}</div>}
  </div>
);

// Helper for breakdown items
const BreakdownItem = ({ label, value, points, isCleansing }: any) => (
  <div className={cn(
    "flex items-center justify-between p-3 rounded-lg border transition-all",
    isCleansing
      ? "bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10"
      : "bg-card/30 border-white/5 hover:bg-white/5"
  )}>
    <span className={cn(
      "text-sm font-medium",
      isCleansing ? "text-purple-400" : "text-muted-foreground"
    )}>{label}</span>
    <div className="flex items-center gap-3">
      {typeof value === 'boolean' ? (
        value ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-destructive" />
      ) : (
        <span className="text-sm font-bold text-foreground">{value || 0}</span>
      )}

      {!isCleansing && (
        <Badge variant="outline" className="text-[10px] bg-background/50 border-white/10">
          {points}pts
        </Badge>
      )}
    </div>
  </div>
);

const TeamDetail: React.FC = () => {
  const router = useRouter();
  const { teamNumber } = router.query;
  const { supabase, user, session } = useSupabase();
  const { isSuperAdmin, isAdmin, loading: adminLoading } = useAdmin();

  const [team, setTeam] = useState<Team | null>(null);
  const [scoutingData, setScoutingData] = useState<ScoutingData[]>([]);
  const [pitData, setPitData] = useState<PitScoutingData | null>(null);
  /** Matches view-data: show Pit sidebar only when competition has non-fallback pit rows. */
  const [competitionPitTabVisible, setCompetitionPitTabVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const matchDetailPushedRef = useRef(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);
  const [activeTeamTab, setActiveTeamTab] = useState<string>('overview');
  
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);

  const pitDriveTrainMerged = useMemo(() => {
    if (!pitData) return null;
    return mergePitDriveTrainDetails(pitData.drive_type || 'Unknown', pitData.drive_train_details);
  }, [pitData]);

  useEffect(() => {
    if (!fullScreenImageUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullScreenImageUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullScreenImageUrl]);

  useEffect(() => {
    const tab = router.query.tab as string | undefined;
    if (tab === 'pit' || tab === 'overview' || tab === 'advanced' || tab === 'matches') {
      setActiveTeamTab(tab);
    }
  }, [router.query.tab]);

  const handleTeamTabChange = useCallback(
    (value: string) => {
      setActiveTeamTab(value);
      if (value !== 'matches') {
        setSelectedMatch(null);
      }
      if (!router.isReady) return;
      void router.replace(
        { pathname: router.pathname, query: { ...router.query, tab: value } },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  /** Browser back from expanded match detail closes the panel before leaving the team page (History API). */
  useEffect(() => {
    if (!router.isReady) return;

    if (!selectedMatch) {
      matchDetailPushedRef.current = false;
      return;
    }

    const onPopState = () => {
      setSelectedMatch(null);
    };

    window.addEventListener('popstate', onPopState);

    if (!matchDetailPushedRef.current) {
      const st = typeof window !== 'undefined' ? window.history.state : null;
      if (!(st && typeof st === 'object' && (st as { teamMatchDetail?: boolean }).teamMatchDetail)) {
        window.history.pushState({ teamMatchDetail: true }, '', window.location.href);
      }
      matchDetailPushedRef.current = true;
    } else {
      window.history.replaceState({ teamMatchDetail: true, id: selectedMatch }, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [selectedMatch, router.isReady]);

  /** Primary robot image: robot_image_url (live) or first valid URL in photos (past/live). */
  const getRobotImageUrl = (pit: PitScoutingData | null): string | null => {
    if (!pit) return null;
    const fromMain = pit.robot_image_url && String(pit.robot_image_url).trim();
    if (fromMain) return fromMain;
    const arr = Array.isArray(pit.photos) ? pit.photos : [];
    const first = arr.find((u: unknown) => typeof u === 'string' && (u as string).trim());
    return first ? (first as string).trim() : null;
  };

  const robotImageUrl = getRobotImageUrl(pitData);

  const getMatchLabel = (matchId: string) => {
    if (!matchId) return 'N/A';
    const parts = matchId.split('_');
    const lastPart = parts[parts.length - 1];
    if (lastPart) return lastPart.toUpperCase();
    return matchId;
  };

  /** Extract numeric sort key from match_id for chronological order (e.g. qm1 -> 1, qm10 -> 10, qf1m1 -> 101). */
  const getMatchSortKey = (matchId: string): number => {
    if (!matchId) return 0;
    const lower = matchId.toLowerCase();
    const qm = lower.match(/qm(\d+)/);
    if (qm) return parseInt(qm[1], 10);
    const qf = lower.match(/qf(\d+)m(\d+)/);
    if (qf) return 100 + parseInt(qf[1], 10) * 10 + parseInt(qf[2], 10);
    const sf = lower.match(/sf(\d+)m(\d+)/);
    if (sf) return 200 + parseInt(sf[1], 10) * 10 + parseInt(sf[2], 10);
    const f = lower.match(/f(\d+)m(\d+)/);
    if (f) return 300 + parseInt(f[1], 10) * 10 + parseInt(f[2], 10);
    return 0;
  };

  useEffect(() => {
    if (!router.isReady || !teamNumber) return;
    loadTeamData();
  }, [
    router.isReady,
    teamNumber,
    user,
    router.query.competition_id,
    router.query.event_key,
    router.query.competition_key,
    router.query.year,
    router.query.see_all_orgs,
    router.query.pit_all_orgs,
  ]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamNum = parseInt(teamNumber as string);
      if (!teamNum) return;

      const competitionId = router.query.competition_id as string | undefined;
      const eventKey = router.query.event_key as string | undefined;
      const competitionKey = router.query.competition_key as string | undefined;
      const yearQ = router.query.year as string | undefined;
      const seeAllOrgs = router.query.see_all_orgs === '1';
      const pitAllOrgs = router.query.pit_all_orgs === '1';

      // When coming from view-data (past or live event), always load that competition's data and filter by team
      if (competitionId || eventKey || (competitionKey && yearQ)) {
        const params = new URLSearchParams();
        if (eventKey) {
          params.set('event_key', eventKey);
          if (seeAllOrgs) params.set('see_all_orgs', '1');
          if (pitAllOrgs) params.set('pit_all_orgs', '1');
        } else if (competitionKey && yearQ) {
          params.set('competition_key', competitionKey);
          params.set('year', yearQ);
          if (seeAllOrgs) params.set('see_all_orgs', '1');
        } else if (competitionId) {
          params.set('id', competitionId);
          if (seeAllOrgs) params.set('see_all_orgs', '1');
        }
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/past-competitions?${params.toString()}`, { headers });
        if (!res.ok) {
          setTeam({ team_number: teamNum, team_name: `Team ${teamNum}`, team_color: '', organization_id: '', created_at: '' });
          setScoutingData([]);
          setPitData(null);
          setCompetitionPitTabVisible(false);
          setLoading(false);
          return;
        }
        const data = await res.json();
        const teamsList = data.teams || [];
        const allScouting = data.scoutingData || [];
        const teamScouting = allScouting.filter((r: any) => r.team_number === teamNum);
        const teamInfo = teamsList.find((t: any) => t.team_number === teamNum);
        const pitList = data.pitScoutingData || [];
        setCompetitionPitTabVisible(hasCompetitionPitSidebarRows(pitList));
        const teamPits = pitList.filter((p: any) => p.team_number === teamNum);
        const teamPit = teamPits.length > 0
          ? teamPits.find((p: any) => (Array.isArray(p.photos) && p.photos.length > 0) || (p.robot_image_url && String(p.robot_image_url).trim())) || teamPits[teamPits.length - 1]
          : null;
        let enrichedTeam = teamInfo ? { ...teamInfo } : { team_number: teamNum, team_name: `Team ${teamNum}`, organization_id: '', team_color: '', created_at: '' };
        if (eventKey) {
          try {
            const metricsRes = await fetch('/api/analysis/event-team-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventKey }),
            });
            if (metricsRes.ok) {
              const metricsJson = await metricsRes.json();
              const rows = Array.isArray(metricsJson?.rows) ? metricsJson.rows : [];
              const row = rows.find((r: any) => Number(r.teamNumber) === teamNum);
              if (row) {
                const opr = Number(row.opr);
                const avgShootingTimeSec = Number((enrichedTeam as any)?.avg_shooting_time_sec);
                const normalizedOpr =
                  Number.isFinite(opr) && Number.isFinite(avgShootingTimeSec) && avgShootingTimeSec > 0
                    ? Math.round((opr / avgShootingTimeSec) * 10) / 10
                    : (enrichedTeam as any).normalized_opr;
                enrichedTeam = {
                  ...enrichedTeam,
                  tba_opr: Number.isFinite(opr) ? opr : (enrichedTeam as any).tba_opr,
                  tba_epa: Number.isFinite(Number(row.totalEpa)) ? Number(row.totalEpa) : enrichedTeam.tba_epa,
                  normalized_opr: normalizedOpr,
                  tba_auto_epa: Number.isFinite(Number(row.autoEpa)) ? Number(row.autoEpa) : null,
                  tba_teleop_epa: Number.isFinite(Number(row.teleopEpa)) ? Number(row.teleopEpa) : null,
                } as any;
              }
            }
          } catch (err) {
            console.warn('team detail event metrics load failed', err);
          }
        }
        setTeam(enrichedTeam as Team);
        setScoutingData(teamScouting);
        setPitData(teamPit);
        setLoading(false);
        return;
      }

      // Guest users (no context): load via public team API
      if (!user) {
        const res = await fetch(`/api/team/${teamNum}`);
        if (!res.ok) {
          if (res.status === 404) {
            setTeam(null);
            setScoutingData([]);
            setPitData(null);
          }
          setCompetitionPitTabVisible(false);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTeam(data.team);
        setScoutingData(data.scoutingData || []);
        setPitData(data.pitData || null);
        setCompetitionPitTabVisible(false);
        setLoading(false);
        return;
      }

      // Logged-in users: load from Supabase
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', teamNum)
        .single();

      if (teamError) throw teamError;

      const { data: scoutingDataResult, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .order('created_at', { ascending: false });

      if (scoutingError) throw scoutingError;

      const { data: pitDataRows } = await supabase
        .from('pit_scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .order('created_at', { ascending: false })
        .limit(10);
      
      let pitDataResult = (pitDataRows && pitDataRows.length > 0)
        ? pitDataRows.find((r: any) => (r.robot_image_url && r.robot_image_url.trim()) || (Array.isArray(r.photos) && r.photos.length > 0)) || pitDataRows[0]
        : null;

      // Fallback: If no robot image in current competition, check past competitions for this ORG
      if (user?.organization_id && (!pitDataResult || !getRobotImageUrl(pitDataResult))) {
        const { data: pastPitData } = await supabase
          .from('past_pit_scouting_data')
          .select('*')
          .eq('team_number', teamNum)
          .eq('organization_id', user.organization_id)
          .order('created_at', { ascending: false });
        
        if (pastPitData && pastPitData.length > 0) {
          const pastWithImage = pastPitData.find((r: any) => 
            (r.robot_image_url && String(r.robot_image_url).trim()) || 
            (Array.isArray(r.photos) && r.photos.length > 0)
          );
          
          if (pastWithImage) {
            if (!pitDataResult) {
               pitDataResult = { ...pastWithImage, is_fallback: true };
            } else {
               // We have pit data but no image. Fallback the image fields.
               pitDataResult.robot_image_url = pastWithImage.robot_image_url;
               pitDataResult.photos = pastWithImage.photos;
               (pitDataResult as any).is_fallback = true;
            }
          }
        }
      }

      let enrichedTeamData: Team = teamData as Team;
      if (user?.organization_id) {
        try {
          const { eventKey } = await getOrgCurrentEvent(supabase, user.organization_id);
          if (eventKey) {
            const metricsRes = await fetch('/api/analysis/event-team-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventKey }),
            });
            if (metricsRes.ok) {
              const metricsJson = await metricsRes.json().catch(() => ({}));
              const rows = Array.isArray(metricsJson?.rows) ? metricsJson.rows : [];
              const row = rows.find((r: any) => Number(r.teamNumber) === teamNum);
              if (row) {
                const opr = Number(row.opr);
                const avgShootingTimeSec = Number((teamData as any)?.avg_shooting_time_sec);
                const normalizedOpr =
                  Number.isFinite(opr) && Number.isFinite(avgShootingTimeSec) && avgShootingTimeSec > 0
                    ? Math.round((opr / avgShootingTimeSec) * 10) / 10
                    : (teamData as any)?.normalized_opr;
                enrichedTeamData = {
                  ...(teamData as Team),
                  tba_opr: Number.isFinite(opr) ? opr : (teamData as any)?.tba_opr,
                  tba_epa: Number.isFinite(Number(row.totalEpa)) ? Number(row.totalEpa) : (teamData as any)?.tba_epa,
                  normalized_opr: normalizedOpr,
                  tba_auto_epa: Number.isFinite(Number(row.autoEpa)) ? Number(row.autoEpa) : null,
                  tba_teleop_epa: Number.isFinite(Number(row.teleopEpa)) ? Number(row.teleopEpa) : null,
                };
              }
            }
          }
        } catch (eventMetricsError) {
          console.warn('team detail event metrics enrich failed', eventMetricsError);
        }
      }

      setTeam(enrichedTeamData);
      setScoutingData(scoutingDataResult || []);
      setPitData(pitDataResult);
      setCompetitionPitTabVisible(false);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamStats = () => {
    const totalMatches = scoutingData.length;
    const rows = scoutingData.map((d) => ({
      notes: d.notes,
      average_downtime: d.average_downtime ?? null,
      broke: d.broke ?? false,
      final_score: d.final_score ?? 0,
      autonomous_points: d.autonomous_points ?? 0,
      teleop_points: d.teleop_points ?? 0,
      autonomous_cleansing: d.autonomous_cleansing ?? 0,
      teleop_cleansing: d.teleop_cleansing ?? 0,
    }));
    const rebuilt = computeRebuiltMetrics(rows);

    const scores = scoutingData.map((d) => d.final_score || 0);
    const avgTotal = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const variance = scores.length > 1
      ? scores.reduce((sum, score) => sum + Math.pow(score - avgTotal, 2), 0) / scores.length
      : 0;
    const standardDeviation = Math.sqrt(variance);
    const consistencyScore = (avgTotal > 0 && scores.length > 0)
      ? Math.max(0, Math.min(100, 100 - (standardDeviation / avgTotal) * 100))
      : 0;

    const avgDefense = totalMatches > 0 ? scoutingData.reduce((sum, data) => sum + (data.defense_rating || 0), 0) / totalMatches : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
    const tbaAutoEpa = Number((team as any)?.tba_auto_epa);
    const tbaTeleopEpa = Number((team as any)?.tba_teleop_epa);
    const teamConsistency = Number((team as any)?.consistency);
    const hasTbaAutoEpa = Number.isFinite(tbaAutoEpa);
    const hasTbaTeleopEpa = Number.isFinite(tbaTeleopEpa);

    return {
      totalMatches,
      avgAutonomous: totalMatches > 0
        ? Math.round(scoutingData.reduce((sum, d) => sum + (d.autonomous_points || 0), 0) / totalMatches)
        : (hasTbaAutoEpa ? Math.round(tbaAutoEpa) : 0),
      avgTeleop: totalMatches > 0
        ? Math.round(scoutingData.reduce((sum, d) => sum + (d.teleop_points || 0), 0) / totalMatches)
        : (hasTbaTeleopEpa ? Math.round(tbaTeleopEpa) : 0),
      avgTotal: Math.round(avgTotal),
      avgDefense: Math.round(avgDefense),
      bestScore,
      worstScore,
      consistencyScore: totalMatches > 0
        ? Math.round(consistencyScore)
        : (Number.isFinite(teamConsistency) ? Math.round(teamConsistency) : 0),
      // REBUILT + EPA
      avg_auto_fuel: rebuilt.avg_auto_fuel,
      avg_teleop_fuel: rebuilt.avg_teleop_fuel,
      avg_climb_pts: rebuilt.avg_climb_pts,
      avg_uptime_pct: rebuilt.avg_uptime_pct,
      avg_downtime_sec: rebuilt.avg_downtime_sec,
      broke_count: rebuilt.broke_count,
      broke_rate: rebuilt.broke_rate,
      avg_autonomous_cleansing: rebuilt.avg_autonomous_cleansing,
      avg_teleop_cleansing: rebuilt.avg_teleop_cleansing,
      clank: rebuilt.clank,
      avg_climb_speed_sec: rebuilt.avg_climb_speed_sec,
      rpmagic: rebuilt.rpmagic,
      goblin: rebuilt.goblin,
      auto_pts_min: rebuilt.auto_pts_min,
      auto_pts_max: rebuilt.auto_pts_max,
      teleop_pts_min: rebuilt.teleop_pts_min,
      teleop_pts_max: rebuilt.teleop_pts_max,
      total_pts_min: rebuilt.total_pts_min,
      total_pts_max: rebuilt.total_pts_max,
      balls_per_cycle_min: rebuilt.balls_per_cycle_min,
      balls_per_cycle_max: rebuilt.balls_per_cycle_max,
      avg_balls_per_cycle: rebuilt.avg_balls_per_cycle,
      auto_fuel_min: rebuilt.auto_fuel_min,
      auto_fuel_max: rebuilt.auto_fuel_max,
      teleop_fuel_min: rebuilt.teleop_fuel_min,
      teleop_fuel_max: rebuilt.teleop_fuel_max,
      avg_shooting_time_sec: rebuilt.avg_shooting_time_sec ?? null,
      shuttle_rate: rebuilt.shuttle_rate,
      avg_shuttle_balls: rebuilt.avg_shuttle_balls,
      endgame_epa: team?.normalized_opr ?? 0,
      epa: Math.round(team?.tba_epa ?? rebuilt.epa ?? avgTotal),

      // Data for Radar Chart (all values 0–100 for correct scale; Recharts expects numeric A and fullMark)
      radarData: [
        { subject: 'Reliability', A: Math.max(0, Math.min(100, 100 - (rebuilt.broke_rate ?? 0))), fullMark: 100 },
        { subject: 'Auto', A: Math.max(0, Math.min(100, ((rebuilt.avg_auto_fuel ?? 0) / 40) * 100)), fullMark: 100 },
        { subject: 'Teleop', A: Math.max(0, Math.min(100, ((rebuilt.avg_teleop_fuel ?? 0) / 40) * 100)), fullMark: 100 },
        { subject: 'Climb', A: Math.max(0, Math.min(100, ((rebuilt.avg_climb_pts ?? 0) / 30) * 100)), fullMark: 100 },
        { subject: 'Uptime', A: Math.max(0, Math.min(100, rebuilt.avg_uptime_pct ?? 0)), fullMark: 100 },
        { subject: 'Consistency', A: Math.max(0, Math.min(100, consistencyScore)), fullMark: 100 },
      ],

      // Trends for Line Chart (numeric score/auto/tele; sorted by match order for correct draw)
      trends: [...scoutingData]
        .sort((a, b) => getMatchSortKey(a.match_id) - getMatchSortKey(b.match_id))
        .map(d => ({
          match: getMatchLabel(d.match_id),
          score: Number(d.final_score) || 0,
          tele: Number(d.teleop_points) || 0,
          auto: Number(d.autonomous_points) || 0,
        })),
      strategicSummary: generateScoutingSummary(scoutingData.map(d => d.comments || ""))
    };
  };

  const renderScoringBreakdown = (notes: any, row?: { shuttling?: boolean | null; shuttling_consistency?: string | null }) => {
    const p = parseNotes(notes, row);
    const autoFuel = getAutoFuelCount(notes);
    const teleopFuel = getTeleopFuelCount(notes);
    const climb = getClimbAchieved(notes); // One climb per robot

    return (
      <div className="flex flex-col gap-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Autonomous */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Autonomous
            </h4>
            <div className="space-y-2">
              <BreakdownItem label="FUEL (game pieces)" value={autoFuel} points={1} />
              <BreakdownItem label="AUTO RUNS" value={(p.autonomous.runs || []).length} points={0} />
            </div>
          </div>

          {/* Teleop */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Teleop
            </h4>
            <div className="space-y-2">
              <BreakdownItem label="FUEL (game pieces)" value={teleopFuel} points={1} />
              <BreakdownItem label="SHUTTLE" value={p.teleop.shuttle ? 'Yes' : 'No'} points={0} />
              {p.teleop.shuttle && <BreakdownItem label="SHUTTLE CONS." value={p.teleop.shuttle_consistency} points={0} />}
              {climb && <BreakdownItem label="TOWER CLIMB" value={climb.label} points={0} />}
            </div>
          </div>

          {/* Climb — one per robot */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Award className="w-4 h-4" /> Climb
            </h4>
            <div className="space-y-2">
              {climb ? (
                <BreakdownItem label={`Climb ${climb.label}`} value={climb.label} points={0} />
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card/30 border-white/5">
                  <span className="text-sm font-medium text-muted-foreground">Climb</span>
                  <span className="text-sm text-muted-foreground">No climb</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const teamStats = calculateTeamStats();

  const qCompetitionKey = router.query.competition_key as string | undefined;
  const qYear = router.query.year as string | undefined;
  const vdTabFromQuery = router.query.vd_tab as string | undefined;
  const competitionSidebarActiveTab: CompetitionViewTab =
    vdTabFromQuery && ['overview', 'comparison', 'teams', 'pit', 'stats'].includes(vdTabFromQuery)
      ? (vdTabFromQuery as CompetitionViewTab)
      : 'teams';

  const backUrl = React.useMemo(() => {
    const base = router.query.competition_id
      ? `/view-data?id=${router.query.competition_id}`
      : router.query.event_key
        ? `/view-data?event_key=${encodeURIComponent(router.query.event_key as string)}`
        : qCompetitionKey && qYear
          ? `/view-data?competition_key=${encodeURIComponent(qCompetitionKey)}&year=${encodeURIComponent(qYear)}`
          : null;
    if (!base) return null;
    if (
      typeof vdTabFromQuery === 'string' &&
      ['overview', 'comparison', 'teams', 'pit', 'stats'].includes(vdTabFromQuery)
    ) {
      return `${base}&view_tab=${encodeURIComponent(vdTabFromQuery)}`;
    }
    return base;
  }, [router.query.competition_id, router.query.event_key, qCompetitionKey, qYear, vdTabFromQuery]);

  const guestBackLink = backUrl
    ? { href: backUrl, label: 'Back to Data' }
    : { href: '/competition-history', label: 'Back to Competition History' };

  const competitionId = router.query.competition_id as string | undefined;
  const eventKey = router.query.event_key as string | undefined;
  const seeAllOrgsQs = router.query.see_all_orgs === '1';
  const pitAllOrgsQs = router.query.pit_all_orgs === '1';
  const inCompetitionContext = Boolean(competitionId || eventKey || (qCompetitionKey && qYear));
  const competitionQueryString = (() => {
    const p = new URLSearchParams();
    if (qCompetitionKey && qYear) {
      p.set('competition_key', qCompetitionKey);
      p.set('year', qYear);
    } else if (competitionId) {
      p.set('id', competitionId);
    } else if (eventKey) {
      p.set('event_key', eventKey);
    } else {
      return '';
    }
    if (seeAllOrgsQs) p.set('see_all_orgs', '1');
    if (eventKey && pitAllOrgsQs) p.set('pit_all_orgs', '1');
    return p.toString();
  })();

  const wrapWithCompetitionLayout = (content: React.ReactNode) => (
    <CompetitionDataLayout
      activeTab={competitionSidebarActiveTab}
      backHref="/competition-history"
      queryString={competitionQueryString}
      showPitTab={competitionPitTabVisible}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">{content}</div>
    </CompetitionDataLayout>
  );

  const summarizeInFlightRef = useRef(false);

  const handleAiSummarize = useCallback(async () => {
    if (!scoutingData.length || summarizeInFlightRef.current) return;

    summarizeInFlightRef.current = true;
    setIsSummarizing(true);
    setSummarizeError(null);

    try {
      const comments = scoutingData.map(d => d.comments).filter(c => c && c.trim()) as string[];
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error('Authentication required for summary generation.');
      }

      const response = await fetch('/api/summarize-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ comments })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        let msg = data.message || 'Failed to generate intelligence';
        if (data.retryAfterSeconds) {
          msg += ` Try again in ~${data.retryAfterSeconds}s.`;
        }
        throw new Error(msg);
      }

      setAiSummary(typeof data.summary === 'string' ? data.summary : null);
    } catch (err: any) {
      console.error('AI Summarization failed:', err);
      setSummarizeError(err.message || 'The intelligence engine is currently offline.');
    } finally {
      summarizeInFlightRef.current = false;
      setIsSummarizing(false);
    }
  }, [scoutingData]);

  const superAdminAutoSummarizeRef = useRef(false);

  useEffect(() => {
    superAdminAutoSummarizeRef.current = false;
    setAiSummary(null);
    setSummarizeError(null);
  }, [
    team?.team_number,
    router.query.competition_id,
    router.query.event_key,
  ]);

  useEffect(() => {
    if (!isSuperAdmin || adminLoading || loading || !team) return;
    if (superAdminAutoSummarizeRef.current) return;
    const hasComments = scoutingData.some(d => d.comments?.trim());
    if (!hasComments) return;
    superAdminAutoSummarizeRef.current = true;
    void handleAiSummarize();
  }, [isSuperAdmin, adminLoading, loading, team, scoutingData, handleAiSummarize]);

  if (loading || adminLoading) {
    const spinner = (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
    if (inCompetitionContext) return wrapWithCompetitionLayout(spinner);
    return user ? (
      <Layout>{spinner}</Layout>
    ) : (
      <GuestLayout backLink={guestBackLink}>{spinner}</GuestLayout>
    );
  }

  if (!team) {
    const notFoundContent = (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 glass-card rounded-2xl mx-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Team Not Found</h3>
        <p className="text-muted-foreground mb-6 max-w-md">The requested team number could not be found in our database.</p>
        <Button onClick={() => router.push(backUrl || '/competition-history')} variant="outline" className="border-white/10 hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
    if (inCompetitionContext) return wrapWithCompetitionLayout(notFoundContent);
    return user ? (
      <Layout>{notFoundContent}</Layout>
    ) : (
      <GuestLayout backLink={guestBackLink}>{notFoundContent}</GuestLayout>
    );
  }

  const mainContent = (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-10 px-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
        <div className="flex items-end gap-4 flex-1 min-w-0">
          {robotImageUrl && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setFullScreenImageUrl(robotImageUrl)}
                className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-white/10 hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <img
                  src={robotImageUrl}
                  alt={`${team?.team_name ?? 'Team'} robot`}
                  className="w-full h-full object-cover"
                />
              </button>
              {(pitData as any)?.is_fallback && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 bg-amber-600 text-[10px] h-5 px-1.5 border-amber-400/50 text-white font-bold shadow-xl"
                >
                  PAST
                </Badge>
              )}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Team Analysis</Badge>
              <span>•</span>
              <span className="font-mono">Season 2026</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black tracking-tight text-foreground flex items-baseline gap-4 flex-wrap">
              <span className="text-primary">{team.team_number}</span>
              <span className="text-2xl md:text-4xl font-bold opacity-90">{team.team_name}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {backUrl ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(backUrl)}
              className="glass border-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Data
            </Button>
          ) : user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/analysis/data')}
              className="glass border-white/10"
            >
              Switch Team
            </Button>
          ) : null}
          {user && (
            <Button size="sm" className="shadow-lg shadow-primary/20">
              Compare
            </Button>
          )}
        </div>
      </div>

      {(
        <Tabs value={activeTeamTab} onValueChange={handleTeamTabChange} className="w-full">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-px overflow-x-auto">
            <TabsList className="bg-transparent h-12 p-0 gap-8 justify-start">
              <TabsTrigger
                value="overview"
                className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
              >
                OVERVIEW
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
              >
                ADVANCED
              </TabsTrigger>
              {(user || pitData) && (
                <TabsTrigger
                  value="pit"
                  className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
                >
                  PIT SCOUTING
                </TabsTrigger>
              )}
              <TabsTrigger
                value="matches"
                className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
              >
                MATCH HISTORY
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6 outline-none">
            {teamStats ? (
              <>
                {/* Super Admin Tactical Summary */}
                {isSuperAdmin && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 border-amber-500/20 bg-amber-500/[0.03] rounded-2xl relative overflow-hidden group shadow-lg shadow-amber-900/10"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Shield className="w-24 h-24 text-amber-500 rotate-12" />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <Shield className="w-4 h-4 text-amber-500" />
                      </div>
                      <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em]">Super Admin Strategy Intelligence</h3>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-widest">Strategic Intelligence Summary</h4>
                          <div className="glass-card p-4 rounded-xl border-amber-500/10 bg-amber-500/5 transition-all group-hover:bg-amber-500/10 min-h-[160px] flex flex-col justify-center border border-white/5 relative overflow-hidden">
                            {aiSummary ? (
                              <p className="text-foreground/90 leading-relaxed text-sm font-medium italic animate-in fade-in slide-in-from-bottom-1 duration-500">
                                "{aiSummary}"
                              </p>
                            ) : isSummarizing ? (
                              <div className="flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                                <span className="text-[10px] font-bold tracking-widest text-amber-500/50 uppercase">Aggregating Global Intelligence...</span>
                              </div>
                            ) : summarizeError ? (
                              <div className="text-center space-y-2">
                                <p className="text-xs text-red-400 font-medium">{summarizeError}</p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={handleAiSummarize}
                                  className="h-7 text-[10px] border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                                >
                                  Retry Intelligence Engine
                                </Button>
                              </div>
                            ) : (
                              <div className="text-center space-y-4">
                                <p className="text-foreground/50 leading-relaxed text-xs italic">
                                  Rule-based: "{teamStats.strategicSummary}"
                                </p>
                                <Button 
                                  onClick={handleAiSummarize}
                                  disabled={scoutingData.length === 0}
                                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-amber-900/20 py-5 group/btn overflow-hidden relative"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                  <Zap className="w-3 h-3 mr-2" />
                                  Generate Advanced Strategic Intelligence
                                </Button>
                              </div>
                            )}
                            <div className="mt-auto pt-3 border-t border-amber-500/10" />
                          </div>
                          <div className="space-y-2 mt-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-widest">Raw Scout Reports</h4>
                            <div className="max-h-[120px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                              {scoutingData
                                .filter(d => d.comments && d.comments.trim())
                                .map((d, i) => (
                                  <div key={d.id} className="flex gap-2 text-[10px] group/note border-b border-white/5 pb-2 last:border-0">
                                    <span className="text-amber-500 font-black shrink-0">[{getMatchLabel(d.match_id)}]</span>
                                    <p className="text-muted-foreground line-clamp-2 italic">{d.comments}</p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stats Grid — aligned with data analysis: core EPAs + consistency */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
                  <StatCard label="Avg Shooting Time" value={teamStats.avg_shooting_time_sec != null ? `${teamStats.avg_shooting_time_sec}s` : '—'} color="primary" icon={TrendingUp} subLabel="per scoring run" />
                  <StatCard label="Matches" value={teamStats.totalMatches} color="blue" icon={Database} subLabel="scouted" />
                  <StatCard label="Auto EPA" value={(team as any)?.tba_auto_epa != null ? Math.round(Number((team as any).tba_auto_epa)) : (teamStats.avgAutonomous ?? '—')} color="blue" icon={Clock} subLabel="pts" />
                  <StatCard label="Teleop EPA" value={(team as any)?.tba_teleop_epa != null ? Math.round(Number((team as any).tba_teleop_epa)) : (teamStats.avgTeleop ?? '—')} color="orange" icon={Zap} subLabel="pts" />
                  <StatCard label="EPA" value={(team as any)?.tba_epa != null ? Math.round(Number((team as any).tba_epa)) : (teamStats.epa ?? '—')} color="purple" icon={Activity} subLabel="expected points" />
                  <StatCard label="Normalized OPR" value={(team as any)?.normalized_opr != null ? Math.round(Number((team as any).normalized_opr) * 10) / 10 : (teamStats.endgame_epa ?? '—')} color="green" icon={Award} subLabel="opr per shooting second" />
                  <StatCard label="Consistency" value={teamStats.totalMatches > 0 ? `${teamStats.consistencyScore}%` : '—'} color="purple" icon={Activity} />
                  <StatCard label="Shuttle Rate" value={`${teamStats.shuttle_rate}%`} color="indigo" icon={Route} />
                  <StatCard label="Avg Shuttle/Return" value={teamStats.avg_shuttle_balls != null ? teamStats.avg_shuttle_balls : '—'} color="indigo" icon={Route} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Radar Chart Section */}
                  <Card className="lg:col-span-5 glass bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Performance Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={teamStats.radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                          <PolarRadiusAxis type="number" angle={30} domain={[0, 100]} allowDataOverflow={false} tick={false} stroke="none" />
                          <Radar
                            name={team.team_name}
                            dataKey="A"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.5}
                            isAnimationActive={true}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Trends Chart Section */}
                  <Card className="lg:col-span-7 glass bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Scoring Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={teamStats.trends} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="match" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 'auto']} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                            formatter={(value: number) => [value, 'Score']}
                            labelFormatter={(label) => `Match ${label}`}
                          />
                          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={true} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="font-medium">No match data yet</p>
                <p className="text-sm mt-1">Check Pit Scouting or Match History when data is available.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="outline-none">
            {teamStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass bg-white/5 border-white/10 overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">CLANK</h3>
                      <Badge variant="outline" className="bg-primary/10 text-primary">{teamStats.clank}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Climb Level Accuracy & No-Knockdown. Adjusted for speed: +2 for ≤3s, -2 for &gt;6s.
                    </p>
                    {teamStats.avg_climb_speed_sec != null && (
                      <p className="text-sm font-medium text-foreground">
                        Avg climb speed: <span className="text-primary">{teamStats.avg_climb_speed_sec}s</span>
                      </p>
                    )}
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (teamStats.clank / 30) * 100)}%` }} />
                    </div>
                  </div>
                </Card>

                <Card className="glass bg-white/5 border-white/10 overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">RPMAGIC</h3>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">{teamStats.rpmagic}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ranking Points — Match Advantage Generated In Cycles. Marginal probability of earning RP.
                    </p>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${teamStats.rpmagic * 100}%` }} />
                    </div>
                  </div>
                </Card>

                <Card className="glass bg-white/5 border-white/10 overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">GOBLIN</h3>
                      <Badge variant="outline" className={cn(teamStats.goblin >= 0 ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500")}>
                        {teamStats.goblin >= 0 ? `+${teamStats.goblin}` : teamStats.goblin}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Game Outcome Boost from Luck, In Numbers. Positive = luckier than expected.
                    </p>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, Math.abs(teamStats.goblin) * 5)}%` }} />
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <p>No match data — advanced metrics require match history.</p>
              </div>
            )}
          </TabsContent>

          {(user || pitData) && (
            <TabsContent value="pit" className="outline-none">
              {pitData ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-4">
                    <Card className="glass bg-white/5 border-white/10 overflow-hidden p-1">
                      <button
                        type="button"
                        onClick={() => setFullScreenImageUrl(robotImageUrl)}
                        className="aspect-[4/3] rounded-lg overflow-hidden relative group block w-full text-left"
                      >
                        <img
                          src={robotImageUrl || '/placeholder-robot.png'}
                          alt={team?.team_name ?? 'Robot'}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                    </Card>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">{pitData.robot_name || 'Generic Bot'}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {pitData.drive_type && <Badge className="bg-primary/20 text-primary border-primary/20">{pitData.drive_type}</Badge>}
                        {(pitData.weight != null && pitData.weight > 0) && <Badge variant="outline" className="border-white/10">{pitData.weight} lbs</Badge>}
                        {(pitData.overall_rating != null && pitData.overall_rating > 0) && <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">★ {pitData.overall_rating}/10</Badge>}
                        {pitDriveTrainMerged && getPitBallHoldAmount(pitDriveTrainMerged) != null && (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            {formatPitBallCapacity(pitDriveTrainMerged)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                          <Wrench className="w-4 h-4" /> Drivetrain
                        </h4>
                        <div className="glass-card p-4 rounded-xl space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Type</span>
                            <span className="font-bold">{pitData.drive_type}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dimensions</span>
                            <span className="font-bold">
                              {pitData.robot_dimensions?.length != null || pitData.robot_dimensions?.width != null || pitData.robot_dimensions?.height != null
                                ? (pitData.robot_dimensions?.length ?? '?') + '"×' + (pitData.robot_dimensions?.width ?? '?') + '"×' + (pitData.robot_dimensions?.height ?? '?') + '"'
                                : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Motor Count</span>
                            <span className="font-bold">
                              {pitDriveTrainMerged?.drive_camps ??
                                pitDriveTrainMerged?.motor_count ??
                                pitData.drive_train_details?.drive_camps ??
                                (pitData.drive_train_details as { motor_count?: number })?.motor_count ??
                                '—'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Ball capacity</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {pitDriveTrainMerged ? formatPitBallCapacity(pitDriveTrainMerged) : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                          <Zap className="w-4 h-4" /> Autonomous
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {pitData.autonomous_capabilities?.map((cap: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-white/5 border-white/10">{cap}</Badge>
                          )) || <span className="text-muted-foreground text-sm italic">None documented</span>}
                        </div>
                        {pitData.auto_fuel_count != null && pitData.auto_fuel_count > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Auto Fuel Scored</span>
                            <span className="font-bold text-orange-400">{pitData.auto_fuel_count}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                          <Target className="w-4 h-4" /> Teleop
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {pitData.teleop_capabilities?.map((cap: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-white/5 border-white/10">{cap}</Badge>
                          )) || <span className="text-muted-foreground text-sm italic">None documented</span>}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                          <Award className="w-4 h-4" /> Endgame
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {pitData.endgame_capabilities?.map((cap: string, i: number) => (
                            <Badge key={i} variant="secondary" className="bg-white/5 border-white/10">{cap}</Badge>
                          )) || <span className="text-muted-foreground text-sm italic">None documented</span>}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" /> Other
                        </h4>
                        <div className="glass-card p-4 rounded-xl space-y-2">
                          {(pitData.programming_language != null && pitData.programming_language !== '') && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Programming</span>
                              <span className="font-bold">{pitData.programming_language}</span>
                            </div>
                          )}
                          {(pitData.overall_rating != null && pitData.overall_rating > 0) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Overall rating</span>
                              <span className="font-bold">{pitData.overall_rating}/10</span>
                            </div>
                          )}
                          {(pitData.drive_teams_count != null && pitData.drive_teams_count > 0) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Drive teams</span>
                              <span className="font-bold">{pitData.drive_teams_count}</span>
                            </div>
                          )}
                          {(pitData.camera_count != null && pitData.camera_count > 0) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Cameras</span>
                              <span className="font-bold">{pitData.camera_count}</span>
                            </div>
                          )}
                          {(pitData.shooting_locations_count != null && pitData.shooting_locations_count > 0) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Shooting locations count</span>
                              <span className="font-bold">{pitData.shooting_locations_count}</span>
                            </div>
                          )}
                          {(pitData.climb_location != null && String(pitData.climb_location).trim() !== '') && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Climb location</span>
                              <span className="font-bold">{pitData.climb_location}</span>
                            </div>
                          )}
                          {pitData.can_autoalign === true && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Can auto-align</span>
                              <span className="font-bold">Yes</span>
                            </div>
                          )}
                          {Array.isArray(pitData.shooting_locations) && pitData.shooting_locations.length > 0 && (
                            <div className="text-sm pt-2 border-t border-white/5">
                              <span className="text-muted-foreground block mb-1">Shooting locations</span>
                              <div className="flex flex-wrap gap-1.5">
                                {pitData.shooting_locations.filter((s: unknown) => typeof s === 'string' && (s as string).trim()).map((loc: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="font-normal text-xs">{loc.trim()}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {(pitData.submitted_by_name || pitData.submitted_at) && (
                            <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                              <span className="text-muted-foreground">Scouted by</span>
                              <span className="font-medium text-foreground/90">
                                {pitData.submitted_by_name || '—'}
                                {pitData.submitted_at ? ' · ' + new Date(pitData.submitted_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {pitData.annotated_image_url && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                          <Route className="w-4 h-4" /> Auto Paths
                        </h4>
                        <Card className="glass-card overflow-hidden border-white/10">
                          <img
                            src={pitData.annotated_image_url}
                            alt="Annotated auto paths"
                            className="w-full h-auto object-contain max-h-80"
                          />
                          {pitData.auto_paths && pitData.auto_paths.length > 0 && (
                            <div className="p-4 space-y-2 border-t border-white/5">
                              {pitData.auto_paths.map((p: { id: string; comment: string; color: string }, i: number) =>
                                p.comment ? (
                                  <div key={p.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                    <span className="text-muted-foreground">Path {i + 1}:</span>
                                    <span>{p.comment}</span>
                                  </div>
                                ) : null
                              )}
                            </div>
                          )}
                        </Card>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Pit Scout Notes
                      </h4>
                      <Card className="glass-card p-6 bg-white/5 border-white/10">
                        <p className="text-muted-foreground text-sm italic leading-relaxed whitespace-pre-wrap">
                          {pitData.notes || 'No notes provided by the scout.'}
                        </p>
                      </Card>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="py-20 text-center glass-card rounded-2xl border-dashed border-2 border-white/5">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">No Pit Scouting Data</h3>
                  <p className="text-muted-foreground text-sm">Data for this team hasn't been collected in the pits yet.</p>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="matches" className="outline-none space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                <Database className="w-5 h-5 text-primary" /> RECORDED MATCHES
              </h2>
              <Badge variant="outline" className="opacity-60">{scoutingData.length} records</Badge>
            </div>

            {scoutingData.length > 0 ? (
              <div className="space-y-4">
                {scoutingData.map((data, index) => {
                  const climb = getClimbAchieved(data.notes);

                  return (
                    <motion.div
                      key={data.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => {
                        if (selectedMatch === data.id) {
                          if (matchDetailPushedRef.current) {
                            window.history.back();
                          } else {
                            setSelectedMatch(null);
                          }
                        } else {
                          setSelectedMatch(data.id);
                        }
                      }}
                      className={cn(
                        "group glass rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
                        selectedMatch === data.id
                          ? "bg-primary/[0.07] border-primary/30 ring-1 ring-primary/20"
                          : "bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10"
                      )}
                    >
                      <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center gap-6">
                        {/* Match ID / Type Block */}
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/20 h-16 w-16 rounded-2xl flex flex-col items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:scale-105 transition-transform">
                            <span className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mb-1">Match</span>
                            <span className="text-2xl font-black text-primary leading-none">{getMatchLabel(data.match_id)}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                "px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border-none",
                                data.alliance_color === 'red' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                              )}>
                                {data.alliance_color} alliance
                              </Badge>
                              <span className="text-[10px] text-muted-foreground/40">•</span>
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                {data.submitted_by_name || 'Anonymous'}
                              </span>
                            </div>
                            <div className="text-2xl font-black text-foreground flex items-baseline gap-1.5">
                              {data.final_score}
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">points</span>
                            </div>
                            <div className="text-[10px] text-primary font-semibold uppercase tracking-widest">
                              Scouted Match Score
                            </div>
                          </div>
                        </div>

                        {/* Scoring Summary Chips */}
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                          <div className="text-center sm:text-left sm:pl-2">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Autonomous</p>
                            <p className="text-lg font-black">{data.autonomous_points}</p>
                          </div>
                          <div className="text-center sm:text-left sm:pl-2 border-l border-white/5">
                            <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Teleop</p>
                            <p className="text-lg font-black">{data.teleop_points}</p>
                          </div>
                          <div className="text-center sm:text-left sm:pl-2 border-l border-white/5">
                            <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-0.5">Climb</p>
                            <p className="text-lg font-black">{climb?.label || '—'}</p>
                          </div>
                          <div className="text-center sm:text-left sm:pl-2 border-l border-white/5">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Reliability</p>
                            <p className={cn("text-lg font-black", data.broke ? "text-red-500" : "text-foreground")}>
                              {data.broke ? 'BROKE' : '100%'}
                            </p>
                          </div>
                        </div>

                        <div className="hidden md:block">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "rounded-full w-10 h-10 p-0 transition-transform",
                              selectedMatch === data.id && "rotate-180 text-primary bg-primary/10"
                            )}
                          >
                            <Target className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {selectedMatch === data.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="border-t border-white/5 bg-black/40 overflow-hidden"
                          >
                            <div className="p-6 space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="h-1 w-4 bg-primary rounded-full" />
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Scout Observations</h4>
                                  </div>
                                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-sm italic text-foreground/80 leading-relaxed relative">
                                    <MessageSquare className="absolute -top-2 -left-2 w-8 h-8 text-white/5 -z-10" />
                                    "{data.comments || "No specific comments recorded for this match."}"
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="h-1 w-4 bg-primary rounded-full" />
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Live Performance</h4>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Active Uptime</p>
                                      <p className="text-xl font-black text-foreground">{getUptimePct(data.average_downtime) || 0}%</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Defense Impact</p>
                                      <p className="text-xl font-black text-foreground">{data.defense_rating}/10</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-1 w-4 bg-primary rounded-full" />
                                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Shooting attempts (range + time per attempt)</h4>
                                </div>
                                <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-4">
                                  <ScoutingRunsBreakdown notes={data.notes} shuttleRow={data} />
                                </div>
                                <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-4">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Scouted vs Statbotics score</h4>
                                    <span className={cn('text-[10px] font-semibold uppercase', data.alliance_finalized ? 'text-green-400' : 'text-amber-400')}>
                                      {data.alliance_finalized ? 'Finalized' : 'Provisional'}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-foreground">
                                    Scouted {data.scouted_score_rounded ?? '—'} · Statbotics {data.statbotics_expected_score_rounded ?? '—'}
                                    {data.score_delta != null && (
                                      <span className={cn('ml-2 font-semibold', data.score_delta >= 0 ? 'text-green-400' : 'text-red-400')}>
                                        Δ {data.score_delta}
                                      </span>
                                    )}
                                  </p>
                                  {!data.alliance_finalized && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Finalized only after all 3 teams on this alliance in this match are scouted.
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="h-1 w-4 bg-primary rounded-full" />
                                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Full Scoring Breakdown</h4>
                                </div>
                                <div className="bg-white/[0.02] rounded-2xl border border-white/5">
                                  {renderScoringBreakdown(data.notes, data)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center glass-card rounded-2xl border-dashed border-2 border-white/5">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium">No Match Data</h3>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Full-screen image lightbox */}
      <AnimatePresence>
        {fullScreenImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setFullScreenImageUrl(null)}
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={() => setFullScreenImageUrl(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={fullScreenImageUrl}
              alt="Robot full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (inCompetitionContext) {
    return wrapWithCompetitionLayout(mainContent);
  }

  return user ? (
    <Layout>{mainContent}</Layout>
  ) : (
    <GuestLayout backLink={guestBackLink}>
      {mainContent}
    </GuestLayout>
  );
};

export default TeamDetail;
