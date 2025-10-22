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
  AlertCircle,
  Trophy,
  MapPin,
  Users,
  FileText
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ScoutingData, Team, ScoringNotes } from '@/lib/types';

interface TeamHistoryProps {}

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

      // Load team information from past teams
      const { data: teamData, error: teamError } = await supabase
        .from('past_teams')
        .select('*')
        .eq('team_number', teamNum)
        .single();

      if (teamError) {
        // If not found in past_teams, try current teams table as fallback
        const { data: currentTeamData, error: currentTeamError } = await supabase
          .from('teams')
          .select('*')
          .eq('team_number', teamNum)
          .single();
        
        if (currentTeamError) throw teamError; // Use original error
        setTeam(currentTeamData);
      } else {
        setTeam(teamData);
      }

      // Load all past competitions
      const { data: pastCompetitions, error: compError } = await supabase
        .from('past_competitions')
        .select('*')
        .order('competition_year', { ascending: false });

      if (compError) throw compError;

      // Load scouting data for each competition
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
          const bestScore = Math.max(...scores);
          const worstScore = Math.min(...scores);
          
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
            avgScore: Math.round(avgScore * 100) / 100,
            bestScore,
            worstScore,
            consistency: Math.round(consistency * 100) / 100
          });
        }
      }

      // If team was found in current teams table, also load current scouting data
      if (teamData && teamData.competition_id) {
        // This is a past team, data already loaded above
      } else {
        // This is a current team, load current scouting data
        const { data: currentScoutingData, error: currentScoutingError } = await supabase
          .from('scouting_data')
          .select('*')
          .eq('team_number', teamNum)
          .order('created_at', { ascending: false });

        if (!currentScoutingError && currentScoutingData && currentScoutingData.length > 0) {
          const scores = currentScoutingData.map((d: ScoutingData) => d.final_score || 0);
          const avgScore = scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length;
          const bestScore = Math.max(...scores);
          const worstScore = Math.min(...scores);
          
          // Calculate consistency
          const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
          const standardDeviation = Math.sqrt(variance);
          const consistency = Math.max(0, 100 - (standardDeviation / avgScore) * 100);

          competitionsData.push({
            competition_id: 'current',
            competition_name: 'Current Competition',
            competition_year: new Date().getFullYear(),
            competition_key: 'current',
            scoutingData: currentScoutingData,
            pitScoutingData: [],
            totalMatches: currentScoutingData.length,
            avgScore: Math.round(avgScore * 100) / 100,
            bestScore,
            worstScore,
            consistency: Math.round(consistency * 100) / 100
          });
        }
      }

      // Calculate overall statistics
      const allScoutingData = competitionsData.flatMap(comp => comp.scoutingData);
      const allScores = allScoutingData.map((d: ScoutingData) => d.final_score || 0);
      const totalMatches = allScoutingData.length;
      
      if (totalMatches > 0) {
        const overallAvgScore = allScores.reduce((sum: number, val: number) => sum + val, 0) / totalMatches;
        const overallBestScore = Math.max(...allScores);
        const overallWorstScore = Math.min(...allScores);
        
        // Calculate overall consistency
        const overallVariance = allScores.reduce((sum: number, score: number) => sum + Math.pow(score - overallAvgScore, 2), 0) / totalMatches;
        const overallStandardDeviation = Math.sqrt(overallVariance);
        const overallConsistency = Math.max(0, 100 - (overallStandardDeviation / overallAvgScore) * 100);

        // Calculate averages by period
        const avgAutonomous = allScoutingData.reduce((sum: number, data: ScoutingData) => sum + (data.autonomous_points || 0), 0) / totalMatches;
        const avgTeleop = allScoutingData.reduce((sum: number, data: ScoutingData) => sum + (data.teleop_points || 0), 0) / totalMatches;
        const avgEndgame = allScoutingData.reduce((sum: number, data: ScoutingData) => sum + (data.endgame_points || 0), 0) / totalMatches;
        const avgDefense = allScoutingData.reduce((sum: number, data: ScoutingData) => sum + (data.defense_rating || 0), 0) / totalMatches;

        setOverallStats({
          totalMatches,
          avgScore: Math.round(overallAvgScore * 100) / 100,
          avgAutonomous: Math.round(avgAutonomous * 100) / 100,
          avgTeleop: Math.round(avgTeleop * 100) / 100,
          avgEndgame: Math.round(avgEndgame * 100) / 100,
          avgDefense: Math.round(avgDefense * 100) / 100,
          bestScore: overallBestScore,
          worstScore: overallWorstScore,
          consistency: Math.round(overallConsistency * 100) / 100,
          competitionsPlayed: competitionsData.length
        });
      }

      setTeam(teamData);
      setCompetitions(competitionsData);
    } catch (error) {
      console.error('Error loading team history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderScoringBreakdown = (notes: any) => {
    // Handle both flat and nested note structures
    const getValue = (path: string) => {
      if (notes.autonomous && notes.teleop && notes.endgame) {
        // Nested structure
        const parts = path.split('_');
        if (parts[0] === 'auto') {
          return notes.autonomous[path];
        } else if (parts[0] === 'teleop') {
          return notes.teleop[path];
        } else if (parts[0] === 'endgame') {
          return notes.endgame[path];
        }
      }
      // Flat structure fallback
      return notes[path];
    };

    const scoringElements = [
      // Autonomous
      { label: 'Auto Leave', value: getValue('auto_leave'), points: 3, period: 'Autonomous' },
      { label: 'Auto Coral Trough', value: getValue('auto_coral_trough'), points: 3, period: 'Autonomous' },
      { label: 'Auto Coral L2', value: getValue('auto_coral_l2'), points: 4, period: 'Autonomous' },
      { label: 'Auto Coral L3', value: getValue('auto_coral_l3'), points: 6, period: 'Autonomous' },
      { label: 'Auto Coral L4', value: getValue('auto_coral_l4'), points: 7, period: 'Autonomous' },
      { label: 'Auto Algae Processor', value: getValue('auto_algae_processor'), points: 6, period: 'Autonomous' },
      { label: 'Auto Algae Net', value: getValue('auto_algae_net'), points: 4, period: 'Autonomous' },
      { label: 'Auto Cleansing', value: getValue('auto_cleansing'), points: 0, period: 'Autonomous', isCleansing: true },
      
      // Teleop
      { label: 'Teleop Coral Trough', value: getValue('teleop_coral_trough'), points: 2, period: 'Teleop' },
      { label: 'Teleop Coral L2', value: getValue('teleop_coral_l2'), points: 3, period: 'Teleop' },
      { label: 'Teleop Coral L3', value: getValue('teleop_coral_l3'), points: 4, period: 'Teleop' },
      { label: 'Teleop Coral L4', value: getValue('teleop_coral_l4'), points: 5, period: 'Teleop' },
      { label: 'Teleop Algae Processor', value: getValue('teleop_algae_processor'), points: 6, period: 'Teleop' },
      { label: 'Teleop Algae Net', value: getValue('teleop_algae_net'), points: 4, period: 'Teleop' },
      { label: 'Teleop Cleansing', value: getValue('teleop_cleansing'), points: 0, period: 'Teleop', isCleansing: true },
      
      // Endgame
      { label: 'Park', value: getValue('endgame_park'), points: 2, period: 'Endgame' },
      { label: 'Shallow Cage', value: getValue('endgame_shallow_cage'), points: 6, period: 'Endgame' },
      { label: 'Deep Cage', value: getValue('endgame_deep_cage'), points: 12, period: 'Endgame' },
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
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                element.isCleansing ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-muted/50'
              }`}>
                <span className={`text-sm font-medium ${
                  element.isCleansing ? 'text-purple-700 dark:text-purple-300' : ''
                }`}>{element.label}</span>
                <div className="flex items-center gap-2">
                  {typeof element.value === 'boolean' ? (
                    element.value ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )
                  ) : (
                    <span className={`text-sm font-semibold ${
                      element.isCleansing ? 'text-purple-600 dark:text-purple-400' : ''
                    }`}>{element.value || 0}</span>
                  )}
                  {!element.isCleansing && (
                    <Badge variant="outline" className="text-xs">
                      {element.points}pts
                    </Badge>
                  )}
                  {element.isCleansing && (
                    <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                      No Points
                    </Badge>
                  )}
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
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                element.isCleansing ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-muted/50'
              }`}>
                <span className={`text-sm font-medium ${
                  element.isCleansing ? 'text-purple-700 dark:text-purple-300' : ''
                }`}>{element.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    element.isCleansing ? 'text-purple-600 dark:text-purple-400' : ''
                  }`}>{element.value || 0}</span>
                  {!element.isCleansing && (
                    <Badge variant="outline" className="text-xs">
                      {element.points}pts
                    </Badge>
                  )}
                  {element.isCleansing && (
                    <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                      No Points
                    </Badge>
                  )}
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
            <Button onClick={() => router.push('/past-competitions')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Past Competitions
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
                onClick={() => router.push('/past-competitions')} 
                variant="outline" 
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Past Competitions
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground font-display flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
                    {team.team_number}
                  </Badge>
                  {team.team_name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Complete historical analysis across all tournaments
                </p>
              </div>
            </div>
          </motion.div>

          {/* Overall Statistics */}
          {overallStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    All-Time Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{overallStats.totalMatches}</div>
                      <div className="text-sm text-muted-foreground">Total Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{overallStats.avgScore}</div>
                      <div className="text-sm text-muted-foreground">Avg Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">{overallStats.avgAutonomous}</div>
                      <div className="text-sm text-muted-foreground">Avg Auto</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">{overallStats.avgTeleop}</div>
                      <div className="text-sm text-muted-foreground">Avg Teleop</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{overallStats.avgEndgame}</div>
                      <div className="text-sm text-muted-foreground">Avg Endgame</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{overallStats.avgDefense}/10</div>
                      <div className="text-sm text-muted-foreground">Avg Defense</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{overallStats.consistency}%</div>
                      <div className="text-sm text-muted-foreground">Consistency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{overallStats.competitionsPlayed}</div>
                      <div className="text-sm text-muted-foreground">Competitions</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{overallStats.bestScore}</div>
                      <div className="text-sm text-muted-foreground">Best Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-red-600">{overallStats.worstScore}</div>
                      <div className="text-sm text-muted-foreground">Worst Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Competition Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Competition Performance ({competitions.length} tournaments)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {competitions.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Competition Data</h3>
                    <p className="text-muted-foreground">
                      No historical competition data found for this team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {competitions.map((comp, index) => (
                      <motion.div
                        key={comp.competition_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="font-mono">
                              {comp.competition_year}
                            </Badge>
                            <div>
                              <h4 className="font-semibold text-foreground">{comp.competition_name}</h4>
                              <p className="text-sm text-muted-foreground">{comp.competition_key}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              {comp.totalMatches} matches
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{comp.avgScore}</div>
                              <div className="text-sm text-muted-foreground">Avg Score</div>
                            </div>
                            <Button
                              size="sm"
                              variant={selectedCompetition === comp.competition_id ? "default" : "outline"}
                              onClick={() => setSelectedCompetition(selectedCompetition === comp.competition_id ? null : comp.competition_id)}
                            >
                              {selectedCompetition === comp.competition_id ? 'Hide Details' : 'Show Details'}
                            </Button>
                          </div>
                        </div>

                        {/* Competition Stats */}
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-semibold text-blue-600">{comp.bestScore}</div>
                            <div className="text-sm text-muted-foreground">Best Score</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-lg font-semibold text-red-600">{comp.worstScore}</div>
                            <div className="text-sm text-muted-foreground">Worst Score</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-semibold text-green-600">{comp.consistency}%</div>
                            <div className="text-sm text-muted-foreground">Consistency</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-lg font-semibold text-purple-600">{comp.totalMatches}</div>
                            <div className="text-sm text-muted-foreground">Matches</div>
                          </div>
                        </div>

                        {/* Individual Match Data */}
                        {selectedCompetition === comp.competition_id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t"
                          >
                            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              Individual Match Data
                            </h4>
                            <div className="space-y-3">
                              {comp.scoutingData.map((data, dataIndex) => (
                                <div key={data.id} className="p-3 bg-muted/30 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
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
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl font-bold text-primary">{data.final_score}</div>
                                      <div className="text-sm text-muted-foreground">Total Score</div>
                                    </div>
                                  </div>
                                  
                                  {/* Score Breakdown */}
                                  <div className="grid grid-cols-3 gap-3 mb-2">
                                    <div className="text-center p-2 bg-blue-50 rounded">
                                      <div className="text-sm font-semibold text-blue-600">{data.autonomous_points}</div>
                                      <div className="text-xs text-muted-foreground">Autonomous</div>
                                    </div>
                                    <div className="text-center p-2 bg-green-50 rounded">
                                      <div className="text-sm font-semibold text-green-600">{data.teleop_points}</div>
                                      <div className="text-xs text-muted-foreground">Teleop</div>
                                    </div>
                                    <div className="text-center p-2 bg-yellow-50 rounded">
                                      <div className="text-sm font-semibold text-yellow-600">{data.endgame_points}</div>
                                      <div className="text-xs text-muted-foreground">Endgame</div>
                                    </div>
                                  </div>

                                  {/* Defense Rating */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Defense Rating:</span>
                                    <div className="flex items-center gap-1">
                                      {[...Array(10)].map((_, i) => (
                                        <div
                                          key={i}
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            i < (data.defense_rating || 0) ? 'bg-yellow-500' : 'bg-gray-200'
                                          }`}
                                        />
                                      ))}
                                      <span className="ml-2 text-sm font-semibold">{data.defense_rating || 0}/10</span>
                                    </div>
                                  </div>

                                  {/* Comments */}
                                  {data.comments && (
                                    <div className="mb-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Comments:</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                        {data.comments}
                                      </p>
                                    </div>
                                  )}

                                  {/* Detailed Scoring Breakdown */}
                                  {data.notes && (
                                    <div className="mt-3 pt-3 border-t">
                                      <h5 className="text-md font-semibold mb-2 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        Detailed Scoring Breakdown
                                      </h5>
                                      {renderScoringBreakdown(data.notes)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
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

export default TeamHistory;
