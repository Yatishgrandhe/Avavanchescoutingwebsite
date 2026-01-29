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
  Award,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  MapPin,
  Users,
  FileText,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ScoutingData, Team } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TeamHistoryProps { }

interface CompetitionData {
  competition_id: string;
  competition_name: string;
  competition_year: number;
  competition_key: string;
  scoutingData: ScoutingData[];
  pitScoutingData: any[];
  totalMatches: number;
  avgScore: number;
  bestScore: number;
  worstScore: number;
  consistency: number;
}

// Helper Components
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

const BreakdownItem = ({ label, value, points, isCleansing }: any) => (
  <div className={cn(
    "flex items-center justify-between p-2 rounded-lg border transition-all text-xs",
    isCleansing
      ? "bg-purple-500/5 border-purple-500/20"
      : "bg-card/30 border-white/5"
  )}>
    <span className={cn(
      "font-medium truncate mr-2",
      isCleansing ? "text-purple-400" : "text-muted-foreground"
    )}>{label}</span>
    <div className="flex items-center gap-2 flex-shrink-0">
      {typeof value === 'boolean' ? (
        value ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-destructive" />
      ) : (
        <span className="font-bold text-foreground">{value ?? 0}</span>
      )}

      {!isCleansing && (
        <Badge variant="outline" className="text-[10px] bg-background/50 border-white/10 px-1 py-0 h-5">
          {points}pts
        </Badge>
      )}
    </div>
  </div>
);

