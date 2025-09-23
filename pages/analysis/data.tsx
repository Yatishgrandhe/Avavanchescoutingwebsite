import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Badge } from '../../components/ui/badge';
import { 
  Database, 
  Download, 
  Filter, 
  Search, 
  RefreshCw,
  User,
  Calendar,
  Target,
  TrendingUp,
  BarChart3,
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

  const exportToCSV = () => {
    const headers = [
      'Team Number',
      'Match ID',
      'Alliance Color',
      'Autonomous Points',
      'Teleop Points',
      'Endgame Points',
      'Final Score',
      'Defense Rating',
      'Comments',
      'Uploaded By',
      'Upload Date'
    ];

    const csvData = sortedData.map(data => [
      data.team_number,
      data.match_id,
      data.alliance_color,
      data.autonomous_points,
      data.teleop_points,
      data.endgame_points,
      data.final_score,
      data.defense_rating,
      data.comments,
      data.scout_id,
      new Date(data.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avalanche-scouting-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
              <h1 className="text-4xl font-bold text-foreground">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by team, match, or comments..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Team Filter */}
                  <select
                    value={selectedTeam || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTeam(e.target.value ? parseInt(e.target.value) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Teams</option>
                    {teams.map(team => (
                      <option key={team.team_number} value={team.team_number}>
                        {team.team_number} - {team.team_name}
                      </option>
                    ))}
                  </select>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button onClick={loadData} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button 
                      onClick={() => setShowUploaderInfo(!showUploaderInfo)} 
                      variant="outline" 
                      size="sm"
                    >
                      {showUploaderInfo ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showUploaderInfo ? 'Hide' : 'Show'} Uploader
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{sortedData.length}</div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {new Set(sortedData.map(d => d.team_number)).size}
                    </div>
                    <div className="text-sm text-gray-600">Teams Scouted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(sortedData.reduce((sum, d) => sum + d.final_score, 0) / sortedData.length) || 0}
                    </div>
                    <div className="text-sm text-gray-600">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(sortedData.reduce((sum, d) => sum + d.defense_rating, 0) / sortedData.length) || 0}
                    </div>
                    <div className="text-sm text-gray-600">Avg Defense</div>
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th 
                          className="text-left p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('team_number')}
                        >
                          <div className="flex items-center gap-2">
                            Team
                            {sortField === 'team_number' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('match_id')}
                        >
                          <div className="flex items-center gap-2">
                            Match
                            {sortField === 'match_id' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th className="text-left p-3">Alliance</th>
                        <th 
                          className="text-left p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('autonomous_points')}
                        >
                          <div className="flex items-center gap-2">
                            Auto
                            {sortField === 'autonomous_points' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('teleop_points')}
                        >
                          <div className="flex items-center gap-2">
                            Teleop
                            {sortField === 'teleop_points' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('endgame_points')}
                        >
                          <div className="flex items-center gap-2">
                            Endgame
                            {sortField === 'endgame_points' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('final_score')}
                        >
                          <div className="flex items-center gap-2">
                            Total
                            {sortField === 'final_score' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="text-left p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('defense_rating')}
                        >
                          <div className="flex items-center gap-2">
                            Defense
                            {sortField === 'defense_rating' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        {showUploaderInfo && (
                          <>
                            <th className="text-left p-3">Uploaded By</th>
                            <th 
                              className="text-left p-3 cursor-pointer hover:bg-gray-50"
                              onClick={() => handleSort('created_at')}
                            >
                              <div className="flex items-center gap-2">
                                Date
                                {sortField === 'created_at' && (
                                  <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                          </>
                        )}
                        <th className="text-left p-3">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((data, index) => (
                        <motion.tr
                          key={data.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{data.team_number}</Badge>
                              <span className="text-sm text-gray-600">
                                {getTeamName(data.team_number)}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-sm">{data.match_id}</td>
                          <td className="p-3">
                            <Badge 
                              variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                            >
                              {data.alliance_color.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 font-semibold text-blue-600">{data.autonomous_points}</td>
                          <td className="p-3 font-semibold text-green-600">{data.teleop_points}</td>
                          <td className="p-3 font-semibold text-purple-600">{data.endgame_points}</td>
                          <td className="p-3 font-bold text-lg text-indigo-600">{data.final_score}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < data.defense_rating ? 'bg-yellow-400' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm">{data.defense_rating}/5</span>
                            </div>
                          </td>
                          {showUploaderInfo && (
                            <>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm">{getUploaderName(data.scout_id)}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm">
                                    {new Date(data.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>
                            </>
                          )}
                          <td className="p-3 max-w-xs">
                            <div className="text-sm text-gray-600 truncate" title={data.comments}>
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
                    <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Data Found</h3>
                    <p className="text-gray-500">
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
