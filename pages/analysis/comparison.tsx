import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Badge } from '../../components/ui/badge';
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
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Download
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { computeRebuiltMetrics } from '@/lib/analytics';

interface TeamComparison {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_endgame_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  avg_downtime?: number | null;
  avg_downtime_sec?: number | null;
  broke_count?: number;
  broke_rate?: number;
  avg_auto_fuel?: number;
  avg_teleop_fuel?: number;
  avg_climb_pts?: number;
  avg_auto_climb_pts?: number;
  avg_teleop_climb_pts?: number;
  avg_uptime_pct?: number | null;
  clank?: number;
  /** Average climb time in seconds (CLANK speed). */
  avg_climb_speed_sec?: number | null;
  rpmagic?: number;
  goblin?: number;
  best_score: number;
  worst_score: number;
  consistency_score: number;
  win_rate: number;
}

/** Build TeamComparison from scouting rows (for competition-scoped comparison). */
function buildTeamComparisonFromRows(
  teamNumber: number,
  teamName: string,
  scoutingData: any[],
): TeamComparison {
  const totalMatches = scoutingData.length;
  const scores = scoutingData.map((m: any) => m.final_score || 0);
  const autonomousScores = scoutingData.map((m: any) => m.autonomous_points || 0);
  const teleopScores = scoutingData.map((m: any) => m.teleop_points || 0);
  const endgameScores = scoutingData.map(() => 0);
  const defenseRatings = scoutingData.map((m: any) => m.defense_rating || 0);
  const downtimeValues = scoutingData.map((m: any) => m.average_downtime).filter((v: any) => v != null && !Number.isNaN(Number(v)));
  const avgDowntime = downtimeValues.length > 0
    ? downtimeValues.reduce((s: number, v: number) => s + Number(v), 0) / downtimeValues.length
    : null;
  const brokeCount = scoutingData.filter((m: any) => m.broke === true).length;
  const brokeRate = totalMatches > 0 ? Math.round((brokeCount / totalMatches) * 100) : 0;
  const rebuilt = computeRebuiltMetrics(scoutingData);
  const avgAutonomous = autonomousScores.reduce((a: number, b: number) => a + b, 0) / totalMatches;
  const avgTeleop = teleopScores.reduce((a: number, b: number) => a + b, 0) / totalMatches;
  const avgEndgame = endgameScores.reduce((a: number, b: number) => a + b, 0) / totalMatches;
  const avgTotal = scores.reduce((a: number, b: number) => a + b, 0) / totalMatches;
  const avgDefense = defenseRatings.reduce((a: number, b: number) => a + b, 0) / totalMatches;
  const variance = totalMatches > 1
    ? scores.reduce((sum: number, s: number) => sum + Math.pow(s - avgTotal, 2), 0) / totalMatches
    : 0;
  const consistencyScore = (avgTotal > 0 && totalMatches > 0)
    ? Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) / avgTotal) * 100))
    : 0;
  return {
    team_number: teamNumber,
    team_name: teamName,
    total_matches: totalMatches,
    avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
    avg_teleop_points: Math.round(avgTeleop * 100) / 100,
    avg_endgame_points: Math.round(avgEndgame * 100) / 100,
    avg_total_score: Math.round(avgTotal * 100) / 100,
    avg_defense_rating: Math.round(avgDefense * 100) / 100,
    avg_downtime: avgDowntime != null ? Math.round(avgDowntime * 100) / 100 : null,
    avg_downtime_sec: rebuilt.avg_downtime_sec,
    broke_count: rebuilt.broke_count,
    broke_rate: brokeRate,
    avg_auto_fuel: rebuilt.avg_auto_fuel,
    avg_teleop_fuel: rebuilt.avg_teleop_fuel,
    avg_climb_pts: rebuilt.avg_climb_pts,
    avg_auto_climb_pts: rebuilt.avg_auto_climb_pts,
    avg_teleop_climb_pts: rebuilt.avg_teleop_climb_pts,
    avg_uptime_pct: rebuilt.avg_uptime_pct,
    clank: rebuilt.clank,
    avg_climb_speed_sec: rebuilt.avg_climb_speed_sec ?? null,
    rpmagic: rebuilt.rpmagic,
    goblin: rebuilt.goblin,
    best_score: Math.max(...scores),
    worst_score: Math.min(...scores),
    consistency_score: Math.round(consistencyScore * 100) / 100,
    win_rate: 0.75,
  };
}

