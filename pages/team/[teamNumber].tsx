import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import GuestLayout from '@/components/layout/GuestLayout';
import { ScoutingData, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  computeRebuiltMetrics,
  getClimbAchieved,
  getAutoFuelCount,
  getTeleopFuelCount,
  getUptimePct,
  parseNotes,
} from '@/lib/analytics';
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
  const { supabase, user } = useSupabase();

  const [team, setTeam] = useState<Team | null>(null);
  const [scoutingData, setScoutingData] = useState<ScoutingData[]>([]);
  const [pitData, setPitData] = useState<PitScoutingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

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
    if (teamNumber) {
      loadTeamData();
    }
  }, [teamNumber, user, router.query.competition_id, router.query.event_key]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamNum = parseInt(teamNumber as string);
      if (!teamNum) return;

      const competitionId = router.query.competition_id as string | undefined;
      const eventKey = router.query.event_key as string | undefined;

      // When coming from view-data (competition or event context), load that competition's data and filter by team
      if (!user && (competitionId || eventKey)) {
        const params = eventKey
          ? `event_key=${encodeURIComponent(eventKey)}`
          : `id=${encodeURIComponent(competitionId!)}`;
        const res = await fetch(`/api/past-competitions?${params}`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        const teamsList = data.teams || [];
        const allScouting = data.scoutingData || [];
        const teamScouting = allScouting.filter((r: any) => r.team_number === teamNum);
        const teamInfo = teamsList.find((t: any) => t.team_number === teamNum);
        const pitList = data.pitScoutingData || [];
        const teamPit = pitList.find((p: any) => p.team_number === teamNum) || null;
        setTeam(teamInfo ? { ...teamInfo } : { team_number: teamNum, team_name: `Team ${teamNum}` });
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
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTeam(data.team);
        setScoutingData(data.scoutingData || []);
        setPitData(data.pitData || null);
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

      const { data: pitDataResult, error: pitError } = await supabase
        .from('pit_scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .maybeSingle();

      setTeam(teamData);
      setScoutingData(scoutingDataResult || []);
      setPitData(pitDataResult);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamStats = () => {
    if (scoutingData.length === 0) return null;

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

    const avgDefense = scoutingData.reduce((sum, data) => sum + (data.defense_rating || 0), 0) / totalMatches;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    return {
      totalMatches,
      avgAutonomous: scoutingData.reduce((sum, d) => sum + (d.autonomous_points || 0), 0) / totalMatches,
      avgTeleop: scoutingData.reduce((sum, d) => sum + (d.teleop_points || 0), 0) / totalMatches,
      avgTotal: Math.round(avgTotal * 10) / 10,
      avgDefense: Math.round(avgDefense * 10) / 10,
      bestScore,
      worstScore,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
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
      epa: Math.round(avgTotal * 10) / 10, // Expected Points Added = avg score

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
        }))
    };
  };

  const renderScoringBreakdown = (notes: any) => {
    const p = parseNotes(notes);
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
              <BreakdownItem label="AUTO CLIMB L1" value={p.autonomous.auto_tower_level1 ? 'Yes' : 'No'} points={15} />
            </div>
          </div>

          {/* Teleop */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Teleop
            </h4>
            <div className="space-y-2">
              <BreakdownItem label="FUEL (game pieces)" value={teleopFuel} points={1} />
              {climb && <BreakdownItem label="TOWER CLIMB" value={climb.label} points={climb.points} />}
            </div>
          </div>

          {/* Climb — one per robot */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Award className="w-4 h-4" /> Climb
            </h4>
            <div className="space-y-2">
              {climb ? (
                <BreakdownItem label={`Climb ${climb.label}`} value={climb.label} points={climb.points} />
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

  const backUrl = router.query.competition_id
    ? `/view-data?id=${router.query.competition_id}`
    : router.query.event_key
      ? `/view-data?event_key=${encodeURIComponent(router.query.event_key as string)}`
      : null;
  const guestBackLink = backUrl
    ? { href: backUrl, label: 'Back to Data' }
    : { href: '/competition-history', label: 'Back to Competition History' };

  if (loading) {
    return user ? (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    ) : (
      <GuestLayout backLink={guestBackLink}>
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </GuestLayout>
    );
  }

  if (!team) {
    return user ? (
      <Layout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 glass-card rounded-2xl mx-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">Team Not Found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">The requested team number could not be found in our database.</p>
          <Button onClick={() => router.push(backUrl || '/competition-history')} variant="outline" className="border-white/10 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </Layout>
    ) : (
      <GuestLayout backLink={guestBackLink}>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 glass-card rounded-2xl mx-4 min-h-[50vh]">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">Team Not Found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">The requested team number could not be found in our database.</p>
          <Button onClick={() => router.push(backUrl || '/competition-history')} variant="outline" className="border-white/10 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </GuestLayout>
    );
  }

  const mainContent = (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-10 px-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-2">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Team Analysis</Badge>
            <span>•</span>
            <span className="font-mono">Season 2026</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-black tracking-tight text-foreground flex items-baseline gap-4">
            <span className="text-primary">{team.team_number}</span>
            <span className="text-2xl md:text-4xl font-bold opacity-90">{team.team_name}</span>
          </h1>
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
          <Tabs defaultValue="overview" className="w-full">
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
                {user && (
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
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    <StatCard label="Avg Scored" value={teamStats.avgTotal} color="primary" icon={TrendingUp} subLabel="points/match" />
                    <StatCard label="Matches" value={teamStats.totalMatches} color="blue" icon={Database} subLabel="scouted" />
                    <StatCard label="Avg Auto" value={teamStats.avg_auto_fuel} color="blue" icon={Clock} subLabel="fuel" />
                    <StatCard label="Avg Teleop" value={teamStats.avg_teleop_fuel} color="orange" icon={Zap} subLabel="fuel" />
                    <StatCard label="Avg Climb" value={teamStats.avg_climb_pts} color="green" icon={Award} subLabel="pts" />
                    <StatCard label="Consistency" value={`${teamStats.consistencyScore}%`} color="purple" icon={Activity} />
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
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">{teamStats.rpmagic.toFixed(3)}</Badge>
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

            {user && (
            <TabsContent value="pit" className="outline-none">
              {pitData ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-4">
                    <Card className="glass bg-white/5 border-white/10 overflow-hidden p-1">
                      <div className="aspect-[4/3] rounded-lg overflow-hidden relative group">
                        <img
                          src={pitData.photos?.[0] || pitData.robot_image_url || '/placeholder-robot.png'}
                          alt={team.team_name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    </Card>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">{pitData.robot_name || 'Generic Bot'}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/20">{pitData.drive_type}</Badge>
                        <Badge variant="outline" className="border-white/10">{pitData.weight} lbs</Badge>
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
                            <span className="font-bold">{pitData.robot_dimensions?.length}"x{pitData.robot_dimensions?.width}"x{pitData.robot_dimensions?.height}"</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Motor Count</span>
                            <span className="font-bold">{pitData.drive_train_details?.drive_camps || '—'}</span>
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
                          "{pitData.notes || 'No notes provided by the scout.'}"
                        </p>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-green-400 uppercase">Strengths</h4>
                        <ul className="space-y-2">
                          {pitData.strengths?.map((s: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-green-500" /> {s}
                            </li>
                          )) || <span className="text-muted-foreground text-sm">Nothing noted</span>}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-red-400 uppercase">Weaknesses</h4>
                        <ul className="space-y-2">
                          {pitData.weaknesses?.map((w: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <XCircle className="w-4 h-4 text-red-500" /> {w}
                            </li>
                          )) || <span className="text-muted-foreground text-sm">Nothing noted</span>}
                        </ul>
                      </div>
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
                        onClick={() => setSelectedMatch(selectedMatch === data.id ? null : data.id)}
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
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Full Scoring Breakdown</h4>
                                  </div>
                                  <div className="bg-white/[0.02] rounded-2xl border border-white/5">
                                    {renderScoringBreakdown(data.notes)}
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
      </div>
  );

  return user ? (
    <Layout>{mainContent}</Layout>
  ) : (
    <GuestLayout backLink={guestBackLink}>
      {mainContent}
    </GuestLayout>
  );
};

export default TeamDetail;
