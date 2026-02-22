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
  AlertCircle,
  BarChart3,
  TrendingUp,
  Target,
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

      setTeam(teamData);
      setScoutingData(scoutingDataResult || []);
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
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-10">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <Button
                onClick={() => {
                  // Try to close the window/tab
                  if (typeof window !== 'undefined') {
                    window.close();
                    // If window.close() doesn't work (e.g., page wasn't opened by script),
                    // navigate to home after a short delay
                    setTimeout(() => {
                      router.push('/');
                    }, 100);
                  }
                }}
                variant="ghost"
                size="sm"
                className="mb-4 text-muted-foreground hover:text-foreground pl-0 hover:bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground flex items-center gap-3">
                <span className="text-primary">{team.team_number}</span>
                <span className="text-muted-foreground/50 hidden md:inline">|</span>
                <span className="text-2xl md:text-4xl">{team.team_name}</span>
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Comprehensive performance analysis for FRC Season 2026 Rebuilt.
              </p>
            </div>
          </motion.div>

          {/* Stats Overview Grid — REBUILT + EPA */}
          {teamStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                <StatCard label="Matches Scouted" value={teamStats.totalMatches} color="blue" icon={Database} />
                <StatCard label="EPA" value={teamStats.epa} color="primary" icon={TrendingUp} subLabel="Expected Pts" />
                <StatCard label="AVG AUTO" value={teamStats.avg_auto_fuel} color="blue" icon={Clock} subLabel="fuel" />
                <StatCard label="AVG TELEOP" value={teamStats.avg_teleop_fuel} color="orange" icon={Zap} subLabel="fuel" />
                <StatCard label="AVG CLIMB" value={teamStats.avg_climb_pts} color="green" icon={Award} subLabel="pts" />
                <StatCard label="Defense" value={teamStats.avgDefense} color="red" icon={Shield} subLabel="/10" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                <StatCard label="AVG UPTIME" value={teamStats.avg_uptime_pct != null ? `${teamStats.avg_uptime_pct}%` : '—'} color="green" icon={Activity} />
                <StatCard label="AVG DOWNTIME" value={teamStats.avg_downtime_sec != null ? `${teamStats.avg_downtime_sec}s` : '—'} color="red" icon={Clock} />
                <StatCard label="BROKE" value={`${teamStats.broke_count}/${teamStats.totalMatches}`} color="red" icon={AlertCircle} subLabel={teamStats.broke_rate ? `${teamStats.broke_rate}%` : ''} />
                <StatCard label="CLANK" value={teamStats.clank} color="purple" icon={Award} subLabel="climb %" />
                <StatCard label="RPMAGIC" value={teamStats.rpmagic} color="primary" icon={BarChart3} subLabel="RP potential" />
                <StatCard label="GOBLIN" value={teamStats.goblin} color="purple" icon={Target} subLabel="consistency" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="glass-card p-4 rounded-xl flex flex-col justify-center items-center text-center border border-white/5 min-w-[120px]">
                  <div className="text-xs text-green-400 font-mono">BEST: {teamStats.bestScore}</div>
                  <div className="w-full h-px bg-white/10 my-1" />
                  <div className="text-xs text-red-400 font-mono">WORST: {teamStats.worstScore}</div>
                </div>
              </div>

              {/* REBUILT KPIs: CLANK, RPMAGIC, GOBLIN with explanations */}
              <div className="rounded-xl border border-white/10 bg-card/50 p-4 sm:p-6 space-y-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">REBUILT advanced metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-white/5 bg-white/5 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">CLANK</span>
                      <span className="text-2xl font-bold tabular-nums text-primary">{teamStats.clank}</span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Climb Level Accuracy & No-Knockdown</p>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                      Climb pts adjusted for speed: +2 for ≤3s, -2 for &gt;6s. Pure avg climb pts (no time = no adjustment).
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">RPMAGIC</span>
                      <span className="text-2xl font-bold tabular-nums text-primary">{teamStats.rpmagic.toFixed(3)}</span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Ranking Points — Match Advantage Generated In Cycles</p>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                      Marginal probability of earning an RP attributable to this team&apos;s scoring contribution per match.
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-white/5 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">GOBLIN</span>
                      <span className={cn("text-2xl font-bold tabular-nums", teamStats.goblin >= 0 ? "text-green-500" : "text-red-500")}>
                        {teamStats.goblin >= 0 ? `+${teamStats.goblin}` : teamStats.goblin}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Game Outcome Boost from Luck, In Numbers</p>
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                      Difference between actual match margin and expected margin based on scouted performance. Positive = luckier than expected.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Match History List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Match History
              </h2>
              <Badge variant="outline" className="border-white/10 bg-white/5">
                {scoutingData.length} Records
              </Badge>
            </div>

            {scoutingData.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl text-center border-dashed border-2 border-white/10">
                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No Match Data Yet</h3>
                <p className="text-muted-foreground mt-1">Start scouting matches to populate this data.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {scoutingData.map((data, index) => (
                  <motion.div
                    key={data.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (index * 0.05) }}
                    className="glass-card rounded-xl overflow-hidden border border-white/5 hover:border-primary/20 transition-all group"
                  >
                    {/* Match Header Summary */}
                    <div
                      className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                      onClick={() => setSelectedMatch(selectedMatch === data.id ? null : data.id)}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-left">Match</span>
                          <span className="text-xl font-bold font-mono text-foreground">#{data.match_id}</span>
                        </div>

                        <div className="h-8 w-px bg-white/10 hidden md:block mx-2" />

                        <Badge
                          className={cn(
                            "uppercase text-[10px] tracking-widest px-2 py-1",
                            data.alliance_color === 'red'
                              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                          )}
                        >
                          {data.alliance_color} Alliance
                        </Badge>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                          <User className="w-3 h-3" />
                          <span>{data.submitted_by_name || 'Anonymous'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                        <div className="grid grid-cols-4 gap-4 sm:gap-6 text-center">
                          <div>
                            <div className="text-xs text-muted-foreground uppercase">Auto</div>
                            <div className="font-bold text-blue-400">{data.autonomous_points ?? 0}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase">Tele</div>
                            <div className="font-bold text-orange-400">{data.teleop_points ?? 0}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase">Climb</div>
                            <div className="font-bold text-green-400">
                              {(() => {
                                const c = getClimbAchieved(data.notes);
                                return c ? `${c.label} (${c.points})` : '—';
                              })()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase">Broke</div>
                            <div className="font-bold">{data.broke ? 'Yes' : 'No'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
                            <div className="text-2xl font-bold text-primary leading-none">{data.final_score}</div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full md:hidden">
                            {selectedMatch === data.id ? <XCircle className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Dropdown */}
                    <AnimatePresence>
                      {selectedMatch === data.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-black/20 border-t border-white/5"
                        >
                          <div className="p-4 md:p-6">
                            {/* Match reliability: downtime, uptime, broke */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block">Downtime</span>
                                <span className="text-sm font-bold">{data.average_downtime != null ? `${Number(data.average_downtime)}s` : '—'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block">Uptime</span>
                                <span className="text-sm font-bold">{getUptimePct(data.average_downtime ?? null) != null ? `${getUptimePct(data.average_downtime ?? null)}%` : '—'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block">Broke</span>
                                <span className="text-sm font-bold">{data.broke ? 'Yes' : 'No'}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block">Climb</span>
                                <span className="text-sm font-bold">
                                  {(() => { const c = getClimbAchieved(data.notes); return c ? `${c.label} (${c.points} pts)` : 'None'; })()}
                                </span>
                              </div>
                            </div>

                            {/* Defense & Comments Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div className="glass-card p-4 rounded-lg bg-white/5">
                                <span className="text-xs text-muted-foreground flex items-center gap-2 mb-2 uppercase tracking-wide">
                                  <Shield className="w-3 h-3" /> Defense Rating
                                </span>
                                <div className="flex items-center gap-1">
                                  {[...Array(10)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "h-2 flex-1 rounded-full transition-all",
                                        i < (data.defense_rating || 0) ? "bg-red-500" : "bg-white/10"
                                      )}
                                    />
                                  ))}
                                  <span className="ml-2 text-sm font-bold text-white">{data.defense_rating}/10</span>
                                </div>
                              </div>

                              {data.comments && (
                                <div className="glass-card p-4 rounded-lg bg-white/5">
                                  <span className="text-xs text-muted-foreground flex items-center gap-2 mb-2 uppercase tracking-wide">
                                    <MessageSquare className="w-3 h-3" /> Scout Comments
                                  </span>
                                  <p className="text-sm italic text-foreground/80 leading-relaxed">"{data.comments}"</p>
                                </div>
                              )}
                            </div>

                            {/* Full Scoring Breakdown */}
                            {data.notes && (
                              <div>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest border-b border-white/5 pb-2 mb-4">
                                  Detailed Score Breakdown
                                </h4>
                                {renderScoringBreakdown(data.notes)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default TeamDetail;
