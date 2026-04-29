import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Switch } from '../../components/ui';
import { Button } from '../../components/ui';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Trophy,
  BarChart3,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { computeRebuiltMetrics } from '@/lib/analytics';
import { formatDurationSec } from '@/lib/utils';
import { SCOUTING_MATCH_ID_SEASON_PATTERN, CURRENT_EVENT_KEY, CURRENT_EVENT_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getOrgCurrentEvent } from '@/lib/org-app-config';

interface TeamData {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  avg_downtime?: number | null;
  avg_downtime_sec?: number | null;
  broke_count?: number;
  broke_rate?: number;
  avg_auto_fuel?: number;
  avg_teleop_fuel?: number;
  avg_climb_pts?: number;
  avg_auto_climb_pts?: number;
  avg_teleop_climb_pts?: number;
  avg_uptime_pct?: number | null;
  clank?: number;
  avg_climb_speed_sec?: number | null;
  rpmagic?: number;
  goblin?: number;
  auto_pts_min?: number;
  auto_pts_max?: number;
  teleop_pts_min?: number;
  teleop_pts_max?: number;
  total_pts_min?: number;
  total_pts_max?: number;
  balls_per_cycle_min?: number;
  balls_per_cycle_max?: number;
  avg_balls_per_cycle?: number;
  epa?: number;
  tba_opr?: number;
  normalized_opr?: number;
  tba_epa?: number;
  avg_shooting_time_sec?: number | null;
}

