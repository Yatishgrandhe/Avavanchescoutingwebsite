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
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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

  useEffect(() => {
    if (teamNumber) {
      loadTeamData();
    }
  }, [teamNumber]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamNum = parseInt(teamNumber as string);

      // Load team information
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', teamNum)
        .single();

      if (teamError) throw teamError;

      // Load all scouting data for this team
      const { data: scoutingDataResult, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .order('created_at', { ascending: false });

      if (scoutingError) throw scoutingError;

      // Load pit scouting data
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
    }));
    const rebuilt = computeRebuiltMetrics(rows);

    const avgTotal = scoutingData.reduce((sum, data) => sum + (data.final_score || 0), 0) / totalMatches;
    const avgDefense = scoutingData.reduce((sum, data) => sum + (data.defense_rating || 0), 0) / totalMatches;
    const bestScore = Math.max(...scoutingData.map(data => data.final_score || 0));
    const worstScore = Math.min(...scoutingData.map(data => data.final_score || 0));

    return {
      totalMatches,
      avgAutonomous: scoutingData.reduce((sum, d) => sum + (d.autonomous_points || 0), 0) / totalMatches,
      avgTeleop: scoutingData.reduce((sum, d) => sum + (d.teleop_points || 0), 0) / totalMatches,
      avgTotal: Math.round(avgTotal * 10) / 10,
      avgDefense: Math.round(avgDefense * 10) / 10,
      bestScore,
      worstScore,
      consistencyScore: Math.round(rebuilt.goblin),
      // REBUILT + EPA
      avg_auto_fuel: rebuilt.avg_auto_fuel,
      avg_teleop_fuel: rebuilt.avg_teleop_fuel,
      avg_climb_pts: rebuilt.avg_climb_pts,
      avg_uptime_pct: rebuilt.avg_uptime_pct,
      avg_downtime_sec: rebuilt.avg_downtime_sec,
      broke_count: rebuilt.broke_count,
      broke_rate: rebuilt.broke_rate,
      clank: rebuilt.clank,
      rpmagic: rebuilt.rpmagic,
      goblin: rebuilt.goblin,
      epa: Math.round(avgTotal * 10) / 10, // Expected Points Added = avg score

      // Data for Radar Chart
      radarData: [
        { subject: 'Reliability', A: Math.max(0, 100 - (rebuilt.broke_rate || 0)), fullMark: 100 },
        { subject: 'Teleop', A: Math.min(100, (rebuilt.avg_teleop_fuel / 40) * 100), fullMark: 100 },
        { subject: 'Climb', A: Math.min(100, (rebuilt.avg_climb_pts / 30) * 100), fullMark: 100 },
        { subject: 'Uptime', A: rebuilt.avg_uptime_pct || 0, fullMark: 100 },
        { subject: 'Consistency', A: Math.min(100, Math.max(0, 100 - Math.abs(rebuilt.goblin) * 10)), fullMark: 100 },
      ],

      // Trends for Line Chart
      trends: scoutingData.map(d => ({
        match: `#${d.match_id}`,
        score: d.final_score,
        tele: d.teleop_points,
        auto: d.autonomous_points
      })).reverse()
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
            </div>
          </div>

          {/* Teleop */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Teleop
            </h4>
            <div className="space-y-2">
              <BreakdownItem label="FUEL (game pieces)" value={teleopFuel} points={1} />
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

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!team) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 glass-card rounded-2xl mx-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Team Not Found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">The requested team number could not be found in our database.</p>
            <Button onClick={() => router.push('/analysis/data')} variant="outline" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Analysis
            </Button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/analysis/data')}
                className="glass border-white/10"
              >
                Switch Team
              </Button>
              <Button size="sm" className="shadow-lg shadow-primary/20">
                Compare
              </Button>
            </div>
          </div>

          {teamStats && (
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
                  <TabsTrigger
                    value="pit"
                    className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
                  >
                    PIT DATA
                  </TabsTrigger>
                  <TabsTrigger
                    value="matches"
                    className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
                  >
                    MATCH HISTORY
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-6 outline-none">
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
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="none" />
                          <Radar
                            name={team.team_name}
                            dataKey="A"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.5}
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
                        <LineChart data={teamStats.trends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="match" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                          />
                          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="outline-none">
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
              </TabsContent>

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

              <TabsContent value="matches" className="outline-none space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                    <Database className="w-5 h-5 text-primary" /> RECORDED MATCHES
                  </h2>
                  <Badge variant="outline" className="opacity-60">{scoutingData.length} records</Badge>
                </div>

                {scoutingData.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4">
                    {scoutingData.map((data, index) => (
                      <motion.div
                        key={data.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedMatch(selectedMatch === data.id ? null : data.id)}
                        className={cn(
                          "glass border border-white/5 rounded-2xl overflow-hidden cursor-pointer transition-all hover:bg-white/[0.02]",
                          selectedMatch === data.id && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                        )}
                      >
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-white/5 h-12 w-12 rounded-xl flex flex-col items-center justify-center border border-white/10">
                              <span className="text-[10px] text-muted-foreground font-bold uppercase leading-none mb-1">MTCH</span>
                              <span className="text-lg font-black leading-none">{data.match_id}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn(
                                  "text-[10px] tracking-widest font-black uppercase",
                                  data.alliance_color === 'red' ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                                )}>
                                  {data.alliance_color}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                                  {data.submitted_by_name || 'Anonymous Scout'}
                                </span>
                              </div>
                              <div className="text-lg font-black text-foreground">
                                Total: <span className="text-primary">{data.final_score} pts</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4 flex-1 sm:max-w-xs text-center border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Auto</p>
                              <p className="font-bold text-blue-400">{data.autonomous_points}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Tele</p>
                              <p className="font-bold text-orange-400">{data.teleop_points}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Climb</p>
                              <p className="font-bold text-green-400">
                                {getClimbAchieved(data.notes)?.label || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Fail</p>
                              <p className={cn("font-bold", data.broke ? "text-red-500" : "text-muted-foreground opacity-30")}>
                                {data.broke ? 'YES' : 'NO'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {selectedMatch === data.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/5 bg-black/40"
                            >
                              <div className="p-4 sm:p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Scout Observations</h4>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-sm italic text-foreground/80 leading-relaxed">
                                      "{data.comments || "No specific comments recorded for this match."}"
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Performance Details</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Uptime</p>
                                        <p className="text-sm font-black">{getUptimePct(data.average_downtime) || 0}%</p>
                                      </div>
                                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Defense</p>
                                        <p className="text-sm font-black">{data.defense_rating}/10</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Scoring Breakdown</h4>
                                  {renderScoringBreakdown(data.notes)}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
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
      </Layout>
    </ProtectedRoute>
  );
};

export default TeamDetail;
