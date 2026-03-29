import React, { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Badge } from '../../components/ui/badge';
import { cn, formatDurationSec, roundToTenth } from '@/lib/utils';
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
  Edit,
  Trash2,
  Shield,
  Target,
  Activity,
  Award,
  TrendingUp,
  Users,
  ArrowRight,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { parseNotes, computeRebuiltMetrics, type RebuiltTeamMetrics } from '@/lib/analytics';
import { ScoutingData, Team } from '@/lib/types';
import { useAdmin } from '@/hooks/use-admin';
import { getClimbPoints } from '@/lib/analytics';
import { getBallChoiceScoreFromRange, getBallChoiceLabel } from '@/lib/types';
import { SCOUTING_MATCH_ID_SEASON_PATTERN } from '@/lib/constants';
import { ScoutingRunsBreakdown } from '@/components/data/ScoutingRunsBreakdown';
import { TeamComparisonPanel } from '@/components/data/TeamComparisonPanel';

interface TeamStat extends RebuiltTeamMetrics {
  team_number: number;
  team_name: string;
  total_matches: number;
  starter_epa?: number;
}

const calculateTeamStats = (
  scoutingData: ScoutingData[],
  teams: Team[],
  matchCountsFromDb?: Record<number, number>,
  epaMap?: Record<number, number>
): TeamStat[] => {
  const teamNameMap = new Map<number, string>();
  teams.forEach(team => {
    teamNameMap.set(team.team_number, team.team_name);
  });

  const teamToRecords = new Map<number, ScoutingData[]>();
  scoutingData.forEach(data => {
    if (!teamToRecords.has(data.team_number)) {
      teamToRecords.set(data.team_number, []);
    }
    teamToRecords.get(data.team_number)!.push(data);
  });

  return Array.from(teamToRecords.entries()).map(([teamNumber, records]) => {
    const teamName = teamNameMap.get(teamNumber) || `Team ${teamNumber}`;
    const uniqueMatchIds = new Set(records.map(r => r.match_id ?? '').filter(Boolean));
    const total_matches =
      matchCountsFromDb != null && typeof matchCountsFromDb[teamNumber] === 'number'
        ? matchCountsFromDb[teamNumber]
        : uniqueMatchIds.size;

    const rebuilt = computeRebuiltMetrics(records, epaMap?.[teamNumber]);

    return {
      ...rebuilt,
      team_number: teamNumber,
      team_name: teamName,
      total_matches,
    };
  }).filter(stat => stat.total_matches > 0);
};

interface DataAnalysisProps { }