const TeamHistory: React.FC<TeamHistoryProps> = () => {
  const router = useRouter();
  const { teamNumber } = router.query;
  const { supabase, user } = useSupabase();

  const [team, setTeam] = useState<Team | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [overallStats, setOverallStats] = useState<any>(null);

  useEffect(() => {
    if (teamNumber) {
      loadTeamHistory();
    }
  }, [teamNumber]);

  const loadTeamHistory = async () => {
    try {
      setLoading(true);
      const teamNum = parseInt(teamNumber as string);

      // Load team information
      const { data: teamData, error: teamError } = await supabase
        .from('past_teams')
        .select('*')
        .eq('team_number', teamNum)
        .single();

      if (teamError) {
        // Fallback to current teams table
        const { data: currentTeamData, error: currentTeamError } = await supabase
          .from('teams')
          .select('*')
          .eq('team_number', teamNum)
          .single();

        if (currentTeamError) throw teamError;
        setTeam(currentTeamData);
      } else {
        setTeam(teamData);
      }

      // Load past competitions
      const { data: pastCompetitions, error: compError } = await supabase
        .from('past_competitions')
        .select('*')
        .order('competition_year', { ascending: false });

      if (compError) throw compError;

      const competitionsData: CompetitionData[] = [];

      for (const comp of pastCompetitions || []) {
        const { data: scoutingData, error: scoutingError } = await supabase
          .from('past_scouting_data')
          .select('*')
          .eq('team_number', teamNum)
          .eq('competition_id', comp.id);

        if (scoutingError) continue;

        const { data: pitScoutingData, error: pitError } = await supabase
          .from('past_pit_scouting_data')
          .select('*')
          .eq('team_number', teamNum)
          .eq('competition_id', comp.id);

        if (pitError) continue;

        if (scoutingData && scoutingData.length > 0) {
          const scores = scoutingData.map((d: ScoutingData) => d.final_score || 0);
          const avgScore = scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length;

          // Calculate consistency
          const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
          const standardDeviation = Math.sqrt(variance);
          const consistency = Math.max(0, 100 - (standardDeviation / avgScore) * 100);

          competitionsData.push({
            competition_id: comp.id,
            competition_name: comp.competition_name,
            competition_year: comp.competition_year,
            competition_key: comp.competition_key,
            scoutingData: scoutingData || [],
            pitScoutingData: pitScoutingData || [],
            totalMatches: scoutingData.length,
            avgScore: Math.round(avgScore * 10) / 10,
            bestScore: Math.max(...scores),
            worstScore: Math.min(...scores),
            consistency: Math.round(consistency)
          });
        }
      }

      // Check current scouting data
      const { data: currentScoutingData, error: currentScoutingError } = await supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .order('created_at', { ascending: false });

      if (!currentScoutingError && currentScoutingData && currentScoutingData.length > 0) {
        const scores = currentScoutingData.map((d: ScoutingData) => d.final_score || 0);
        const avgScore = scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length;
        const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
        const standardDeviation = Math.sqrt(variance);
        const consistency = Math.max(0, 100 - (standardDeviation / avgScore) * 100);

        competitionsData.push({
          competition_id: 'current',
          competition_name: 'Current Season (2026)',
          competition_year: 2026,
          competition_key: 'current',
          scoutingData: currentScoutingData,
          pitScoutingData: [],
          totalMatches: currentScoutingData.length,
          avgScore: Math.round(avgScore * 10) / 10,
          bestScore: Math.max(...scores),
          worstScore: Math.min(...scores),
          consistency: Math.round(consistency)
        });
      }

      // Calculate Overall Stats
      const allScoutingData = competitionsData.flatMap(comp => comp.scoutingData);
      const totalMatches = allScoutingData.length;

      if (totalMatches > 0) {
        const allScores = allScoutingData.map((d: ScoutingData) => d.final_score || 0);
        const overallAvgScore = allScores.reduce((sum, val) => sum + val, 0) / totalMatches;

        const avgAutonomous = allScoutingData.reduce((sum, data) => sum + (data.autonomous_points || 0), 0) / totalMatches;
        const avgTeleop = allScoutingData.reduce((sum, data) => sum + (data.teleop_points || 0), 0) / totalMatches;
        const avgEndgame = 0; // endgame_points not in database schema
        const avgDefense = allScoutingData.reduce((sum, data) => sum + (data.defense_rating || 0), 0) / totalMatches;

        const variance = allScores.reduce((sum, score) => sum + Math.pow(score - overallAvgScore, 2), 0) / totalMatches;
        const consistency = Math.max(0, 100 - (Math.sqrt(variance) / overallAvgScore) * 100);

        setOverallStats({
          totalMatches,
          avgScore: Math.round(overallAvgScore * 10) / 10,
          avgAutonomous: Math.round(avgAutonomous * 10) / 10,
          avgTeleop: Math.round(avgTeleop * 10) / 10,
          avgEndgame: Math.round(avgEndgame * 10) / 10,
          avgDefense: Math.round(avgDefense * 10) / 10,
          bestScore: Math.max(...allScores),
          worstScore: Math.min(...allScores),
          consistency: Math.round(consistency),
          competitionsPlayed: competitionsData.length
        });
      }

      setCompetitions(competitionsData.sort((a, b) => b.competition_year - a.competition_year));
    } catch (error) {
      console.error('Error loading team history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderScoringBreakdown = (notes: any) => {
    // Handle stringified notes
    let parsedNotes = notes;
    try {
      if (typeof notes === 'string') {
        parsedNotes = JSON.parse(notes);
      }
    } catch (e) {
      console.error("Failed to parse notes", e);
    }

    // Handle both flat and nested note structures
    const getValue = (path: string) => {
      if (parsedNotes && typeof parsedNotes === 'object') {
        if (parsedNotes.autonomous || parsedNotes.teleop) {
          // Nested structure
          if (path.startsWith('auto_')) return parsedNotes.autonomous?.[path];
          if (path.startsWith('teleop_')) return parsedNotes.teleop?.[path];
        }
        // Flat structure
        return parsedNotes[path];
      }
      return undefined;
    };

    const scoringElements = [
      // Autonomous (First 20 seconds)
      { label: 'FUEL Active HUB', value: getValue('auto_fuel_active_hub'), points: 1, period: 'Autonomous' },
      { label: 'TOWER LEVEL 1', value: getValue('auto_tower_level1'), points: 15, period: 'Autonomous' },

      // Teleop (Last 2:20)
      { label: 'FUEL Active HUB', value: getValue('teleop_fuel_active_hub'), points: 1, period: 'Teleop' },
      { label: 'TOWER LEVEL 1', value: getValue('teleop_tower_level1'), points: 10, period: 'Teleop' },
      { label: 'TOWER LEVEL 2', value: getValue('teleop_tower_level2'), points: 20, period: 'Teleop' },
      { label: 'TOWER LEVEL 3', value: getValue('teleop_tower_level3'), points: 30, period: 'Teleop' },

      // Endgame (Last 30 seconds)
      { label: 'FUEL in HUB', value: getValue('endgame_fuel'), points: 1, period: 'Endgame' },
    ];

    const shiftsData = getValue('teleop_fuel_shifts');
    const singleFuel = getValue('teleop_fuel_active_hub');
    const shifts = (shiftsData && Array.isArray(shiftsData) && shiftsData.length > 0)
      ? shiftsData
      : (singleFuel ? [singleFuel] : []);

    const autonomousElements = scoringElements.filter(el => el.period === 'Autonomous');
    const teleopElements = scoringElements.filter(el => el.period === 'Teleop');
    const endgameElements = scoringElements.filter(el => el.period === 'Endgame');

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-blue-400 uppercase tracking-widest pl-1">Auto</h5>
            {autonomousElements.map((el, i) => <BreakdownItem key={i} {...el} />)}
          </div>
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-orange-400 uppercase tracking-widest pl-1">Teleop</h5>
            {teleopElements.map((el, i) => <BreakdownItem key={i} {...el} />)}
          </div>
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-green-400 uppercase tracking-widest pl-1">Endgame</h5>
            {endgameElements.map((el, i) => <BreakdownItem key={i} {...el} />)}
          </div>
        </div>

        {/* Teleop Shifts Grid */}
        {shifts.length > 0 && (
          <div className="bg-black/20 p-3 rounded-lg border border-white/5">
            <h5 className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Activity className="w-3 h-3" /> Teleop Scoring Intensity
            </h5>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center p-2 rounded-lg bg-white/5 border border-white/5 group hover:border-orange-500/30 transition-all">
                  <span className="text-[7px] text-muted-foreground uppercase font-black mb-1">{i === 4 ? 'END' : `S${i + 1}`}</span>
                  <span className="text-xl sm:text-2xl font-black text-orange-400 leading-none">{shifts[i] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
            <p className="text-muted-foreground mb-6 max-w-md">Historical data for this team is not available.</p>
            <Button onClick={() => router.push('/past-competitions')} variant="outline" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Past Competitions
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <Button
                onClick={() => router.push('/past-competitions')}
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
                Historical performance analysis across {overallStats?.competitionsPlayed || 0} competitions.
              </p>
            </div>
          </motion.div>

          {/* Overall Statistics */}
          {overallStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">All-Time Statistics</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
                <StatCard label="Total Matches" value={overallStats.totalMatches} color="blue" icon={Database} />
                <StatCard label="Avg Score" value={overallStats.avgScore} color="primary" icon={BarChart3} />
                <StatCard label="Auto Avg" value={overallStats.avgAutonomous} color="blue" icon={Clock} />
                <StatCard label="Teleop Avg" value={overallStats.avgTeleop} color="orange" icon={Zap} />
                <StatCard label="Endgame Avg" value={overallStats.avgEndgame} color="green" icon={Award} />
                <StatCard label="Defense" value={overallStats.avgDefense} color="red" icon={Shield} subLabel="OUT OF 10" />
                <StatCard label="Consistency" value={`${overallStats.consistency}%`} color="purple" icon={Activity} />
                <div className="glass-card p-4 rounded-xl flex flex-col justify-center items-center text-center border border-white/5 space-y-2">
                  <div className="text-xs text-green-400 font-mono">BEST: {overallStats.bestScore}</div>
                  <div className="w-full h-px bg-white/10" />
                  <div className="text-xs text-red-400 font-mono">WORST: {overallStats.worstScore}</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Competition Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Competition History</h2>
            </div>

            {competitions.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl text-center border-dashed border-2 border-white/10">
                <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No Historical Data</h3>
                <p className="text-muted-foreground mt-1">No competition records found for this team.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {competitions.map((comp, index) => (
                  <motion.div
                    key={comp.competition_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (index * 0.05) }}
                    className="relative pl-6 sm:pl-8 border-l-2 border-white/10 last:border-0 pb-8 last:pb-0"
                  >
                    {/* Timeline Dot */}
                    <div className="absolute top-0 left-[-9px] w-4 h-4 rounded-full bg-background border-2 border-primary" />

                    <div className="glass-card rounded-xl overflow-hidden border border-white/5 hover:border-primary/20 transition-all">
                      {/* Competition Header */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-white/5 to-transparent">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-background/50 border-white/10 text-lg font-mono px-3 py-1">
                              {comp.competition_year}
                            </Badge>
                            <div>
                              <h3 className="text-lg font-bold text-foreground leading-tight">{comp.competition_name}</h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="font-mono">{comp.competition_key}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {comp.totalMatches} Matches</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{comp.avgScore}</div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg Score</div>
                            </div>
                            <Button
                              size="sm"
                              variant={selectedCompetition === comp.competition_id ? "default" : "secondary"}
                              className="w-10 h-10 p-0 rounded-full"
                              onClick={() => setSelectedCompetition(selectedCompetition === comp.competition_id ? null : comp.competition_id)}
                            >
                              {selectedCompetition === comp.competition_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Mini Stats Bar */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                          <div className="bg-background/20 rounded p-2 text-center">
                            <span className="text-[10px] text-muted-foreground uppercase block">Best</span>
                            <span className="font-bold text-green-400">{comp.bestScore}</span>
                          </div>
                          <div className="bg-background/20 rounded p-2 text-center">
                            <span className="text-[10px] text-muted-foreground uppercase block">Worst</span>
                            <span className="font-bold text-red-400">{comp.worstScore}</span>
                          </div>
                          <div className="bg-background/20 rounded p-2 text-center">
                            <span className="text-[10px] text-muted-foreground uppercase block">Consistency</span>
                            <span className="font-bold text-purple-400">{comp.consistency}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Match Details */}
                      <AnimatePresence>
                        {selectedCompetition === comp.competition_id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/5 bg-black/20"
                          >
                            <div className="p-4 sm:p-6 space-y-4">
                              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                                <FileText className="w-4 h-4" /> Individual Matches
                              </h4>

                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {comp.scoutingData.map((data) => (
                                  <div key={data.id} className="bg-card/40 border border-white/5 rounded-lg p-3 hover:bg-white/5 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground uppercase">Match</span>
                                        <span className="font-mono font-bold text-foreground">#{data.match_id}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-primary">{data.final_score}</div>
                                        <Badge
                                          className={cn(
                                            "text-[10px] px-1 py-0 h-4",
                                            data.alliance_color === 'red' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                                          )}
                                        >
                                          {data.alliance_color}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Quick Stats */}
                                    <div className="flex justify-between text-xs text-muted-foreground mb-3 bg-black/20 rounded p-1.5">
                                      <span>A: <strong className="text-blue-400">{data.autonomous_points}</strong></span>
                                      <span>T: <strong className="text-orange-400">{data.teleop_points}</strong></span>
                                      <span>E: <strong className="text-green-400">0</strong></span>
                                    </div>

                                    {/* Expanded details trigger (could be nested inside this small card) */}
                                    {data.notes && (
                                      <div className="mt-2 pt-2 border-t border-white/5">
                                        <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Breakdown</div>
                                        {renderScoringBreakdown(data.notes)}
                                      </div>
                                    )}

                                    {data.comments && (
                                      <div className="mt-2 pt-2 border-t border-white/5">
                                        <p className="text-xs italic text-muted-foreground">"{data.comments}"</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
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

export default TeamHistory;