interface MatchData {
  id?: string;
  match_id: string;
  team_number: number;
  team_name?: string;
  alliance_color: 'red' | 'blue';
  autonomous_points: number;
  teleop_points: number;
  final_score: number;
  defense_rating: number;
  average_downtime?: number | null;
  broke?: boolean | null;
  comments?: string;
  created_at: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  submitted_at?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function BasicAnalysis() {
  const { user, loading: authLoading, supabase } = useSupabase();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [uniqueMatchesCount, setUniqueMatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [teamDataOnly, setTeamDataOnly] = useState(false); // Default OFF (Show all data for active competition)
  type TeamSortKey = 'avg_shooting_time_sec' | 'avg_total_score' | 'total_matches' | 'avg_autonomous_points' | 'avg_teleop_points' | 'tba_opr' | 'team_number' | 'team_name' | 'epa' | 'avg_defense_rating';
  const [teamSortField, setTeamSortField] = useState<TeamSortKey>('avg_shooting_time_sec');
  const [teamSortDirection, setTeamSortDirection] = useState<'asc' | 'desc'>('desc');
  const [minMatchesFilter, setMinMatchesFilter] = useState<number | ''>('');
  const [minAvgScoreFilter, setMinAvgScoreFilter] = useState<number | ''>('');

  useEffect(() => {
    fetchData();
  }, [teamDataOnly, user?.organization_id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch organization's active event if available
      let currentEventKey = '';
      if (user?.organization_id) {
        const { eventKey } = await getOrgCurrentEvent(supabase, user.organization_id);
        currentEventKey = eventKey;
      }

      // Load scouting data exactly like data.tsx does
      let scoutingQuery = supabase
        .from('scouting_data')
        .select('*, matches!inner(event_key)');

      // Use active competition filter if found, otherwise season pattern
      if (currentEventKey) {
        scoutingQuery = scoutingQuery.eq('matches.event_key', currentEventKey);
      } else {
        scoutingQuery = scoutingQuery.like('match_id', SCOUTING_MATCH_ID_SEASON_PATTERN);
      }

      if (teamDataOnly && user?.organization_id) {
        scoutingQuery = scoutingQuery.eq('organization_id', user.organization_id);
      }

      const { data: scoutingDataResult, error: scoutingError } = await scoutingQuery;

      if (scoutingError) {
        console.error('Error fetching scouting data:', scoutingError);
        throw scoutingError;
      }

      // Sort by submitted_at first, then created_at as fallback (most recent first)
      const sortedScoutingData = (scoutingDataResult || []).sort((a: any, b: any) => {
        const aTime = a.submitted_at || a.created_at;
        const bTime = b.submitted_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      // Load teams exactly like data.tsx does
      const { data: teamsResult, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .not('team_name', 'ilike', '%avalanche%')
        .order('team_number');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      const allTeams = teamsResult || [];

      // Set matches data for matches tab
      const teamsMap = new Map();
      allTeams.forEach((team: any) => {
        teamsMap.set(team.team_number, team.team_name);
      });

      // Transform scouting data to match MatchData interface
      const matchData = sortedScoutingData.map((sd: any) => ({
        id: sd.id,
        match_id: sd.match_id,
        team_number: sd.team_number,
        team_name: teamsMap.get(sd.team_number) || `Team ${sd.team_number}`,
        alliance_color: sd.alliance_color,
        autonomous_points: sd.autonomous_points || 0,
        teleop_points: sd.teleop_points || 0,
        final_score: sd.final_score || 0,
        defense_rating: sd.defense_rating || 0,
        average_downtime: sd.average_downtime ?? null,
        broke: sd.broke ?? null,
        comments: sd.comments || '',
        created_at: sd.created_at,
        submitted_by_name: sd.submitted_by_name,
        submitted_by_email: sd.submitted_by_email,
        submitted_at: sd.submitted_at,
      }));

      setMatches(matchData);

      // Count unique matches (distinct match_id values)
      const uniqueMatchIds = new Set(sortedScoutingData.map((sd: any) => sd.match_id));
      setUniqueMatchesCount(uniqueMatchIds.size);

      // Calculate team stats from scouting data. Use all form scores for averages; matches scouted = distinct match_id (not form count).
      const teamsWithStats = allTeams.map((team: any) => {
        const teamScoutingData = sortedScoutingData.filter((sd: any) => sd.team_number === team.team_number);
        const uniqueMatchIds = new Set(teamScoutingData.map((sd: any) => sd.match_id).filter(Boolean));
        const totalMatches = uniqueMatchIds.size; // matches scouted from data (distinct match_id)
        const formCount = teamScoutingData.length; // all forms submitted for this team

        if (formCount === 0) {
          return {
            team_number: team.team_number,
            team_name: team.team_name,
            total_matches: 0,
            avg_autonomous_points: 0,
            avg_teleop_points: 0,
            avg_total_score: 0,
            avg_defense_rating: 0,
            avg_downtime: null,
            broke_rate: 0,
          };
        }

        // Averages use all form scores (every submission)
        const avgAutonomous = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.autonomous_points || 0), 0) / formCount;
        const avgTeleop = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.teleop_points || 0), 0) / formCount;
        const avgTotal = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.final_score || 0), 0) / formCount;
        const avgDefense = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.defense_rating || 0), 0) / formCount;
        const downtimeValues = teamScoutingData.map((sd: any) => sd.average_downtime).filter((v: any) => v != null && !Number.isNaN(Number(v)));
        const avgDowntime = downtimeValues.length > 0
          ? downtimeValues.reduce((s: number, v: number) => s + Number(v), 0) / downtimeValues.length
          : null;
        const brokeMatchIds = new Set(teamScoutingData.filter((sd: any) => sd.broke === true).map((sd: any) => sd.match_id));
        const brokeRate = totalMatches > 0 ? Math.round((brokeMatchIds.size / totalMatches) * 100) : 0;
        const rebuilt = computeRebuiltMetrics(teamScoutingData);

        return {
          team_number: team.team_number,
          team_name: team.team_name,
          total_matches: totalMatches,
          avg_autonomous_points: avgAutonomous,
          avg_teleop_points: avgTeleop,
          avg_total_score: avgTotal,
          avg_defense_rating: avgDefense,
          avg_downtime: avgDowntime,
          avg_downtime_sec: rebuilt.avg_downtime_sec,
          broke_count: brokeMatchIds.size,
          broke_rate: brokeRate,
          avg_auto_fuel: rebuilt.avg_auto_fuel,
          avg_teleop_fuel: rebuilt.avg_teleop_fuel,
          avg_climb_pts: rebuilt.avg_climb_pts,
          avg_auto_climb_pts: rebuilt.avg_auto_climb_pts,
          avg_teleop_climb_pts: rebuilt.avg_teleop_climb_pts,
          avg_uptime_pct: rebuilt.avg_uptime_pct,
          clank: rebuilt.clank,
          avg_climb_speed_sec: rebuilt.avg_climb_speed_sec ?? null,
          rpmagic: rebuilt.rpmagic,
          goblin: rebuilt.goblin,
          tba_opr: Number(team.tba_opr || 0),
          normalized_opr: Number(team.normalized_opr || 0),
          tba_epa: Number(team.tba_epa || 0),
          avg_shooting_time_sec: team.avg_shooting_time_sec != null ? Number(team.avg_shooting_time_sec) : null,
          epa: Number(team.tba_epa || rebuilt.epa),
        };
      });

      setTeams(teamsWithStats);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error
      setMatches([]);
      setTeams([]);
      setUniqueMatchesCount(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = (teams || []).filter(team => {
    const matchesSearch =
      team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.team_number.toString().includes(searchTerm);
    const matchesMinMatches = minMatchesFilter === '' || team.total_matches >= Number(minMatchesFilter);
    const matchesMinAvgScore = minAvgScoreFilter === '' || (team.avg_total_score ?? 0) >= Number(minAvgScoreFilter);
    return matchesSearch && matchesMinMatches && matchesMinAvgScore;
  });

  const sortedFilteredTeams = [...filteredTeams].sort((a, b) => {
    type K = keyof TeamData;
    let aVal: number | string = (a as any)[teamSortField as K];
    let bVal: number | string = (b as any)[teamSortField as K];
    if (teamSortField === 'team_name') {
      aVal = (aVal ?? '').toString().toLowerCase();
      bVal = (bVal ?? '').toString().toLowerCase();
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return teamSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return teamSortDirection === 'asc'
      ? String(aVal ?? '').localeCompare(String(bVal ?? ''))
      : String(bVal ?? '').localeCompare(String(aVal ?? ''));
  });

  const handleTeamSort = (field: TeamSortKey) => {
    if (teamSortField === field) {
      setTeamSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setTeamSortField(field);
      setTeamSortDirection('desc');
    }
  };

  const topTeams = [...(teams || [])]
    .filter(team => team.avg_total_score > 0) // Only show teams with actual data
    .sort((a, b) => b.avg_total_score - a.avg_total_score)
    .slice(0, 10);

  const chartData = topTeams.map(team => ({
    name: team.team_name ? `${team.team_name}` : `Team ${team.team_number}`,
    nameShort: `#${team.team_number}`, // Short version for charts
    teamNumber: team.team_number,
    autonomous: team.avg_autonomous_points || 0,
    teleop: team.avg_teleop_points || 0,
    total: team.avg_total_score || 0
  }));

  const pieData = [
    { name: 'Autonomous', value: (teams || []).reduce((sum, team) => sum + (team.avg_autonomous_points || 0), 0) },
    { name: 'Teleop', value: (teams || []).reduce((sum, team) => sum + (team.avg_teleop_points || 0), 0) }
  ];

  if (authLoading || loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!user) {
    return null; // ProtectedRoute will handle the redirect
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6 data-page">
          {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Team Analysis</h1>
                <p className="text-slate-300">
                  Comprehensive team performance analysis and insights
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Team Data Only Toggle */}
                <div className="flex items-center gap-3 p-2 px-3 rounded-lg border border-white/5 bg-white/[0.02]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider leading-none mb-1">Data Mode</span>
                    <span className="text-[11px] font-medium text-white/70 whitespace-nowrap">
                      {teamDataOnly ? 'Organization Only' : 'Global Events'}
                    </span>
                  </div>
                  <Switch
                    checked={teamDataOnly}
                    onClick={() => setTeamDataOnly(!teamDataOnly)}
                  />
                </div>

                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.team_number} value={team.team_number.toString()} className="text-white hover:bg-gray-700">
                        Team {team.team_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">All Events</SelectItem>
                    <SelectItem value={CURRENT_EVENT_KEY} className="text-white hover:bg-gray-700">{CURRENT_EVENT_NAME}</SelectItem>
                    <SelectItem value="2026camb" className="text-white hover:bg-gray-700">CAMB 2026</SelectItem>
                    <SelectItem value="2026mabt" className="text-white hover:bg-gray-700">MABT 2026</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Min matches</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Any"
                      value={minMatchesFilter === '' ? '' : minMatchesFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinMatchesFilter(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-24 h-9 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Min performance filter</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="Any"
                      value={minAvgScoreFilter === '' ? '' : minAvgScoreFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinAvgScoreFilter(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 h-9 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Teams</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{teams.length}</div>
                <p className="text-xs text-slate-400">
                  Teams in database
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Scouting Records</CardTitle>
                <Target className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{matches.length}</div>
                <p className="text-xs text-slate-400">
                  {uniqueMatchesCount > 0 ? `${uniqueMatchesCount} unique match${uniqueMatchesCount !== 1 ? 'es' : ''} scouted` : 'No matches scouted yet'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Avg Shooting Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {teams.length > 0
                    ? `${(teams.reduce((sum, team) => sum + (team.avg_shooting_time_sec || 0), 0) / teams.length).toFixed(1)}s`
                    : '—'}
                </div>
                <p className="text-xs text-slate-400">
                  Across all teams
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Top Team</CardTitle>
                <Trophy className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {topTeams.length > 0 ? (topTeams[0].team_name || `Team ${topTeams[0].team_number}`) : 'N/A'}
                </div>
                <p className="text-xs text-slate-400">
                  {topTeams.length > 0 ? `Team ${topTeams[0].team_number} selected by scoring output` : 'No data'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Tables */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Metric definitions (Overview) */}
              <Card className="bg-muted/30 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-white">Overview metrics — how they are calculated</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-300 space-y-1">
                  <p><strong className="text-white">AUTO EPA</strong> — Expected points from autonomous phase (average autonomous points per match).</p>
                  <p><strong className="text-white">TELEOP EPA</strong> — Expected points from teleop phase (average teleop points per match).</p>
                  <p><strong className="text-white">MATCHES SCOUTED</strong> — Total count of matches for which scouting data has been submitted.</p>
                  <p><strong className="text-white">AVG CLIMB</strong> — Average point value earned from climbing at end of match.</p>
                  <p><strong className="text-white">AUTO CLIMB</strong> — Points earned for climbing/moving during autonomous.</p>
                  <p><strong className="text-white">TELEOP CLIMB</strong> — Points earned for climbing during end-game/teleop.</p>
                  <p><strong className="text-white">AVG DOWNTIME</strong> — Average time (seconds) per match robot was disabled.</p>
                  <p><strong className="text-white">BROKE</strong> — Count of matches where robot suffered failure (e.g. X/N or rate).</p>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Top 10 Teams by Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="nameShort"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => value}
                          labelFormatter={(label: any, payload: any) => {
                            const data = payload?.[0]?.payload;
                            return data ? `${data.name} (${data.teamNumber})` : label;
                          }}
                        />
                        <Bar dataKey="total" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="teams" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Team Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('team_number')}>
                          <span className="inline-flex items-center gap-1">Team {teamSortField === 'team_number' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                        <TableHead className="text-[9px] cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('avg_autonomous_points')}>
                          <span className="inline-flex items-center gap-1">Auto EPA {teamSortField === 'avg_autonomous_points' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                        <TableHead className="text-[9px] cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('avg_teleop_points')}>
                          <span className="inline-flex items-center gap-1">Teleop EPA {teamSortField === 'avg_teleop_points' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                        <TableHead className="text-[9px] cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('total_matches')}>
                          <span className="inline-flex items-center gap-1">Matches Scouted {teamSortField === 'total_matches' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                        <TableHead className="text-[9px] cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('tba_opr')}>
                          <span className="inline-flex items-center gap-1">TBA OPR {teamSortField === 'tba_opr' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                        <TableHead className="text-[9px]">AUTO CLIMB</TableHead>
                        <TableHead className="text-[9px]">TELEOP CLIMB</TableHead>
                        <TableHead className="text-[9px]">AVG DOWNTIME</TableHead>
                        <TableHead className="text-[9px]">BROKE</TableHead>
                        <TableHead className="cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('avg_shooting_time_sec')}>
                          <span className="inline-flex items-center gap-1">Avg shooting time {teamSortField === 'avg_shooting_time_sec' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                        <TableHead className="text-[9px]">Average balls/cycle</TableHead>
                        <TableHead className="cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('avg_defense_rating')}>
                          <span className="inline-flex items-center gap-1">Defense {teamSortField === 'avg_defense_rating' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                        <TableHead className="text-[9px]">CLANK</TableHead>
                        <TableHead className="text-[9px]">Avg climb speed</TableHead>
                        <TableHead className="text-[9px]">RPMAGIC</TableHead>
                        <TableHead className="text-[9px]">GOBLIN</TableHead>
                        <TableHead className="text-[9px] cursor-pointer hover:text-white select-none" onClick={() => handleTeamSort('epa')}>
                          <span className="inline-flex items-center gap-1">TBA EPA {teamSortField === 'epa' && (teamSortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFilteredTeams.map((team) => (
                        <TableRow key={team.team_number}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Team {team.team_number}</Badge>
                              <span className="text-sm text-muted-foreground">{team.team_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{team.avg_autonomous_points ?? 0}</TableCell>
                          <TableCell className="text-sm">{team.avg_teleop_points ?? 0}</TableCell>
                          <TableCell>{team.total_matches}</TableCell>
                          <TableCell className="text-sm">{team.tba_opr != null ? Number(team.tba_opr).toFixed(1) : '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_auto_climb_pts ?? '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_teleop_climb_pts ?? '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_downtime_sec != null ? `${Math.round(team.avg_downtime_sec)}s` : (team.avg_downtime != null ? `${Number(team.avg_downtime).toFixed(0)}s` : '—')}</TableCell>
                          <TableCell className="text-sm">{team.total_matches ? `${team.broke_count ?? 0}/${team.total_matches}` : '—'}</TableCell>
                          <TableCell className="font-medium">{team.avg_shooting_time_sec != null ? `${team.avg_shooting_time_sec}s` : '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_balls_per_cycle ?? 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div className="w-16 bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${((team.avg_defense_rating || 0) / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm">{(team.avg_defense_rating || 0).toFixed(0)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{team.normalized_opr != null ? Number(team.normalized_opr).toFixed(2) : '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_shooting_time_sec != null ? `${team.avg_shooting_time_sec}s` : '—'}</TableCell>
                          <TableCell className="text-sm">{team.rpmagic != null ? `${team.rpmagic}%` : '—'}</TableCell>
                          <TableCell className="text-sm">{team.goblin ?? '—'}</TableCell>
                          <TableCell className="text-sm font-bold text-primary">{team.tba_epa != null ? Number(team.tba_epa).toFixed(1) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-white">Recent Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead>Match ID</TableHead>
                        <TableHead>Alliance</TableHead>
                        <TableHead>Autonomous</TableHead>
                        <TableHead>Teleop</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Defense</TableHead>
                        <TableHead>Downtime</TableHead>
                        <TableHead>Broke</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(matches || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center text-muted-foreground">
                            No matches recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        (matches || []).map((match, index) => (
                          <TableRow key={match.id || match.match_id || `match-${index}`}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="font-semibold">{match.team_name || `Team ${match.team_number}`}</span>
                                <span className="text-xs text-muted-foreground">#{match.team_number}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{match.match_id || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={match.alliance_color === 'red' ? 'destructive' : 'default'}>
                                {match.alliance_color}
                              </Badge>
                            </TableCell>
                            <TableCell>{match.autonomous_points}</TableCell>
                            <TableCell>{match.teleop_points}</TableCell>
                            <TableCell className="font-medium">{match.final_score}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: `${((match.defense_rating || 0) / 10) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm">{match.defense_rating || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell>{match.average_downtime != null ? formatDurationSec(Number(match.average_downtime)) : '—'}</TableCell>
                            <TableCell>{match.broke === true ? 'Yes' : match.broke === false ? 'No' : '—'}</TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground">
                              {match.comments || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {match.submitted_by_name || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {match.created_at ? new Date(match.created_at).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Score Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="nameShort"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => value}
                          labelFormatter={(label: any, payload: any) => {
                            const data = payload?.[0]?.payload;
                            return data ? `${data.name} (${data.teamNumber})` : label;
                          }}
                        />
                        <Line type="monotone" dataKey="autonomous" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="teleop" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-white">Performance Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="nameShort"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => value}
                          labelFormatter={(label: any, payload: any) => {
                            const data = payload?.[0]?.payload;
                            return data ? `${data.name} (${data.teamNumber})` : label;
                          }}
                        />
                        <Bar dataKey="autonomous" stackId="a" fill="#8884d8" />
                        <Bar dataKey="teleop" stackId="a" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
