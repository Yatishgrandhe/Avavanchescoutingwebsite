import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { Button } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  User,
  Calendar,
  Wrench,
  Target,
  RefreshCw,
  Edit,
  Trash2,
  Shield
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/hooks/use-admin';

interface PitScoutingData {
  id: string;
  team_number: number;
  robot_name: string;
  drive_type: string;
  drive_train_details: {
    type: string;
    auto_capabilities: string;
    teleop_capabilities: string;
    drive_camps: number;
    playoff_driver: string;
  };
  autonomous_capabilities: string[];
  teleop_capabilities: string[];
  endgame_capabilities: string[];
  robot_dimensions: {
    length?: number;
    width?: number;
    height: number;
  };
  weight: number;
  programming_language: string;
  notes: string;
  strengths: string[];
  weaknesses: string[];
  overall_rating: number;
  submitted_by: string;
  submitted_by_email: string;
  submitted_by_name: string;
  submitted_at: string;
  created_at: string;
}

export default function PitScoutingData() {
  const { user, loading } = useSupabase();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const [pitData, setPitData] = useState<PitScoutingData[]>([]);
  const [filteredData, setFilteredData] = useState<PitScoutingData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedView, setSelectedView] = useState('table');
  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<PitScoutingData | null>(null);
  const [deletingItem, setDeletingItem] = useState<PitScoutingData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [allTeams, setAllTeams] = useState<Array<{team_number: number, team_name: string}>>([]);
  const [scoutedTeamNumbers, setScoutedTeamNumbers] = useState<Set<number>>(new Set());
  const [showUnscoutedTeams, setShowUnscoutedTeams] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<PitScoutingData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load pit scouting data
  useEffect(() => {
    const loadPitData = async () => {
      setLoadingData(true);
      try {
        // Load all teams and pit scouting data in parallel
        const [teamsResult, pitScoutingResult] = await Promise.all([
          supabase.from('teams').select('team_number, team_name').order('team_number'),
          supabase.from('pit_scouting_data').select('*').order('created_at', { ascending: false })
        ]);

        if (teamsResult.error) {
          throw new Error(`Failed to load teams: ${teamsResult.error.message}`);
        }

        if (pitScoutingResult.error) {
          throw new Error(`Failed to load pit scouting data: ${pitScoutingResult.error.message}`);
        }

        const pitScoutingData = pitScoutingResult.data;
        const teamsData = teamsResult.data || [];

        // Transform the data to match our interface
        const transformedData: PitScoutingData[] = (pitScoutingData || []).map((item: any) => ({
          id: item.id,
          team_number: item.team_number,
          robot_name: item.robot_name || 'Unknown Robot',
          drive_type: item.drive_type || 'Unknown',
          drive_train_details: item.drive_train_details || {
            type: item.drive_type || 'Unknown',
            auto_capabilities: '',
            teleop_capabilities: '',
            drive_camps: 0,
            playoff_driver: 'TBD'
          },
          autonomous_capabilities: item.autonomous_capabilities || [],
          teleop_capabilities: item.teleop_capabilities || [],
          endgame_capabilities: item.endgame_capabilities || [],
          robot_dimensions: item.robot_dimensions || { height: 0 },
          weight: item.weight || 0,
          programming_language: item.programming_language || 'Unknown',
          notes: item.notes || '',
          strengths: item.strengths || [],
          weaknesses: item.weaknesses || [],
          overall_rating: item.overall_rating || 0,
          submitted_by: item.submitted_by,
          submitted_by_email: item.submitted_by_email,
          submitted_by_name: item.submitted_by_name,
          submitted_at: item.submitted_at,
          created_at: item.created_at
        }));
        
        setPitData(transformedData);
        setFilteredData(transformedData);
        
        // Set teams and scouted team numbers
        setAllTeams(teamsData);
        const scoutedNumbers = new Set(pitScoutingData?.map((item: any) => item.team_number) || []);
        setScoutedTeamNumbers(scoutedNumbers);
      } catch (error) {
        console.error('Error loading pit scouting data:', error);
        // Fallback to empty array on error
        setPitData([]);
        setFilteredData([]);
        setAllTeams([]);
        setScoutedTeamNumbers(new Set());
      } finally {
        setLoadingData(false);
      }
    };

    if (user) {
      loadPitData();
    }
  }, [user]);

  // Filter data based on search and team selection
  useEffect(() => {
    let filtered = pitData;

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.robot_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.team_number.toString().includes(searchTerm) ||
        item.drive_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedTeam !== 'all') {
      filtered = filtered.filter(item => item.team_number.toString() === selectedTeam);
    }

    setFilteredData(filtered);
  }, [pitData, searchTerm, selectedTeam]);

  const handleViewDetails = (item: PitScoutingData) => {
    setSelectedDetailItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = (item: PitScoutingData) => {
    setEditingItem(item);
    router.push(`/pit-scouting?id=${item.id}&edit=true`);
  };

  const handleDelete = (item: PitScoutingData) => {
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      const { error } = await supabase
        .from('pit_scouting_data')
        .delete()
        .eq('id', deletingItem.id);

      if (error) {
        throw new Error(`Failed to delete pit scouting data: ${error.message}`);
      }

      // Remove from local state
      setPitData(prev => prev.filter(item => item.id !== deletingItem.id));
      setFilteredData(prev => prev.filter(item => item.id !== deletingItem.id));
      
      setShowDeleteConfirm(false);
      setDeletingItem(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete pit scouting data. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingItem(null);
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const { data: pitScoutingData, error } = await supabase
        .from('pit_scouting_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to load pit scouting data: ${error.message}`);
      }

      // Transform the data to match our interface
      const transformedData: PitScoutingData[] = (pitScoutingData || []).map((item: any) => ({
        id: item.id,
        team_number: item.team_number,
        robot_name: item.robot_name || 'Unknown Robot',
        drive_type: item.drive_type || 'Unknown',
        drive_train_details: item.drive_train_details || {
          type: item.drive_type || 'Unknown',
          auto_capabilities: '',
          teleop_capabilities: '',
          drive_camps: 0,
          playoff_driver: 'TBD'
        },
        autonomous_capabilities: item.autonomous_capabilities || [],
        teleop_capabilities: item.teleop_capabilities || [],
        endgame_capabilities: item.endgame_capabilities || [],
        robot_dimensions: item.robot_dimensions || { height: 0 },
        weight: item.weight || 0,
        programming_language: item.programming_language || 'Unknown',
        notes: item.notes || '',
        strengths: item.strengths || [],
        weaknesses: item.weaknesses || [],
        overall_rating: item.overall_rating || 0,
        submitted_by: item.submitted_by,
        submitted_by_email: item.submitted_by_email,
        submitted_by_name: item.submitted_by_name,
        submitted_at: item.submitted_at,
        created_at: item.created_at
      }));
      
      setPitData(transformedData);
      setFilteredData(transformedData);
    } catch (error) {
      console.error('Error refreshing pit scouting data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // ProtectedRoute will handle the redirect
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-full p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center space-x-3 mb-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Wrench className="w-8 h-8 text-blue-400" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Pit Scouting Data
                  </h1>
                  <p className="mt-2 text-gray-400">
                    View and analyze pit scouting information
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Pit Scouting Status Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <Card className="bg-gray-800/30 backdrop-blur-sm border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Target className="w-5 h-5 text-blue-400" />
                    <span>Pit Scouting Progress</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500">
                        {scoutedTeamNumbers.size}/{allTeams.length} Teams Scouted
                      </Badge>
                      <span className="text-gray-300 text-sm">
                        {allTeams.length - scoutedTeamNumbers.size} teams remaining
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUnscoutedTeams(!showUnscoutedTeams)}
                      className="text-gray-300 hover:text-white"
                    >
                      {showUnscoutedTeams ? 'Hide' : 'Show'} Unscouted Teams
                    </Button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div
                      className="bg-blue-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${allTeams.length > 0 ? (scoutedTeamNumbers.size / allTeams.length) * 100 : 0}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                  
                  {/* Unscouted Teams List */}
                  {showUnscoutedTeams && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-600"
                    >
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Teams Not Yet Scouted:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {allTeams
                          .filter(team => !scoutedTeamNumbers.has(team.team_number))
                          .map(team => (
                            <div
                              key={team.team_number}
                              className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded border border-gray-600"
                            >
                              {team.team_number} - {team.team_name}
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Filters */}
            <Card className="mb-8 bg-gray-800/30 backdrop-blur-sm border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by robot name, team number, or drive type..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-gray-700">All Teams</SelectItem>
                      {Array.from(new Set(pitData.map(item => item.team_number))).map(teamNum => (
                        <SelectItem key={teamNum} value={teamNum.toString()} className="text-white hover:bg-gray-700">
                          Team {teamNum}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedView} onValueChange={setSelectedView}>
                    <SelectTrigger className="w-32 bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="table" className="text-white hover:bg-gray-700">Table</SelectItem>
                      <SelectItem value="cards" className="text-white hover:bg-gray-700">Cards</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshData}
                    disabled={refreshing}
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Display */}
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-400">Loading pit scouting data...</span>
              </div>
            ) : selectedView === 'table' ? (
              <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-xl">Pit Scouting Data ({filteredData.length} entries)</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Robot Name</TableHead>
                        <TableHead>Drive Type</TableHead>
                        <TableHead>Dimensions</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>
                          <div className="flex items-center space-x-2">
                            <span>Actions</span>
                            {isAdmin && (
                              <Shield className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">Team {item.team_number}</TableCell>
                          <TableCell>{item.robot_name}</TableCell>
                          <TableCell>{item.drive_type}</TableCell>
                          <TableCell>
                            {item.robot_dimensions.length && item.robot_dimensions.width 
                              ? `${item.robot_dimensions.length}" × ${item.robot_dimensions.width}" × ${item.robot_dimensions.height}"`
                              : `${item.robot_dimensions.height}" (H only)`
                            }
                          </TableCell>
                          <TableCell>{item.weight} lbs</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(item.overall_rating / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm">{item.overall_rating}/10</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.submitted_by_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                                onClick={() => handleViewDetails(item)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {isAdmin && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="bg-blue-800 border-blue-600 text-white hover:bg-blue-700"
                                    onClick={() => handleEdit(item)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="bg-red-800 border-red-600 text-white hover:bg-red-700"
                                    onClick={() => handleDelete(item)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredData.map((item) => (
                  <Card key={item.id} className="bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:bg-gray-800/70 transition-all duration-200 hover:scale-105 hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white">Team {item.team_number}</CardTitle>
                        <Badge variant="outline" className="text-blue-400 border-blue-400">
                          {item.overall_rating}/10
                        </Badge>
                      </div>
                      <p className="text-gray-400">{item.robot_name}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400">Drive Type</p>
                        <p className="text-white">{item.drive_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Dimensions</p>
                        <p className="text-white">
                          {item.robot_dimensions.length && item.robot_dimensions.width 
                            ? `${item.robot_dimensions.length}" × ${item.robot_dimensions.width}" × ${item.robot_dimensions.height}"`
                            : `${item.robot_dimensions.height}" (H only)`
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Weight</p>
                        <p className="text-white">{item.weight} lbs</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Drive Camps</p>
                        <p className="text-white">{item.drive_train_details.drive_camps}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <User className="h-4 w-4" />
                          {item.submitted_by_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="pt-3 space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {isAdmin && (
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 bg-blue-800 border-blue-600 text-white hover:bg-blue-700"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 bg-red-800 border-red-600 text-white hover:bg-red-700"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && deletingItem && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-red-600 rounded-full p-2">
                      <Trash2 className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                  </div>
                  <p className="text-gray-300 mb-6">
                    Are you sure you want to delete the pit scouting data for Team {deletingItem.team_number} - {deletingItem.robot_name}?
                    This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={cancelDelete}
                      className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmDelete}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {filteredData.length === 0 && !loadingData && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Pit Scouting Data</h3>
                  <p className="text-gray-400">
                    {searchTerm || selectedTeam !== 'all' 
                      ? 'No data matches your current filters.' 
                      : 'No pit scouting data has been submitted yet.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Detailed View Modal */}
            {showDetailModal && selectedDetailItem && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-white">
                        Team {selectedDetailItem.team_number} - {selectedDetailItem.robot_name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetailModal(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Basic Information */}
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-3">Basic Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Team Number:</span>
                            <span className="text-white font-medium">{selectedDetailItem.team_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Robot Name:</span>
                            <span className="text-white font-medium">{selectedDetailItem.robot_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Drive Type:</span>
                            <span className="text-white font-medium">{selectedDetailItem.drive_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Programming Language:</span>
                            <span className="text-white font-medium">{selectedDetailItem.programming_language || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Overall Rating:</span>
                            <span className="text-white font-medium">{selectedDetailItem.overall_rating}/10</span>
                          </div>
                        </div>
                      </div>

                      {/* Robot Dimensions */}
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-3">Robot Specifications</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Length:</span>
                            <span className="text-white font-medium">{selectedDetailItem.robot_dimensions.length ? `${selectedDetailItem.robot_dimensions.length}"` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Width:</span>
                            <span className="text-white font-medium">{selectedDetailItem.robot_dimensions.width ? `${selectedDetailItem.robot_dimensions.width}"` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Height:</span>
                            <span className="text-white font-medium">{selectedDetailItem.robot_dimensions.height ? `${selectedDetailItem.robot_dimensions.height}"` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Weight:</span>
                            <span className="text-white font-medium">{selectedDetailItem.weight ? `${selectedDetailItem.weight} lbs` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Capabilities */}
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-3">Capabilities</h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-gray-300 font-medium">Autonomous:</span>
                            <div className="mt-1">
                              {selectedDetailItem.autonomous_capabilities.length > 0 ? (
                                selectedDetailItem.autonomous_capabilities.map((cap, index) => (
                                  <div key={index} className="text-white">• {cap}</div>
                                ))
                              ) : (
                                <div className="text-gray-400">None specified</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-300 font-medium">Teleop:</span>
                            <div className="mt-1">
                              {selectedDetailItem.teleop_capabilities.length > 0 ? (
                                selectedDetailItem.teleop_capabilities.map((cap, index) => (
                                  <div key={index} className="text-white">• {cap}</div>
                                ))
                              ) : (
                                <div className="text-gray-400">None specified</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-300 font-medium">Endgame:</span>
                            <div className="mt-1">
                              {selectedDetailItem.endgame_capabilities.length > 0 ? (
                                selectedDetailItem.endgame_capabilities.map((cap, index) => (
                                  <div key={index} className="text-white">• {cap}</div>
                                ))
                              ) : (
                                <div className="text-gray-400">None specified</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-3">Strengths</h3>
                        <div className="text-sm">
                          {selectedDetailItem.strengths.length > 0 ? (
                            selectedDetailItem.strengths.map((strength, index) => (
                              <div key={index} className="text-green-300 mb-1">• {strength}</div>
                            ))
                          ) : (
                            <div className="text-gray-400">None specified</div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-3">Weaknesses</h3>
                        <div className="text-sm">
                          {selectedDetailItem.weaknesses.length > 0 ? (
                            selectedDetailItem.weaknesses.map((weakness, index) => (
                              <div key={index} className="text-red-300 mb-1">• {weakness}</div>
                            ))
                          ) : (
                            <div className="text-gray-400">None specified</div>
                          )}
                        </div>
                      </div>

                      {/* Notes & Metadata */}
                      <div className="bg-gray-700/50 p-4 rounded-lg md:col-span-2 lg:col-span-1">
                        <h3 className="font-semibold text-white mb-3">Notes & Metadata</h3>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-gray-300 font-medium">Notes:</span>
                            <p className="text-white mt-1 text-xs">{selectedDetailItem.notes || 'No notes provided'}</p>
                          </div>
                          <div className="pt-2 border-t border-gray-600">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Submitted by:</span>
                              <span className="text-white font-medium">{selectedDetailItem.submitted_by_name}</span>
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-gray-300">Date:</span>
                              <span className="text-white font-medium">
                                {new Date(selectedDetailItem.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-6">
                      <Button
                        onClick={() => setShowDetailModal(false)}
                        className="bg-gray-600 hover:bg-gray-500 text-white"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
