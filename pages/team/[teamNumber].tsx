import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { Button } from '../../components/ui';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft,
  Database, 
  Calendar,
  User,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  MessageSquare,
  Award,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ScoutingData, Team, ScoringNotes } from '@/lib/types';

interface TeamDetailProps {}

const TeamDetail: React.FC<TeamDetailProps> = () => {
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
    const avgEndgame = scoutingData.reduce((sum, data) => sum + (data.endgame_points || 0), 0) / totalMatches;
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
      avgAutonomous: Math.round(avgAutonomous * 100) / 100,
      avgTeleop: Math.round(avgTeleop * 100) / 100,
      avgEndgame: Math.round(avgEndgame * 100) / 100,
      avgTotal: Math.round(avgTotal * 100) / 100,
      avgDefense: Math.round(avgDefense * 100) / 100,
      bestScore,
      worstScore,
      consistencyScore: Math.round(consistencyScore * 100) / 100
    };
  };

  const renderScoringBreakdown = (notes: ScoringNotes) => {
    const scoringElements = [
      // Autonomous
      { label: 'Auto Leave', value: notes.auto_leave, points: 3, period: 'Autonomous' },
      { label: 'Auto Coral Trough', value: notes.auto_coral_trough, points: 3, period: 'Autonomous' },
      { label: 'Auto Coral L2', value: notes.auto_coral_l2, points: 4, period: 'Autonomous' },
      { label: 'Auto Coral L3', value: notes.auto_coral_l3, points: 6, period: 'Autonomous' },
      { label: 'Auto Coral L4', value: notes.auto_coral_l4, points: 7, period: 'Autonomous' },
      { label: 'Auto Algae Processor', value: notes.auto_algae_processor, points: 6, period: 'Autonomous' },
      { label: 'Auto Algae Net', value: notes.auto_algae_net, points: 4, period: 'Autonomous' },
      
      // Teleop
      { label: 'Teleop Coral Trough', value: notes.teleop_coral_trough, points: 2, period: 'Teleop' },
      { label: 'Teleop Coral L2', value: notes.teleop_coral_l2, points: 3, period: 'Teleop' },
      { label: 'Teleop Coral L3', value: notes.teleop_coral_l3, points: 4, period: 'Teleop' },
      { label: 'Teleop Coral L4', value: notes.teleop_coral_l4, points: 5, period: 'Teleop' },
      { label: 'Teleop Algae Processor', value: notes.teleop_algae_processor, points: 6, period: 'Teleop' },
      { label: 'Teleop Algae Net', value: notes.teleop_algae_net, points: 4, period: 'Teleop' },
      
      // Endgame
      { label: 'Park', value: notes.endgame_park, points: 2, period: 'Endgame' },
      { label: 'Shallow Cage', value: notes.endgame_shallow_cage, points: 6, period: 'Endgame' },
      { label: 'Deep Cage', value: notes.endgame_deep_cage, points: 12, period: 'Endgame' },
    ];

    const autonomousElements = scoringElements.filter(el => el.period === 'Autonomous');
    const teleopElements = scoringElements.filter(el => el.period === 'Teleop');
    const endgameElements = scoringElements.filter(el => el.period === 'Endgame');

    return (
      <div className="space-y-6">
        {/* Autonomous Period */}
        <div>
          <h4 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Autonomous Period
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {autonomousElements.map((element, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{element.label}</span>
                <div className="flex items-center gap-2">
                  {typeof element.value === 'boolean' ? (
                    element.value ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )
                  ) : (
                    <span className="text-sm font-semibold">{element.value || 0}</span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {element.points}pts
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Teleop Period */}
        <div>
          <h4 className="text-lg font-semibold text-secondary mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Teleop Period
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teleopElements.map((element, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{element.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{element.value || 0}</span>
                  <Badge variant="outline" className="text-xs">
                    {element.points}pts
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Endgame Period */}
        <div>
          <h4 className="text-lg font-semibold text-warning mb-3 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Endgame Period
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {endgameElements.map((element, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{element.label}</span>
                <div className="flex items-center gap-2">
                  {typeof element.value === 'boolean' ? (
                    element.value ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )
                  ) : (
                    <span className="text-sm font-semibold">{element.value || 0}</span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {element.points}pts
                  </Badge>
                </div>
              </div>
            ))}
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!team) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Team Not Found</h3>
            <p className="text-muted-foreground mb-4">The requested team could not be found.</p>
            <Button onClick={() => router.push('/analysis/data')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Data Analysis
            </Button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => router.push('/analysis/data')} 
                variant="outline" 
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground font-display flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
                    {team.team_number}
                  </Badge>
                  {team.team_name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Detailed scouting analysis and match breakdowns
                </p>
              </div>
            </div>
          </motion.div>

          {/* Team Overview Stats */}
          {teamStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Team Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{teamStats.totalMatches}</div>
                      <div className="text-sm text-muted-foreground">Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{teamStats.avgTotal}</div>
                      <div className="text-sm text-muted-foreground">Avg Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">{teamStats.avgAutonomous}</div>
                      <div className="text-sm text-muted-foreground">Avg Auto</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">{teamStats.avgTeleop}</div>
                      <div className="text-sm text-muted-foreground">Avg Teleop</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{teamStats.avgEndgame}</div>
                      <div className="text-sm text-muted-foreground">Avg Endgame</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{teamStats.avgDefense}/10</div>
                      <div className="text-sm text-muted-foreground">Avg Defense</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{teamStats.consistencyScore}%</div>
                      <div className="text-sm text-muted-foreground">Consistency</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{teamStats.bestScore}</div>
                      <div className="text-sm text-muted-foreground">Best Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{teamStats.worstScore}</div>
                      <div className="text-sm text-muted-foreground">Worst Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Individual Match Data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Individual Match Data ({scoutingData.length} matches)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scoutingData.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Scouting Data</h3>
                    <p className="text-muted-foreground">
                      No scouting data has been collected for this team yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scoutingData.map((data, index) => (
                      <motion.div
                        key={data.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="font-mono">
                              {data.match_id}
                            </Badge>
                            <Badge 
                              variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                            >
                              {data.alliance_color.toUpperCase()} Alliance
                            </Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {new Date(data.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-4 h-4" />
                              {data.submitted_by_name || 'Unknown'}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{data.final_score}</div>
                              <div className="text-sm text-muted-foreground">Total Score</div>
                            </div>
                            <Button
                              size="sm"
                              variant={selectedMatch === data.id ? "default" : "outline"}
                              onClick={() => setSelectedMatch(selectedMatch === data.id ? null : data.id)}
                            >
                              {selectedMatch === data.id ? 'Hide Details' : 'Show Details'}
                            </Button>
                          </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-semibold text-blue-600">{data.autonomous_points}</div>
                            <div className="text-sm text-muted-foreground">Autonomous</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-semibold text-green-600">{data.teleop_points}</div>
                            <div className="text-sm text-muted-foreground">Teleop</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-lg font-semibold text-yellow-600">{data.endgame_points}</div>
                            <div className="text-sm text-muted-foreground">Endgame</div>
                          </div>
                        </div>

                        {/* Defense Rating */}
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Defense Rating:</span>
                          <div className="flex items-center gap-1">
                            {[...Array(10)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < (data.defense_rating || 0) ? 'bg-yellow-500' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm font-semibold">{data.defense_rating || 0}/10</span>
                          </div>
                        </div>

                        {/* Comments */}
                        {data.comments && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Comments:</span>
                            </div>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                              {data.comments}
                            </p>
                          </div>
                        )}

                        {/* Detailed Scoring Breakdown */}
                        {selectedMatch === data.id && data.notes && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t"
                          >
                            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <Activity className="w-5 h-5" />
                              Detailed Scoring Breakdown
                            </h4>
                            {renderScoringBreakdown(data.notes as ScoringNotes)}
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default TeamDetail;
