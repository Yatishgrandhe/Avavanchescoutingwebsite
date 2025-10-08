import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
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
  Download
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

interface TeamStats {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_endgame_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  best_score: number;
  worst_score: number;
  consistency_score: number;
  win_rate: number;
  recent_performance: Array<{
    match_id: string;
    final_score: number;
    autonomous_points: number;
    teleop_points: number;
    endgame_points: number;
    defense_rating: number;
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
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [filters, setFilters] = useState<AnalysisFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Array<{team_number: number, team_name: string}>>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

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
  }, [user]);

  const handleTeamSearch = async () => {
    if (!selectedTeam) return;
    
    setLoading(true);
    setError(null);
    
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

      // Fetch scouting data with filters
      let scoutingQuery = supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', selectedTeam)
        .order('created_at', { ascending: false });

      if (filters.event_key) {
        scoutingQuery = scoutingQuery.eq('event_key', filters.event_key);
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
        return;
      }

      // Calculate advanced statistics
      const totalMatches = scoutingData.length;
      const scores = scoutingData.map((match: any) => match.final_score || 0);
      const autonomousScores = scoutingData.map((match: any) => match.autonomous_points || 0);
      const teleopScores = scoutingData.map((match: any) => match.teleop_points || 0);
      const endgameScores = scoutingData.map((match: any) => match.endgame_points || 0);
      const defenseRatings = scoutingData.map((match: any) => match.defense_rating || 0);

      // Calculate averages
      const avgAutonomous = autonomousScores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgTeleop = teleopScores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgEndgame = endgameScores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgTotal = scores.reduce((sum: number, score: number) => sum + score, 0) / totalMatches;
      const avgDefense = defenseRatings.reduce((sum: number, rating: number) => sum + rating, 0) / totalMatches;

      // Calculate consistency (standard deviation)
      const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgTotal, 2), 0) / totalMatches;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 100 - (standardDeviation / avgTotal) * 100);

      // Calculate best/worst scores
      const bestScore = Math.max(...scores);
      const worstScore = Math.min(...scores);

      // Calculate win rate (simplified - you might want to implement actual win/loss logic)
      const winRate = 0.75; // Placeholder - would need actual match results

      setTeamStats({
        team_number: selectedTeam,
        team_name: teamData?.team_name || `Team ${selectedTeam}`,
        total_matches: totalMatches,
        avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
        avg_teleop_points: Math.round(avgTeleop * 100) / 100,
        avg_endgame_points: Math.round(avgEndgame * 100) / 100,
        avg_total_score: Math.round(avgTotal * 100) / 100,
        avg_defense_rating: Math.round(avgDefense * 100) / 100,
        best_score: bestScore,
        worst_score: worstScore,
        consistency_score: Math.round(consistencyScore * 100) / 100,
        win_rate: winRate,
        recent_performance: scoutingData.slice(0, 10).map((match: any) => ({
          match_id: match.match_id,
          final_score: match.final_score || 0,
          autonomous_points: match.autonomous_points || 0,
          teleop_points: match.teleop_points || 0,
          endgame_points: match.endgame_points || 0,
          defense_rating: match.defense_rating || 0,
          created_at: match.created_at
        }))
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
      setTeamStats(null);
    } finally {
      setLoading(false);
    }
  };

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
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Please sign in to access advanced analysis</p>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-full p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Advanced Team Analysis
                </h1>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Deep insights into team performance and strategic analysis
                </p>
              </div>
              <div className="flex items-center space-x-3">
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
              <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      
                      placeholder="e.g., 2025mabos"
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
          <Card className={`mb-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
              <div className="flex space-x-4">
                <select
                  value={selectedTeam || ''}
                  onChange={(e) => setSelectedTeam(parseInt(e.target.value) || null)}
                  disabled={teamsLoading || loading}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
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
                  className="px-8"
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
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Avg Score
                        </p>
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {teamStats.avg_total_score}
                        </p>
                      </div>
                      <BarChart3 className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <CardHeader>
                    <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Scoring Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Autonomous</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {teamStats.avg_autonomous_points} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Teleop</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {teamStats.avg_teleop_points} pts
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

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
              <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                              {match.endgame_points}
                            </td>
                            <td className={`py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {match.defense_rating}/10
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
