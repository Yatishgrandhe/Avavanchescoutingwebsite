import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import {
  BarChart3,
  TrendingUp,
  Target,
  Users,
  Zap,
  Shield,
  Award,
  Clock,
  Activity,
  Database,
  Loader2,
  AlertCircle,
  ChevronDown,
  Filter,
  Download,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAdmin } from '@/hooks/use-admin';
import { Badge } from '@/components/ui/badge';
import { formatDurationSec, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { computeRebuiltMetrics, formatScoreRange } from '@/lib/analytics';
import { SCOUTING_MATCH_ID_SEASON_PATTERN } from '@/lib/constants';
import { getOrgCurrentEvent } from '@/lib/org-app-config';
import { loadAnalysisTeamDataOnly, saveAnalysisTeamDataOnly } from '@/lib/view-data-filter-storage';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface TeamStats {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_endgame_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  avg_downtime?: number | null;
  broke_rate?: number;
  avg_auto_fuel?: number;
  avg_teleop_fuel?: number;
  avg_climb_pts?: number;
  avg_auto_climb_pts?: number;
  avg_teleop_climb_pts?: number;
  avg_uptime_pct?: number | null;
  avg_downtime_sec?: number | null;
  broke_count?: number;
  clank?: number;
  avg_climb_speed_sec?: number | null;
  rpmagic?: number;
  goblin?: number;
  epa?: number;
  best_score: number;
  worst_score: number;
  consistency_score: number;
  win_rate: number;
  auto_pts_min?: number;
  auto_pts_max?: number;
  teleop_pts_min?: number;
  teleop_pts_max?: number;
  total_pts_min?: number;
  total_pts_max?: number;
  balls_per_cycle_min?: number;
  balls_per_cycle_max?: number;
  recent_performance: Array<{
    match_id: string;
    final_score: number;
    autonomous_points: number;
    teleop_points: number;
    endgame_points: number;
    defense_rating: number;
    average_downtime?: number | null;
    broke?: boolean | null;
    created_at: string;
  }>;
}

interface AnalysisFilters {
  event_key?: string;
  min_matches?: number;
  date_range?: {
    start: string;
    end: string;
  };
}

export default function AdvancedAnalysis() {
  const { user, loading: authLoading } = useSupabase();
  const { isSuperAdmin, loading: adminLoading } = useAdmin();
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [filters, setFilters] = useState<AnalysisFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Array<{ team_number: number, team_name: string }>>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamDataOnly, setTeamDataOnly] = useState(false); // Default OFF (Show all data for active competition)
  useEffect(() => {
    setTeamDataOnly(loadAnalysisTeamDataOnly(false));
  }, []);
  const [scoutingRowsForAi, setScoutingRowsForAi] = useState<Array<{ comments?: string | null }>>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState<string | null>(null);
  const summarizeInFlightRef = useRef(false);
  const superAdminAutoSummarizeRef = useRef(false);
  const canUseCommentSummary = isSuperAdmin;

  // Load available teams from Supabase
  useEffect(() => {
    const loadTeams = async () => {
      try {
        setTeamsLoading(true);
        const { data: teams, error } = await supabase
          .from('teams')
          .select('team_number, team_name')
          .not('team_name', 'ilike', '%avalanche%')
          .order('team_number');

        if (error) {
          console.error('Error loading teams:', error);
          setError('Failed to load teams');
        } else {
          setAvailableTeams(teams || []);
        }
      } catch (err) {
        console.error('Error loading teams:', err);
        setError('Failed to load teams');
      } finally {
        setTeamsLoading(false);
      }
    };

    if (user) {
      loadTeams();
    }
  }, [user, teamDataOnly]);

  const handleAiSummarize = useCallback(async (rows: Array<{ comments?: string | null }>) => {
    const comments = rows.map(r => r.comments).filter((c): c is string => Boolean(c?.trim()));
    if (!comments.length || summarizeInFlightRef.current) return;

    summarizeInFlightRef.current = true;
    setIsSummarizing(true);
    setSummarizeError(null);

    try {
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
        body: JSON.stringify({ comments }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        let msg = error.message || 'Failed to generate summary';
        if (error.retryAfterSeconds) {
          msg += ` Try again in ~${error.retryAfterSeconds}s.`;
        }
        throw new Error(msg);
      }
      const { summary } = await response.json();
      setAiSummary(summary);
    } catch (err: unknown) {
      console.error('AI summarization failed:', err);
      setSummarizeError(err instanceof Error ? err.message : 'Summary unavailable');
    } finally {
      summarizeInFlightRef.current = false;
      setIsSummarizing(false);
    }
  }, []);

  const handleTeamSearch = async () => {
    if (!selectedTeam) return;

    setLoading(true);
    setError(null);
    setScoutingRowsForAi([]);
    setAiSummary(null);
    setSummarizeError(null);
    superAdminAutoSummarizeRef.current = false;

    try {
      // Fetch team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', selectedTeam)
        .single();

      if (teamError) {
        throw new Error('Team not found');
      }

      // Fetch organization's active event if available
      let currentEventKey = '';
      if (user?.organization_id) {
        const { eventKey } = await getOrgCurrentEvent(supabase, user.organization_id);
        currentEventKey = eventKey;
      }

      // Fetch scouting data with filters
      let scoutingQuery = supabase
        .from('scouting_data')
        .select('*, matches!inner(event_key)')
        .eq('team_number', selectedTeam);

      // Filter by event: explicit filter > active event > season pattern
      if (filters.event_key) {
        scoutingQuery = scoutingQuery.eq('matches.event_key', filters.event_key);
      } else if (currentEventKey) {
        scoutingQuery = scoutingQuery.eq('matches.event_key', currentEventKey);
      } else {
        scoutingQuery = scoutingQuery.like('match_id', SCOUTING_MATCH_ID_SEASON_PATTERN);
      }

      scoutingQuery = scoutingQuery.order('created_at', { ascending: false });

      if (teamDataOnly && user?.organization_id) {
        scoutingQuery = scoutingQuery.eq('organization_id', user.organization_id);
      }



      if (filters.date_range?.start) {
        scoutingQuery = scoutingQuery.gte('created_at', filters.date_range.start);
      }

      if (filters.date_range?.end) {
        scoutingQuery = scoutingQuery.lte('created_at', filters.date_range.end);
      }

      const { data: scoutingData, error: scoutingError } = await scoutingQuery;

      if (scoutingError) {
        throw new Error('Failed to fetch scouting data');
      }

      if (!scoutingData || scoutingData.length === 0) {
        setError('No scouting data available for this team');
        setTeamStats(null);
        setScoutingRowsForAi([]);
        return;
      }

      setScoutingRowsForAi(scoutingData);

      // Calculate advanced statistics
      const totalMatches = scoutingData.length;
      const scores = scoutingData.map((match: any) => match.final_score || 0);
      const autonomousScores = scoutingData.map((match: any) => match.autonomous_points || 0);
      const teleopScores = scoutingData.map((match: any) => match.teleop_points || 0);
      const endgameScores = scoutingData.map((match: any) => 0); // endgame_points not in database schema
      const defenseRatings = scoutingData.map((match: any) => match.defense_rating || 0);

      // Calculate averages
      const avgAutonomous = autonomousScores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgTeleop = teleopScores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgEndgame = endgameScores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgTotal = scores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgDefense = defenseRatings.reduce((sum: number, rating: number) => sum + rating, 0) / totalMatches;
      const downtimeValues = scoutingData.map((m: any) => m.average_downtime).filter((v: any) => v != null && !Number.isNaN(Number(v)));
      const avgDowntime = downtimeValues.length > 0
        ? downtimeValues.reduce((s: number, v: number) => s + Number(v), 0) / downtimeValues.length
        : null;
      const brokeCount = scoutingData.filter((m: any) => m.broke === true).length;
      const brokeRate = totalMatches > 0 ? Math.round((brokeCount / totalMatches) * 100) : 0;
      const rebuilt = computeRebuiltMetrics(scoutingData);

      // Calculate consistency (lower coefficient of variation = higher consistency)
      const variance = totalMatches > 1
        ? scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgTotal, 2), 0) / totalMatches
        : 0;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = (avgTotal > 0 && totalMatches > 0)
        ? Math.max(0, Math.min(100, 100 - (standardDeviation / avgTotal) * 100))
        : 0;

      // Calculate best/worst scores
      const bestScore = Math.max(...scores);
      const worstScore = Math.min(...scores);

      // Calculate win rate (simplified - you might want to implement actual win/loss logic)
      const winRate = 0.75; // Placeholder - would need actual match results

      setTeamStats({
        team_number: selectedTeam,
        team_name: teamData?.team_name || `Team ${selectedTeam}`,
        total_matches: totalMatches,
        avg_autonomous_points: Math.round(avgAutonomous),
        avg_teleop_points: Math.round(avgTeleop),
        avg_endgame_points: Math.round(avgEndgame),
        avg_total_score: Math.round(avgTotal),
        avg_defense_rating: Math.round(avgDefense),
        avg_downtime: avgDowntime != null ? Math.round(avgDowntime) : null,
        broke_rate: brokeRate,
        avg_auto_fuel: rebuilt.avg_auto_fuel,
        avg_teleop_fuel: rebuilt.avg_teleop_fuel,
        avg_climb_pts: rebuilt.avg_climb_pts,
        avg_auto_climb_pts: rebuilt.avg_auto_climb_pts,
        avg_teleop_climb_pts: rebuilt.avg_teleop_climb_pts,
        avg_uptime_pct: rebuilt.avg_uptime_pct,
        avg_downtime_sec: rebuilt.avg_downtime_sec,
        broke_count: rebuilt.broke_count,
        clank: rebuilt.clank,
        avg_climb_speed_sec: rebuilt.avg_climb_speed_sec ?? null,
        rpmagic: rebuilt.rpmagic,
        goblin: rebuilt.goblin,
        epa: rebuilt.epa,
        best_score: bestScore,
        worst_score: worstScore,
        consistency_score: Math.round(consistencyScore),
        win_rate: winRate,
        recent_performance: scoutingData.slice(0, 10).map((match: any) => ({
          match_id: match.match_id,
          final_score: match.final_score || 0,
          autonomous_points: match.autonomous_points || 0,
          teleop_points: match.teleop_points || 0,
          endgame_points: 0,
          defense_rating: match.defense_rating || 0,
          average_downtime: match.average_downtime ?? null,
          broke: match.broke ?? null,
          created_at: match.created_at
        }))
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
      setTeamStats(null);
      setScoutingRowsForAi([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    superAdminAutoSummarizeRef.current = false;
  }, [selectedTeam]);

  useEffect(() => {
    if (!canUseCommentSummary || adminLoading || authLoading || !teamStats || loading) return;
    if (superAdminAutoSummarizeRef.current) return;
    if (!scoutingRowsForAi.some(r => r.comments?.trim())) return;
    superAdminAutoSummarizeRef.current = true;
    void handleAiSummarize(scoutingRowsForAi);
  }, [
    canUseCommentSummary,
    adminLoading,
    authLoading,
    teamStats,
    loading,
    scoutingRowsForAi,
    handleAiSummarize,
  ]);

  const exportData = () => {
    if (!teamStats) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Team Number', teamStats.team_number],
      ['Team Name', teamStats.team_name],
      ['Total Matches', teamStats.total_matches],
      ['Average Autonomous Points', teamStats.avg_autonomous_points],
      ['Average Teleop Points', teamStats.avg_teleop_points],
      ['Average Endgame Points', teamStats.avg_endgame_points],
      ['Average Total Score', teamStats.avg_total_score],
      ['Average Defense Rating', teamStats.avg_defense_rating],
      ['Average Downtime (s)', teamStats.avg_downtime ?? ''],
      ['Broke Rate (%)', teamStats.broke_rate ?? ''],
      ['Best Score', teamStats.best_score],
      ['Worst Score', teamStats.worst_score],
      ['Consistency Score', teamStats.consistency_score],
      ['Win Rate', teamStats.win_rate]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-${teamStats.team_number}-analysis.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    const router = useRouter();
    router.push('/');
    return null;
  }

  return (
    <Layout>
      <div className="min-h-full p-3 sm:p-6 data-page max-w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold break-words ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Advanced Team Analysis
                </h1>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Deep insights into team performance and strategic analysis
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Team Data Only Toggle */}
                <div className="flex items-center gap-3 p-2 rounded-lg border border-white/10 bg-white/[0.02]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground font-heading">Team Data</span>
                    <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">
                      {teamDataOnly ? 'Org Only' : 'All Data'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={teamDataOnly ? 'default' : 'outline'}
                    onClick={() => {
                      const v = !teamDataOnly;
                      setTeamDataOnly(v);
                      saveAnalysisTeamDataOnly(v);
                    }}
                    className={cn(
                      "h-7 px-2.5 rounded-full transition-all text-[10px] font-bold",
                      teamDataOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    {teamDataOnly ? 'ON' : 'OFF'}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                {teamStats && (
                  <Button
                    onClick={exportData}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input

                      placeholder="e.g., 2026mabos"
                      value={filters.event_key || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, event_key: e.target.value || undefined }))}

                    />
                    <Input

                      type="number"
                      placeholder="Minimum matches"
                      value={filters.min_matches || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, min_matches: parseInt(e.target.value) || undefined }))}

                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setFilters({})}

                        className="flex-1"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Team Search */}
          <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className={`flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Target className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </motion.div>
                <span>Team Analysis</span>
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Enter a team number to view detailed performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <select
                  value={selectedTeam || ''}
                  onChange={(e) => setSelectedTeam(parseInt(e.target.value) || null)}
                  disabled={teamsLoading || loading}
                  className={`flex-1 px-3 py-2 border rounded-md ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-background border-border text-foreground'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">
                    {teamsLoading ? 'Loading teams...' : 'Select a team to analyze'}
                  </option>
                  {availableTeams.map(team => (
                    <option key={team.team_number} value={team.team_number.toString()}>
                      Team {team.team_number} - {team.team_name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleTeamSearch}
                  disabled={!selectedTeam || loading || teamsLoading}
                  className="px-8 w-full sm:w-auto"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    'Analyze'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 p-4 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {/* Team Statistics */}
          {teamStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {canUseCommentSummary && (
                <Card className="bg-amber-500/[0.06] border-amber-500/25">
                  <CardHeader className="pb-2">
                    <CardTitle className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      <Shield className="w-5 h-5 shrink-0" />
                          Superadmin comments intelligence
                    </CardTitle>
                    <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Runs automatically after you analyze a team with scouting comments. Same engine as Team Details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aiSummary ? (
                      <p className={`text-sm leading-relaxed italic ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        &ldquo;{aiSummary}&rdquo;
                      </p>
                    ) : isSummarizing ? (
                      <div className="flex items-center gap-2 text-amber-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Summarizing comments…</span>
                      </div>
                    ) : summarizeError ? (
                      <div className="space-y-2">
                        <p className="text-sm text-red-400">{summarizeError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleAiSummarize(scoutingRowsForAi)}
                          disabled={!scoutingRowsForAi.length}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        No qualitative comments in this dataset, or summary not started yet.
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                      <span className="text-[10px] uppercase tracking-widest text-amber-600/80">
                        {aiSummary ? 'Summary ready' : 'Ready'}
                      </span>
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                        Superadmin
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Total Matches
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {teamStats.total_matches}
                        </p>
                      </div>
                      <Database className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Avg Score
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatScoreRange(teamStats.total_pts_min ?? teamStats.avg_total_score, teamStats.total_pts_max ?? teamStats.avg_total_score)}
                        </p>
                      </div>
                      <BarChart3 className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          EPA (Expected Points Added)
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {teamStats.epa ?? '—'}
                        </p>
                      </div>
                      <Target className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Consistency
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {teamStats.consistency_score}%
                        </p>
                      </div>
                      <TrendingUp className={`w-8 h-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Defense Rating
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {teamStats.avg_defense_rating}/10
                        </p>
                      </div>
                      <Shield className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Avg Downtime
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {teamStats.avg_downtime != null ? `${teamStats.avg_downtime}s` : '—'}
                        </p>
                      </div>
                      <Clock className={`w-8 h-8 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Broke Rate
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {teamStats.broke_rate != null ? `${teamStats.broke_rate}%` : '—'}
                        </p>
                      </div>
                      <AlertCircle className={`w-8 h-8 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* REBUILT 2026 KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Auto Fuel</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.avg_auto_fuel ?? '—'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Teleop Fuel</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.avg_teleop_fuel ?? '—'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Climb Pts</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.avg_climb_pts ?? '—'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Uptime %</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.avg_uptime_pct != null ? `${teamStats.avg_uptime_pct}%` : '—'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>CLANK</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.clank != null ? `${teamStats.clank}` : '—'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg climb speed</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.avg_climb_speed_sec != null ? `${teamStats.avg_climb_speed_sec}s` : '—'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>RPMAGIC</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.rpmagic != null ? `${teamStats.rpmagic}%` : '—'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3">
                    <p className={`text-[10px] font-medium uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>GOBLIN</p>
                    <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teamStats.goblin ?? '—'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* CLANK, RPMAGIC, GOBLIN descriptions */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>KPI Descriptions</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <p><strong className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>CLANK</strong> — Climb Level Accuracy &amp; No-Knockdown. Points adjusted for speed (+2 ≤3s, -2 &gt;6s).</p>
                  <p><strong className={isDarkMode ? 'text-green-400' : 'text-green-600'}>RPMAGIC</strong> — Ranking Points — Match Advantage Generated In Cycles. Probability of earning an RP from scoring.</p>
                  <p><strong className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>GOBLIN</strong> — Game Outcome Boost from Luck, In Numbers. Difference between actual match margin and expected margin.</p>
                </CardContent>
              </Card>

              {/* Radar Chart: 5 axes 0–100 */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance Radar</CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Blue area = team&apos;s actual performance; balanced shape = well-rounded robot. Scale 0–100.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={340}>
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      data={(() => {
                        const autoCap = 30;
                        const teleopCap = 50;
                        const climbMax = 45;
                        const autoScore = Math.min(100, ((teamStats.avg_auto_fuel ?? 0) / autoCap) * 100);
                        const teleopScore = Math.min(100, ((teamStats.avg_teleop_fuel ?? 0) / teleopCap) * 100);
                        const climbScore = Math.min(100, ((teamStats.avg_climb_pts ?? 0) / climbMax) * 100);
                        const consistency = Math.min(100, Math.max(0, teamStats.goblin ?? 0));
                        const reliability = teamStats.avg_uptime_pct != null
                          ? (teamStats.avg_uptime_pct + (100 - (teamStats.broke_rate ?? 0))) / 2
                          : Math.max(0, 100 - (teamStats.broke_rate ?? 0));
                        return [
                          { subject: 'Auto Scoring', value: Math.round(autoScore), fullMark: 100 },
                          { subject: 'Teleop Scoring', value: Math.round(teleopScore), fullMark: 100 },
                          { subject: 'Climb Points', value: Math.round(climbScore), fullMark: 100 },
                          { subject: 'Consistency', value: Math.round(consistency), fullMark: 100 },
                          { subject: 'Reliability', value: Math.round(reliability), fullMark: 100 },
                        ];
                      })()}
                    >
                      <PolarGrid stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                      />
                      <Radar
                        name="Team"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}` }}
                        labelStyle={{ color: isDarkMode ? '#fff' : '#111' }}
                        formatter={(value: number) => [value, 'Score (0–100)']}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Radar Chart: Auto Scoring, Teleop Scoring, Climb Points, Consistency, Reliability */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Performance radar
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Auto Scoring (fuel in auto), Teleop Scoring (fuel in teleop), Climb Points, Consistency (score stability), Reliability (uptime / no breakdowns). Blue area = this team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={340}>
                    <RadarChart
                      data={[
                        { subject: 'Auto Scoring', value: Math.min(100, ((teamStats.avg_auto_fuel ?? 0) / 50) * 100), fullMark: 100 },
                        { subject: 'Teleop Scoring', value: Math.min(100, ((teamStats.avg_teleop_fuel ?? 0) / 150) * 100), fullMark: 100 },
                        { subject: 'Climb Pts', value: Math.min(100, ((teamStats.avg_climb_pts ?? 0) / 30) * 100), fullMark: 100 },
                        { subject: 'Consistency', value: Math.min(100, teamStats.consistency_score ?? 0), fullMark: 100 },
                        { subject: 'Reliability', value: teamStats.avg_uptime_pct != null ? teamStats.avg_uptime_pct : Math.max(0, 100 - (teamStats.broke_rate ?? 0)), fullMark: 100 },
                      ]}
                      margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                    >
                      <PolarGrid stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: isDarkMode ? '#9ca3af' : '#6b7280' }} />
                      <Radar name="Team" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} strokeWidth={2} />
                      <Tooltip contentStyle={{ background: isDarkMode ? '#1f2937' : '#fff', border: '1px solid #374151' }} formatter={(value: number) => [value.toFixed(0), 'Score (0–100)']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Advanced metric descriptions */}
              <Card className="bg-card border-border bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Advanced metrics — how they are calculated</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>CLANK</strong> — Climb Level Accuracy &amp; No-Knockdown. Success rate of climbs; points can be adjusted for speed (+2 for ≤3s, -2 for &gt;6s) when climb time is collected.</p>
                  <p><strong className={isDarkMode ? 'text-green-400' : 'text-green-600'}>RPMAGIC</strong> — Ranking Points — Match Advantage Generated In Cycles. The probability of a team earning an RP based on their scoring and climb consistency.</p>
                  <p><strong className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>GOBLIN</strong> — Game Outcome Boost from Luck, In Numbers. The difference between actual match margin and expected margin; higher = more consistent (less luck-dependent).</p>
                </CardContent>
              </Card>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Scoring Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Autonomous</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatScoreRange(teamStats.auto_pts_min ?? teamStats.avg_autonomous_points, teamStats.auto_pts_max ?? teamStats.avg_autonomous_points)} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Teleop</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatScoreRange(teamStats.teleop_pts_min ?? teamStats.avg_teleop_points, teamStats.teleop_pts_max ?? teamStats.avg_teleop_points)} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Endgame</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {teamStats.avg_endgame_points} pts
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Performance Range
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Best Score</span>
                      <span className={`font-semibold text-green-400`}>
                        {teamStats.best_score} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Worst Score</span>
                      <span className={`font-semibold text-red-400`}>
                        {teamStats.worst_score} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Score Range</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {teamStats.best_score - teamStats.worst_score} pts
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Performance */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Performance
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Last 10 matches performance data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Match
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Total
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Auto
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Teleop
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Endgame
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Defense
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Downtime
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Broke
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamStats.recent_performance.map((match, index) => (
                          <motion.tr
                            key={match.match_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                          >
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {match.match_id}
                            </td>
                            <td className={`py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {match.final_score}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {match.autonomous_points}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {match.teleop_points}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              0
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {match.defense_rating}/10
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {match.average_downtime != null ? formatDurationSec(Number(match.average_downtime)) : '—'}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {match.broke === true ? 'Yes' : match.broke === false ? 'No' : '—'}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
