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
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Download
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

interface TeamComparison {
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
}

export default function TeamComparison() {
  const { user, loading: authLoading } = useSupabase();
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [teamComparisons, setTeamComparisons] = useState<TeamComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const addTeam = async (teamNumber: number) => {
    if (selectedTeams.includes(teamNumber) || selectedTeams.length >= 4) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', teamNumber)
        .single();

      if (teamError) {
        throw new Error(`Team ${teamNumber} not found`);
      }

      // Fetch scouting data
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

      // Calculate statistics
      const totalMatches = scoutingData.length;
      const scores = scoutingData.map(match => match.final_score || 0);
      const autonomousScores = scoutingData.map(match => match.autonomous_points || 0);
      const teleopScores = scoutingData.map(match => match.teleop_points || 0);
      const endgameScores = scoutingData.map(match => match.endgame_points || 0);
      const defenseRatings = scoutingData.map(match => match.defense_rating || 0);

      // Calculate averages
      const avgAutonomous = autonomousScores.reduce((sum, score) => sum + score, 0) / totalMatches;
      const avgTeleop = teleopScores.reduce((sum, score) => sum + score, 0) / totalMatches;
      const avgEndgame = endgameScores.reduce((sum, score) => sum + score, 0) / totalMatches;
      const avgTotal = scores.reduce((sum, score) => sum + score, 0) / totalMatches;
      const avgDefense = defenseRatings.reduce((sum, rating) => sum + rating, 0) / totalMatches;

      // Calculate consistency
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgTotal, 2), 0) / totalMatches;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 100 - (standardDeviation / avgTotal) * 100);

      const teamComparison: TeamComparison = {
        team_number: teamNumber,
        team_name: teamData?.team_name || `Team ${teamNumber}`,
        total_matches: totalMatches,
        avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
        avg_teleop_points: Math.round(avgTeleop * 100) / 100,
        avg_endgame_points: Math.round(avgEndgame * 100) / 100,
        avg_total_score: Math.round(avgTotal * 100) / 100,
        avg_defense_rating: Math.round(avgDefense * 100) / 100,
        best_score: Math.max(...scores),
        worst_score: Math.min(...scores),
        consistency_score: Math.round(consistencyScore * 100) / 100,
        win_rate: 0.75 // Placeholder
      };

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
      ['Team Number', 'Team Name', 'Total Matches', 'Avg Autonomous', 'Avg Teleop', 'Avg Endgame', 'Avg Total Score', 'Avg Defense', 'Best Score', 'Worst Score', 'Consistency Score'],
      ...teamComparisons.map(team => [
        team.team_number,
        team.team_name,
        team.total_matches,
        team.avg_autonomous_points,
        team.avg_teleop_points,
        team.avg_endgame_points,
        team.avg_total_score,
        team.avg_defense_rating,
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
    return teamComparisons.reduce((best, current) => 
      current[metric] > best[metric] ? current : best
    );
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
          <p className="text-white text-lg">Please sign in to access team comparison</p>
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
                  Team Comparison
                </h1>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Compare multiple teams side-by-side for strategic analysis
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
          <Card className={`mb-8 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
              <div className="flex space-x-4 mb-4">
                <Input
                  type="number"
                  placeholder="Enter team number (e.g., 1234)"
                  value={inputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                  
                  className="flex-1"
                />
                <Button
                  onClick={handleAddTeam}
                  disabled={!inputValue || loading || selectedTeams.length >= 4}
                  
                  className="px-6"
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
                      Add Team
                    </>
                  )}
                </Button>
              </div>

              {/* Selected Teams */}
              {selectedTeams.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTeams.map(teamNumber => (
                    <motion.div
                      key={teamNumber}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                        isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        Team {teamNumber}
                      </span>
                      <button
                        onClick={() => removeTeam(teamNumber)}
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
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                          Team {getBestTeam('avg_total_score')?.team_number || 'N/A'}
                        </p>
                      </div>
                      <Award className={`w-8 h-8 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                          Team {getBestTeam('consistency_score')?.team_number || 'N/A'}
                        </p>
                      </div>
                      <TrendingUp className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                          Team {getBestTeam('avg_defense_rating')?.team_number || 'N/A'}
                        </p>
                      </div>
                      <Shield className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                          Team {getBestTeam('best_score')?.team_number || 'N/A'}
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <th className={`text-left py-3 px-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Team
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
                                <div className="font-semibold">Team {team.team_number}</div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {team.team_name}
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
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                              Team {team.team_number}
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

                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                              Team {team.team_number}
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
