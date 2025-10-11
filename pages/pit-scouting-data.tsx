import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
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
  X,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { supabase } from '@/lib/supabase';

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
  const [pitData, setPitData] = useState<PitScoutingData[]>([]);
  const [filteredData, setFilteredData] = useState<PitScoutingData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedView, setSelectedView] = useState('table');
  const [selectedItem, setSelectedItem] = useState<PitScoutingData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load pit scouting data
  useEffect(() => {
    const loadPitData = async () => {
      setLoadingData(true);
      try {
        // Load real data from Supabase
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
        console.error('Error loading pit scouting data:', error);
        // Fallback to empty array on error
        setPitData([]);
        setFilteredData([]);
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
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedItem(null);
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

            {/* Filters */}
            <Card className="mb-6">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Pit Scouting Data ({filteredData.length} entries)</CardTitle>
                </CardHeader>
                <CardContent>
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
                        <TableHead>Actions</TableHead>
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
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                              onClick={() => handleViewDetails(item)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredData.map((item) => (
                  <Card key={item.id} className="bg-gray-800 border-gray-700">
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
                      <div className="pt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
            {showDetailModal && selectedItem && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-700">
                  <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                          <Wrench className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-white">Team {selectedItem.team_number}</h2>
                          <p className="text-blue-100 text-lg">{selectedItem.robot_name}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-white/20 rounded-full h-2">
                                <div 
                                  className="bg-yellow-400 h-2 rounded-full" 
                                  style={{ width: `${(selectedItem.overall_rating / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-white font-semibold">{selectedItem.overall_rating}/10</span>
                            </div>
                            <Badge variant="outline" className="text-white border-white/30 bg-white/10">
                              {selectedItem.drive_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={closeDetailModal}
                        className="text-white hover:bg-white/20 rounded-full p-2"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-8">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-blue-500 rounded-full p-2">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Basic Information</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-blue-400/20">
                            <span className="text-blue-200 font-medium">Team Number</span>
                            <span className="text-white font-bold text-lg">{selectedItem.team_number}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-blue-400/20">
                            <span className="text-blue-200 font-medium">Robot Name</span>
                            <span className="text-white font-semibold">{selectedItem.robot_name}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-blue-400/20">
                            <span className="text-blue-200 font-medium">Drive Type</span>
                            <span className="text-white font-semibold">{selectedItem.drive_type}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-blue-200 font-medium">Programming</span>
                            <span className="text-white font-semibold">{selectedItem.programming_language || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-xl p-6 border border-green-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-green-500 rounded-full p-2">
                            <Target className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Specifications</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-green-400/20">
                            <span className="text-green-200 font-medium">Dimensions</span>
                            <span className="text-white font-semibold text-sm">
                              {selectedItem.robot_dimensions.length && selectedItem.robot_dimensions.width 
                                ? `${selectedItem.robot_dimensions.length}" × ${selectedItem.robot_dimensions.width}" × ${selectedItem.robot_dimensions.height}"`
                                : `${selectedItem.robot_dimensions.height}" (H only)`
                              }
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-green-400/20">
                            <span className="text-green-200 font-medium">Weight</span>
                            <span className="text-white font-semibold">{selectedItem.weight} lbs</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-green-200 font-medium">Rating</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-green-400/20 rounded-full h-2">
                                <div 
                                  className="bg-yellow-400 h-2 rounded-full" 
                                  style={{ width: `${(selectedItem.overall_rating / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-white font-bold">{selectedItem.overall_rating}/10</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-purple-500 rounded-full p-2">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Submission Info</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-purple-400/20">
                            <span className="text-purple-200 font-medium">Submitted by</span>
                            <span className="text-white font-semibold text-sm">{selectedItem.submitted_by_name}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-purple-400/20">
                            <span className="text-purple-200 font-medium">Email</span>
                            <span className="text-white font-semibold text-xs">{selectedItem.submitted_by_email}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-purple-200 font-medium">Date</span>
                            <span className="text-white font-semibold text-sm">{new Date(selectedItem.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-xl p-6 border border-orange-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-orange-500 rounded-full p-2">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Autonomous</h3>
                        </div>
                        <div className="space-y-3">
                          {selectedItem.autonomous_capabilities && selectedItem.autonomous_capabilities.length > 0 ? (
                            selectedItem.autonomous_capabilities.map((cap: string, index: number) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-orange-500/10 rounded-lg border border-orange-400/20">
                                <CheckCircle className="h-4 w-4 text-orange-400 flex-shrink-0" />
                                <span className="text-white font-medium">{cap}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-400/20 text-center">
                              <p className="text-orange-200">No autonomous capabilities specified</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-cyan-500 rounded-full p-2">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Teleop</h3>
                        </div>
                        <div className="space-y-3">
                          {selectedItem.teleop_capabilities && selectedItem.teleop_capabilities.length > 0 ? (
                            selectedItem.teleop_capabilities.map((cap: string, index: number) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-400/20">
                                <CheckCircle className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                                <span className="text-white font-medium">{cap}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-400/20 text-center">
                              <p className="text-cyan-200">No teleop capabilities specified</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 backdrop-blur-sm rounded-xl p-6 border border-pink-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-pink-500 rounded-full p-2">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Endgame</h3>
                        </div>
                        <div className="space-y-3">
                          {selectedItem.endgame_capabilities && selectedItem.endgame_capabilities.length > 0 ? (
                            selectedItem.endgame_capabilities.map((cap: string, index: number) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-pink-500/10 rounded-lg border border-pink-400/20">
                                <CheckCircle className="h-4 w-4 text-pink-400 flex-shrink-0" />
                                <span className="text-white font-medium">{cap}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-400/20 text-center">
                              <p className="text-pink-200">No endgame capabilities specified</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Strengths and Weaknesses */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 backdrop-blur-sm rounded-xl p-6 border border-emerald-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-emerald-500 rounded-full p-2">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Strengths</h3>
                        </div>
                        <div className="space-y-3">
                          {selectedItem.strengths && selectedItem.strengths.length > 0 ? (
                            selectedItem.strengths.map((strength: string, index: number) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-400/20">
                                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                <span className="text-white font-medium">{strength}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-400/20 text-center">
                              <p className="text-emerald-200">No strengths specified</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-red-500 rounded-full p-2">
                            <AlertCircle className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Weaknesses</h3>
                        </div>
                        <div className="space-y-3">
                          {selectedItem.weaknesses && selectedItem.weaknesses.length > 0 ? (
                            selectedItem.weaknesses.map((weakness: string, index: number) => (
                              <div key={index} className="flex items-center space-x-3 p-3 bg-red-500/10 rounded-lg border border-red-400/20">
                                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                <span className="text-white font-medium">{weakness}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-red-500/10 rounded-lg border border-red-400/20 text-center">
                              <p className="text-red-200">No weaknesses specified</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedItem.notes && (
                      <div className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 backdrop-blur-sm rounded-xl p-6 border border-indigo-500/30">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="bg-indigo-500 rounded-full p-2">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-white">Notes</h3>
                        </div>
                        <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-400/20">
                          <p className="text-white leading-relaxed">{selectedItem.notes}</p>
                        </div>
                      </div>
                    )}
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
