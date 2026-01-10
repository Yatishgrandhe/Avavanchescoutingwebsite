import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { Button } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { 
  Wrench, 
  User,
  Calendar,
  Target,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowLeft,
  Home
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

export default function PitScoutingDetails() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const { id } = router.query;
  const [pitData, setPitData] = useState<PitScoutingData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load specific pit scouting data
  useEffect(() => {
    const loadPitData = async () => {
      if (!id) return;
      
      setLoadingData(true);
      setError(null);
      
      try {
        const { data: pitScoutingData, error } = await supabase
          .from('pit_scouting_data')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw new Error(`Failed to load pit scouting data: ${error.message}`);
        }

        if (!pitScoutingData) {
          throw new Error('Pit scouting data not found');
        }

        // Transform the data to match our interface
        const transformedData: PitScoutingData = {
          id: pitScoutingData.id,
          team_number: pitScoutingData.team_number,
          robot_name: pitScoutingData.robot_name || 'Unknown Robot',
          drive_type: pitScoutingData.drive_type || 'Unknown',
          drive_train_details: pitScoutingData.drive_train_details || {
            type: pitScoutingData.drive_type || 'Unknown',
            auto_capabilities: '',
            teleop_capabilities: '',
            drive_camps: 0,
            playoff_driver: 'TBD'
          },
          autonomous_capabilities: pitScoutingData.autonomous_capabilities || [],
          teleop_capabilities: pitScoutingData.teleop_capabilities || [],
          robot_dimensions: pitScoutingData.robot_dimensions || { height: 0 },
          weight: pitScoutingData.weight || 0,
          programming_language: pitScoutingData.programming_language || 'Unknown',
          notes: pitScoutingData.notes || '',
          strengths: pitScoutingData.strengths || [],
          weaknesses: pitScoutingData.weaknesses || [],
          overall_rating: pitScoutingData.overall_rating || 0,
          submitted_by: pitScoutingData.submitted_by,
          submitted_by_email: pitScoutingData.submitted_by_email,
          submitted_by_name: pitScoutingData.submitted_by_name,
          submitted_at: pitScoutingData.submitted_at,
          created_at: pitScoutingData.created_at
        };
        
        setPitData(transformedData);
      } catch (error) {
        console.error('Error loading pit scouting data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load pit scouting data');
      } finally {
        setLoadingData(false);
      }
    };

    if (user && id) {
      loadPitData();
    }
  }, [user, id]);

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.push('/');
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

  if (loadingData) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-full p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-400">Loading pit scouting data...</span>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-full p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
                  <p className="text-gray-400 mb-4">{error}</p>
                  <div className="space-x-4">
                    <Button onClick={handleBack} variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                    <Button onClick={handleHome}>
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!pitData) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-full p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Data Found</h3>
                  <p className="text-gray-400 mb-4">The requested pit scouting data could not be found.</p>
                  <div className="space-x-4">
                    <Button onClick={handleBack} variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                    <Button onClick={handleHome}>
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Wrench className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    <div>
                      <h1 className="text-3xl font-bold text-white">
                        Team {pitData.team_number} - {pitData.robot_name}
                      </h1>
                      <p className="mt-2 text-gray-400">
                        Pit Scouting Details
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHome}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </div>
            </motion.div>

            {/* Content */}
            <div className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-600 rounded-full p-2">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Basic Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 font-medium">Team Number</span>
                      <span className="text-white font-bold text-lg">{pitData.team_number}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 font-medium">Robot Name</span>
                      <span className="text-white font-semibold">{pitData.robot_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 font-medium">Drive Type</span>
                      <span className="text-white font-semibold">{pitData.drive_type}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400 font-medium">Programming</span>
                      <span className="text-white font-semibold">{pitData.programming_language || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-green-600 rounded-full p-2">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Specifications</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 font-medium">Dimensions</span>
                      <span className="text-white font-semibold text-sm">
                        {pitData.robot_dimensions.length && pitData.robot_dimensions.width 
                          ? `${pitData.robot_dimensions.length}" × ${pitData.robot_dimensions.width}" × ${pitData.robot_dimensions.height}"`
                          : `${pitData.robot_dimensions.height}" (H only)`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 font-medium">Weight</span>
                      <span className="text-white font-semibold">{pitData.weight} lbs</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400 font-medium">Rating</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full" 
                            style={{ width: `${(pitData.overall_rating / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-white font-bold">{pitData.overall_rating}/10</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-purple-600 rounded-full p-2">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Submission Info</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 font-medium">Submitted by</span>
                      <span className="text-white font-semibold text-sm">{pitData.submitted_by_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 font-medium">Email</span>
                      <span className="text-white font-semibold text-xs">{pitData.submitted_by_email}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400 font-medium">Date</span>
                      <span className="text-white font-semibold text-sm">{new Date(pitData.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-yellow-500 rounded-full p-2">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Autonomous</h3>
                  </div>
                  <div className="space-y-3">
                    {pitData.autonomous_capabilities && pitData.autonomous_capabilities.length > 0 ? (
                      pitData.autonomous_capabilities.map((cap: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <CheckCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                          <span className="text-white font-medium">{cap}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-center">
                        <p className="text-gray-400">No autonomous capabilities specified</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-600 rounded-full p-2">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Teleop</h3>
                  </div>
                  <div className="space-y-3">
                    {pitData.teleop_capabilities && pitData.teleop_capabilities.length > 0 ? (
                      pitData.teleop_capabilities.map((cap: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          <span className="text-white font-medium">{cap}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-center">
                        <p className="text-gray-400">No teleop capabilities specified</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-purple-600 rounded-full p-2">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Climb & Navigation</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                      <div className="text-white font-medium mb-2">Can Climb: {(pitData.drive_train_details as any)?.can_climb ? 'Yes' : 'No'}</div>
                      {(pitData.drive_train_details as any)?.can_climb && (pitData.drive_train_details as any)?.climb_levels?.length > 0 && (
                        <div className="text-white mb-2">
                          <span className="font-medium">Levels: </span>
                          {(pitData.drive_train_details as any).climb_levels.join(', ')}
                        </div>
                      )}
                      <div className="text-white mb-2">
                        <span className="font-medium">Navigation: </span>
                        {(pitData.drive_train_details as any)?.navigation_locations?.join(', ') || 'N/A'}
                      </div>
                      <div className="text-white mb-2">
                        <span className="font-medium">Ball Hold Amount: </span>
                        {(pitData.drive_train_details as any)?.ball_hold_amount || 0} balls
                      </div>
                      <div className="text-white">
                        <span className="font-medium">Downtime Strategy: </span>
                        {(pitData.drive_train_details as any)?.downtime_strategy?.join(', ') || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths and Weaknesses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-green-600 rounded-full p-2">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Strengths</h3>
                  </div>
                  <div className="space-y-3">
                    {pitData.strengths && pitData.strengths.length > 0 ? (
                      pitData.strengths.map((strength: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span className="text-white font-medium">{strength}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-center">
                        <p className="text-gray-400">No strengths specified</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-red-600 rounded-full p-2">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Weaknesses</h3>
                  </div>
                  <div className="space-y-3">
                    {pitData.weaknesses && pitData.weaknesses.length > 0 ? (
                      pitData.weaknesses.map((weakness: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                          <span className="text-white font-medium">{weakness}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-center">
                        <p className="text-gray-400">No weaknesses specified</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {pitData.notes && (
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-600 rounded-full p-2">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Notes</h3>
                  </div>
                  <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <p className="text-white leading-relaxed">{pitData.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
