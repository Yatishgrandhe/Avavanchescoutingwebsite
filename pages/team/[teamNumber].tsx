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
  Target
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ScoutingData, Team, ScoringNotes } from '@/lib/types';
import { cn } from '@/lib/utils';

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
    const avgAutonomous = scoutingData.reduce((sum, data) => sum + (data.autonomous_points || 0), 0) / totalMatches;
    const avgTeleop = scoutingData.reduce((sum, data) => sum + (data.teleop_points || 0), 0) / totalMatches;
    const avgEndgame = 0; // endgame_points not in database schema
    const avgTotal = scoutingData.reduce((sum, data) => sum + (data.final_score || 0), 0) / totalMatches;
    const avgDefense = scoutingData.reduce((sum, data) => sum + (data.defense_rating || 0), 0) / totalMatches;

    const bestScore = Math.max(...scoutingData.map(data => data.final_score || 0));
    const worstScore = Math.min(...scoutingData.map(data => data.final_score || 0));

    // Calculate consistency
    const scores = scoutingData.map(data => data.final_score || 0);
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgTotal, 2), 0) / totalMatches;
    const standardDeviation = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (standardDeviation / avgTotal) * 100);

    return {
      totalMatches,
      avgAutonomous: Math.round(avgAutonomous * 10),
      avgTeleop: Math.round(avgTeleop * 10),
      avgEndgame: Math.round(avgEndgame * 10),
      avgTotal: Math.round(avgTotal * 10) / 10,
      avgDefense: Math.round(avgDefense * 10) / 10,
      bestScore,
      worstScore,
      consistencyScore: Math.round(consistencyScore)
    };
  };

  const renderScoringBreakdown = (notes: any) => {
    // Handle both flat and nested note structures
    const getValue = (path: string) => {
      if (notes && typeof notes === 'object') {
        if (notes.autonomous || notes.teleop) {
          // Nested structure
          if (path.startsWith('auto_')) return notes.autonomous?.[path];
          if (path.startsWith('teleop_')) return notes.teleop?.[path];
        }
        // Flat structure
        return notes[path];
      }
      return undefined;
    };

    const scoringElements = [
      // Autonomous (First 20 seconds)
      { label: 'FUEL in Active HUB', value: getValue('auto_fuel_active_hub'), points: 1, period: 'Autonomous' },
      { label: 'TOWER LEVEL 1 Climb', value: getValue('auto_tower_level1'), points: 15, period: 'Autonomous', isBoolean: true },

      // Teleop (Last 2:20)
      { label: 'FUEL in Active HUB', value: getValue('teleop_fuel_active_hub'), points: 1, period: 'Teleop' },
      { label: 'TOWER LEVEL 1', value: getValue('teleop_tower_level1'), points: 10, period: 'Teleop', isBoolean: true },
      { label: 'TOWER LEVEL 2', value: getValue('teleop_tower_level2'), points: 20, period: 'Teleop', isBoolean: true },
      { label: 'TOWER LEVEL 3', value: getValue('teleop_tower_level3'), points: 30, period: 'Teleop', isBoolean: true },

      // Endgame (Last 30 seconds)
      { label: 'FUEL in HUB', value: getValue('endgame_fuel'), points: 1, period: 'Endgame' },
    ];

    const autonomousElements = scoringElements.filter(el => el.period === 'Autonomous');
    const teleopElements = scoringElements.filter(el => el.period === 'Teleop');
    const endgameElements = scoringElements.filter(el => el.period === 'Endgame');

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {/* Autonomous Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Autonomous
          </h4>
          <div className="space-y-2">
            {autonomousElements.map((el, i) => <BreakdownItem key={i} {...el} />)}
          </div>
        </div>

        {/* Teleop Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Teleop
          </h4>
          <div className="space-y-2">
            {teleopElements.map((el, i) => <BreakdownItem key={i} {...el} />)}
          </div>
        </div>

        {/* Endgame Column */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Award className="w-4 h-4" /> Endgame
          </h4>
          <div className="space-y-2">
            {endgameElements.map((el, i) => <BreakdownItem key={i} {...el} />)}
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

          {/* Stats Overview Grid */}
          {teamStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4"
            >
              <StatCard label="Matches" value={teamStats.totalMatches} color="blue" icon={Database} />
              <StatCard label="Avg Score" value={teamStats.avgTotal} color="primary" icon={BarChart3} />
              <StatCard label="Auto Avg" value={teamStats.avgAutonomous} color="blue" icon={Clock} />
              <StatCard label="Teleop Avg" value={teamStats.avgTeleop} color="orange" icon={Zap} />
              <StatCard label="Endgame Avg" value={teamStats.avgEndgame} color="green" icon={Award} />
              <StatCard label="Defense" value={teamStats.avgDefense} color="red" icon={Shield} subLabel="OUT OF 10" />
              <StatCard label="Consistency" value={`${teamStats.consistencyScore}%`} color="purple" icon={Activity} />
              <div className="glass-card p-4 rounded-xl flex flex-col justify-center items-center text-center border border-white/5 space-y-2">
                <div className="text-xs text-green-400 font-mono">BEST: {teamStats.bestScore}</div>
                <div className="w-full h-px bg-white/10" />
                <div className="text-xs text-red-400 font-mono">WORST: {teamStats.worstScore}</div>
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
                        <div className="grid grid-cols-3 gap-6 text-center">
                          <div>
                            <div className="text-xs text-muted-foreground uppercase">Auto</div>
                            <div className="font-bold text-blue-400">{data.autonomous_points}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase">Tele</div>
                            <div className="font-bold text-orange-400">{data.teleop_points}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground uppercase">End</div>
                            <div className="font-bold text-green-400">0</div>
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
