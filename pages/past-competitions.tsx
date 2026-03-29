import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { roundToTenth } from '@/lib/utils';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Target, 
  BarChart3, 
  Eye, 
  Filter,
  Search,
  Clock,
  MapPin,
  ChevronRight,
  Database,
  Archive,
  Radio
} from 'lucide-react';

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
  organization_id?: string;
  organization_name?: string | null;
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
  organization_name?: string | null;
}

export default function PastCompetitionsPage() {
  const router = useRouter();
  const { supabase, user, session } = useSupabase();
  const { isAdmin, loading: adminLoading } = useAdmin();
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
      const headers: HeadersInit = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const response = await fetch('/api/past-competitions', { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCompetitions(data.competitions || []);
      setLiveEvents(data.live || []);
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setIsLoading(false);
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading competition history...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
        <div className="min-h-screen bg-background">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header Section */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1 sm:mb-2">
                    Competition History
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Archived competitions from all organizations. Live appears only when your org has a current event set in Team Management.
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

            {/* Live section: current data being collected */}
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
                      className="p-4 sm:p-6 rounded-lg shadow-sm border border-emerald-500/30 bg-emerald-500/5 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      onClick={() => router.push(`/view-data?event_key=${encodeURIComponent(ev.event_key)}&see_all_orgs=1`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Live
                            </span>
                            {ev.organization_name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                {ev.organization_name}
                              </span>
                            )}
                          </div>
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
                        {ev.scouting_count} scouting records · Click to view analysis
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Past Competitions — only archived */}
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              Past competitions
            </h2>

            {/* Filters */}
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

            {/* Competitions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredCompetitions.length === 0 ? (
                <div className="col-span-full">
                  <Card className="p-8 sm:p-12 text-center rounded-lg shadow-sm border">
                    <Archive className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3">
                      No Competitions Found
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
                      {searchTerm || yearFilter 
                        ? 'No competitions match your search criteria.' 
                        : 'No past competitions have been archived yet.'}
                    </p>
                  </Card>
                </div>
              ) : (
                filteredCompetitions.map((competition) => (
                  <Card 
                    key={competition.id} 
                    className="p-4 sm:p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => router.push(`/view-data?id=${encodeURIComponent(competition.id)}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {competition.organization_name && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-2 block w-fit">
                            {competition.organization_name}
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {competition.competition_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {competition.competition_key}
                        </p>
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
                          <span className="text-sm font-medium text-foreground">
                            {competition.total_teams}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Teams</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Target className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-foreground">
                            {competition.total_matches}
                          </span>
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
                        {competition.migrated_at ? new Date(competition.migrated_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
    </Layout>
  );
}
