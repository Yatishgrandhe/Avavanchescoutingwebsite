/**
 * Public Competition History — for non–logged-in users.
 * Linked from the homepage "Competition History" button.
 * Shows live events + past competitions with full detail (match scouting data).
 */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Calendar,
  Trophy,
  Users,
  Target,
  BarChart3,
  Search,
  Clock,
  MapPin,
  ChevronRight,
  Database,
  Archive,
  Radio,
  ArrowLeft,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useSupabase } from '@/pages/_app';

interface PastCompetition {
  id: string;
  competition_name: string;
  competition_key: string;
  competition_year: number;
  competition_location?: string;
  competition_date_start?: string;
  competition_date_end?: string;
  total_teams: number;
  total_matches: number;
  migrated_at: string;
  created_at: string;
}

interface CompetitionDetails {
  competition: PastCompetition;
  teams: any[];
  matches: any[];
  scoutingData: any[];
  pitScoutingData: any[];
  pickLists: any[];
}

interface LiveEvent {
  event_key: string;
  competition_name: string;
  total_teams: number;
  total_matches: number;
  scouting_count: number;
}

export default function PublicCompetitionHistoryPage() {
  const router = useRouter();
  const { user } = useSupabase();
  const [competitions, setCompetitions] = useState<PastCompetition[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      const response = await fetch('/api/past-competitions');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCompetitions(data.competitions || []);
      setLiveEvents(data.live || []);
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompetitionDetails = async (competitionId: string) => {
    try {
      const response = await fetch(`/api/past-competitions?id=${competitionId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSelectedCompetition(data);
      setShowDetails(true);
    } catch (error) {
      console.error('Error loading competition details:', error);
    }
  };

  const filteredCompetitions = competitions.filter(comp => {
    const matchesSearch = comp.competition_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comp.competition_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (comp.competition_location && comp.competition_location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesYear = !yearFilter || comp.competition_year.toString() === yearFilter;
    return matchesSearch && matchesYear;
  });

  const uniqueYears = Array.from(new Set(competitions.map(comp => comp.competition_year))).sort((a, b) => b - a);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <Logo size="sm" />
              <span className="font-semibold">Avalanche Scouting</span>
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading competition history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Public header — no sidebar; guests see Back to Home only, logged-in see Sign In only */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Logo size="sm" />
            <span className="font-semibold">Avalanche Scouting</span>
          </Link>
          <div className="flex items-center gap-3">
            {!user && (
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Home
                </Button>
              </Link>
            )}
            {user && (
              <Link href="/">
                <Button size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1 sm:mb-2">
                Competition History
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                View live and past competition data.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {liveEvents.length > 0 && `${liveEvents.length} live · `}
                {competitions.length} past archived
              </span>
            </div>
          </div>
        </div>

        {/* Live section */}
        {liveEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Radio className="h-5 w-5 text-emerald-500" />
              Live — current data being scouted
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {liveEvents.map((ev) => (
                <Card
                  key={ev.event_key}
                  className="p-4 sm:p-6 rounded-lg shadow-sm border border-emerald-500/30 bg-emerald-500/5 transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-2 block">
                        Live
                      </span>
                      <h3 className="text-lg font-semibold text-foreground">{ev.competition_name}</h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{ev.event_key}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Users className="h-4 w-4 text-emerald-500 mr-1" />
                        <span className="text-sm font-medium text-foreground">{ev.total_teams}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Teams</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Target className="h-4 w-4 text-emerald-500 mr-1" />
                        <span className="text-sm font-medium text-foreground">{ev.total_matches}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Matches</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    {ev.scouting_count} scouting records
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past competitions */}
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          Past competitions
        </h2>

        <Card className="p-4 sm:p-6 mb-6 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search competitions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">All Years</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCompetitions.length === 0 ? (
            <div className="col-span-full">
              <Card className="p-8 sm:p-12 text-center rounded-lg shadow-sm border">
                <Archive className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">No Competitions Found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {searchTerm || yearFilter ? 'No competitions match your search.' : 'No past competitions archived yet.'}
                </p>
              </Card>
            </div>
          ) : (
            filteredCompetitions.map((competition) => (
              <Card
                key={competition.id}
                className="p-4 sm:p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => loadCompetitionDetails(competition.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{competition.competition_name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{competition.competition_key}</p>
                    {competition.competition_location && (
                      <div className="flex items-center text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        {competition.competition_location}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-sm font-medium text-foreground">{competition.total_teams}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Teams</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Target className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm font-medium text-foreground">{competition.total_matches}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Matches</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {competition.competition_year}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(competition.migrated_at).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail modal — full data */}
        {showDetails && selectedCompetition && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {selectedCompetition.competition.competition_name}
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedCompetition.competition.competition_key} • {selectedCompetition.competition.competition_year}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowDetails(false)} className="px-4 py-2">
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4 text-center">
                    <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{selectedCompetition.teams.length}</p>
                    <p className="text-sm text-muted-foreground">Teams</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{selectedCompetition.matches.length}</p>
                    <p className="text-sm text-muted-foreground">Matches</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <BarChart3 className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{selectedCompetition.scoutingData.length}</p>
                    <p className="text-sm text-muted-foreground">Scouting Records</p>
                  </Card>
                  {selectedCompetition.pickLists.length > 0 && (
                    <Card className="p-4 text-center">
                      <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{selectedCompetition.pickLists.length}</p>
                      <p className="text-sm text-muted-foreground">Pick Lists</p>
                    </Card>
                  )}
                </div>

                <Card className="p-6 mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Match Schedule</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Match</th>
                          <th className="text-left py-2">Red Alliance</th>
                          <th className="text-left py-2">Blue Alliance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCompetition.matches.map((match) => (
                          <tr key={match.match_id} className="border-b">
                            <td className="py-2 font-medium">{match.match_number}</td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-1">
                                {(match.red_teams || []).map((team: number) => (
                                  <span key={team} className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-600 dark:text-red-400">
                                    {team}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-1">
                                {(match.blue_teams || []).map((team: number) => (
                                  <span key={team} className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    {team}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-sm text-muted-foreground mt-2">
                      Showing all {selectedCompetition.matches.length} matches
                    </p>
                  </div>
                </Card>

                <Card className="p-6 mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Team Performance (Match Scouting)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Team</th>
                          <th className="text-left py-2">Matches</th>
                          <th className="text-left py-2">Avg Score</th>
                          <th className="text-left py-2">Auto</th>
                          <th className="text-left py-2">Teleop</th>
                          <th className="text-left py-2">Endgame</th>
                          <th className="text-left py-2">Defense</th>
                          <th className="text-left py-2">Best</th>
                          <th className="text-left py-2">Consistency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const teamStatsMap = new Map();
                          selectedCompetition.teams.forEach((team: { team_number: number; team_name: string }) => {
                            teamStatsMap.set(team.team_number, {
                              team_number: team.team_number,
                              team_name: team.team_name,
                              total_matches: 0,
                              scores: [] as number[],
                              autonomous_points: [] as number[],
                              teleop_points: [] as number[],
                              endgame_points: [] as number[],
                              defense_ratings: [] as number[],
                            });
                          });
                          selectedCompetition.scoutingData.forEach((data: any) => {
                            const teamStat = teamStatsMap.get(data.team_number);
                            if (teamStat) {
                              teamStat.total_matches++;
                              teamStat.scores.push(data.final_score || 0);
                              teamStat.autonomous_points.push(data.autonomous_points || 0);
                              teamStat.teleop_points.push(data.teleop_points || 0);
                              teamStat.endgame_points.push(0);
                              teamStat.defense_ratings.push(data.defense_rating || 0);
                            }
                          });
                          return Array.from(teamStatsMap.values())
                            .filter(stat => stat.total_matches > 0)
                            .map(stat => {
                              const avgScore = stat.scores.reduce((a: number, b: number) => a + b, 0) / stat.total_matches;
                              const avgAuto = stat.autonomous_points.reduce((a: number, b: number) => a + b, 0) / stat.total_matches;
                              const avgTeleop = stat.teleop_points.reduce((a: number, b: number) => a + b, 0) / stat.total_matches;
                              const avgEndgame = stat.endgame_points.reduce((a: number, b: number) => a + b, 0) / stat.total_matches;
                              const avgDefense = stat.defense_ratings.reduce((a: number, b: number) => a + b, 0) / stat.total_matches;
                              const bestScore = Math.max(...stat.scores);
                              const variance = stat.scores.reduce((s: number, sc: number) => s + Math.pow(sc - avgScore, 2), 0) / stat.total_matches;
                              const consistency = Math.max(0, 100 - (Math.sqrt(variance) / avgScore) * 100);
                              return {
                                ...stat,
                                avg_score: Math.round(avgScore * 100) / 100,
                                avg_auto: Math.round(avgAuto * 100) / 100,
                                avg_teleop: Math.round(avgTeleop * 100) / 100,
                                avg_endgame: Math.round(avgEndgame * 100) / 100,
                                avg_defense: Math.round(avgDefense * 100) / 100,
                                best_score: bestScore,
                                consistency: Math.round(consistency * 100) / 100,
                              };
                            })
                            .sort((a, b) => b.avg_score - a.avg_score)
                            .map(team => (
                              <tr key={team.team_number} className="border-b hover:bg-muted/50">
                                <td className="py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                      {team.team_number}
                                    </span>
                                    <span className="font-medium text-foreground">{team.team_name || 'No Name'}</span>
                                  </div>
                                </td>
                                <td className="py-2 text-foreground">{team.total_matches}</td>
                                <td className="py-2"><span className="font-semibold text-primary">{team.avg_score}</span></td>
                                <td className="py-2 text-foreground">{team.avg_auto}</td>
                                <td className="py-2 text-foreground">{team.avg_teleop}</td>
                                <td className="py-2 text-foreground">{team.avg_endgame}</td>
                                <td className="py-2">
                                  <span className={`font-semibold ${team.avg_defense >= 7 ? 'text-green-600' : team.avg_defense >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {team.avg_defense}/10
                                  </span>
                                </td>
                                <td className="py-2 font-semibold text-green-600">{team.best_score}</td>
                                <td className="py-2">
                                  <span className={`font-semibold ${team.consistency >= 80 ? 'text-green-600' : team.consistency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {team.consistency}%
                                  </span>
                                </td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>
                    <p className="text-sm text-muted-foreground mt-2">
                      Match scouting data.
                    </p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">All Teams ({selectedCompetition.teams.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {selectedCompetition.teams.map((team: any) => (
                      <div
                        key={team.team_number}
                        className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                            {team.team_number}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate" title={team.team_name}>
                          {team.team_name || 'No Name'}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    All teams in this competition.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Avalanche Scouting</Link>
          {user && (
            <>
              {' · '}
              <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
