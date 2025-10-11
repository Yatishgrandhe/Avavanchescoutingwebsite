import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Badge } from '../../components/ui/badge';
import { 
  Database, 
  Filter, 
  Search, 
  RefreshCw,
  User,
  Calendar,
  FileSpreadsheet,
  Eye,
  EyeOff
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ScoutingData, Team } from '@/lib/types';

interface DataAnalysisProps {}

const DataAnalysis: React.FC<DataAnalysisProps> = () => {
  const { supabase, user } = useSupabase();
  const [scoutingData, setScoutingData] = useState<ScoutingData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamStats, setTeamStats] = useState<Array<{
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
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showUploaderInfo, setShowUploaderInfo] = useState(true);
  const [sortField, setSortField] = useState<keyof ScoutingData>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'teams' | 'individual'>('teams');
  const [selectedTeamDetails, setSelectedTeamDetails] = useState<number | null>(null);
  const [selectedFormDetails, setSelectedFormDetails] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load scouting data with user information
      const { data: scoutingDataResult, error: scoutingError } = await supabase
        .from('scouting_data')
        .select(`
          *,
          scout:scout_id
        `)
        .order('created_at', { ascending: false });

      if (scoutingError) throw scoutingError;

      // Load teams
      const { data: teamsResult, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .not('team_name', 'ilike', '%avalanche%')
        .order('team_number');

      if (teamsError) throw teamsError;

      setScoutingData(scoutingDataResult || []);
      setTeams(teamsResult || []);

      // Calculate team statistics
      const stats = calculateTeamStats(scoutingDataResult || [], teamsResult || []);
      setTeamStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamStats = (scoutingData: ScoutingData[], teams: Team[]) => {
    const teamStatsMap = new Map<number, {
      team_number: number;
      team_name: string;
      total_matches: number;
      autonomous_points: number[];
      teleop_points: number[];
      endgame_points: number[];
      total_scores: number[];
      defense_ratings: number[];
    }>();

    // Initialize team stats
    teams.forEach(team => {
      teamStatsMap.set(team.team_number, {
        team_number: team.team_number,
        team_name: team.team_name,
        total_matches: 0,
        autonomous_points: [],
        teleop_points: [],
        endgame_points: [],
        total_scores: [],
        defense_ratings: []
      });
    });

    // Aggregate scouting data
    scoutingData.forEach(data => {
      const teamStat = teamStatsMap.get(data.team_number);
      if (teamStat) {
        teamStat.total_matches++;
        teamStat.autonomous_points.push(data.autonomous_points || 0);
        teamStat.teleop_points.push(data.teleop_points || 0);
        teamStat.endgame_points.push(data.endgame_points || 0);
        teamStat.total_scores.push(data.final_score || 0);
        teamStat.defense_ratings.push(data.defense_rating || 0);
      }
    });

    // Calculate averages and statistics
    return Array.from(teamStatsMap.values()).map(stat => {
      const avgAutonomous = stat.autonomous_points.reduce((sum, val) => sum + val, 0) / stat.total_matches || 0;
      const avgTeleop = stat.teleop_points.reduce((sum, val) => sum + val, 0) / stat.total_matches || 0;
      const avgEndgame = stat.endgame_points.reduce((sum, val) => sum + val, 0) / stat.total_matches || 0;
      const avgTotal = stat.total_scores.reduce((sum, val) => sum + val, 0) / stat.total_matches || 0;
      const avgDefense = stat.defense_ratings.reduce((sum, val) => sum + val, 0) / stat.total_matches || 0;
      
      const bestScore = Math.max(...stat.total_scores);
      const worstScore = Math.min(...stat.total_scores);
      
      // Calculate consistency (lower standard deviation = higher consistency)
      const variance = stat.total_scores.reduce((sum, score) => sum + Math.pow(score - avgTotal, 2), 0) / stat.total_matches;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = Math.max(0, 100 - (standardDeviation / avgTotal) * 100);

      return {
        team_number: stat.team_number,
        team_name: stat.team_name,
        total_matches: stat.total_matches,
        avg_autonomous_points: Math.round(avgAutonomous * 100) / 100,
        avg_teleop_points: Math.round(avgTeleop * 100) / 100,
        avg_endgame_points: Math.round(avgEndgame * 100) / 100,
        avg_total_score: Math.round(avgTotal * 100) / 100,
        avg_defense_rating: Math.round(avgDefense * 100) / 100,
        best_score: bestScore,
        worst_score: worstScore,
        consistency_score: Math.round(consistencyScore * 100) / 100
      };
    }).filter(stat => stat.total_matches > 0); // Only show teams with scouting data
  };

  const filteredData = scoutingData.filter(data => {
    const matchesSearch = searchTerm === '' || 
      data.team_number.toString().includes(searchTerm) ||
      data.match_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.comments.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTeam = selectedTeam === null || data.team_number === selectedTeam;
    
    return matchesSearch && matchesTeam;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const handleSort = (field: keyof ScoutingData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  const getTeamName = (teamNumber: number) => {
    const team = teams.find(t => t.team_number === teamNumber);
    return team ? team.team_name : `Team ${teamNumber}`;
  };

  const getUploaderName = (scoutId: string) => {
    // For now, return the scout ID. In a real implementation, you'd look up the user
    return scoutId || 'Unknown';
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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6 data-page">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-foreground font-display">
                Data Analysis
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive view of all scouting data with detailed breakdowns and uploader information
            </p>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters & Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by team, match, or comments..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Team Filter */}
                  <div className="relative">
                    <select
                      value={selectedTeam || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTeam(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                    >
                      <option value="">All Teams</option>
                      {teams.map(team => (
                        <option key={team.team_number} value={team.team_number}>
                          {team.team_number} - {team.team_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <span className="text-sm font-medium text-foreground">View:</span>
                    <div className="flex bg-muted rounded-lg p-1 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant={viewMode === 'teams' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('teams')}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs sm:text-sm"
                      >
                        Team Stats
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'individual' ? 'default' : 'ghost'}
                        onClick={() => setViewMode('individual')}
                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs sm:text-sm"
                      >
                        Individual Forms
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={loadData} variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    {viewMode === 'individual' && (
                      <Button 
                        onClick={() => setShowUploaderInfo(!showUploaderInfo)} 
                        variant="outline" 
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        {showUploaderInfo ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                        {showUploaderInfo ? 'Hide' : 'Show'} Uploader
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-primary">
                      {viewMode === 'teams' ? teamStats.length : sortedData.length}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {viewMode === 'teams' ? 'Teams with Data' : 'Total Records'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-secondary">
                      {viewMode === 'teams' 
                        ? Math.round(teamStats.reduce((sum, t) => sum + t.avg_total_score, 0) / teamStats.length) || 0
                        : new Set(sortedData.map(d => d.team_number)).size
                      }
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {viewMode === 'teams' ? 'Avg Team Score' : 'Teams Scouted'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-warning">
                      {viewMode === 'teams'
                        ? Math.round(teamStats.reduce((sum, t) => sum + t.avg_defense_rating, 0) / teamStats.length) || 0
                        : Math.round(sortedData.reduce((sum, d) => sum + d.final_score, 0) / sortedData.length) || 0
                      }
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {viewMode === 'teams' ? 'Avg Defense (/10)' : 'Avg Score'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-success">
                      {viewMode === 'teams'
                        ? Math.round(teamStats.reduce((sum, t) => sum + t.consistency_score, 0) / teamStats.length) || 0
                        : Math.round(sortedData.reduce((sum, d) => sum + d.defense_rating, 0) / sortedData.length) || 0
                      }
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      {viewMode === 'teams' ? 'Avg Consistency (%)' : 'Avg Defense'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  {viewMode === 'teams' 
                    ? `Team Statistics (${teamStats.length} teams)` 
                    : `Scouting Data (${sortedData.length} records)`
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === 'teams' ? (
                  // Team Statistics View
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full border-collapse min-w-[800px]">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Team</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Matches</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Avg Score</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Auto</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Teleop</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Endgame</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Defense (/10)</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Best</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Consistency</th>
                          <th className="text-left p-2 md:p-3 text-xs md:text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamStats
                          .filter(team => 
                            searchTerm === '' || 
                            team.team_number.toString().includes(searchTerm) ||
                            team.team_name.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((team, index) => (
                            <motion.tr
                              key={team.team_number}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b hover:bg-muted/50 cursor-pointer"
                              onClick={() => setSelectedTeamDetails(team.team_number)}
                            >
                              <td className="p-2 md:p-3">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {team.team_number}
                                  </Badge>
                                  <span className="font-medium text-foreground">{team.team_name}</span>
                                </div>
                              </td>
                              <td className="p-2 md:p-3 text-foreground">{team.total_matches}</td>
                              <td className="p-2 md:p-3">
                                <span className="font-semibold text-primary">{team.avg_total_score}</span>
                              </td>
                              <td className="p-2 md:p-3 text-foreground">{team.avg_autonomous_points}</td>
                              <td className="p-2 md:p-3 text-foreground">{team.avg_teleop_points}</td>
                              <td className="p-2 md:p-3 text-foreground">{team.avg_endgame_points}</td>
                              <td className="p-2 md:p-3">
                                <span className={`font-semibold ${
                                  team.avg_defense_rating >= 7 ? 'text-green-600' :
                                  team.avg_defense_rating >= 5 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {team.avg_defense_rating}/10
                                </span>
                              </td>
                              <td className="p-2 md:p-3">
                                <span className="font-semibold text-green-600">{team.best_score}</span>
                              </td>
                              <td className="p-2 md:p-3">
                                <span className={`font-semibold ${
                                  team.consistency_score >= 80 ? 'text-green-600' :
                                  team.consistency_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {team.consistency_score}%
                                </span>
                              </td>
                              <td className="p-2 md:p-3">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewMode('individual');
                                      setSelectedTeam(team.team_number);
                                    }}
                                    className="text-xs"
                                  >
                                    View Forms
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/team/${team.team_number}`, '_blank');
                                    }}
                                    className="text-xs"
                                  >
                                    Team Details
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Individual Forms View
                  <div>
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b">
                            <th 
                              className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleSort('team_number')}
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                Team
                                {sortField === 'team_number' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleSort('match_id')}
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                Match
                                {sortField === 'match_id' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th className="text-left p-2 md:p-3 text-xs md:text-sm">Alliance</th>
                            <th 
                              className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleSort('autonomous_points')}
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                Auto
                                {sortField === 'autonomous_points' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleSort('teleop_points')}
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                Teleop
                                {sortField === 'teleop_points' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleSort('endgame_points')}
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                Endgame
                                {sortField === 'endgame_points' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleSort('final_score')}
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                Total
                                {sortField === 'final_score' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleSort('defense_rating')}
                            >
                              <div className="flex items-center gap-1 md:gap-2">
                                Defense
                                {sortField === 'defense_rating' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            {showUploaderInfo && (
                              <>
                                <th className="text-left p-2 md:p-3 text-xs md:text-sm">Uploaded By</th>
                                <th 
                                  className="text-left p-2 md:p-3 cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                                  onClick={() => handleSort('created_at')}
                                >
                                  <div className="flex items-center gap-1 md:gap-2">
                                    Date
                                    {sortField === 'created_at' && (
                                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </div>
                                </th>
                              </>
                            )}
                            <th className="text-left p-2 md:p-3 text-xs md:text-sm">Comments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedData.map((data, index) => (
                            <motion.tr
                              key={data.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="p-2 md:p-3">
                                <div className="flex items-center gap-1 md:gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => window.open(`/team/${data.team_number}`, '_blank')}
                                  >
                                    {data.team_number}
                                  </Badge>
                                  <span 
                                    className="text-xs md:text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => window.open(`/team/${data.team_number}`, '_blank')}
                                  >
                                    {getTeamName(data.team_number)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 md:p-3 font-mono text-xs md:text-sm">{data.match_id}</td>
                              <td className="p-2 md:p-3">
                                <Badge 
                                  variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                                  className="text-xs"
                                >
                                  {data.alliance_color.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="p-2 md:p-3 font-semibold text-primary text-xs md:text-sm">{data.autonomous_points}</td>
                              <td className="p-2 md:p-3 font-semibold text-secondary text-xs md:text-sm">{data.teleop_points}</td>
                              <td className="p-2 md:p-3 font-semibold text-warning text-xs md:text-sm">{data.endgame_points}</td>
                              <td className="p-2 md:p-3 font-bold text-sm md:text-lg text-primary">{data.final_score}</td>
                              <td className="p-2 md:p-3">
                                <div className="flex items-center gap-1">
                                  {[...Array(10)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                                        i < data.defense_rating ? 'bg-warning' : 'bg-muted'
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-1 md:ml-2 text-xs md:text-sm">{data.defense_rating}/10</span>
                                </div>
                              </td>
                              {showUploaderInfo && (
                                <>
                                  <td className="p-2 md:p-3">
                                    <div className="flex items-center gap-1 md:gap-2">
                                      <User className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                                      <span className="text-xs md:text-sm">{getUploaderName(data.scout_id)}</span>
                                    </div>
                                  </td>
                                  <td className="p-2 md:p-3">
                                    <div className="flex items-center gap-1 md:gap-2">
                                      <Calendar className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                                      <span className="text-xs md:text-sm">
                                        {new Date(data.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}
                              <td className="p-2 md:p-3 max-w-xs">
                                <div className="text-xs md:text-sm text-muted-foreground truncate" title={data.comments}>
                                  {data.comments || '-'}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sortedData.length === 0 && (
                      <div className="text-center py-12">
                        <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Data Found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm || selectedTeam 
                            ? 'Try adjusting your filters to see more results.'
                            : 'No scouting data has been uploaded yet.'
                          }
                        </p>
                      </div>
                    )}
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

export default DataAnalysis;
