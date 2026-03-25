import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  Users,
  ClipboardList,
  Wrench,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button, Badge } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LeaderboardResponse, LeaderboardEntry } from './api/leaderboard';
import { cn } from '@/lib/utils';
import Head from 'next/head';

export default function LeaderboardPage() {
  const { user, supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLeaderboard = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      const token = session?.access_token;
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch(`/api/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load (${res.status})`);
      }
      const result: LeaderboardResponse = await res.json();
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to load leaderboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadLeaderboard();
  }, [user]);

  const filteredLeaderboard = data?.leaderboard.filter(entry => 
    entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const topThree = filteredLeaderboard.slice(0, 3);
  const remaining = filteredLeaderboard.slice(3);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-gray-400" />;
      case 2: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-muted-foreground font-mono font-bold w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <Head>
          <title>Scouting Leaderboard | Avalanche</title>
        </Head>

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                Scouting Leaderboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Celebrating our team's scouting contributions
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search scouts..."
                  className="pl-9 glass-input border-white/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              

              <Button
                variant="outline"
                size="icon"
                onClick={loadLeaderboard}
                disabled={loading}
                className="glass border-white/10"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3"
            >
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}

          {/* Top 3 Podium */}
          {!loading && filteredLeaderboard.length > 0 && searchQuery === '' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* 2nd Place */}
              {topThree[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="order-2 md:order-1 mt-0 md:mt-8"
                >
                  <Card className="glass border-white/10 bg-gradient-to-b from-gray-400/5 to-transparent relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Medal className="w-24 h-24" />
                    </div>
                    <CardHeader className="text-center pb-2">
                       <div className="mx-auto w-12 h-12 rounded-full bg-gray-400/20 flex items-center justify-center mb-2">
                        <Medal className="w-7 h-7 text-gray-400" />
                       </div>
                       <CardTitle className="text-xl">{topThree[1].name}</CardTitle>
                       <p className="text-gray-400 font-bold">2nd Place</p>
                    </CardHeader>
                    <CardContent className="text-center pt-2">
                      <div className="text-3xl font-bold text-white">{topThree[1].totalCount}</div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Total Forms</p>
                      
                      <div className="flex justify-center gap-4 mt-4 text-sm">
                        <div className="flex flex-col">
                          <span className="text-primary font-bold">{topThree[1].matchScoutingCount}</span>
                          <span className="text-[10px] text-muted-foreground">Match</span>
                        </div>
                        <div className="flex flex-col border-l border-white/10 pl-4">
                          <span className="text-purple-400 font-bold">{topThree[1].pitScoutingCount}</span>
                          <span className="text-[10px] text-muted-foreground">Pit</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="order-1 md:order-2"
                >
                  <Card className="glass border-primary/20 bg-gradient-to-b from-primary/10 to-transparent relative overflow-hidden group shadow-2xl shadow-primary/10">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Trophy className="w-32 h-32" />
                    </div>
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/20 blur-3xl" />
                    <CardHeader className="text-center pb-2">
                       <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2 ring-2 ring-primary/40">
                        <Trophy className="w-10 h-10 text-yellow-500" />
                       </div>
                       <CardTitle className="text-2xl font-black">{topThree[0].name}</CardTitle>
                       <p className="text-primary font-black uppercase tracking-widest text-sm">Grand Champion</p>
                    </CardHeader>
                    <CardContent className="text-center pt-2">
                      <div className="text-5xl font-black text-white">{topThree[0].totalCount}</div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Forms Submitted</p>
                      
                      <div className="flex justify-center gap-6 mt-6 text-sm">
                        <div className="flex flex-col">
                          <span className="text-primary font-black text-lg">{topThree[0].matchScoutingCount}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">Match</span>
                        </div>
                        <div className="w-px h-8 bg-white/10 mt-1" />
                        <div className="flex flex-col">
                          <span className="text-purple-400 font-black text-lg">{topThree[0].pitScoutingCount}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">Pit</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="order-3 mt-0 md:mt-12"
                >
                  <Card className="glass border-white/10 bg-gradient-to-b from-amber-600/5 to-transparent relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Award className="w-20 h-20" />
                    </div>
                    <CardHeader className="text-center pb-2">
                       <div className="mx-auto w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center mb-2">
                        <Award className="w-6 h-6 text-amber-600" />
                       </div>
                       <CardTitle className="text-lg">{topThree[2].name}</CardTitle>
                       <p className="text-amber-700 font-bold">3rd Place</p>
                    </CardHeader>
                    <CardContent className="text-center pt-2">
                      <div className="text-2xl font-bold text-white">{topThree[2].totalCount}</div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Total Forms</p>

                      <div className="flex justify-center gap-4 mt-4 text-sm">
                        <div className="flex flex-col">
                          <span className="text-primary font-bold">{topThree[2].matchScoutingCount}</span>
                          <span className="text-[10px] text-muted-foreground">Match</span>
                        </div>
                        <div className="flex flex-col border-l border-white/10 pl-4">
                          <span className="text-purple-400 font-bold">{topThree[2].pitScoutingCount}</span>
                          <span className="text-[10px] text-muted-foreground">Pit</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}

          {/* List View */}
          <Card className="glass border-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/[0.02] flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  All Team Members
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Ranked by total submission volume
                </p>
              </div>
              {!loading && data && (
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{data.totalForms}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">Total Event Submissions</div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <Trophy className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/50" />
                  </div>
                  <p className="text-muted-foreground animate-pulse">Calculating rankings...</p>
                </div>
              ) : filteredLeaderboard.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No results found</h3>
                  <p className="text-muted-foreground">Try searching for a different name</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="w-16 text-center text-[10px] uppercase font-bold tracking-widest">Rank</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Scout Name</TableHead>
                          <TableHead className="text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Match Forms</TableHead>
                          <TableHead className="text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Pit Forms</TableHead>
                          <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest text-primary">Total forms</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(searchQuery === '' ? remaining : filteredLeaderboard).map((entry, idx) => {
                          const actualIndex = searchQuery === '' ? idx + 3 : idx;
                          return (
                            <motion.tr
                              key={entry.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="border-white/5 hover:bg-white/[0.03] transition-colors group"
                            >
                              <TableCell className="text-center">
                                {getRankIcon(actualIndex)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground group-hover:text-primary transition-colors">{entry.name}</span>
                                  <span className="text-[10px] text-muted-foreground">Active Scout</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center align-middle">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold">
                                  <ClipboardList className="w-3 h-3" />
                                  {entry.matchScoutingCount}
                                </div>
                              </TableCell>
                              <TableCell className="text-center align-middle">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-bold">
                                  <Wrench className="w-3 h-3" />
                                  {entry.pitScoutingCount}
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="text-lg font-black text-white group-hover:scale-110 transition-transform origin-right">
                                  {entry.totalCount}
                                </div>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Footer Card */}
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.5 }}
          >
            <Card className="glass border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="py-6 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary rotate-3">
                       <TrendingUp size={24} />
                    </div>
                    <div>
                       <h3 className="font-bold">Keep it up, Team!</h3>
                       <p className="text-sm text-muted-foreground">Every form submitted improves our strategy and match predictions.</p>
                    </div>
                 </div>
                 <Button 
                   className="bg-primary hover:bg-primary/80 text-primary-foreground font-bold shadow-lg shadow-primary/20"
                   onClick={() => window.location.href = '/scout'}
                 >
                   Submit More Forms
                 </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
