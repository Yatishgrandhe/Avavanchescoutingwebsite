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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showUploaderInfo, setShowUploaderInfo] = useState(true);
  const [sortField, setSortField] = useState<keyof ScoutingData>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
        .order('team_number');

      if (teamsError) throw teamsError;

      setScoutingData(scoutingDataResult || []);
      setTeams(teamsResult || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="space-y-6">
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

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={loadData} variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button 
                      onClick={() => setShowUploaderInfo(!showUploaderInfo)} 
                      variant="outline" 
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      {showUploaderInfo ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showUploaderInfo ? 'Hide' : 'Show'} Uploader
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-primary">{sortedData.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-secondary">
                      {new Set(sortedData.map(d => d.team_number)).size}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Teams Scouted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-warning">
                      {Math.round(sortedData.reduce((sum, d) => sum + d.final_score, 0) / sortedData.length) || 0}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-success">
                      {Math.round(sortedData.reduce((sum, d) => sum + d.defense_rating, 0) / sortedData.length) || 0}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Avg Defense</div>
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
                  Scouting Data ({sortedData.length} records)
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                              <Badge variant="outline" className="text-xs">{data.team_number}</Badge>
                              <span className="text-xs md:text-sm text-muted-foreground">
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
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                                    i < data.defense_rating ? 'bg-warning' : 'bg-muted'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 md:ml-2 text-xs md:text-sm">{data.defense_rating}/5</span>
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
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default DataAnalysis;
