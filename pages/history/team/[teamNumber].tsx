import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
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
    ArrowLeft,
    Sparkles,
    ChevronDown,
    Activity,
    Award,
    Zap,
    Shield,
    FileText,
    MessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui';
import Logo from '@/components/ui/Logo';
import GuestLayout from '@/components/layout/GuestLayout';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Team {
    team_number: number;
    team_name: string;
}

interface CompetitionData {
    competition_id: string;
    competition_name: string;
    competition_year: number;
    competition_key: string;
    scoutingData: any[];
    totalMatches: number;
    avgScore: number;
    bestScore: number;
    consistency: number;
}

const HistoryBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
    </div>
);

export default function PublicTeamHistoryPage() {
    const router = useRouter();
    const { teamNumber } = router.query;
    const [team, setTeam] = useState<Team | null>(null);
    const [competitions, setCompetitions] = useState<CompetitionData[]>([]);
    const [overallStats, setOverallStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);

    useEffect(() => {
        if (teamNumber) {
            loadTeamHistory();
        }
    }, [teamNumber]);

    const loadTeamHistory = async () => {
        try {
            setLoading(true);
            const teamNum = parseInt(teamNumber as string);

            // Load team info from past_teams
            const { data: teamData, error: teamError } = await supabase
                .from('past_teams')
                .select('*')
                .eq('team_number', teamNum)
                .limit(1)
                .single();

            if (teamError) {
                // Fallback to teams table
                const { data: currentTeam, error: currentTeamError } = await supabase
                    .from('teams')
                    .select('*')
                    .eq('team_number', teamNum)
                    .single();
                if (!currentTeamError) setTeam(currentTeam);
            } else {
                setTeam(teamData);
            }

            // Load past competitions where this team participated
            const { data: pastComps, error: compError } = await supabase
                .from('past_competitions')
                .select('*')
                .order('competition_year', { ascending: false });

            if (compError) throw compError;

            const results: CompetitionData[] = [];
            for (const comp of pastComps || []) {
                const { data: scouting, error: sError } = await supabase
                    .from('past_scouting_data')
                    .select('*')
                    .eq('team_number', teamNum)
                    .eq('competition_id', comp.id);

                if (!sError && scouting && scouting.length > 0) {
                    const scores = scouting.map(d => d.final_score || 0);
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
                    const consistency = Math.max(0, 100 - (Math.sqrt(variance) / avg) * 100);

                    results.push({
                        competition_id: comp.id,
                        competition_name: comp.competition_name,
                        competition_year: comp.competition_year,
                        competition_key: comp.competition_key,
                        scoutingData: scouting,
                        totalMatches: scouting.length,
                        avgScore: Math.round(avg * 10) / 10,
                        bestScore: Math.max(...scores),
                        consistency: Math.round(consistency)
                    });
                }
            }

            if (results.length > 0) {
                const allData = results.flatMap(r => r.scoutingData);
                const allScores = allData.map(d => d.final_score || 0);
                const overallAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

                setOverallStats({
                    totalMatches: allScores.length,
                    avgScore: Math.round(overallAvg * 10) / 10,
                    bestScore: Math.max(...allScores),
                    avgAuto: Math.round(allData.reduce((a, b) => a + (b.autonomous_points || 0), 0) / allScores.length * 10) / 10,
                    avgTeleop: Math.round(allData.reduce((a, b) => a + (b.teleop_points || 0), 0) / allScores.length * 10) / 10,
                    competitionsPlayed: results.length
                });
            }

            setCompetitions(results);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <GuestLayout backLink={{ href: '/history', label: 'Back to Archive' }} forceShowNavbar>
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Logo size="md" className="animate-pulse" />
                    <div className="h-1 w-48 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                    </div>
                </div>
            </div>
        </GuestLayout>
    );

    if (!team) return (
        <GuestLayout backLink={{ href: '/history', label: 'Back to Archive' }} forceShowNavbar>
            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh]">
                <Archive className="h-16 w-16 text-muted-foreground/20 mb-6" />
                <h1 className="text-2xl font-bold mb-2">Team History Not Found</h1>
                <p className="text-muted-foreground mb-8">This team has no publicly archived records.</p>
                <Link href="/history">
                    <Button>Back to Archive</Button>
                </Link>
            </div>
        </GuestLayout>
    );

    return (
        <GuestLayout backLink={{ href: '/history', label: 'Back to Archive' }} forceShowNavbar>
            <div className="min-h-screen relative transition-colors duration-500">
            <HistoryBackground />

            <main className="max-w-5xl mx-auto px-4 py-16">
                {/* Team Hero */}
                <div className="mb-16 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-6"
                    >
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Season Legend</span>
                    </motion.div>
                    <h1 className="text-6xl sm:text-7xl font-black text-foreground tracking-tighter mb-4">
                        Team <span className="text-primary">{team.team_number}</span>
                    </h1>
                    <h2 className="text-3xl font-heading font-bold text-muted-foreground/80">{team.team_name}</h2>
                </div>

                {/* Global Summary */}
                {overallStats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                        {[
                            { label: 'Avg Points', value: overallStats.avgScore, icon: Target, color: 'text-primary' },
                            { label: 'Best Match', value: overallStats.bestScore, icon: Trophy, color: 'text-yellow-500' },
                            { label: 'Auto Power', value: overallStats.avgAuto, icon: Zap, color: 'text-blue-400' },
                            { label: 'Consistency', value: competitions.length > 0 ? `${competitions[0].consistency}%` : 'N/A', icon: Activity, color: 'text-emerald-400' }
                        ].map((stat, i) => (
                            <Card key={i} className="bg-white/5 border-white/10 rounded-[2.5rem] p-8 text-center hover:bg-white/10 transition-colors shadow-2xl">
                                <stat.icon className={`h-8 w-8 ${stat.color} mx-auto mb-4`} />
                                <p className="text-4xl font-black text-foreground">{stat.value}</p>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mt-2">{stat.label}</p>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Competition Timeline */}
                <div className="space-y-12">
                    <div className="flex items-center gap-4 mb-8">
                        <h3 className="text-2xl font-bold">Campaign History</h3>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    {competitions.map((comp, idx) => (
                        <motion.div
                            key={comp.competition_id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <Card className="bg-white/5 border-white/10 rounded-[2rem] overflow-hidden group hover:border-primary/20 transition-all shadow-xl">
                                <div
                                    className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer"
                                    onClick={() => setSelectedCompetition(selectedCompetition === comp.competition_id ? null : comp.competition_id)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                                            <span className="text-[10px] font-black uppercase text-primary/60 tracking-tight">Season</span>
                                            <span className="text-2xl font-black text-primary">{comp.competition_year}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-bold group-hover:text-primary transition-colors">{comp.competition_name}</h4>
                                            <p className="text-sm text-muted-foreground mt-1 font-mono uppercase tracking-widest">{comp.competition_key}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 pr-4">
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-foreground">{comp.avgScore}</p>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Avg Score</p>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-full border border-white/5 group-hover:border-primary/20 transition-all">
                                            {selectedCompetition === comp.competition_id ? <ChevronDown className="h-6 w-6 rotate-180 transition-transform" /> : <ChevronDown className="h-6 w-6 transition-transform" />}
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {selectedCompetition === comp.competition_id && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            exit={{ height: 0 }}
                                            className="border-t border-white/5 bg-black/40"
                                        >
                                            <div className="p-8">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {comp.scoutingData.map((match) => (
                                                        <div key={match.id} className="bg-white/5 rounded-2.5xl p-6 border border-white/5 hover:border-white/10 transition-all shadow-lg">
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div>
                                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Match Record</p>
                                                                    <p className="text-xl font-black font-mono">#{match.match_id || idx + 1}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-black text-primary">{match.final_score}</p>
                                                                    <Badge className={match.alliance_color === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}>
                                                                        {match.alliance_color.toUpperCase()}
                                                                    </Badge>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                                <div className="p-3 bg-white/5 rounded-xl text-center">
                                                                    <p className="text-[9px] uppercase text-muted-foreground font-black mb-1">Auto</p>
                                                                    <p className="text-lg font-bold text-blue-400">{match.autonomous_points}</p>
                                                                </div>
                                                                <div className="p-3 bg-white/5 rounded-xl text-center">
                                                                    <p className="text-[9px] uppercase text-muted-foreground font-black mb-1">Teleop</p>
                                                                    <p className="text-lg font-bold text-orange-400">{match.teleop_points}</p>
                                                                </div>
                                                            </div>

                                                            {match.comments && (
                                                                <div className="flex gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                                                                    <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-1" />
                                                                    <p className="text-xs text-muted-foreground italic leading-relaxed">{match.comments}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </main>

            <footer className="py-20 border-t border-white/5 mt-20 opacity-40">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <Logo size="md" className="mx-auto grayscale mb-6" />
                    <p className="text-xs uppercase tracking-[0.5em] font-bold">Historical Archive &copy; 2026</p>
                </div>
            </footer>
        </div>
        </GuestLayout>
    );
}
