import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
  RefreshCw,
  Edit,
  Trash2,
  Shield,
  XCircle,
  Zap,
  Award,
  Activity,
  Clock,
  ArrowLeft,
  Route,
  FileSpreadsheet,
  Users,
  CheckCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAdmin } from '@/hooks/use-admin';
import { getLocalPendingPitRows } from '@/lib/local-pending-data';
import {
  mergePitDriveTrainDetails,
  formatPitBallCapacity,
  getPitBallHoldAmount,
  type PitDriveTrainDetails,
} from '@/lib/pit-drive-train';
import { normalizePitPhotoUrls, mergePitPhotoUrlLists } from '@/lib/pit-images';
import { PitPhotoImg } from '@/components/pit/PitPhotoImg';

export interface PitScoutingData {
  id: string;
  team_number: number;
  team_name?: string;
  robot_name: string;
  robot_image_url?: string | null;
  photos?: string[];
  climb_location?: string | null;
  drive_type: string;
  drive_train_details: PitDriveTrainDetails;
  autonomous_capabilities: string[];
  teleop_capabilities: string[];
  endgame_capabilities?: string[];
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
  shooting_locations: string[];
  programming_language: string;
  notes: string;
  strengths: string[];
  weaknesses: string[];
  overall_rating?: number;
  drive_teams_count?: number;
  auto_paths?: Array<{ id: string; points: { x: number; y: number }[]; color: string; comment: string }>;
  annotated_image_url?: string | null;
  submitted_by: string;
  submitted_by_email: string;
  submitted_by_name: string;
  submitted_at: string;
  created_at: string;
  auto_fuel_count?: number;
  is_local_only?: boolean;
}

