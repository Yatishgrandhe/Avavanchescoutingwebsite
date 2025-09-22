import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BarChart3, TrendingUp, Target, Users } from 'lucide-react';
import Layout from '@/components/layout/Layout';

export default function BasicAnalysis() {
  const { data: session } = useSession();
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTeamSearch = async () => {
    if (!selectedTeam) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/teams?team_number=${selectedTeam}`);
      if (!response.ok) {
        throw new Error('Team not found');
      }
      
      const teamData = await response.json();
      
      // Fetch scouting data for this team
      const scoutingResponse = await fetch(`/api/scouting_data?team_number=${selectedTeam}`);
      const scoutingData = await scoutingResponse.json();
      
      if (scoutingData.length === 0) {
        setError('No scouting data available for this team');
        setTeamStats(null);
        return;
      }
      
      // Calculate statistics
      const totalMatches = scoutingData.length;
      const avgAutonomous = scoutingData.reduce((sum: number, match: any) => sum + match.autonomous_points, 0) / totalMatches;
      const avgTeleop = scoutingData.reduce((sum: number, match: any) => sum + match.teleop_points, 0) / totalMatches;
      const avgEndgame = scoutingData.reduce((sum: number, match: any) => sum + match.endgame_points, 0) / totalMatches;
      const avgTotal = scoutingData.reduce((sum: number, match: any) => sum + match.final_score, 0) / totalMatches;
      const avgDefense = scoutingData.reduce((sum: number, match: any) => sum + match.defense_rating, 0) / totalMatches;
      
      // Calculate win rate (simplified - you might want to implement actual win/loss logic)
      const winRate = 0.75; // Placeholder
      const consistencyScore = 0.82; // Placeholder
      
      setTeamStats({
        team_number: selectedTeam,
        team_name: teamData.team_name || `Team ${selectedTeam}`,
        total_matches: totalMatches,
        avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
        avg_teleop_points: Math.round(avgTeleop * 100) / 100,
        avg_endgame_points: Math.round(avgEndgame * 100) / 100,
        avg_total_score: Math.round(avgTotal * 100) / 100,
        avg_defense_rating: Math.round(avgDefense * 100) / 100,
        win_rate: winRate,
        consistency_score: consistencyScore,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
      setTeamStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to access analysis</h1>
          <p className="text-gray-400">You need to be authenticated to view team analysis.</p>
        </div>
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
          <h1 className="text-3xl font-bold text-white mb-2">Basic Analysis</h1>
          <p className="text-gray-400">Quick insights and statistics for team performance</p>
        </motion.div>

        {/* Team Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-dark-800 border-dark-700">
            <CardHeader>
              <CardTitle className="text-white">Team Search</CardTitle>
              <CardDescription className="text-gray-400">
                Enter a team number to view their statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Input
                  type="number"
                  placeholder="Team number (e.g., 1234)"
                  value={selectedTeam || ''}
                  onChange={(e) => setSelectedTeam(parseInt(e.target.value) || null)}
                  className="flex-1 bg-dark-700 border-dark-600 text-white"
                />
                <Button
                  onClick={handleTeamSearch}
                  disabled={!selectedTeam || loading}
                  className="bg-reef-600 hover:bg-reef-700 text-white"
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

        {/* No Team Selected */}
        {!teamStats && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-reef-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Team Selected</h3>
            <p className="text-gray-400">
              Enter a team number above to view their performance statistics
            </p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
