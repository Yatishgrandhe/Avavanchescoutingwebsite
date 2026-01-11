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
  EyeOff,
  ArrowLeft,
  Home,
  Menu
} from 'lucide-react';
import { ScoutingData, Team } from '@/lib/types';
import { useRouter } from 'next/router';

interface DataAnalysisProps {}

const DataAnalysisMobile: React.FC<DataAnalysisProps> = () => {
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const [scoutingData, setScoutingData] = useState<ScoutingData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showUploaderInfo, setShowUploaderInfo] = useState(false);
  const [sortField, setSortField] = useState<keyof ScoutingData>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load scouting data - includes submitted_by_name for uploader display
      const { data: scoutingDataResult, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*')
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

  const getUploaderName = (data: ScoutingData) => {
    // Use submitted_by_name (username) from scouting_data - set when form is submitted
    if (data.submitted_by_name && data.submitted_by_name.trim()) {
      return data.submitted_by_name;
    }
    if (data.submitted_by_email && data.submitted_by_email.trim()) {
      return data.submitted_by_email;
    }
    return 'Unknown';
  };

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="p-2"
            >
              <Home size={20} />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Data Analysis</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="p-2"
          >
            <Menu size={20} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 data-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Database className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Scouting Data
            </h2>
          </div>
          <p className="text-muted-foreground">
            Comprehensive view of all scouting data with detailed breakdowns
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
              <div className="flex gap-2">
                <Button onClick={loadData} variant="outline" size="sm" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button 
                  onClick={() => setShowUploaderInfo(!showUploaderInfo)} 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  {showUploaderInfo ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showUploaderInfo ? 'Hide' : 'Show'} Uploader
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">{sortedData.length}</div>
                  <div className="text-xs text-muted-foreground">Total Records</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-secondary">
                    {new Set(sortedData.map(d => d.team_number)).size}
                  </div>
                  <div className="text-xs text-muted-foreground">Teams Scouted</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-warning">
                    {Math.round(sortedData.reduce((sum, d) => sum + d.final_score, 0) / sortedData.length) || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-success">
                    {Math.round(sortedData.reduce((sum, d) => sum + d.defense_rating, 0) / sortedData.length) || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Defense</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Scouting Data ({sortedData.length} records)
            </h3>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          {currentData.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Data Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedTeam 
                    ? 'Try adjusting your filters to see more results.'
                    : 'No scouting data has been uploaded yet.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {currentData.map((data, index) => (
                <motion.div
                  key={data.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{data.team_number}</Badge>
                            <span className="text-sm font-medium text-foreground">
                              {getTeamName(data.team_number)}
                            </span>
                          </div>
                          <Badge 
                            variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                          >
                            {data.alliance_color.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Match Info */}
                        <div className="text-sm text-muted-foreground">
                          <div className="font-mono">{data.match_id}</div>
                        </div>

                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Auto</div>
                            <div className="font-semibold text-primary">{data.autonomous_points}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Teleop</div>
                            <div className="font-semibold text-secondary">{data.teleop_points}</div>
                          </div>
                        </div>


                        {/* Total Score */}
                        <div className="text-center border-t pt-2">
                          <div className="text-xs text-muted-foreground">Total Score</div>
                          <div className="text-lg font-bold text-primary">{data.final_score}</div>
                        </div>

                        {/* Defense Rating */}
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-muted-foreground">Defense:</span>
                          <div className="flex items-center gap-1">
                            {[...Array(10)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i < data.defense_rating ? 'bg-warning' : 'bg-muted'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm">{data.defense_rating}/10</span>
                          </div>
                        </div>

                        {/* Uploader Info */}
                        {showUploaderInfo && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              <span>{getUploaderName(data)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(data.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Comments */}
                        {data.comments && (
                          <div className="text-xs text-muted-foreground border-t pt-2">
                            <div className="font-medium mb-1">Comments:</div>
                            <div className="truncate" title={data.comments}>
                              {data.comments}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DataAnalysisMobile;