export default function TeamComparison() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabase();
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [teamComparisons, setTeamComparisons] = useState<TeamComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [availableTeams, setAvailableTeams] = useState<Array<{ team_number: number, team_name: string }>>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [competitionScoutingData, setCompetitionScoutingData] = useState<any[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<Array<{ team_number: number; team_name: string }>>([]);
  const [competitionName, setCompetitionName] = useState<string | null>(null);

  const eventKey = (router.query.event_key as string) || undefined;
  const competitionId = (router.query.id as string) || undefined;
  const isCompetitionMode = Boolean(eventKey || competitionId);

  // Load competition data when guest/open from view-data with event_key or id
  useEffect(() => {
    if (!eventKey && !competitionId) return;
    const loadCompetition = async () => {
      try {
        setTeamsLoading(true);
        setError(null);
        const params = eventKey
          ? `event_key=${encodeURIComponent(eventKey)}`
          : competitionId
            ? `id=${encodeURIComponent(competitionId)}`
            : '';
        if (!params) return;
        const res = await fetch(`/api/past-competitions?${params}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load competition');
        }
        const data = await res.json();
        const scouting = Array.isArray(data.scoutingData) ? data.scoutingData : [];
        const teams = Array.isArray(data.teams) ? data.teams : [];
        setCompetitionScoutingData(scouting);
        setCompetitionTeams(teams);
        setCompetitionName(data.competition?.competition_name || null);
        const teamNumbers = new Set<number>();
        scouting.forEach((r: any) => { if (r.team_number) teamNumbers.add(r.team_number); });
        const withData = teams.filter((t: { team_number: number }) => teamNumbers.has(t.team_number));
        setAvailableTeams(withData);
      } catch (e: any) {
        setError(e?.message || 'Failed to load competition data');
        setAvailableTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadCompetition();
  }, [eventKey, competitionId]);

  // Load all teams from Supabase when logged-in and not in competition mode
  useEffect(() => {
    if (!user || isCompetitionMode) return;
    const loadTeams = async () => {
      try {
        setTeamsLoading(true);
        const { data: teams, error } = await supabase
          .from('teams')
          .select('team_number, team_name')
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
    loadTeams();
  }, [user, isCompetitionMode]);

  const addTeam = async (teamNumber: number) => {
    if (selectedTeams.includes(teamNumber) || selectedTeams.length >= 4) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isCompetitionMode && competitionScoutingData.length > 0) {
        const teamRows = competitionScoutingData.filter((r: any) => r.team_number === teamNumber);
        if (teamRows.length === 0) {
          setError(`No scouting data for Team ${teamNumber} in this competition`);
          return;
        }
        const team = competitionTeams.find(t => t.team_number === teamNumber);
        const teamName = team?.team_name || `Team ${teamNumber}`;
        const teamComparison = buildTeamComparisonFromRows(teamNumber, teamName, teamRows);
        setSelectedTeams(prev => [...prev, teamNumber]);
        setTeamComparisons(prev => [...prev, teamComparison]);
        setInputValue('');
        return;
      }

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', teamNumber)
        .single();

      if (teamError) {
        throw new Error(`Team ${teamNumber} not found`);
      }

      const { data: scoutingData, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', teamNumber)
        .order('created_at', { ascending: false });

      if (scoutingError) {
        throw new Error('Failed to fetch scouting data');
      }

      if (!scoutingData || scoutingData.length === 0) {
        throw new Error(`No scouting data available for Team ${teamNumber}`);
      }

      const teamComparison = buildTeamComparisonFromRows(
        teamNumber,
        teamData?.team_name || `Team ${teamNumber}`,
        scoutingData,
      );
      setSelectedTeams(prev => [...prev, teamNumber]);
      setTeamComparisons(prev => [...prev, teamComparison]);
      setInputValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team');
    } finally {
      setLoading(false);
    }
  };

  const removeTeam = (teamNumber: number) => {
    setSelectedTeams(prev => prev.filter(t => t !== teamNumber));
    setTeamComparisons(prev => prev.filter(t => t.team_number !== teamNumber));
  };

  const handleAddTeam = () => {
    const teamNumber = parseInt(inputValue);
    if (teamNumber && !isNaN(teamNumber)) {
      addTeam(teamNumber);
    }
  };

  const exportComparison = () => {
    if (teamComparisons.length === 0) return;

    const csvContent = [
      ['Team Number', 'Team Name', 'Total Matches', 'Avg Autonomous', 'Avg Teleop', 'Avg Endgame', 'Avg Total Score', 'Avg Defense', 'Avg Downtime', 'Broke %', 'Best Score', 'Worst Score', 'Consistency Score'],
      ...teamComparisons.map(team => [
        team.team_number,
        team.team_name,
        team.total_matches,
        team.avg_autonomous_points,
        team.avg_teleop_points,
        team.avg_endgame_points,
        team.avg_total_score,
        team.avg_defense_rating,
        team.avg_downtime ?? '',
        team.broke_rate ?? '',
        team.best_score,
        team.worst_score,
        team.consistency_score
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getBestTeam = (metric: keyof TeamComparison) => {
    if (teamComparisons.length === 0) return null;
    return teamComparisons.reduce((best, current) => {
      const currentVal = current[metric];
      const bestVal = best[metric];
      if (typeof currentVal === 'number' && typeof bestVal === 'number') {
        return currentVal > bestVal ? current : best;
      }
      return best;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user && !isCompetitionMode) {
    router.push('/');
    return null;
  }

  const backToCompetitionHref = competitionId
    ? `/view-data?id=${competitionId}`
    : eventKey
      ? `/view-data?event_key=${encodeURIComponent(eventKey)}`
      : null;

  return (
    <Layout>
      <div className="min-h-full p-6 data-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            {backToCompetitionHref && (
              <div className="mb-4">
                <Link href={backToCompetitionHref} className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                  ← Back to {competitionName || 'Competition'}
                </Link>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Team Comparison
                </h1>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {competitionName ? `Compare teams at ${competitionName}` : 'Compare multiple teams side-by-side for strategic analysis'}
                </p>
              </div>
              {teamComparisons.length > 0 && (
                <Button
                  onClick={exportComparison}

                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Comparison
                </Button>
              )}
            </div>
          </div>

          {/* Team Selection */}
          <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className={`flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Users className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </motion.div>
                <span>Select Teams to Compare</span>
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Add up to 4 teams for detailed comparison analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
                <select
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={teamsLoading || loading}
                  className={`flex-1 px-3 py-3 sm:py-2 border rounded-md text-sm sm:text-base min-h-[44px] ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-background border-border text-foreground'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">
                    {teamsLoading ? 'Loading teams...' : 'Select a team to compare'}
                  </option>
                  {availableTeams
                    .filter(team => !selectedTeams.includes(team.team_number))
                    .map(team => (
                      <option key={team.team_number} value={team.team_number.toString()}>
                        {team.team_name} ({team.team_number})
                      </option>
                    ))}
                </select>
                <Button
                  onClick={handleAddTeam}
                  disabled={!inputValue || loading || selectedTeams.length >= 4 || teamsLoading}
                  className="px-6 py-3 sm:py-2 text-sm sm:text-base"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Add Team</span>
                      <span className="sm:hidden">Add</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Selected Teams - show team names from teamComparisons */}
              {selectedTeams.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {teamComparisons.map(team => (
                    <motion.div
                      key={team.team_number}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
                        }`}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        {team.team_name}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ({team.team_number})
                      </span>
                      <button
                        onClick={() => removeTeam(team.team_number)}
                        className={`hover:bg-red-500/20 rounded-full p-1 transition-colors`}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
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

          {/* Comparison Results */}
          {teamComparisons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Best Avg Score
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {getBestTeam('avg_total_score')?.avg_total_score || 0}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {getBestTeam('avg_total_score')?.team_name || 'N/A'}
                        </p>
                      </div>
                      <Award className={`w-8 h-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Most Consistent
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {getBestTeam('consistency_score')?.consistency_score || 0}%
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {getBestTeam('consistency_score')?.team_name || 'N/A'}
                        </p>
                      </div>
                      <TrendingUp className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Best Defense
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {getBestTeam('avg_defense_rating')?.avg_defense_rating || 0}/10
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {getBestTeam('avg_defense_rating')?.team_name || 'N/A'}
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
                          Highest Score
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {getBestTeam('best_score')?.best_score || 0}
                        </p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {getBestTeam('best_score')?.team_name || 'N/A'}
                        </p>
                      </div>
                      <Zap className={`w-8 h-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Comparison Table */}
              <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <CardHeader>
                  <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Detailed Comparison
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Side-by-side comparison of all selected teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-4">
                    {teamComparisons.map((team, index) => (
                      <div key={team.team_number} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {team.team_name}
                          </h3>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                            {team.team_number}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Matches:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.total_matches}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Score:</span>
                            <span className={`ml-2 font-semibold text-blue-600`}>{team.avg_total_score}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Auto:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_autonomous_points}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Teleop:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_teleop_points}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Endgame:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_endgame_points}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Defense:</span>
                            <span className={`ml-2 font-semibold ${team.avg_defense_rating >= 7 ? 'text-green-600' :
                              team.avg_defense_rating >= 5 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                              {team.avg_defense_rating}/10
                            </span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Downtime:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {team.avg_downtime != null ? `${team.avg_downtime}s` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Broke %:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {team.broke_rate != null ? `${team.broke_rate}%` : '—'}
                            </span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Auto Fuel:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_auto_fuel ?? '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Teleop Fuel:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_teleop_fuel ?? '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Climb Pts:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_climb_pts ?? '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Uptime %:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_uptime_pct != null ? `${team.avg_uptime_pct}%` : '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>CLANK:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.clank != null ? `${team.clank}` : '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg climb speed:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.avg_climb_speed_sec != null ? `${team.avg_climb_speed_sec}s` : '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>RPMAGIC:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.rpmagic ?? '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>GOBLIN:</span>
                            <span className={`ml-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{team.goblin ?? '—'}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Best:</span>
                            <span className={`ml-2 font-semibold text-green-600`}>{team.best_score}</span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Consistency:</span>
                            <span className={`ml-2 font-semibold ${team.consistency_score >= 80 ? 'text-green-600' :
                              team.consistency_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                              {team.consistency_score}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Team Name
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Matches
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Avg Score
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
                            Broke %
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Auto Fuel</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Teleop Fuel</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Climb</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Uptime %</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>CLANK</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Avg climb speed</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>RPMAGIC</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>GOBLIN</th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Best
                          </th>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Consistency
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamComparisons.map((team, index) => (
                          <motion.tr
                            key={team.team_number}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                          >
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              <div>
                                <div className="font-semibold">{team.team_name}</div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Team {team.team_number}
                                </div>
                              </div>
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {team.total_matches}
                            </td>
                            <td className={`py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {team.avg_total_score}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.avg_autonomous_points}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.avg_teleop_points}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.avg_endgame_points}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.avg_defense_rating}/10
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.avg_downtime != null ? `${team.avg_downtime}s` : '—'}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.broke_rate != null ? `${team.broke_rate}%` : '—'}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.avg_auto_fuel ?? '—'}</td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.avg_teleop_fuel ?? '—'}</td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.avg_climb_pts ?? '—'}</td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.avg_uptime_pct != null ? `${team.avg_uptime_pct}%` : '—'}</td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.clank != null ? `${team.clank}` : '—'}</td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.avg_climb_speed_sec != null ? `${team.avg_climb_speed_sec}s` : '—'}</td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.rpmagic ?? '—'}</td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{team.goblin ?? '—'}</td>
                            <td className={`py-3 px-4 font-semibold text-green-400`}>
                              {team.best_score}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.consistency_score}%
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Visual Comparison Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Average Scores Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {teamComparisons.map((team, index) => (
                        <div key={team.team_number} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.team_name}
                            </span>
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {team.avg_total_score}
                            </span>
                          </div>
                          <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(team.avg_total_score / Math.max(...teamComparisons.map(t => t.avg_total_score))) * 100}%` }}
                              transition={{ duration: 1, delay: index * 0.2 }}
                              className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Consistency Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {teamComparisons.map((team, index) => (
                        <div key={team.team_number} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {team.team_name}
                            </span>
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {team.consistency_score}%
                            </span>
                          </div>
                          <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${team.consistency_score}%` }}
                              transition={{ duration: 1, delay: index * 0.2 }}
                              className="h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
