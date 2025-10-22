import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Target, 
  BarChart3, 
  Eye, 
  Filter,
  Search,
  Clock,
  MapPin,
  ChevronRight,
  Database,
  Archive
} from 'lucide-react';

interface PastCompetition {
  id: string;
  competition_name: string;
  competition_key: string;
  competition_year: number;
  competition_location?: string;
  competition_date_start?: string;
  competition_date_end?: string;
  total_teams: number;
  total_matches: number;
  migrated_at: string;
  created_at: string;
}

interface CompetitionDetails {
  competition: PastCompetition;
  teams: any[];
  matches: any[];
  scoutingData: any[];
  pitScoutingData: any[];
  pickLists: any[];
}

export default function PastCompetitionsPage() {
  const router = useRouter();
  const { supabase, user, session } = useSupabase();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [competitions, setCompetitions] = useState<PastCompetition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (session && isAdmin) {
      loadCompetitions();
    }
  }, [session, isAdmin]);

  const loadCompetitions = async () => {
    if (!session) return;
    
    try {
      const response = await fetch('/api/past-competitions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCompetitions(data.competitions || []);
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompetitionDetails = async (competitionId: string) => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/past-competitions?id=${competitionId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSelectedCompetition(data);
      setShowDetails(true);
    } catch (error) {
      console.error('Error loading competition details:', error);
    }
  };

  const filteredCompetitions = competitions.filter(comp => {
    const matchesSearch = comp.competition_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comp.competition_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (comp.competition_location && comp.competition_location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesYear = !yearFilter || comp.competition_year.toString() === yearFilter;
    return matchesSearch && matchesYear;
  });

  const uniqueYears = Array.from(new Set(competitions.map(comp => comp.competition_year))).sort((a, b) => b - a);

  // Check if user is admin
  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Archive className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You need admin privileges to access past competitions.</p>
            <Button onClick={() => router.push('/')} className="bg-blue-500 hover:bg-blue-600">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading past competitions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Section */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1 sm:mb-2">
                    Past Competitions
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    View and analyze historical competition data
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {competitions.length} competitions archived
                  </span>
                </div>
              </div>
            </div>

            {/* Filters */}
            <Card className="p-4 sm:p-6 mb-6 rounded-lg shadow-sm border">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search competitions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">All Years</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year.toString()}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Competitions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredCompetitions.length === 0 ? (
                <div className="col-span-full">
                  <Card className="p-8 sm:p-12 text-center rounded-lg shadow-sm border">
                    <Archive className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                      No Competitions Found
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
                      {searchTerm || yearFilter 
                        ? 'No competitions match your search criteria.' 
                        : 'No past competitions have been archived yet.'}
                    </p>
                  </Card>
                </div>
              ) : (
                filteredCompetitions.map((competition) => (
                  <Card 
                    key={competition.id} 
                    className="p-4 sm:p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => loadCompetitionDetails(competition.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {competition.competition_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {competition.competition_key}
                        </p>
                        {competition.competition_location && (
                          <div className="flex items-center text-xs text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3 mr-1" />
                            {competition.competition_location}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-sm font-medium text-foreground">
                            {competition.total_teams}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Teams</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Target className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-foreground">
                            {competition.total_matches}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Matches</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {competition.competition_year}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(competition.migrated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Competition Details Modal */}
            {showDetails && selectedCompetition && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                          {selectedCompetition.competition.competition_name}
                        </h2>
                        <p className="text-muted-foreground">
                          {selectedCompetition.competition.competition_key} • {selectedCompetition.competition.competition_year}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowDetails(false)}
                        className="px-4 py-2"
                      >
                        Close
                      </Button>
                    </div>

                    {/* Competition Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Card className="p-4 text-center">
                        <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground">{selectedCompetition.teams.length}</p>
                        <p className="text-sm text-muted-foreground">Teams</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground">{selectedCompetition.matches.length}</p>
                        <p className="text-sm text-muted-foreground">Matches</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground">{selectedCompetition.scoutingData.length}</p>
                        <p className="text-sm text-muted-foreground">Scouting Records</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-foreground">{selectedCompetition.pickLists.length}</p>
                        <p className="text-sm text-muted-foreground">Pick Lists</p>
                      </Card>
                    </div>

                    {/* Match Schedule */}
                    <Card className="p-6 mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Match Schedule</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Match</th>
                              <th className="text-left py-2">Red Alliance</th>
                              <th className="text-left py-2">Blue Alliance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCompetition.matches.map((match) => (
                              <tr key={match.match_id} className="border-b">
                                <td className="py-2 font-medium">{match.match_number}</td>
                                <td className="py-2">
                                  <div className="flex space-x-1">
                                    {match.red_teams.map((team: number) => (
                                      <span key={team} className="px-2 py-1 rounded text-xs team-tag-red">
                                        {team}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2">
                                  <div className="flex space-x-1">
                                    {match.blue_teams.map((team: number) => (
                                      <span key={team} className="px-2 py-1 rounded text-xs team-tag-blue">
                                        {team}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing all {selectedCompetition.matches.length} matches
                        </p>
                      </div>
                    </Card>

                    {/* Team Statistics Analysis */}
                    <Card className="p-6 mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Team Performance Analysis</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Team</th>
                              <th className="text-left py-2">Matches</th>
                              <th className="text-left py-2">Avg Score</th>
                              <th className="text-left py-2">Auto</th>
                              <th className="text-left py-2">Teleop</th>
                              <th className="text-left py-2">Endgame</th>
                              <th className="text-left py-2">Defense</th>
                              <th className="text-left py-2">Best</th>
                              <th className="text-left py-2">Consistency</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // Calculate team statistics from scouting data
                              const teamStatsMap = new Map();
                              
                              // Initialize team stats
                              selectedCompetition.teams.forEach(team => {
                                teamStatsMap.set(team.team_number, {
                                  team_number: team.team_number,
                                  team_name: team.team_name,
                                  total_matches: 0,
                                  scores: [],
                                  autonomous_points: [],
                                  teleop_points: [],
                                  endgame_points: [],
                                  defense_ratings: []
                                });
                              });

                              // Aggregate scouting data
                              selectedCompetition.scoutingData.forEach(data => {
                                const teamStat = teamStatsMap.get(data.team_number);
                                if (teamStat) {
                                  teamStat.total_matches++;
                                  teamStat.scores.push(data.final_score || 0);
                                  teamStat.autonomous_points.push(data.autonomous_points || 0);
                                  teamStat.teleop_points.push(data.teleop_points || 0);
                                  teamStat.endgame_points.push(data.endgame_points || 0);
                                  teamStat.defense_ratings.push(data.defense_rating || 0);
                                }
                              });

                              // Calculate averages and return sorted by average score
                              return Array.from(teamStatsMap.values())
                                .filter(stat => stat.total_matches > 0)
                                .map(stat => {
                                  const avgScore = stat.scores.reduce((sum: number, val: number) => sum + val, 0) / stat.total_matches;
                                  const avgAuto = stat.autonomous_points.reduce((sum: number, val: number) => sum + val, 0) / stat.total_matches;
                                  const avgTeleop = stat.teleop_points.reduce((sum: number, val: number) => sum + val, 0) / stat.total_matches;
                                  const avgEndgame = stat.endgame_points.reduce((sum: number, val: number) => sum + val, 0) / stat.total_matches;
                                  const avgDefense = stat.defense_ratings.reduce((sum: number, val: number) => sum + val, 0) / stat.total_matches;
                                  const bestScore = Math.max(...stat.scores);
                                  
                                  // Calculate consistency
                                  const variance = stat.scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgScore, 2), 0) / stat.total_matches;
                                  const standardDeviation = Math.sqrt(variance);
                                  const consistencyScore = Math.max(0, 100 - (standardDeviation / avgScore) * 100);

                                  return {
                                    ...stat,
                                    avg_score: Math.round(avgScore * 100) / 100,
                                    avg_auto: Math.round(avgAuto * 100) / 100,
                                    avg_teleop: Math.round(avgTeleop * 100) / 100,
                                    avg_endgame: Math.round(avgEndgame * 100) / 100,
                                    avg_defense: Math.round(avgDefense * 100) / 100,
                                    best_score: bestScore,
                                    consistency: Math.round(consistencyScore * 100) / 100
                                  };
                                })
                                .sort((a, b) => b.avg_score - a.avg_score)
                                .map((team, index) => (
                                  <tr key={team.team_number} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => window.open(`/team-history/${team.team_number}`, '_blank')}>
                                    <td className="py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 rounded text-xs team-number-tag">
                                          {team.team_number}
                                        </span>
                                        <span className="font-medium text-foreground">{team.team_name || 'No Name'}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 text-foreground">{team.total_matches}</td>
                                    <td className="py-2">
                                      <span className="font-semibold text-primary">{team.avg_score}</span>
                                    </td>
                                    <td className="py-2 text-foreground">{team.avg_auto}</td>
                                    <td className="py-2 text-foreground">{team.avg_teleop}</td>
                                    <td className="py-2 text-foreground">{team.avg_endgame}</td>
                                    <td className="py-2">
                                      <span className={`font-semibold ${
                                        team.avg_defense >= 7 ? 'text-green-600' :
                                        team.avg_defense >= 5 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        {team.avg_defense}/10
                                      </span>
                                    </td>
                                    <td className="py-2">
                                      <span className="font-semibold text-green-600">{team.best_score}</span>
                                    </td>
                                    <td className="py-2">
                                      <span className={`font-semibold ${
                                        team.consistency >= 80 ? 'text-green-600' :
                                        team.consistency >= 60 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        {team.consistency}%
                                      </span>
                                    </td>
                                  </tr>
                                ));
                            })()}
                          </tbody>
                        </table>
                        <p className="text-sm text-muted-foreground mt-2">
                          Click any team to view detailed analysis. Teams sorted by average score.
                        </p>
                      </div>
                    </Card>

                    {/* Teams List */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">All Teams ({selectedCompetition.teams.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {selectedCompetition.teams.map((team) => (
                          <div 
                            key={team.team_number} 
                            className="p-3 border rounded-lg bg-card hover:bg-accent transition-colors cursor-pointer"
                            onClick={() => window.open(`/team-history/${team.team_number}`, '_blank')}
                            title={`Click to view detailed analysis for Team ${team.team_number}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="px-2 py-1 rounded text-xs team-number-tag">
                                {team.team_number}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate" title={team.team_name}>
                              {team.team_name || 'No Name'}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        Showing all {selectedCompetition.teams.length} teams from this competition. Click any team for detailed analysis.
                      </p>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