function getPitTimestampMs(row: Pick<PitScoutingData, 'submitted_at' | 'created_at'>): number {
  const value = row.submitted_at || row.created_at;
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergePitRows(localRows: PitScoutingData[], serverRows: PitScoutingData[]): PitScoutingData[] {
  const deduped = new Map<string, PitScoutingData>();
  [...localRows, ...serverRows].forEach((row) => {
    if (!row?.id) return;
    deduped.set(row.id, row);
  });
  return Array.from(deduped.values()).sort((a, b) => getPitTimestampMs(b) - getPitTimestampMs(a));
}

export default function PitScoutingData() {
  const { user, loading, supabase } = useSupabase();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const [pitData, setPitData] = useState<PitScoutingData[]>([]);
  const [filteredData, setFilteredData] = useState<PitScoutingData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedView, setSelectedView] = useState('cards');
  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<PitScoutingData | null>(null);
  const [deletingItem, setDeletingItem] = useState<PitScoutingData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<PitScoutingData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const detailModalPhotoUrls = React.useMemo(
    () => (selectedDetailItem ? normalizePitPhotoUrls(selectedDetailItem) : []),
    [selectedDetailItem],
  );

  const pitDisplayList = React.useMemo(() => {
    const byTeam = new Map<number, PitScoutingData>();
    filteredData.forEach((row) => {
      const teamNum = row.team_number;
      const existing = byTeam.get(teamNum);
      if (!existing) {
        const ph = normalizePitPhotoUrls(row);
        byTeam.set(teamNum, {
          ...row,
          photos: ph,
          robot_image_url:
            row.robot_image_url && String(row.robot_image_url).trim()
              ? row.robot_image_url
              : ph[0] || null,
        });
        return;
      }
      const mergedUrls = mergePitPhotoUrlLists(normalizePitPhotoUrls(existing), normalizePitPhotoUrls(row));
      const latest = getPitTimestampMs(row) >= getPitTimestampMs(existing) ? row : existing;
      byTeam.set(teamNum, {
        ...latest,
        photos: mergedUrls,
        robot_image_url:
          (latest.robot_image_url && String(latest.robot_image_url).trim()) ||
          (row.robot_image_url && String(row.robot_image_url).trim()) ||
          (existing.robot_image_url && String(existing.robot_image_url).trim()) ||
          mergedUrls[0] ||
          null,
      });
    });
    return Array.from(byTeam.values());
  }, [filteredData]);

  // Load pit scouting data (org-scoped) + TBA roster names for this org’s event
  useEffect(() => {
    const loadPitData = async () => {
      setLoadingData(true);
      try {
        if (!user?.organization_id) {
          setPitData([]);
          setFilteredData([]);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const teamNameByNumber = new Map<number, string>();
        if (session?.access_token) {
          const etRes = await fetch('/api/pit-scouting/event-teams', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (etRes.ok) {
            const etJson = await etRes.json();
            for (const t of etJson.teams || []) {
              teamNameByNumber.set(t.team_number, t.team_name || `Team ${t.team_number}`);
            }
          }
        }

        const pitScoutingResult = await supabase
          .from('pit_scouting_data')
          .select('*')
          .eq('organization_id', user.organization_id)
          .order('created_at', { ascending: false });

        if (pitScoutingResult.error) {
          throw new Error(`Failed to load pit scouting data: ${pitScoutingResult.error.message}`);
        }

        const pitScoutingData = pitScoutingResult.data;

        const transformedData: PitScoutingData[] = (pitScoutingData || []).map((item: any) => {
          const photosNorm = normalizePitPhotoUrls({
            robot_image_url: item.robot_image_url,
            photos: item.photos,
          });
          return {
          id: item.id,
          team_number: item.team_number,
          team_name: teamNameByNumber.get(item.team_number) || undefined,
          robot_name: item.robot_name || 'Unknown Robot',
          robot_image_url:
            item.robot_image_url && String(item.robot_image_url).trim()
              ? String(item.robot_image_url).trim()
              : photosNorm[0] || null,
          photos: photosNorm,
          climb_location: item.climb_location ?? null,
          drive_type: item.drive_type || 'Unknown',
          drive_train_details: mergePitDriveTrainDetails(item.drive_type || 'Unknown', item.drive_train_details),
          autonomous_capabilities: item.autonomous_capabilities || [],
          teleop_capabilities: item.teleop_capabilities || [],
          can_autoalign: !!item.can_autoalign,
          robot_dimensions: item.robot_dimensions && typeof item.robot_dimensions === 'object' ? item.robot_dimensions : { height: 0 },
          weight: item.weight || 0,
          camera_count: item.camera_count !== undefined && item.camera_count !== null ? item.camera_count : undefined,
          shooting_locations: item.shooting_locations || [],
          programming_language: item.programming_language || 'Unknown',
          notes: item.notes || '',
          strengths: item.strengths || [],
          weaknesses: item.weaknesses || [],
          auto_paths: item.auto_paths || [],
          annotated_image_url: item.annotated_image_url || null,
          submitted_by: item.submitted_by,
          submitted_by_email: item.submitted_by_email,
          submitted_by_name: item.submitted_by_name,
          submitted_at: item.submitted_at,
          created_at: item.created_at,
          auto_fuel_count: item.auto_fuel_count ?? 0
        };
        });

        const localPending = await getLocalPendingPitRows(user.organization_id);
        const merged = mergePitRows(localPending as unknown as PitScoutingData[], transformedData);
        setPitData(merged);
        setFilteredData(merged);
      } catch (error) {
        console.error('Error loading pit scouting data:', error);
        setPitData([]);
        setFilteredData([]);
      } finally {
        setLoadingData(false);
      }
    };

    if (user) {
      loadPitData();
    }
  }, [user, supabase.auth]);

  // Filter data based on search and team selection
  useEffect(() => {
    let filtered = pitData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.robot_name.toLowerCase().includes(term) ||
        item.team_number.toString().includes(searchTerm) ||
        (item.team_name || '').toLowerCase().includes(term) ||
        item.drive_type.toLowerCase().includes(term)
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
      if (!user?.organization_id) return;

      const { data: { session } } = await supabase.auth.getSession();
      const teamNameByNumber = new Map<number, string>();
      if (session?.access_token) {
        const etRes = await fetch('/api/pit-scouting/event-teams', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (etRes.ok) {
          const etJson = await etRes.json();
          for (const t of etJson.teams || []) {
            teamNameByNumber.set(t.team_number, t.team_name || `Team ${t.team_number}`);
          }
        }
      }

      const { data: pitScoutingData, error } = await supabase
        .from('pit_scouting_data')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to load pit scouting data: ${error.message}`);
      }

      const transformedData: PitScoutingData[] = (pitScoutingData || []).map((item: any) => {
        const photosNorm = normalizePitPhotoUrls({
          robot_image_url: item.robot_image_url,
          photos: item.photos,
        });
        return {
        id: item.id,
        team_number: item.team_number,
        team_name: teamNameByNumber.get(item.team_number) || undefined,
        robot_name: item.robot_name || 'Unknown Robot',
        robot_image_url:
          item.robot_image_url && String(item.robot_image_url).trim()
            ? String(item.robot_image_url).trim()
            : photosNorm[0] || null,
        photos: photosNorm,
        climb_location: item.climb_location ?? null,
        drive_type: item.drive_type || 'Unknown',
        drive_train_details: mergePitDriveTrainDetails(item.drive_type || 'Unknown', item.drive_train_details),
        autonomous_capabilities: item.autonomous_capabilities || [],
        teleop_capabilities: item.teleop_capabilities || [],
        can_autoalign: !!item.can_autoalign,
        robot_dimensions: item.robot_dimensions || { height: 0 },
        weight: item.weight || 0,
        camera_count: item.camera_count !== undefined && item.camera_count !== null ? item.camera_count : undefined,
        shooting_locations: item.shooting_locations || [],
        programming_language: item.programming_language || 'Unknown',
        notes: item.notes || '',
        strengths: item.strengths || [],
        weaknesses: item.weaknesses || [],
        auto_paths: item.auto_paths || [],
        annotated_image_url: item.annotated_image_url || null,
        submitted_by: item.submitted_by,
        submitted_by_email: item.submitted_by_email,
        submitted_by_name: item.submitted_by_name,
        submitted_at: item.submitted_at,
        created_at: item.created_at,
        auto_fuel_count: item.auto_fuel_count ?? 0
      };
      });

      const localPending = await getLocalPendingPitRows(user.organization_id);
      const merged = mergePitRows(localPending as unknown as PitScoutingData[], transformedData);
      setPitData(merged);
      setFilteredData(merged);
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

            {/* Filters */}
            <Card className="mb-8 bg-gray-800/30 backdrop-blur-sm border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by team name, robot name, team number, or drive type..."
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
                      {Array.from(new Set(pitData.map(item => item.team_number))).map(teamNum => {
                        const name = pitData.find((p) => p.team_number === teamNum)?.team_name;
                        return (
                          <SelectItem key={teamNum} value={teamNum.toString()} className="text-white hover:bg-gray-700">
                            {name ? `Team ${teamNum} — ${name}` : `Team ${teamNum}`}
                          </SelectItem>
                        );
                      })}
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
                            <TableCell className="font-medium">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Team number</span>
                              <span className="block font-semibold">Team {item.team_number}</span>
                              {item.is_local_only && (
                                <Badge className="mt-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">LOCAL PENDING</Badge>
                              )}
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mt-1 block">Team name</span>
                              <span className="block text-muted-foreground text-sm font-normal">{item.team_name || '—'}</span>
                            </TableCell>
                            <TableCell>{item.robot_name}</TableCell>
                            <TableCell>{item.drive_type}</TableCell>
                            <TableCell>
                              {item.robot_dimensions.length != null && item.robot_dimensions.width != null
                                ? `${item.robot_dimensions.length}" × ${item.robot_dimensions.width}"${item.robot_dimensions.height != null ? ` × ${item.robot_dimensions.height}"` : ''}`
                                : item.robot_dimensions.height != null
                                  ? `${item.robot_dimensions.height}" (H only)`
                                  : '—'}
                            </TableCell>
                            <TableCell>{item.weight != null ? `${item.weight} lbs` : '—'}</TableCell>
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
                                {isAdmin && !item.is_local_only && (
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
              <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Pit Scouting</h2>
                <p className="text-gray-400 text-sm">
                  Teams with pit scouting data. Click a team to view details and robot images.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pitDisplayList.map((item, idx) => {
                  const teamUrl = `/team/${item.team_number}?tab=pit`;
                  return (
                    <Card key={item.id ?? `pit-${item.team_number}-${idx}`} className="overflow-hidden border border-white/10 bg-card/50 hover:border-primary/30 hover:bg-white/5 transition-all h-full flex flex-col">
                      <Link href={teamUrl} className="block flex-1 min-w-0">
                        <div className="aspect-[4/3] bg-muted/20 flex items-center justify-center overflow-hidden relative">
                          <PitPhotoImg
                            urls={normalizePitPhotoUrls(item)}
                            alt={item.robot_name || item.team_name || `Team ${item.team_number}`}
                            className="w-full h-full object-cover"
                            placeholder={<Wrench className="w-12 h-12 text-muted-foreground/50" />}
                          />
                        </div>
                        <CardContent className="p-3 space-y-1.5">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Team number</span>
                            <p className="font-bold text-foreground truncate">Team {item.team_number}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Team name</span>
                            <p className="text-sm text-muted-foreground truncate">{item.team_name || '—'}</p>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{item.robot_name || '—'}</p>
                          {(item.drive_type || (item.weight != null && Number(item.weight) > 0) || (item.overall_rating != null && Number(item.overall_rating) > 0)) && (
                            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-muted-foreground">
                              {item.drive_type ? <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0 border-white/10">{String(item.drive_type)}</Badge> : null}
                              {item.weight != null && Number(item.weight) > 0 && <span>{Number(item.weight)} lbs (no bumpers)</span>}
                              {item.overall_rating != null && Number(item.overall_rating) > 0 && <span>★ {Number(item.overall_rating)}/10</span>}
                            </div>
                          )}
                        </CardContent>
                      </Link>
                      {isAdmin && item.id && !item.is_local_only && (
                        <div className="flex items-center gap-2 p-2 border-t border-white/10 bg-black/20" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/pit-scouting?id=${encodeURIComponent(item.id)}&edit=true`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs bg-red-900/30 border-red-600/50 text-red-300 hover:bg-red-900/50"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
              </>
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
                    Are you sure you want to delete the pit scouting data for Team {deletingItem.team_number}{deletingItem.team_name ? ` — ${deletingItem.team_name}` : ''} ({deletingItem.robot_name})?
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
              <Card className="border border-white/10 bg-card/50 shadow-lg">
                <CardContent className="p-16 text-center">
                  <div className="bg-muted/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                    <Wrench className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">No Pit Scouting Data</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {searchTerm || selectedTeam !== 'all'
                      ? 'We couldn\'t find any pit scouting records that match your current search or filters. Try adjusting them or clearing the search.'
                      : 'It looks like no pit scouting reports have been submitted yet for this competition. Be the first to start scouting teams in the pits!'}
                  </p>
                  {(searchTerm || selectedTeam !== 'all') && (
                    <Button 
                      variant="outline" 
                      className="mt-8 border-white/10 hover:bg-white/5"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedTeam('all');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Detailed View Modal */}
            {showDetailModal && selectedDetailItem && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-gray-900 border border-gray-700 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                        <Wrench className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">Team number</span>
                        <h2 className="text-2xl font-bold text-white leading-tight">
                          Team {selectedDetailItem.team_number}
                        </h2>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1 block">Team name</span>
                        <p className="text-gray-400 font-medium">{selectedDetailItem.team_name || '—'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[10px] uppercase tracking-wider h-5">
                            Pit Scouting Details
                          </Badge>
                          <span className="text-gray-500 text-xs font-mono">•</span>
                          <span className="text-gray-400 text-xs font-mono">{selectedDetailItem.robot_name || 'Generic Bot'}</span>
                          {getPitBallHoldAmount(selectedDetailItem.drive_train_details) != null && (
                            <>
                              <span className="text-gray-500 text-xs font-mono">•</span>
                              <span className="text-emerald-400 text-xs font-semibold">
                                {formatPitBallCapacity(selectedDetailItem.drive_train_details)}
                              </span>
                            </>
                          )}
                        </div>
                        <Link
                          href={`/pit-scouting-details?id=${encodeURIComponent(selectedDetailItem.id)}`}
                          className="inline-block mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
                          onClick={() => setShowDetailModal(false)}
                        >
                          Open full pit details page
                        </Link>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full h-10 w-10 p-0"
                    >
                      <XCircle className="h-6 w-6" />
                    </Button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-0 overflow-y-auto flex-1 scrollbar-hide">
                    <div className="p-6 space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Image & Basic Info */}
                        <div className="lg:col-span-4 space-y-6">
                          <Card className="bg-gray-800/50 border-gray-700 overflow-hidden p-1 shadow-lg">
                            <div className="aspect-[4/3] rounded-lg overflow-hidden relative group bg-gray-900">
                              <PitPhotoImg
                                urls={detailModalPhotoUrls}
                                alt={selectedDetailItem.robot_name || 'Robot'}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                fallbackSrc="/placeholder-robot.png"
                                loading="eager"
                              />
                            </div>
                          </Card>
                          
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold text-white">{selectedDetailItem.robot_name || 'Robot Overview'}</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedDetailItem.drive_type && (
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium">
                                  {selectedDetailItem.drive_type}
                                </Badge>
                              )}
                              {selectedDetailItem.weight != null && selectedDetailItem.weight > 0 && (
                                <Badge variant="outline" className="border-gray-600 text-gray-300 font-medium">
                                  {selectedDetailItem.weight} lbs (no bumpers)
                                </Badge>
                              )}
                              {selectedDetailItem.overall_rating && selectedDetailItem.overall_rating > 0 && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold">
                                  ★ {selectedDetailItem.overall_rating}/10
                                </Badge>
                              )}
                              {getPitBallHoldAmount(selectedDetailItem.drive_train_details) != null && (
                                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 font-medium">
                                  {formatPitBallCapacity(selectedDetailItem.drive_train_details)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-gray-500 uppercase block mb-1">Programming</span>
                              <span className="text-sm font-semibold text-white">{selectedDetailItem.programming_language || '—'}</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="text-[10px] text-gray-500 uppercase block mb-1">Cameras</span>
                              <span className="text-sm font-semibold text-white">{selectedDetailItem.camera_count ?? '—'}</span>
                            </div>
                          </div>

                          {/* Auto Paths Section */}
                          {selectedDetailItem.annotated_image_url && (
                            <div className="space-y-3 pt-4 border-t border-gray-800">
                              <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Route className="w-3.5 h-3.5" /> Auto Paths
                              </h4>
                              <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900 shadow-inner">
                                <img
                                  src={selectedDetailItem.annotated_image_url}
                                  alt="Annotated auto paths"
                                  className="w-full h-auto object-contain max-h-64"
                                />
                              </div>
                              {selectedDetailItem.auto_paths && selectedDetailItem.auto_paths.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                                  {selectedDetailItem.auto_paths.map((p: any, i: number) => (
                                    p.comment && (
                                      <div key={p.id} className="flex items-start gap-2.5 text-xs bg-gray-800/30 p-2 rounded-lg border border-gray-700/50">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: p.color }} />
                                        <div className="flex flex-col">
                                          <span className="text-gray-400 font-bold">Path {i + 1}</span>
                                          <span className="text-gray-200">{p.comment}</span>
                                        </div>
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Detailed Specs */}
                        <div className="lg:col-span-8 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Drivetrain Section */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" /> Drivetrain
                              </h4>
                              <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 space-y-3 shadow-sm">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-400">Drive Type</span>
                                  <span className="font-bold text-white">{selectedDetailItem.drive_type}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-400">Frame Perimeter</span>
                                  <span className="font-bold text-white">
                                    {selectedDetailItem.robot_dimensions?.framePerimeter != null
                                      ? `${selectedDetailItem.robot_dimensions.framePerimeter.toFixed(1)}"`
                                      : (selectedDetailItem.robot_dimensions?.length != null && selectedDetailItem.robot_dimensions?.width != null
                                          ? `${(2*(selectedDetailItem.robot_dimensions.length + selectedDetailItem.robot_dimensions.width)).toFixed(1)}" (calc)`
                                          : '—')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-400">L × W × H</span>
                                  <span className="font-bold text-white">
                                    {selectedDetailItem.robot_dimensions?.length != null || selectedDetailItem.robot_dimensions?.width != null || selectedDetailItem.robot_dimensions?.height != null
                                      ? `${selectedDetailItem.robot_dimensions?.length ?? '?'}" × ${selectedDetailItem.robot_dimensions?.width ?? '?'}" × ${selectedDetailItem.robot_dimensions?.height ?? '?'}"`
                                      : '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-400">Motor Count</span>
                                  <span className="font-bold text-white">{selectedDetailItem.drive_train_details?.drive_camps ?? selectedDetailItem.drive_train_details?.motor_count ?? '—'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-400">Ball capacity</span>
                                  <span className="font-bold text-white">{formatPitBallCapacity(selectedDetailItem.drive_train_details)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-400">Weight (no bumpers)</span>
                                  <span className="font-bold text-white">{selectedDetailItem.weight != null ? `${selectedDetailItem.weight} lbs` : '—'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Autonomous Capabilities */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-400" /> Autonomous
                              </h4>
                              <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 min-h-[140px] shadow-sm">
                                <div className="flex flex-wrap gap-2">
                                  {selectedDetailItem.autonomous_capabilities?.length > 0 ? (
                                    selectedDetailItem.autonomous_capabilities.map((cap: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="bg-orange-500/10 text-orange-300 border-orange-500/20 font-normal">
                                        {cap}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-gray-500 text-sm italic">No autonomous capabilities documented</span>
                                  )}
                                </div>
                                {selectedDetailItem.can_autoalign && (
                                  <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center gap-2 text-sm text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Supports Auto-Align</span>
                                  </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center text-sm">
                                  <span className="text-gray-400">Auto Fuel Scored</span>
                                  <span className="font-bold text-white text-lg">{selectedDetailItem.auto_fuel_count ?? 0}</span>
                                </div>
                              </div>
                            </div>

                            {/* Teleop Section */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-400" /> Teleop
                              </h4>
                              <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 min-h-[120px] shadow-sm">
                                <div className="flex flex-wrap gap-2">
                                  {selectedDetailItem.teleop_capabilities?.length > 0 ? (
                                    selectedDetailItem.teleop_capabilities.map((cap: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="bg-yellow-500/10 text-yellow-300 border-yellow-500/20 font-normal">
                                        {cap}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-gray-500 text-sm italic">No teleop capabilities documented</span>
                                  )}
                                </div>
                                {selectedDetailItem.shooting_locations?.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                                    <span className="text-[10px] text-gray-500 uppercase block mb-2">Shooting Locations</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {selectedDetailItem.shooting_locations.map((loc: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-[10px] border-gray-700 text-gray-400">{loc}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Endgame Section */}
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Award className="w-4 h-4 text-green-400" /> Endgame
                              </h4>
                              <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 min-h-[120px] shadow-sm">
                                <div className="flex flex-wrap gap-2">
                                  {(selectedDetailItem.endgame_capabilities?.length ?? 0) > 0 ? (
                                    selectedDetailItem.endgame_capabilities?.map((cap: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="bg-green-500/10 text-green-300 border-green-500/20 font-normal">
                                        {cap}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-gray-500 text-sm italic">No endgame capabilities documented</span>
                                  )}
                                </div>
                                {selectedDetailItem.climb_location && (
                                  <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Climb Location</span>
                                    <span className="font-bold text-white capitalize">{selectedDetailItem.climb_location}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>

                          {/* Notes Section */}
                          <div className="space-y-4 h-full">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-gray-400" /> Additional Notes
                            </h4>
                            <div className="bg-gray-800/40 p-5 rounded-2xl border border-gray-700/50 shadow-sm h-full">
                              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedDetailItem.notes || 'No additional notes provided for this robot.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Extra photos (hero uses first URL; gallery shows the rest without duplicating) */}
                      {detailModalPhotoUrls.length > 1 && (
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Robot Gallery</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {detailModalPhotoUrls.slice(1).map((url: string, i: number) => (
                              <div key={url + i} className="aspect-square rounded-xl overflow-hidden border border-gray-700 bg-gray-900 group relative">
                                <img
                                  src={url}
                                  alt={`Robot photo ${i + 2}`}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-gray-700 bg-gray-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>Scouted by <span className="text-white font-medium">{selectedDetailItem.submitted_by_name}</span></span>
                      </div>
                      <div className="h-3 w-px bg-gray-700" />
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(selectedDetailItem.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => setShowDetailModal(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        Close
                      </Button>
                      {isAdmin && (
                        <Button
                          onClick={() => handleEdit(selectedDetailItem)}
                          className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-lg shadow-blue-500/20"
                        >
                          <Edit className="w-4 h-4" /> Edit Data
                        </Button>
                      )}
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
