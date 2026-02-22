import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
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
  BarChart3
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { computeRebuiltMetrics } from '@/lib/analytics';

interface TeamData {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
  avg_downtime?: number | null;
  broke_rate?: number;
  avg_auto_fuel?: number;
  avg_teleop_fuel?: number;
  avg_climb_pts?: number;
  avg_uptime_pct?: number | null;
  clank?: number;
  rpmagic?: number;
  goblin?: number;
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Load scouting data exactly like data.tsx does
      // Fetch all data, then sort client-side by submitted_at (or created_at as fallback)
      const { data: scoutingDataResult, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*');

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

      // Calculate team stats from scouting data
      const teamsWithStats = allTeams.map((team: any) => {
        const teamScoutingData = sortedScoutingData.filter((sd: any) => sd.team_number === team.team_number);
        const totalMatches = teamScoutingData.length;
        
        if (totalMatches === 0) {
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
        
        const avgAutonomous = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.autonomous_points || 0), 0) / totalMatches;
        const avgTeleop = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.teleop_points || 0), 0) / totalMatches;
        const avgTotal = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.final_score || 0), 0) / totalMatches;
        const avgDefense = teamScoutingData.reduce((sum: number, sd: any) => sum + (sd.defense_rating || 0), 0) / totalMatches;
        const downtimeValues = teamScoutingData.map((sd: any) => sd.average_downtime).filter((v: any) => v != null && !Number.isNaN(Number(v)));
        const avgDowntime = downtimeValues.length > 0
          ? downtimeValues.reduce((s: number, v: number) => s + Number(v), 0) / downtimeValues.length
          : null;
        const brokeCount = teamScoutingData.filter((sd: any) => sd.broke === true).length;
        const brokeRate = totalMatches > 0 ? Math.round((brokeCount / totalMatches) * 100) : 0;
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
          broke_rate: brokeRate,
          avg_auto_fuel: rebuilt.avg_auto_fuel,
          avg_teleop_fuel: rebuilt.avg_teleop_fuel,
          avg_climb_pts: rebuilt.avg_climb_pts,
          avg_uptime_pct: rebuilt.avg_uptime_pct,
          clank: rebuilt.clank,
          rpmagic: rebuilt.rpmagic,
          goblin: rebuilt.goblin,
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

  const filteredTeams = (teams || []).filter(team => 
    team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.team_number.toString().includes(searchTerm)
  );

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
          <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-bold text-white">Team Analysis</h1>
               <p className="text-slate-300">
                 Comprehensive team performance analysis and insights
               </p>
            </div>
            <div className="flex items-center gap-2">
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
                    <SelectItem value="2026camb" className="text-white hover:bg-gray-700">CAMB 2026</SelectItem>
                    <SelectItem value="2026mabt" className="text-white hover:bg-gray-700">MABT 2026</SelectItem>
                  </SelectContent>
                </Select>
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
                 <CardTitle className="text-sm font-medium text-white">Avg Score</CardTitle>
                 <TrendingUp className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                 <div className="text-2xl font-bold text-white">
                   {teams.length > 0 ? (teams.reduce((sum, team) => sum + (team.avg_total_score || 0), 0) / teams.length).toFixed(1) : '0'}
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
                   {topTeams.length > 0 && topTeams[0].avg_total_score ? `Team ${topTeams[0].team_number} - ${topTeams[0].avg_total_score.toFixed(1)} avg` : 'No data'}
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
                        <TableHead>Team</TableHead>
                        <TableHead>Matches</TableHead>
                        <TableHead>Avg Autonomous</TableHead>
                        <TableHead>Avg Teleop</TableHead>
                        <TableHead>Total Score</TableHead>
                        <TableHead>Defense</TableHead>
                        <TableHead>Avg Downtime</TableHead>
                        <TableHead>Broke %</TableHead>
                        <TableHead className="text-[9px]">Auto Fuel</TableHead>
                        <TableHead className="text-[9px]">Teleop Fuel</TableHead>
                        <TableHead className="text-[9px]">Climb Pts</TableHead>
                        <TableHead className="text-[9px]">Uptime %</TableHead>
                        <TableHead className="text-[9px]">CLANK</TableHead>
                        <TableHead className="text-[9px]">RPMAGIC</TableHead>
                        <TableHead className="text-[9px]">GOBLIN</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.map((team) => (
                        <TableRow key={team.team_number}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Team {team.team_number}</Badge>
                              <span className="text-sm text-muted-foreground">{team.team_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{team.total_matches}</TableCell>
                           <TableCell>{(team.avg_autonomous_points || 0).toFixed(1)}</TableCell>
                           <TableCell>{(team.avg_teleop_points || 0).toFixed(1)}</TableCell>
                           <TableCell className="font-medium">{(team.avg_total_score || 0).toFixed(1)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div className="w-16 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ width: `${((team.avg_defense_rating || 0) / 10) * 100}%` }}
                                />
                              </div>
                               <span className="text-sm">{(team.avg_defense_rating || 0).toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{team.avg_downtime != null ? `${Number(team.avg_downtime).toFixed(1)}s` : '—'}</TableCell>
                          <TableCell>{team.broke_rate != null ? `${team.broke_rate}%` : '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_auto_fuel ?? '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_teleop_fuel ?? '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_climb_pts ?? '—'}</TableCell>
                          <TableCell className="text-sm">{team.avg_uptime_pct != null ? `${team.avg_uptime_pct}%` : '—'}</TableCell>
                          <TableCell className="text-sm">{team.clank != null ? `${team.clank}%` : '—'}</TableCell>
                          <TableCell className="text-sm">{team.rpmagic ?? '—'}</TableCell>
                          <TableCell className="text-sm">{team.goblin ?? '—'}</TableCell>
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
                            <TableCell>{match.average_downtime != null ? `${Number(match.average_downtime).toFixed(1)}s` : '—'}</TableCell>
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
