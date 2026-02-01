import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
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
    ArrowLeft,
    Sparkles,
    ChevronDown,
    ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

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
}

interface CompetitionDetails {
    competition: PastCompetition;
    teams: any[];
    matches: any[];
    scoutingData: any[];
    pitScoutingData: any[];
    pickLists: any[];
}

const HistoryBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary/20 rounded-full"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                }}
                animate={{
                    opacity: [0.1, 0.4, 0.1],
                    scale: [1, 1.5, 1],
                }}
                transition={{
                    duration: 5 + Math.random() * 5,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                }}
            />
        ))}
    </div>
);

export default function HistoryPage() {
    const router = useRouter();
    const [competitions, setCompetitions] = useState<PastCompetition[]>([]);
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
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setCompetitions(data.competitions || []);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCompetitionDetails = async (competitionId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/past-competitions?id=${competitionId}`);
            if (!response.ok) throw new Error('Failed to fetch details');
            const data = await response.json();
            setSelectedCompetition(data);
            setShowDetails(true);
        } catch (error) {
            console.error('Error loading details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCompetitions = competitions.filter(comp => {
        const matchesSearch = comp.competition_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            comp.competition_key.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesYear = !yearFilter || comp.competition_year.toString() === yearFilter;
        return matchesSearch && matchesYear;
    });

    const uniqueYears = Array.from(new Set(competitions.map(comp => comp.competition_year))).sort((a, b) => b - a);

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/30">
            <HistoryBackground />

            {/* Professional Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-3 group">
                        <Logo size="sm" />
                        <span className="font-heading font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
                            Avalanche <span className="text-muted-foreground font-normal">History</span>
                        </span>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <Link href="/auth/signin">
                            <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                                Sign In
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg h-9 px-4">
                                Back Home
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 text-center"
                >
                    <Badge variant="outline" className="mb-4 border-primary/20 text-primary uppercase tracking-widest text-[10px] font-bold py-1">
                        Historical Archive
                    </Badge>
                    <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground mb-4">
                        Competition Legacy
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        Explore a comprehensive archive of FRC performance data. Trace the evolution of strategies and team analytics across past seasons.
                    </p>
                </motion.div>

                {/* Filters Panel */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="md:col-span-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search by competition name or key..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 hover:bg-white/10 transition-all text-lg"
                            />
                        </div>
                    </div>
                    <div>
                        <div className="relative h-14">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="w-full h-full pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-primary/20 hover:bg-white/10 transition-all appearance-none text-foreground outline-none"
                            >
                                <option value="">All Seasons</option>
                                {uniqueYears.map(year => (
                                    <option key={year} value={year.toString()}>Season {year}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Competitions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {isLoading && !competitions.length ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
                        ))
                    ) : filteredCompetitions.length === 0 ? (
                        <div className="col-span-full py-20 text-center">
                            <Archive className="h-16 w-16 text-white/10 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No Records Found</h3>
                            <p className="text-muted-foreground">Adjust your filters to discover archived data.</p>
                        </div>
                    ) : (
                        filteredCompetitions.map((comp) => (
                            <motion.div
                                key={comp.id}
                                whileHover={{ y: -5 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl -z-10" />
                                <Card
                                    className="h-full bg-white/5 border-white/10 rounded-3xl p-6 hover:border-primary/30 transition-all cursor-pointer overflow-hidden backdrop-blur-sm shadow-xl"
                                    onClick={() => loadCompetitionDetails(comp.id)}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <Badge className="bg-primary/10 text-primary border-primary/20 mb-3 px-3">
                                                Season {comp.competition_year}
                                            </Badge>
                                            <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                                                {comp.competition_name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-widest">
                                                {comp.competition_key}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-xl border border-white/5 group-hover:border-primary/20 transition-colors">
                                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="p-4 bg-black/20 rounded-2xl border border-white/5 group-hover:border-primary/10 transition-colors">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="h-4 w-4 text-blue-400" />
                                                <span className="text-lg font-bold text-foreground">{comp.total_teams}</span>
                                            </div>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Teams</p>
                                        </div>
                                        <div className="p-4 bg-black/20 rounded-2xl border border-white/5 group-hover:border-primary/10 transition-colors">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Target className="h-4 w-4 text-emerald-400" />
                                                <span className="text-lg font-bold text-foreground">{comp.total_matches}</span>
                                            </div>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Matches</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {comp.competition_location || 'Archive'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            {new Date(comp.migrated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>

            {/* Detail Overlay */}
            <AnimatePresence>
                {showDetails && selectedCompetition && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl overflow-y-auto"
                    >
                        <div className="min-h-screen p-4 sm:p-8">
                            <div className="max-w-7xl mx-auto">
                                {/* Overlay Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 sticky top-0 bg-background/95 backdrop-blur-md py-4 z-10 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowDetails(false)}
                                            className="rounded-full bg-white/5 hover:bg-white/10 h-12 px-6"
                                        >
                                            <ArrowLeft className="mr-2 h-5 w-5" />
                                            Back to Archive
                                        </Button>
                                        <div className="h-8 w-[1px] bg-white/10" />
                                        <div>
                                            <h2 className="text-3xl font-bold text-foreground">
                                                {selectedCompetition.competition.competition_name}
                                            </h2>
                                            <div className="flex items-center gap-3 mt-1">
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                    Verified Data
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">{selectedCompetition.competition.competition_key} • Season {selectedCompetition.competition.competition_year}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
                                            <Archive className="mr-2 h-4 w-4" /> Export Report
                                        </Button>
                                    </div>
                                </div>

                                {/* Legacy Stats Dashboard */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                                    {[
                                        { label: 'Teams', value: selectedCompetition.teams.length, icon: Users, color: 'text-blue-400' },
                                        { label: 'Matches', value: selectedCompetition.matches.length, icon: Target, color: 'text-emerald-400' },
                                        { label: 'Data Points', value: selectedCompetition.scoutingData.length, icon: BarChart3, color: 'text-purple-400' },
                                        { label: 'Year', value: selectedCompetition.competition.competition_year, icon: Calendar, color: 'text-orange-400' }
                                    ].map((stat, i) => (
                                        <Card key={i} className="p-6 bg-white/5 border-white/10 rounded-3xl text-center shadow-2xl">
                                            <stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-3`} />
                                            <p className="text-3xl font-black text-foreground">{stat.value}</p>
                                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mt-1">{stat.label}</p>
                                        </Card>
                                    ))}
                                </div>

                                {/* Performance Rankings */}
                                <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden mb-12 shadow-2xl">
                                    <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                                        <h3 className="text-xl font-bold flex items-center gap-3">
                                            <Trophy className="text-yellow-500 h-6 w-6" />
                                            Performance Rankings
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1 text-balance">Comprehensive team analysis aggregated from {selectedCompetition.scoutingData.length} match observations.</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-white/[0.03]">
                                                    <th className="text-left p-4 font-semibold text-muted-foreground">Team</th>
                                                    <th className="text-left p-4 font-semibold text-muted-foreground">Matches</th>
                                                    <th className="text-left p-4 font-semibold text-muted-foreground">Avg Score</th>
                                                    <th className="text-left p-4 font-semibold text-muted-foreground">Auto</th>
                                                    <th className="text-left p-4 font-semibold text-muted-foreground">Teleop</th>
                                                    <th className="text-left p-4 font-semibold text-muted-foreground">Consistency</th>
                                                    <th className="text-right p-4 font-semibold text-muted-foreground">Profile</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const teamStatsMap = new Map();
                                                    selectedCompetition.teams.forEach(team => {
                                                        teamStatsMap.set(team.team_number, {
                                                            ...team,
                                                            total_matches: 0,
                                                            scores: [],
                                                            auto: [],
                                                            teleop: []
                                                        });
                                                    });

                                                    selectedCompetition.scoutingData.forEach(data => {
                                                        const stat = teamStatsMap.get(data.team_number);
                                                        if (stat) {
                                                            stat.total_matches++;
                                                            stat.scores.push(data.final_score || 0);
                                                            stat.auto.push(data.autonomous_points || 0);
                                                            stat.teleop.push(data.teleop_points || 0);
                                                        }
                                                    });

                                                    return Array.from(teamStatsMap.values())
                                                        .filter(t => t.total_matches > 0)
                                                        .map(t => {
                                                            const avg = t.scores.reduce((a: number, b: number) => a + b, 0) / t.total_matches;
                                                            const variance = t.scores.reduce((a: number, b: number) => a + Math.pow(b - avg, 2), 0) / t.total_matches;
                                                            const sd = Math.sqrt(variance);
                                                            const consistency = Math.max(0, 100 - (sd / avg) * 100);
                                                            return { ...t, avg: Math.round(avg * 10) / 10, consistency: Math.round(consistency) };
                                                        })
                                                        .sort((a, b) => b.avg - a.avg)
                                                        .map(team => (
                                                            <tr key={team.team_number} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors group">
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="font-mono font-bold text-primary group-hover:scale-110 transition-transform bg-primary/10 px-2 py-1 rounded text-base">{team.team_number}</span>
                                                                        <span className="font-semibold text-foreground truncate max-w-[150px]">{team.team_name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-muted-foreground">{team.total_matches}</td>
                                                                <td className="p-4">
                                                                    <span className="text-lg font-black text-foreground">{team.avg}</span>
                                                                </td>
                                                                <td className="p-4 text-muted-foreground">
                                                                    {Math.round(team.auto.reduce((a: number, b: number) => a + b, 0) / team.total_matches * 10) / 10}
                                                                </td>
                                                                <td className="p-4 text-muted-foreground">
                                                                    {Math.round(team.teleop.reduce((a: number, b: number) => a + b, 0) / team.total_matches * 10) / 10}
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-emerald-500 rounded-full"
                                                                                style={{ width: `${team.consistency}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="font-bold text-emerald-400">{team.consistency}%</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-white/10" asChild>
                                                                        <Link href={`/history/team/${team.team_number}`}>
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </Link>
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>

                                {/* Event Schedule Timeline */}
                                <div className="mb-20">
                                    <h3 className="text-xl font-bold flex items-center gap-3 mb-8">
                                        <Clock className="text-primary h-6 w-6" />
                                        Archive Event Log
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {selectedCompetition.matches.map((match) => (
                                            <Card key={match.match_id} className="p-5 bg-white/[0.03] border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                                                    <span className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Match {match.match_number}</span>
                                                    <Badge variant="outline" className="text-[10px] opacity-60">Complete</Badge>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                                        <div className="flex gap-2">
                                                            {match.red_teams.map((t: number) => (
                                                                <span key={t} className="font-mono text-xs font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">{t}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                        <div className="flex gap-2">
                                                            {match.blue_teams.map((t: number) => (
                                                                <span key={t} className="font-mono text-xs font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{t}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 bg-black/20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <Logo size="md" className="mx-auto grayscale opacity-50 mb-6" />
                    <p className="text-muted-foreground text-sm">
                        &copy; 2026 Avalanche Scouting Archives. Built for FRC Excellence.
                    </p>
                </div>
            </footer>
        </div>
    );
}