const DataAnalysis: React.FC<DataAnalysisProps> = () => {
  const { supabase, user } = useSupabase();
  const { isAdmin } = useAdmin();
  const [scoutingData, setScoutingData] = useState<ScoutingData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // For filter dropdown (excludes Avalanche)
  const [allTeams, setAllTeams] = useState<Team[]>([]); // All teams for name lookups
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showUploaderInfo, setShowUploaderInfo] = useState(true);
  const [sortField, setSortField] = useState<keyof ScoutingData>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'teams' | 'individual'>('teams');
  const [selectedTeamDetails, setSelectedTeamDetails] = useState<number | null>(null);
  const [selectedFormDetails, setSelectedFormDetails] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<ScoutingData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [clearingData, setClearingData] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Team stats sort: default greatest to least average score
  type TeamStatSortKey = 'avg_total_score' | 'total_matches' | 'avg_autonomous_points' | 'avg_teleop_points' | 'endgame_epa' | 'epa' | 'consistency_score' | 'team_number' | 'team_name' | 'shuttle_rate' | 'shuttle_consistency_score' | 'starter_epa';
  const [teamStatsSortField, setTeamStatsSortField] = useState<TeamStatSortKey>('avg_total_score');
  const [teamStatsSortDirection, setTeamStatsSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minMatchesFilter, setMinMatchesFilter] = useState<number | ''>('');
  const [minAvgScoreFilter, setMinAvgScoreFilter] = useState<number | ''>('');
  const [pitByTeam, setPitByTeam] = useState<Record<number, { robot_name?: string | null; drive_type?: string | null; weight?: number | null; overall_rating?: number | null }>>({});
  const [starterEpaMap, setStarterEpaMap] = useState<Record<number, number>>({});
  const [teamDataOnly, setTeamDataOnly] = useState(false); // Default to OFF (show all data)

  useEffect(() => {
    loadData();
  }, [teamDataOnly]); // Reload when toggle changes

  const loadData = async () => {
    try {
      setLoading(true);

      // Load scouting data - select all fields including submitted_by_name and submitted_by_email
      // Only 2026 season: match_id must contain 2026 (e.g. avalanche_2026_qm1)
      let query = supabase
        .from('scouting_data')
        .select('*')
        .like('match_id', SCOUTING_MATCH_ID_SEASON_PATTERN);

      // Apply organization filter if toggle is ON
      if (teamDataOnly && user?.organization_id) {
        query = query.eq('organization_id', user.organization_id);
      }

      const { data: scoutingDataResult, error: scoutingError } = await query;

      if (scoutingError) {
        console.error('Error loading scouting data:', scoutingError);
        throw scoutingError;
      }

      // Sort by submitted_at first, then created_at as fallback (most recent first)
      const sortedScoutingData = (scoutingDataResult || []).sort((a: ScoutingData, b: ScoutingData) => {
        const aTime = a.submitted_at || a.created_at;
        const bTime = b.submitted_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      // Load ALL teams (including Avalanche) for team name lookups and Team Stats calculation
      // Team Stats needs all teams that have scouting data, regardless of team list filter
      const { data: allTeamsResult, error: allTeamsError } = await supabase
        .from('teams')
        .select('*')
        .order('team_number');

      if (allTeamsError) throw allTeamsError;

      // For the team filter dropdown, exclude Avalanche (scouting own team)
      const { data: teamsResult, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .not('team_name', 'ilike', '%avalanche%')
        .order('team_number');

      if (teamsError) throw teamsError;

      setScoutingData(sortedScoutingData);
      setTeams(teamsResult || []);
      setAllTeams(allTeamsResult || []);

      // Calculate starter EPA from past historical data
      const teamNums = (allTeamsResult || []).map((t: any) => t.team_number);
      const { data: pastData } = await supabase
        .from('past_scouting_data')
        .select('team_number, notes')
        .in('team_number', teamNums);

      const epaMap: Record<number, number> = {};
      if (pastData) {
        const teamScores: Record<number, number[]> = {};
        pastData.forEach((row: any) => {
          const rebuilt = computeRebuiltMetrics([row as any]);
          const score = rebuilt.epa; // This will be the estimated score for one match
          if (!teamScores[row.team_number]) teamScores[row.team_number] = [];
          teamScores[row.team_number].push(score);
        });
        Object.entries(teamScores).forEach(([num, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          epaMap[Number(num)] = Math.round(avg * 10) / 10;
        });
      }
      setStarterEpaMap(epaMap);

      // Matches scouted per team from database (distinct match_id count, not form count)
      let matchCountsFromDb: Record<number, number> = {};
      try {
        const countsRes = await fetch('/api/analysis/team-match-counts');
        if (countsRes.ok) {
          const { counts } = await countsRes.json();
          if (counts && typeof counts === 'object') matchCountsFromDb = counts;
        }
      } catch (_) {
        // Fall back to computing from loaded data
      }

      // Calculate team statistics: use ALL form scores for averages; matches = distinct match_id from DB
      const stats = calculateTeamStats(sortedScoutingData, allTeamsResult || [], matchCountsFromDb, epaMap);
      setTeamStats(stats);

      // Load pit scouting data so we can show robot name / drive type per team
      const { data: pitDataResult } = await supabase
        .from('pit_scouting_data')
        .select('team_number, robot_name, drive_type, weight, overall_rating')
        .order('created_at', { ascending: false });
      const pitMap: Record<number, { robot_name?: string | null; drive_type?: string | null; weight?: number | null; overall_rating?: number | null }> = {};
      (pitDataResult || []).forEach((row: { team_number: number; robot_name?: string | null; drive_type?: string | null; weight?: number | null; overall_rating?: number | null }) => {
        if (!pitMap[row.team_number]) {
          pitMap[row.team_number] = {
            robot_name: row.robot_name ?? null,
            drive_type: row.drive_type ?? null,
            weight: row.weight ?? null,
            overall_rating: row.overall_rating ?? null,
          };
        }
      });
      setPitByTeam(pitMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  // Helper functions - defined before use to avoid temporal dead zone errors
  const parseFormNotes = (notes: any) => {
    try {
      const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;

      // Handle nested structure (autonomous/teleop keys) or flat structure
      if (parsed.autonomous || parsed.teleop) {
        // Nested structure; support runs (stopwatch + multiple choice per run)
        const autoRuns = Array.isArray(parsed.autonomous?.runs) ? parsed.autonomous.runs : [];
        const teleopRuns = Array.isArray(parsed.teleop?.runs) ? parsed.teleop.runs : [];
        const autoFuelFromRuns = autoRuns.reduce((s: number, r: { ball_choice: number }) => s + getBallChoiceScoreFromRange(r.ball_choice), 0);
        const teleopFuelFromRuns = teleopRuns.reduce((s: number, r: { ball_choice: number }) => s + getBallChoiceScoreFromRange(r.ball_choice), 0);
        const teleopShiftsFromRuns = teleopRuns.length > 0 ? teleopRuns.map((r: { ball_choice: number }) => getBallChoiceScoreFromRange(r.ball_choice)) : null;

        return {
          autonomous: {
            auto_fuel_active_hub: autoFuelFromRuns || parsed.autonomous?.auto_fuel_active_hub || 0,
            auto_tower_level1: parsed.autonomous?.auto_tower_level1 || false,
            runs: autoRuns,
            duration_sec: parsed.autonomous?.duration_sec,
            balls_0_15: parsed.autonomous?.balls_0_15 ?? 0,
            balls_15_30: parsed.autonomous?.balls_15_30 ?? 0,
            balls_30_45: parsed.autonomous?.balls_30_45 ?? 0,
            balls_45_60: parsed.autonomous?.balls_45_60 ?? 0,
            balls_60_75: parsed.autonomous?.balls_60_75 ?? 0,
            balls_75_90: parsed.autonomous?.balls_75_90 ?? 0,
          },
          teleop: {
            teleop_fuel_active_hub: teleopFuelFromRuns || parsed.teleop?.teleop_fuel_active_hub || 0,
            teleop_fuel_shifts: teleopShiftsFromRuns || parsed.teleop?.teleop_fuel_shifts || (parsed.teleop?.teleop_fuel_active_hub ? [parsed.teleop.teleop_fuel_active_hub] : []),
            teleop_tower_level1: parsed.teleop?.teleop_tower_level1 || false,
            teleop_tower_level2: parsed.teleop?.teleop_tower_level2 || false,
            teleop_tower_level3: parsed.teleop?.teleop_tower_level3 || false,
            runs: teleopRuns,
            duration_sec: parsed.teleop?.duration_sec,
            balls_0_15: parsed.teleop?.balls_0_15 ?? 0,
            balls_15_30: parsed.teleop?.balls_15_30 ?? 0,
            balls_30_45: parsed.teleop?.balls_30_45 ?? 0,
            balls_45_60: parsed.teleop?.balls_45_60 ?? 0,
            balls_60_75: parsed.teleop?.balls_60_75 ?? 0,
            balls_75_90: parsed.teleop?.balls_75_90 ?? 0,
          },
        };
      } else {
        // Flat structure
        return {
          autonomous: {
            auto_fuel_active_hub: parsed.auto_fuel_active_hub || 0,
            auto_tower_level1: parsed.auto_tower_level1 || false,
            duration_sec: parsed.autonomous?.duration_sec ?? parsed.duration_sec,
            balls_0_15: parsed.autonomous?.balls_0_15 ?? parsed.balls_0_15 ?? 0,
            balls_15_30: parsed.autonomous?.balls_15_30 ?? parsed.balls_15_30 ?? 0,
            balls_30_45: parsed.autonomous?.balls_30_45 ?? parsed.balls_30_45 ?? 0,
            balls_45_60: parsed.autonomous?.balls_45_60 ?? parsed.balls_45_60 ?? 0,
            balls_60_75: parsed.autonomous?.balls_60_75 ?? parsed.balls_60_75 ?? 0,
            balls_75_90: parsed.autonomous?.balls_75_90 ?? parsed.balls_75_90 ?? 0,
          },
          teleop: {
            teleop_fuel_active_hub: parsed.teleop_fuel_active_hub || 0,
            teleop_fuel_shifts: parsed.teleop_fuel_shifts || (parsed.teleop_fuel_active_hub ? [parsed.teleop_fuel_active_hub] : []),
            teleop_tower_level1: parsed.teleop_tower_level1 || false,
            teleop_tower_level2: parsed.teleop_tower_level2 || false,
            teleop_tower_level3: parsed.teleop_tower_level3 || false,
            duration_sec: parsed.teleop?.duration_sec,
            balls_0_15: parsed.teleop?.balls_0_15 ?? 0,
            balls_15_30: parsed.teleop?.balls_15_30 ?? 0,
            balls_30_45: parsed.teleop?.balls_30_45 ?? 0,
            balls_45_60: parsed.teleop?.balls_45_60 ?? 0,
            balls_60_75: parsed.teleop?.balls_60_75 ?? 0,
            balls_75_90: parsed.teleop?.balls_75_90 ?? 0,
          },
        };
      }
    } catch (error) {
      return {
        autonomous: { auto_fuel_active_hub: 0, auto_tower_level1: false },
        teleop: { teleop_fuel_active_hub: 0, teleop_fuel_shifts: [], teleop_tower_level1: false, teleop_tower_level2: false, teleop_tower_level3: false },
      };
    }
  };


  // Helper functions - defined before use to avoid temporal dead zone errors
  const getTeamName = (teamNumber: number) => {
    // Use allTeams to get names for all teams including those in scouting_data but not in filter
    const team = allTeams.find(t => t.team_number === teamNumber);
    return team ? team.team_name : `Team ${teamNumber}`;
  };

  const getUploaderName = (data: ScoutingData) => {
    // Use submitted_by_name (username) from scouting_data - this is set when the form is submitted
    // Fall back to submitted_by_email, or 'Unknown' if neither is available
    if (data?.submitted_by_name && typeof data.submitted_by_name === 'string' && data.submitted_by_name.trim()) {
      return data.submitted_by_name.trim();
    }
    if (data?.submitted_by_email && typeof data.submitted_by_email === 'string' && data.submitted_by_email.trim()) {
      // Extract username from email if no name is available
      const emailUsername = data.submitted_by_email.split('@')[0];
      return emailUsername || data.submitted_by_email;
    }
    return 'Unknown';
  };

  // Filter and sort data - using useMemo to prevent recalculation on every render
  const filteredData = useMemo(() => {
    return scoutingData.filter(data => {
      const matchesSearch = searchTerm === '' ||
        data.team_number.toString().includes(searchTerm) ||
        data.match_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (data.comments && data.comments.toLowerCase().includes(searchTerm.toLowerCase())) ||
        getTeamName(data.team_number).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTeam = selectedTeam === null || data.team_number === selectedTeam;

      return matchesSearch && matchesTeam;
    });
  }, [scoutingData, searchTerm, selectedTeam, allTeams]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
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
  }, [filteredData, sortField, sortDirection]);

  const filteredTeamStats = useMemo(() => {
    return teamStats.filter(team => {
      const matchesSearch = searchTerm === '' ||
        team.team_number.toString().includes(searchTerm) ||
        team.team_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTeam = selectedTeam === null || team.team_number === selectedTeam;
      const matchesMinMatches = minMatchesFilter === '' || team.total_matches >= Number(minMatchesFilter);
      const matchesMinAvgScore = minAvgScoreFilter === '' || (team.avg_total_score ?? 0) >= Number(minAvgScoreFilter);
      return matchesSearch && matchesTeam && matchesMinMatches && matchesMinAvgScore;
    });
  }, [teamStats, searchTerm, selectedTeam, minMatchesFilter, minAvgScoreFilter]);

  const sortedTeamStats = useMemo(() => {
    return [...filteredTeamStats].sort((a, b) => {
      type K = keyof typeof a;
      const key = teamStatsSortField as K;
      let aVal: number | string | undefined = (a as any)[key];
      let bVal: number | string | undefined = (b as any)[key];
      
      // Handle undefined values for sorting
      if (aVal === undefined || aVal === null) aVal = -Infinity;
      if (bVal === undefined || bVal === null) bVal = -Infinity;

      if (key === 'team_name') {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return teamStatsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return teamStatsSortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [filteredTeamStats, teamStatsSortField, teamStatsSortDirection]);

  const handleTeamStatsSort = (field: TeamStatSortKey) => {
    if (teamStatsSortField === field) {
      setTeamStatsSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamStatsSortField(field);
      setTeamStatsSortDirection('desc');
    }
  };

  const handleSort = (field: keyof ScoutingData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = (item: ScoutingData) => {
    setDeletingItem(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      const { error } = await supabase
        .from('scouting_data')
        .delete()
        .eq('id', deletingItem.id);

      if (error) {
        throw new Error(`Failed to delete scouting data: ${error.message}`);
      }

      // Remove from local state
      setScoutingData(prev => prev.filter(item => item.id !== deletingItem.id));

      setShowDeleteConfirm(false);
      setDeletingItem(null);

      // Reload data to update team stats
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete scouting data. Please try again.');
    }
  };

  const clearAllMatchData = async () => {
    setClearingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not signed in.');
        return;
      }
      const res = await fetch('/api/admin/clear-scouting-data', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || json.details || 'Failed to clear data');
      }
      setShowClearConfirm(false);
      await loadData();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to clear match data.');
    } finally {
      setClearingData(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingItem(null);
  };

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
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
        <div className="space-y-6 data-page px-2 sm:px-4 md:px-0 max-w-full overflow-x-hidden">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground font-display break-words">
                Data Analysis
              </h1>
            </div>
            <p className="text-sm sm:text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4 break-words">
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

                  {/* Min Matches & Min Avg Score (Team Stats view) */}
                  {viewMode === 'teams' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Min matches</label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Any"
                          value={minMatchesFilter === '' ? '' : minMatchesFilter}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinMatchesFilter(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Min avg score</label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          placeholder="Any"
                          value={minAvgScoreFilter === '' ? '' : minAvgScoreFilter}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinAvgScoreFilter(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}

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

                  {/* Org-only data toggle — default OFF = all orgs */}
                  <div className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {teamDataOnly ? 'Org Only' : 'All Organizations'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {teamDataOnly
                          ? 'Showing data from your organization only'
                          : 'Analysis compiled from all organizations (recommended)'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={teamDataOnly ? 'default' : 'outline'}
                      onClick={() => setTeamDataOnly(!teamDataOnly)}
                      className={cn(
                        "h-8 px-3 rounded-full transition-all",
                        teamDataOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {teamDataOnly ? 'Org Only' : 'All Orgs'}
                    </Button>
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
                    {isAdmin && (
                      <Button
                        onClick={() => setShowClearConfirm(true)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All Data
                      </Button>
                    )}
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
                    ? `Team Statistics (${sortedTeamStats.length} teams)`
                    : `Scouting Data (${sortedData.length} records)`
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {viewMode === 'teams' ? (
                  // Team Statistics View
                  <div className="space-y-4">
                    {/* Mobile Card View for Team Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                      {sortedTeamStats
                        .map((team, index) => (
                          <motion.div
                            key={team.team_number}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="glass-card p-5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all cursor-pointer"
                            onClick={() => setSelectedTeamDetails(team.team_number)}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1 min-w-0 pr-2">
                                <h3 className="text-lg font-bold text-foreground truncate">{team.team_name}</h3>
                                <Badge variant="secondary" className="mt-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
                                  #{team.team_number}
                                </Badge>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest block">Avg Score</span>
                                <span className="text-2xl font-bold text-primary" title="Average score">{team.avg_total_score}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Matches scouted</span>
                                <span className="text-sm font-semibold">{team.total_matches}</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Avg Score</span>
                                <span className="text-sm font-semibold text-primary">{team.avg_total_score}</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Starter EPA</span>
                                <span className="text-sm font-semibold text-muted-foreground">{team.starter_epa ?? '—'}</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Auto EPA</span>
                                <span className="text-sm font-semibold text-blue-400">{team.avg_autonomous_points ?? '—'}</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Teleop EPA</span>
                                <span className="text-sm font-semibold text-orange-400">{team.avg_teleop_points ?? '—'}</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Endgame EPA</span>
                                <span className="text-sm font-semibold text-green-400">{team.endgame_epa ?? team.avg_climb_pts ?? '—'}</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Consistency</span>
                                <span className={cn("text-sm font-semibold", team.consistency_score >= 80 ? 'text-green-400' : team.consistency_score >= 60 ? 'text-yellow-400' : 'text-red-400')}>{team.consistency_score}%</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Shuttle Rate</span>
                                <span className="text-sm font-semibold">{team.shuttle_rate}%</span>
                              </div>
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Shuttle Cons.</span>
                                <span className="text-sm font-semibold">{team.shuttle_consistency_score != null ? `${team.shuttle_consistency_score}%` : '—'}</span>
                              </div>
                            </div>

                            {pitByTeam[team.team_number] && (
                              <div className="mb-4 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                                <span className="text-[10px] text-muted-foreground uppercase block mb-1">Pit</span>
                                <span className="text-sm font-medium text-foreground">{pitByTeam[team.team_number].robot_name || '—'}</span>
                                {pitByTeam[team.team_number].drive_type && <span className="text-sm text-muted-foreground"> · {pitByTeam[team.team_number].drive_type}</span>}
                                {(pitByTeam[team.team_number].weight != null && pitByTeam[team.team_number].weight! > 0) && <span className="text-sm text-muted-foreground"> · {pitByTeam[team.team_number].weight} lbs</span>}
                                {(pitByTeam[team.team_number].overall_rating != null && pitByTeam[team.team_number].overall_rating! > 0) && <span className="text-sm text-muted-foreground"> ★{pitByTeam[team.team_number].overall_rating}/10</span>}
                              </div>
                            )}

                            <div className="flex gap-2 pt-2 border-t border-white/5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewMode('individual');
                                  setSelectedTeam(team.team_number);
                                }}
                                className="flex-1 text-xs glass border-white/10 h-9"
                              >
                                View Forms
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/team/${team.team_number}`, '_blank');
                                }}
                                className="flex-1 text-xs h-9 shadow-lg shadow-primary/20"
                              >
                                Team Details
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none" onClick={() => handleTeamStatsSort('team_number')}>
                              <span className="inline-flex items-center gap-1">Team {teamStatsSortField === 'team_number' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none" onClick={() => handleTeamStatsSort('total_matches')} title="Distinct matches with scouting data (from database, not form count)">
                              <span className="inline-flex items-center gap-1">Matches scouted {teamStatsSortField === 'total_matches' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none" onClick={() => handleTeamStatsSort('avg_total_score')}>
                              <span className="inline-flex items-center gap-1">Avg Score {teamStatsSortField === 'avg_total_score' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none text-[9px]" onClick={() => handleTeamStatsSort('starter_epa')} title="Historical performance baseline from past competitions">
                              <span className="inline-flex items-center gap-1">Starter {teamStatsSortField === 'starter_epa' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none text-[9px]" onClick={() => handleTeamStatsSort('avg_autonomous_points')}>
                              <span className="inline-flex items-center gap-1">Auto EPA {teamStatsSortField === 'avg_autonomous_points' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none text-[9px]" onClick={() => handleTeamStatsSort('avg_teleop_points')}>
                              <span className="inline-flex items-center gap-1">Teleop EPA {teamStatsSortField === 'avg_teleop_points' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none text-[9px]" onClick={() => handleTeamStatsSort('endgame_epa')}>
                              <span className="inline-flex items-center gap-1">Endgame EPA {teamStatsSortField === 'endgame_epa' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none text-[9px]" onClick={() => handleTeamStatsSort('epa')}>
                              <span className="inline-flex items-center gap-1">EPA {teamStatsSortField === 'epa' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground select-none text-[11px]" onClick={() => handleTeamStatsSort('consistency_score')}>
                              <span className="inline-flex items-center gap-1">Consistency {teamStatsSortField === 'consistency_score' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground text-[9px]" onClick={() => handleTeamStatsSort('shuttle_rate')}>
                              <span className="inline-flex items-center gap-1">Shuttle {teamStatsSortField === 'shuttle_rate' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}</span>
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground text-[9px]" onClick={() => handleTeamStatsSort('shuttle_consistency_score')}>
                              <span className="inline-flex items-center gap-1">Shuttle Cons. {teamStatsSortField === 'shuttle_consistency_score' && (teamStatsSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronUp className="w-3.5 h-3.5 inline" />)}</span>
                            </th>
                            <th className="text-left p-4 text-[11px]">Pit</th>
                            <th className="text-right p-4 text-[11px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedTeamStats
                            .map((team, index) => {
                              const pit = pitByTeam[team.team_number];
                              return (
                              <motion.tr
                                key={team.team_number}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                                onClick={() => setSelectedTeamDetails(team.team_number)}
                              >
                                <td className="p-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="bg-blue-500/10 p-2 rounded-lg group-hover:scale-110 transition-transform">
                                      <Users className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-foreground">{team.team_name}</span>
                                      <span className="text-xs text-muted-foreground font-mono">#{team.team_number}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 text-foreground font-medium">{team.total_matches}</td>
                                <td className="p-4">
                                  <span className="font-bold text-primary text-lg">{team.avg_total_score}</span>
                                </td>
                                <td className="p-4 text-muted-foreground font-medium text-xs">{team.starter_epa ?? '—'}</td>
                                <td className="p-4 text-blue-400 font-semibold text-sm">{team.avg_autonomous_points ?? '—'}</td>
                                <td className="p-4 text-orange-400 font-semibold text-sm">{team.avg_teleop_points ?? '—'}</td>
                                <td className="p-4 text-green-400 font-semibold text-sm">{team.endgame_epa ?? team.avg_climb_pts ?? '—'}</td>
                                <td className="p-4 text-primary font-bold text-sm">{team.epa ?? team.avg_total_score ?? '—'}</td>
                                <td className="p-4">
                                  <span className={cn(
                                    "font-bold text-sm",
                                    team.consistency_score >= 80 ? 'text-green-400' :
                                      team.consistency_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                                  )}>
                                    {team.consistency_score}%
                                  </span>
                                </td>
                                <td className="p-4 text-sm font-semibold">{team.shuttle_rate}%</td>
                                <td className="p-4 text-sm font-semibold">{team.shuttle_consistency_score != null ? `${team.shuttle_consistency_score}%` : '—'}</td>
                                <td className="p-4">
                                  {pit ? (
                                    <a
                                      href={`/team/${team.team_number}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      <span className="font-medium text-foreground">{pit.robot_name || '—'}</span>
                                      {pit.drive_type && <span className="ml-1 text-xs"> · {pit.drive_type}</span>}
                                      {pit.weight != null && pit.weight > 0 && <span className="ml-1 text-xs"> · {pit.weight} lbs</span>}
                                      {pit.overall_rating != null && pit.overall_rating > 0 && <span className="ml-1 text-xs"> ★{pit.overall_rating}/10</span>}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewMode('individual');
                                        setSelectedTeam(team.team_number);
                                      }}
                                      className="h-8 w-8 p-0 hover:bg-white/10"
                                      title="View Individual Forms"
                                    >
                                      <Database className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/team/${team.team_number}`, '_blank');
                                      }}
                                      className="h-8 w-8 p-0 hover:bg-white/10"
                                      title="Detailed Analysis"
                                    >
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Individual Forms View
                  <div className="space-y-4">
                    {/* Mobile Card View for Individual Forms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                      {sortedData.map((data, index) => (
                        <motion.div
                          key={data.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="glass-card p-5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all cursor-pointer"
                          onClick={() => toggleRowExpansion(data.id)}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-base font-bold text-foreground truncate">{getTeamName(data.team_number)}</h3>
                                <Badge variant="outline" className="text-[10px] font-mono">#{data.team_number}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                                  className="text-[9px] px-1.5 py-0 uppercase tracking-widest h-4"
                                >
                                  {data.alliance_color}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground font-mono">Match {data.match_id}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest block">Total</span>
                              <span className="text-2xl font-bold text-primary">{data.final_score}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white/5 p-2 rounded-xl text-center border border-white/5">
                              <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Auto</span>
                              <span className="text-sm font-bold text-blue-400">{data.autonomous_points}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl text-center border border-white/5">
                              <span className="text-[9px] text-muted-foreground uppercase block mb-0.5">Teleop</span>
                              <span className="text-sm font-bold text-orange-400">{data.teleop_points}</span>
                            </div>
                          </div>

                          <div className="space-y-4 mb-4">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground uppercase text-[8px] tracking-widest mb-1">Defense Rating</div>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-red-500 h-full rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                    style={{ width: `${(data.defense_rating / 10) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-white min-w-[2.5rem] text-right">{data.defense_rating}/10</span>
                              </div>
                            </div>
                          </div>

                          {data.comments && (
                            <div className="bg-white/5 p-3 rounded-xl mb-4 italic text-xs text-muted-foreground border border-white/5 line-clamp-2">
                              "{data.comments}"
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <User className="w-2.5 h-2.5" />
                                {getUploaderName(data)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(data.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="h-6 px-2 text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center gap-1 font-bold uppercase tracking-wider">
                              {expandedRows.has(data.id) ? (
                                <>Less <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>Details <ChevronDown className="w-3 h-3" /></>
                              )}
                            </div>
                          </div>

                          {/* Expanded Mobile Content */}
                          <AnimatePresence>
                            {expandedRows.has(data.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-white/5 space-y-6"
                              >
                                {(() => {
                                  const formNotes = parseNotes(data.notes, data);
                                  const autoRuns = formNotes.autonomous.runs || [];
                                  const teleopRuns = formNotes.teleop.runs || [];
                                  return (
                                    <>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">Auto</h4>
                                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-muted-foreground uppercase">AVG AUTO (fuel)</span>
                                            <div className="text-sm font-bold text-blue-400">{formNotes.autonomous.auto_fuel_active_hub ?? 0}</div>
                                          </div>
                                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-muted-foreground uppercase">Climb pts</span>
                                            <div className="text-sm font-bold">{getClimbPoints(data.notes)}</div>
                                          </div>
                                          {autoRuns.length > 0 && (
                                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                              <span className="text-[8px] text-muted-foreground uppercase">Runs ({autoRuns.length})</span>
                                              <ul className="text-xs mt-1 space-y-0.5">
                                                {autoRuns.map((r, i) => (
                                                  <li key={i}>{formatDurationSec(r.duration_sec)} — {getBallChoiceLabel(r.ball_choice)}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-muted-foreground uppercase">Climb</span>
                                            <div className="mt-1">
                                              {formNotes.autonomous.auto_tower_level1 ? (
                                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px] h-4">SUCCESS</Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-[9px] opacity-40 h-4">NONE</Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Teleop</h4>
                                          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-muted-foreground uppercase">AVG TELEOP (fuel)</span>
                                            <div className="text-sm font-bold text-orange-400">{formNotes.teleop.teleop_fuel_active_hub ?? 0}</div>
                                          </div>
                                          {teleopRuns.length > 0 && (
                                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                              <span className="text-[8px] text-muted-foreground uppercase">Runs ({teleopRuns.length})</span>
                                              <ul className="text-xs mt-1 space-y-0.5">
                                                {teleopRuns.map((r, i) => (
                                                  <li key={i}>{formatDurationSec(r.duration_sec)} — {getBallChoiceLabel(r.ball_choice)}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex justify-between items-center">
                                            <span className="text-[8px] text-muted-foreground uppercase">T1</span>
                                            {formNotes.teleop.teleop_tower_level1 ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-muted-foreground/20" />}
                                          </div>
                                          <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex justify-between items-center">
                                            <span className="text-[8px] text-muted-foreground uppercase">T2</span>
                                            {formNotes.teleop.teleop_tower_level2 ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-muted-foreground/20" />}
                                          </div>
                                          <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex justify-between items-center">
                                            <span className="text-[8px] text-muted-foreground uppercase font-bold text-white">T3</span>
                                            {formNotes.teleop.teleop_tower_level3 ? <Award className="w-4 h-4 text-yellow-400" /> : <XCircle className="w-3 h-3 text-muted-foreground/20" />}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                          <span className="text-[8px] text-muted-foreground uppercase block">Downtime</span>
                                          <span className="text-xs font-bold">{data.average_downtime != null ? formatDurationSec(Number(data.average_downtime)) : '—'}</span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                          <span className="text-[8px] text-muted-foreground uppercase block">Broke</span>
                                          <span className="text-xs font-bold">{data.broke === true ? 'Yes' : data.broke === false ? 'No' : '—'}</span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                          <span className="text-[8px] text-muted-foreground uppercase block">Climb pts</span>
                                          <span className="text-xs font-bold">{getClimbPoints(data.notes)}</span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                          <span className="text-[8px] text-muted-foreground uppercase block">Shuttle</span>
                                          <span className="text-xs font-bold">{parseNotes(data.notes, data).teleop.shuttle ? 'Yes' : 'No'}</span>
                                        </div>
                                        {parseNotes(data.notes, data).teleop.shuttle && (
                                          <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                            <span className="text-[8px] text-muted-foreground uppercase block">Consistent</span>
                                            <span className="text-xs font-bold">{parseNotes(data.notes, data).teleop.shuttle_consistency}</span>
                                          </div>
                                        )}
                                      </div>

                                      {autoRuns.length === 0 && teleopRuns.length === 0 && (
                                        <div className="text-xs text-muted-foreground text-center py-2">No runs recorded (legacy data)</div>
                                      )}
                                    </>
                                  );
                                })()}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                            <th className="text-left p-4 cursor-pointer hover:text-foreground transition-all" onClick={() => handleSort('team_number')}>
                              Team {sortField === 'team_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground transition-all" onClick={() => handleSort('match_id')}>
                              Match {sortField === 'match_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left p-4">Alliance</th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground transition-all" onClick={() => handleSort('autonomous_points')}>
                              Auto {sortField === 'autonomous_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground transition-all" onClick={() => handleSort('teleop_points')}>
                              Teleop {sortField === 'teleop_points' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground transition-all" onClick={() => handleSort('final_score')}>
                              Total {sortField === 'final_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left p-4 cursor-pointer hover:text-foreground transition-all" onClick={() => handleSort('defense_rating')}>
                              Defense {sortField === 'defense_rating' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left p-4">Downtime</th>
                            <th className="text-left p-4">Broke</th>
                            {showUploaderInfo && (
                              <>
                                <th className="text-left p-4">Uploaded By</th>
                                <th className="text-left p-4 cursor-pointer hover:text-foreground transition-all" onClick={() => handleSort('created_at')}>
                                  Date {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                              </>
                            )}
                            <th className="text-left p-4">Comments</th>
                            <th className="text-left p-4">Details</th>
                            {isAdmin && (
                              <th className="text-left p-4">
                                <div className="flex items-center space-x-2">
                                  <span>Actions</span>
                                  <Shield className="w-4 h-4 text-yellow-500" />
                                </div>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedData.map((data, index) => (
                            <React.Fragment key={data.id}>
                              <motion.tr
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="border-b border-white/5 hover:bg-white/5 group transition-colors"
                              >
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">{getTeamName(data.team_number)}</span>
                                    <Badge variant="outline" className="font-mono text-[10px]">#{data.team_number}</Badge>
                                  </div>
                                </td>
                                <td className="p-4 font-mono font-bold text-primary">{data.match_id}</td>
                                <td className="p-4">
                                  <Badge
                                    variant={data.alliance_color === 'red' ? 'destructive' : 'default'}
                                    className="uppercase text-[9px] tracking-widest"
                                  >
                                    {data.alliance_color}
                                  </Badge>
                                </td>
                                <td className="p-4 text-blue-400 font-bold">{data.autonomous_points}</td>
                                <td className="p-4 text-orange-400 font-bold">{data.teleop_points}</td>
                                <td className="p-4">
                                  <span className="text-xl font-black text-foreground">{data.final_score}</span>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                      {[...Array(10)].map((_, i) => (
                                        <div
                                          key={i}
                                          className={cn(
                                            "w-1 h-3 rounded-full",
                                            i < data.defense_rating ? 'bg-red-500' : 'bg-white/5'
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs font-bold text-muted-foreground">{data.defense_rating}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-muted-foreground text-sm">{data.average_downtime != null ? formatDurationSec(Number(data.average_downtime)) : '—'}</td>
                                <td className="p-4 text-muted-foreground text-sm">{data.broke === true ? 'Yes' : data.broke === false ? 'No' : '—'}</td>
                                {showUploaderInfo && (
                                  <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <User className="w-3 h-3 text-primary" />
                                        <span className="text-xs font-medium text-muted-foreground truncate max-w-[80px]">{getUploaderName(data)}</span>
                                      </div>
                                      <div className="flex items-center gap-2 opacity-60">
                                        <Calendar className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] font-medium text-muted-foreground">{new Date(data.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </td>
                                )}
                                <td className="p-4">
                                  <div className="max-w-[150px] truncate italic text-xs text-muted-foreground" title={data.comments}>
                                    {data.comments || '-'}
                                  </div>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-white/10"
                                      onClick={() => toggleRowExpansion(data.id)}
                                    >
                                      {expandedRows.has(data.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                    {isAdmin && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-white/10"
                                        onClick={() => handleDelete(data)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                              {/* Expanded Details Row */}
                              <AnimatePresence>
                                {expandedRows.has(data.id) && (
                                  <motion.tr
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-white/[0.02] border-b border-white/5 overflow-hidden"
                                  >
                                    <td colSpan={isAdmin ? 12 : 11} className="p-6">
                                      {(() => {
                                        const formNotes = parseNotes(data.notes, data);
                                        const autoRuns = formNotes.autonomous.runs || [];
                                        const teleopRuns = formNotes.teleop.runs || [];
                                        return (
                                          <div className="space-y-6">
                                            <div className="pb-4 border-b border-white/10">
                                              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">2026 Rebuilt · Shooting runs &amp; estimated score</h4>
                                              <ScoutingRunsBreakdown notes={data.notes} shuttleRow={data} compact />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                              <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                                  <Target className="w-3 h-3" /> Autonomous
                                                </h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">AVG AUTO (fuel)</span>
                                                    <div className="text-xl font-bold text-blue-400">{formNotes.autonomous.auto_fuel_active_hub ?? 0}</div>
                                                  </div>
                                                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Climb pts</span>
                                                    <div className="text-lg font-bold">{getClimbPoints(data.notes)}</div>
                                                  </div>
                                                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Level 1 Climb</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                      {formNotes.autonomous.auto_tower_level1 ? (
                                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/20 text-[10px]">SUCCESS</Badge>
                                                      ) : (
                                                        <Badge variant="outline" className="text-[10px] opacity-40">NONE</Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                                {autoRuns.length > 0 && (
                                                  <div className="space-y-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Runs ({autoRuns.length})</span>
                                                    <ul className="text-sm space-y-1">
                                                      {autoRuns.map((r, i) => (
                                                        <li key={i} className="flex justify-between"><span>Run {i + 1}: {formatDurationSec(r.duration_sec)}</span><span>{getBallChoiceLabel(r.ball_choice)} balls</span></li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                                                  <TrendingUp className="w-3 h-3" /> Teleop
                                                </h4>
                                                <div className="space-y-2">
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground">AVG TELEOP (fuel)</span>
                                                    <span className="text-sm font-bold text-orange-400">{formNotes.teleop.teleop_fuel_active_hub ?? 0}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground">Tower Level 1</span>
                                                    {formNotes.teleop.teleop_tower_level1 ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-muted-foreground/20" />}
                                                  </div>
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground">Tower Level 2</span>
                                                    {formNotes.teleop.teleop_tower_level2 ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-muted-foreground/20" />}
                                                  </div>
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground font-bold text-white">Tower Level 3</span>
                                                    {formNotes.teleop.teleop_tower_level3 ? <Award className="w-5 h-5 text-yellow-400" /> : <XCircle className="w-4 h-4 text-muted-foreground/20" />}
                                                  </div>
                                                </div>
                                                {teleopRuns.length > 0 && (
                                                  <div className="space-y-1">
                                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Runs ({teleopRuns.length})</span>
                                                    <ul className="text-sm space-y-1">
                                                      {teleopRuns.map((r, i) => (
                                                        <li key={i} className="flex justify-between"><span>Run {i + 1}: {formatDurationSec(r.duration_sec)}</span><span>{getBallChoiceLabel(r.ball_choice)} balls</span></li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                  <Activity className="w-3 h-3" /> Match reliability
                                                </h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground">Downtime</span>
                                                    <span className="text-sm font-medium">{data.average_downtime != null ? formatDurationSec(Number(data.average_downtime)) : '—'}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground">Broke</span>
                                                    <span className="text-sm font-medium">{data.broke === true ? 'Yes' : data.broke === false ? 'No' : '—'}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground">Climb pts</span>
                                                    <span className="text-sm font-medium">{getClimbPoints(data.notes)}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                    <span className="text-xs text-muted-foreground">Shuttle</span>
                                                    <span className="text-sm font-medium">{formNotes.teleop.shuttle ? 'Yes' : 'No'}</span>
                                                  </div>
                                                  {formNotes.teleop.shuttle && (
                                                    <div className="flex justify-between items-center p-2 px-3 rounded-lg bg-white/5 border border-white/5">
                                                      <span className="text-xs text-muted-foreground">Shuttle Cons.</span>
                                                      <span className="text-sm font-medium">{formNotes.teleop.shuttle_consistency}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
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
                  Are you sure you want to delete the scouting data for Team {deletingItem.team_number} - Match {deletingItem.match_id}?
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

          {/* Clear all data confirmation (admin) */}
          {showClearConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-red-600 rounded-full p-2">
                    <Trash2 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Clear All Match Data</h3>
                </div>
                <p className="text-gray-300 mb-6">
                  Permanently delete all match scouting records? This cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowClearConfirm(false)}
                    disabled={clearingData}
                    className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={clearAllMatchData}
                    disabled={clearingData}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {clearingData ? 'Clearing...' : 'Clear All'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout >
    </ProtectedRoute >
  );
};

export default DataAnalysis;
