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
  Home,
  Clock,
  Zap,
  Award,
  Activity,
  BarChart3,
  Search,
  Route,
  FileSpreadsheet,
  Users,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface PitScoutingData {
  id: string;
  team_number: number;
  robot_name: string;
  robot_image_url?: string | null;
  photos?: string[];
  climb_location?: string | null;
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
  can_autoalign?: boolean;
  robot_dimensions: {
    length?: number;
    width?: number;
    framePerimeter?: number;
    height?: number;
  };
  weight?: number;
  camera_count?: number;
  shooting_locations_count?: number;
  programming_language: string;
  notes: string;
  strengths: string[];
  weaknesses: string[];
  auto_paths?: Array<{ id: string; points: { x: number; y: number }[]; color: string; comment: string }>;
  annotated_image_url?: string | null;
  overall_rating: number;
  submitted_by: string;
  submitted_by_email: string;
  submitted_by_name: string;
  submitted_at: string;
  created_at: string;
  auto_fuel_count?: number;
}

export default function PitScoutingDetails() {
  const { user, loading, supabase } = useSupabase();
  const router = useRouter();
  const { id } = router.query;
  const [pitData, setPitData] = useState<PitScoutingData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'admin' || user.role === 'lead');
    }
  }, [user]);

  const setAsMainImage = async (url: string) => {
    if (!pitData || !isAdmin) return;
    
    setIsUpdating(true);
    try {
      // Update ALL records for this team in this organization to have this as the robot_image_url
      // This ensures the list view always picks this image regardless of which record it chooses
      const { error } = await supabase
        .from('pit_scouting_data')
        .update({ robot_image_url: url })
        .eq('team_number', pitData.team_number)
        .eq('organization_id', user?.organization_id);

      if (error) throw error;
      
      setPitData(prev => prev ? ({ ...prev, robot_image_url: url }) : null);
    } catch (err) {
      console.error('Error setting main image:', err);
      alert('Failed to update main image across team records');
    } finally {
      setIsUpdating(false);
    }
  };

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

        // Fetch all photos for this team in the current event (org-scoped)
        const { data: allTeamPhotos } = await supabase
          .from('pit_scouting_data')
          .select('photos, robot_image_url')
          .eq('team_number', pitScoutingData.team_number)
          .eq('organization_id', pitScoutingData.organization_id);

        const photoSet = new Set<string>();
        if (pitScoutingData.robot_image_url) photoSet.add(pitScoutingData.robot_image_url);
        if (Array.isArray(pitScoutingData.photos)) {
          pitScoutingData.photos.forEach((p: string) => p && photoSet.add(p));
        }
        
        // Also add photos from other records for the same team
        if (allTeamPhotos) {
          allTeamPhotos.forEach((record: { photos?: string[] | null; robot_image_url?: string | null }) => {
            if (record.robot_image_url) photoSet.add(record.robot_image_url);
            if (Array.isArray(record.photos)) {
              record.photos.forEach((p: string) => p && photoSet.add(p));
            }
          });
        }

        // Transform the data to match our interface
        const transformedData: PitScoutingData = {
          id: pitScoutingData.id,
          team_number: pitScoutingData.team_number,
          robot_name: pitScoutingData.robot_name || 'Unknown Robot',
          robot_image_url: pitScoutingData.robot_image_url || null,
          photos: Array.from(photoSet),
          climb_location: pitScoutingData.climb_location ?? null,
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
          can_autoalign: !!pitScoutingData.can_autoalign,
          robot_dimensions: pitScoutingData.robot_dimensions || {},
          weight: pitScoutingData.weight ?? undefined,
          camera_count: pitScoutingData.camera_count !== undefined && pitScoutingData.camera_count !== null ? pitScoutingData.camera_count : undefined,
          shooting_locations_count: pitScoutingData.shooting_locations_count !== undefined && pitScoutingData.shooting_locations_count !== null ? pitScoutingData.shooting_locations_count : undefined,
          programming_language: pitScoutingData.programming_language || 'Unknown',
          notes: pitScoutingData.notes || '',
          strengths: pitScoutingData.strengths || [],
          weaknesses: pitScoutingData.weaknesses || [],
          auto_paths: pitScoutingData.auto_paths || [],
          annotated_image_url: pitScoutingData.annotated_image_url || null,
          overall_rating: pitScoutingData.overall_rating || 0,
          submitted_by: pitScoutingData.submitted_by,
          submitted_by_email: pitScoutingData.submitted_by_email,
          submitted_by_name: pitScoutingData.submitted_by_name,
          submitted_at: pitScoutingData.submitted_at,
          created_at: pitScoutingData.created_at,
          auto_fuel_count: pitScoutingData.auto_fuel_count ?? 0
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
    const raw = router.query.returnTo;
    const returnTo = typeof raw === 'string' ? raw : '';
    if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      void router.push(returnTo);
      return;
    }
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
        <div className="min-h-screen bg-gray-950 text-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header / Breadcrumbs */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-gray-400 hover:text-white gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <div className="h-4 w-px bg-gray-800 hidden md:block" />
                <div>
                  <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Team {pitData.team_number}
                  </h1>
                  <p className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-wider">
                    {pitData.robot_name || 'Pit Scouting Record'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
                  2026 Season
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHome}
                  className="border-gray-800 text-gray-400 hover:text-white"
                >
                  <Home className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Visuals & Quick Data */}
              <div className="lg:col-span-4 space-y-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-gray-900 border-gray-800 overflow-hidden p-1 shadow-2xl">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden relative group bg-gray-800">
                      <img
                        src={pitData.robot_image_url || (pitData.photos && pitData.photos[0]) || '/placeholder-robot.png'}
                        alt={pitData.robot_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <p className="text-white font-bold text-lg">{pitData.robot_name}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-3">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex-1 min-w-[140px] shadow-lg">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Drivetrain</span>
                    <span className="text-lg font-bold text-blue-400">{pitData.drive_type}</span>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex-1 min-w-[140px] shadow-lg">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Rating</span>
                    <span className="text-lg font-bold text-amber-400">★ {pitData.overall_rating}/10</span>
                  </div>
                </div>

                {/* Auto Paths */}
                {pitData.annotated_image_url && (
                  <Card className="bg-gray-900 border-gray-800 p-6 shadow-xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Route className="w-4 h-4" /> Planned Auto Paths
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-gray-800 bg-black/40">
                      <img
                        src={pitData.annotated_image_url}
                        alt="Auto Paths"
                        className="w-full h-auto object-contain max-h-72"
                      />
                    </div>
                    {pitData.auto_paths && pitData.auto_paths.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {pitData.auto_paths.map((p, i) => (
                          <div key={p.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                            <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: p.color }} />
                            <div>
                              <p className="text-xs font-bold text-gray-400">Path {i + 1}</p>
                              <p className="text-sm text-gray-200">{p.comment}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {/* Team Media Gallery */}
                {pitData.photos && pitData.photos.length > 0 && (
                  <Card className="bg-gray-900 border-gray-800 p-6 shadow-xl">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Team Media Gallery
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {pitData.photos.map((photo, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-black/40 border border-gray-800">
                          <img
                            src={photo}
                            alt={`Team photo ${i + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            {isAdmin && photo !== pitData.robot_image_url && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-[10px] h-7 px-2 font-bold bg-blue-600 hover:bg-blue-500 text-white border-none"
                                onClick={() => setAsMainImage(photo)}
                                disabled={isUpdating}
                              >
                                Set as Main
                              </Button>
                            )}
                            {photo === pitData.robot_image_url && (
                              <Badge className="bg-green-600 text-white border-none text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5">
                                Current Main
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-[10px] text-gray-500 italic">
                      All robot images for Team {pitData.team_number} from current entries.
                    </p>
                  </Card>
                )}
              </div>

              {/* Right Column: Detailed Breakdown */}
              <div className="lg:col-span-8 space-y-8">
                {/* 2x2 Specs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Capabilities sections */}
                  <CapabilityCard
                    title="Autonomous"
                    icon={<Clock className="w-5 h-5 text-orange-400" />}
                    items={pitData.autonomous_capabilities}
                    accent="orange"
                    footer={pitData.can_autoalign ? "Supports Auto-Align" : null}
                  >
                    {pitData.auto_fuel_count != null && pitData.auto_fuel_count > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center text-sm">
                        <span className="text-gray-400">Auto Fuel Scored</span>
                        <span className="font-bold text-orange-400 text-lg">{pitData.auto_fuel_count}</span>
                      </div>
                    )}
                  </CapabilityCard>
                  <CapabilityCard
                    title="Teleop"
                    icon={<Zap className="w-5 h-5 text-yellow-400" />}
                    items={pitData.teleop_capabilities}
                    accent="yellow"
                  />
                  <CapabilityCard
                    title="Drivetrain Specs"
                    icon={<Activity className="w-5 h-5 text-blue-400" />}
                    accent="blue"
                  >
                    <div className="space-y-3 mt-4">
                      <DetailRow label="Weight (no bumpers)" value={pitData.weight != null ? `${pitData.weight} lbs` : 'N/A'} />
                      <DetailRow label="Frame Perimeter" value={pitData.robot_dimensions.framePerimeter != null ? `${pitData.robot_dimensions.framePerimeter.toFixed(1)}"` : (pitData.robot_dimensions.length != null && pitData.robot_dimensions.width != null ? `${(2*(pitData.robot_dimensions.length + pitData.robot_dimensions.width)).toFixed(1)}" (calc)` : 'N/A')} />
                      <DetailRow label="Length × Width" value={`${pitData.robot_dimensions.length ?? '?'}" × ${pitData.robot_dimensions.width ?? '?'}"`} />
                      <DetailRow label="Height" value={pitData.robot_dimensions.height != null ? `${pitData.robot_dimensions.height}"` : 'N/A'} />
                      <DetailRow label="Motor Count" value={pitData.drive_train_details.drive_camps} />
                    </div>
                  </CapabilityCard>
                  <CapabilityCard
                    title="Performance Summary"
                    icon={<Award className="w-5 h-5 text-purple-400" />}
                    accent="purple"
                  >
                    <div className="space-y-3 mt-4">
                      <DetailRow label="Programming" value={pitData.programming_language} />
                      <DetailRow label="Climb Level" value={pitData.climb_location || 'None'} />
                      <DetailRow label="Cameras" value={pitData.camera_count} />
                      <DetailRow label="Submission" value={new Date(pitData.submitted_at).toLocaleDateString()} />
                    </div>
                  </CapabilityCard>
                </div>

                {/* Full Width Notes */}
                <Card className="bg-gray-900 border-gray-800 p-8 shadow-xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-gray-800 p-3 rounded-2xl">
                      <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Scout's Observations</h3>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-6 border border-gray-800">
                    <p className="text-gray-300 leading-relaxed text-lg italic whitespace-pre-wrap">
                      "{pitData.notes || 'No notes were provided for this entry.'}"
                    </p>
                  </div>
                  
                </Card>

                {/* Submitter Info Footer */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-2 rounded-full">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{pitData.submitted_by_name}</p>
                      <p className="text-xs text-gray-500">{pitData.submitted_by_email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Entry UID</p>
                    <p className="text-xs font-mono text-gray-400">{pitData.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function CapabilityCard({ title, icon, items, children, accent, footer }: any) {
  const accentClasses: any = {
    orange: "border-orange-500/20 bg-orange-500/5",
    yellow: "border-yellow-500/20 bg-yellow-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
  };

  return (
    <Card className={`p-6 border shadow-lg bg-gray-900 ${accentClasses[accent] || 'border-gray-800'}`}>
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">{title}</h3>
      </div>
      {items && (
        <div className="flex flex-wrap gap-2">
          {items.map((it: string, i: number) => (
            <Badge key={i} variant="outline" className="border-gray-800 bg-black/20 text-gray-300 font-normal">
              {it}
            </Badge>
          ))}
          {items.length === 0 && <span className="text-xs text-gray-600 italic">None listed</span>}
        </div>
      )}
      {children}
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-xs font-bold text-green-500">
          <CheckCircle className="w-3.5 h-3.5" /> {footer}
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-white font-bold">{value ?? '—'}</span>
    </div>
  );
}
