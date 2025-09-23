import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BarChart3, TrendingUp, Target, Users, Play, TreePine, Waves, Database } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

export default function BasicAnalysis() {
  const { data: session } = useSession();
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleTeamSearch = async () => {
    if (!selectedTeam) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch team data from Supabase
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', selectedTeam)
        .single();
      
      if (teamError && teamError.code !== 'PGRST116') {
        throw new Error('Failed to fetch team data');
      }
      
      // Fetch scouting data for this team from Supabase
      const { data: scoutingData, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', selectedTeam)
        .order('created_at', { ascending: false });
      
      if (scoutingError) {
        throw new Error('Failed to fetch scouting data');
      }
      
      if (!scoutingData || scoutingData.length === 0) {
        setError('No scouting data available for this team');
        setTeamStats(null);
        setRecentMatches([]);
        return;
      }
      
      // Calculate statistics
      const totalMatches = scoutingData.length;
      const avgAutonomous = scoutingData.reduce((sum: number, match: any) => sum + (match.autonomous_points || 0), 0) / totalMatches;
      const avgTeleop = scoutingData.reduce((sum: number, match: any) => sum + (match.teleop_points || 0), 0) / totalMatches;
      const avgEndgame = scoutingData.reduce((sum: number, match: any) => sum + (match.endgame_points || 0), 0) / totalMatches;
      const avgTotal = scoutingData.reduce((sum: number, match: any) => sum + (match.final_score || 0), 0) / totalMatches;
      const avgDefense = scoutingData.reduce((sum: number, match: any) => sum + (match.defense_rating || 0), 0) / totalMatches;
      
      // Calculate win rate (simplified - you might want to implement actual win/loss logic)
      const winRate = 0.75; // Placeholder
      const consistencyScore = 0.82; // Placeholder
      
      setTeamStats({
        team_number: selectedTeam,
        team_name: teamData?.team_name || `Team ${selectedTeam}`,
        total_matches: totalMatches,
        avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
        avg_teleop_points: Math.round(avgTeleop * 100) / 100,
        avg_endgame_points: Math.round(avgEndgame * 100) / 100,
        avg_total_score: Math.round(avgTotal * 100) / 100,
        avg_defense_rating: Math.round(avgDefense * 100) / 100,
        win_rate: winRate,
        consistency_score: consistencyScore,
      });
      
      // Set recent matches (last 5)
      setRecentMatches(scoutingData.slice(0, 5));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
      setTeamStats(null);
      setRecentMatches([]);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
            <p className="text-gray-400 mb-6">Please sign in with Discord to access the data analysis.</p>
            <a
              href="/auth/signin"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Sign in with Discord
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout user={{
      name: session.user?.name || 'User',
      username: session.user?.email || undefined,
      image: session.user?.image || undefined,
    }}>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Avalanche Data Analysis</h1>
              <p className="text-gray-400">Comprehensive team performance insights and statistics</p>
            </div>
          </div>
        </motion.div>

        {/* Team Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <CardHeader>
              <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Team Search</CardTitle>
              <CardDescription className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Enter a team number to view their Avalanche performance statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Input
                  type="number"
                  placeholder="Team number (e.g., 1234)"
                  value={selectedTeam || ''}
                  onChange={(e) => setSelectedTeam(parseInt(e.target.value) || null)}
                  isDarkMode={isDarkMode}
                />
                <Button
                  onClick={handleTeamSearch}
                  disabled={!selectedTeam || loading}
                  isDarkMode={isDarkMode}
                >
                  {loading ? 'Loading...' : 'Search'}
                </Button>
              </div>
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team Statistics */}
        {teamStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <Card className="bg-dark-800 border-dark-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Matches</CardTitle>
                <BarChart3 className="h-4 w-4 text-reef-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{teamStats.total_matches}</div>
              </CardContent>
            </Card>

            <Card className="bg-dark-800 border-dark-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Avg Total Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-reef-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{teamStats.avg_total_score}</div>
              </CardContent>
            </Card>

            <Card className="bg-dark-800 border-dark-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-reef-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{(teamStats.win_rate * 100).toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card className="bg-dark-800 border-dark-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Consistency</CardTitle>
                <Users className="h-4 w-4 text-reef-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{(teamStats.consistency_score * 100).toFixed(1)}%</div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Detailed Statistics */}
        {teamStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <Card className="bg-dark-800 border-dark-700">
              <CardHeader>
                <CardTitle className="text-white">Scoring Breakdown</CardTitle>
                <CardDescription className="text-gray-400">
                  Average points by game period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Autonomous</span>
                  <span className="text-white font-semibold">{teamStats.avg_autonomous_points} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Teleop</span>
                  <span className="text-white font-semibold">{teamStats.avg_teleop_points} pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Endgame</span>
                  <span className="text-white font-semibold">{teamStats.avg_endgame_points} pts</span>
                </div>
                <div className="border-t border-dark-600 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-reef-400 font-bold text-lg">{teamStats.avg_total_score} pts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-dark-800 border-dark-700">
              <CardHeader>
                <CardTitle className="text-white">Performance Metrics</CardTitle>
                <CardDescription className="text-gray-400">
                  Additional team performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Defense Rating</span>
                  <span className="text-white font-semibold">{teamStats.avg_defense_rating}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-white font-semibold">{(teamStats.win_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Consistency</span>
                  <span className="text-white font-semibold">{(teamStats.consistency_score * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <CardHeader>
                <CardTitle className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Matches</CardTitle>
                <CardDescription className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Latest 5 matches for Team {selectedTeam}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentMatches.map((match, index) => (
                    <div key={match.id} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Match {match.match_id}
                          </p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(match.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {match.final_score} pts
                          </p>
                          <div className="flex space-x-2 text-xs">
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Auto: {match.autonomous_points}
                            </span>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Teleop: {match.teleop_points}
                            </span>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              End: {match.endgame_points}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* No Team Selected */}
        {!teamStats && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Team Selected</h3>
            <p className="text-gray-400">
              Enter a team number above to view their Avalanche performance statistics
            </p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
