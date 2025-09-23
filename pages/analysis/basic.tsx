import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
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

interface TeamData {
  team_number: number;
  team_name: string;
  total_matches: number;
  avg_autonomous_points: number;
  avg_teleop_points: number;
  avg_endgame_points: number;
  avg_total_score: number;
  avg_defense_rating: number;
}

interface MatchData {
  match_id: string;
  team_number: number;
  alliance_color: 'red' | 'blue';
  autonomous_points: number;
  teleop_points: number;
  endgame_points: number;
  final_score: number;
  defense_rating: number;
  created_at: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function BasicAnalysis() {
  const { user, loading: authLoading } = useSupabase();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
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
      
      // Fetch teams data
      const teamsResponse = await fetch('/api/teams');
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setTeams(teamsData.teams || []);
      }

      // Fetch matches data
      const matchesResponse = await fetch('/api/matches');
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches(matchesData.matches || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = (teams || []).filter(team => 
    team.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.team_number.toString().includes(searchTerm)
  );

  const topTeams = [...(teams || [])]
    .sort((a, b) => b.avg_total_score - a.avg_total_score)
    .slice(0, 10);

  const chartData = topTeams.map(team => ({
    name: `Team ${team.team_number}`,
    autonomous: team.avg_autonomous_points,
    teleop: team.avg_teleop_points,
    endgame: team.avg_endgame_points,
    total: team.avg_total_score
  }));

  const pieData = [
    { name: 'Autonomous', value: (teams || []).reduce((sum, team) => sum + (team.avg_autonomous_points || 0), 0) },
    { name: 'Teleop', value: (teams || []).reduce((sum, team) => sum + (team.avg_teleop_points || 0), 0) },
    { name: 'Endgame', value: (teams || []).reduce((sum, team) => sum + (team.avg_endgame_points || 0), 0) }
  ];

  if (authLoading) {
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
        <div className="space-y-6">
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
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.team_number} value={team.team_number.toString()}>
                        Team {team.team_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="2025camb">CAMB 2025</SelectItem>
                    <SelectItem value="2025mabt">MABT 2025</SelectItem>
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
                 <CardTitle className="text-sm font-medium text-white">Total Matches</CardTitle>
                 <Target className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{matches.length}</div>
                <p className="text-xs text-slate-400">
                  Matches recorded
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
                  {topTeams.length > 0 ? `Team ${topTeams[0].team_number}` : 'N/A'}
                </div>
                 <p className="text-xs text-slate-400">
                   {topTeams.length > 0 && topTeams[0].avg_total_score ? `${topTeams[0].avg_total_score.toFixed(1)} avg` : 'No data'}
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
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
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
                        <TableHead>Avg Endgame</TableHead>
                        <TableHead>Total Score</TableHead>
                        <TableHead>Defense</TableHead>
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
                           <TableCell>{(team.avg_endgame_points || 0).toFixed(1)}</TableCell>
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
                        <TableHead>Match ID</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Alliance</TableHead>
                        <TableHead>Autonomous</TableHead>
                        <TableHead>Teleop</TableHead>
                        <TableHead>Endgame</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(matches || []).slice(0, 20).map((match) => (
                        <TableRow key={match.match_id}>
                          <TableCell className="font-medium">{match.match_id}</TableCell>
                          <TableCell>Team {match.team_number}</TableCell>
                          <TableCell>
                            <Badge variant={match.alliance_color === 'red' ? 'destructive' : 'default'}>
                              {match.alliance_color}
                            </Badge>
                          </TableCell>
                          <TableCell>{match.autonomous_points}</TableCell>
                          <TableCell>{match.teleop_points}</TableCell>
                          <TableCell>{match.endgame_points}</TableCell>
                          <TableCell className="font-medium">{match.final_score}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(match.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
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
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="autonomous" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="teleop" stroke="#82ca9d" strokeWidth={2} />
                        <Line type="monotone" dataKey="endgame" stroke="#ffc658" strokeWidth={2} />
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
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="autonomous" stackId="a" fill="#8884d8" />
                        <Bar dataKey="teleop" stackId="a" fill="#82ca9d" />
                        <Bar dataKey="endgame" stackId="a" fill="#ffc658" />
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
