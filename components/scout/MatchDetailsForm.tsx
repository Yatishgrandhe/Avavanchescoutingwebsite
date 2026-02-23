import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { ChevronDown, Loader2, AlertCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Match {
  match_id: string;
  event_key: string;
  match_number: number;
  red_teams: Array<{
    team_number: number;
    team_name: string;
    team_color: string;
  }>;
  blue_teams: Array<{
    team_number: number;
    team_name: string;
    team_color: string;
  }>;
}

interface MatchDetailsFormProps {
  onNext: (matchData: Match, selectedTeam: number, allianceColor: 'red' | 'blue', alliancePosition: 1 | 2 | 3) => void;
  onBack?: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: {
    matchData?: Match;
    teamNumber?: number;
    allianceColor?: 'red' | 'blue';
    alliancePosition?: 1 | 2 | 3;
  };
}

const MatchDetailsForm: React.FC<MatchDetailsFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(initialData?.matchData || null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(initialData?.teamNumber || null);
  const [allianceColor, setAllianceColor] = useState<'red' | 'blue' | ''>(initialData?.allianceColor || '');
  const [alliancePosition, setAlliancePosition] = useState<1 | 2 | 3 | null>(initialData?.alliancePosition || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch matches on component mount
  useEffect(() => {
    fetchMatches();
  }, []);

  // Sync initialData with state when it changes
  useEffect(() => {
    if (initialData) {
      if (initialData.matchData) setSelectedMatch(initialData.matchData);
      if (initialData.teamNumber) setSelectedTeam(initialData.teamNumber);
      if (initialData.allianceColor) setAllianceColor(initialData.allianceColor);
      if (initialData.alliancePosition) setAlliancePosition(initialData.alliancePosition);
    }
  }, [initialData]);

  const fetchMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/matches');
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelect = (matchId: string) => {
    const match = matches.find(m => m.match_id === matchId);
    if (match) {
      setSelectedMatch(match);
      setSelectedTeam(null);
      setAllianceColor('');
      setAlliancePosition(null);
      setError(''); // Clear any previous errors when match is selected
    }
  };

  const handleTeamSelect = (teamNumber: number, color: 'red' | 'blue', position: 1 | 2 | 3) => {
    setSelectedTeam(teamNumber);
    setAllianceColor(color);
    setAlliancePosition(position);
    setError(''); // Clear any previous errors when team is selected
  };

  const handleNext = () => {
    // Clear any previous errors
    setError('');

    if (!selectedMatch) {
      setError('Please select a match');
      return;
    }

    if (!selectedTeam) {
      setError('Please select a team to scout');
      return;
    }

    if (!alliancePosition) {
      setError('Please select an alliance position');
      return;
    }

    // All validations passed, proceed to next step
    onNext(selectedMatch, selectedTeam, allianceColor as 'red' | 'blue', alliancePosition);
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]"
    >
      <Card className="bg-card border-border">


        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter text-foreground flex items-center justify-center gap-2">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <span>SELECT MATCH & TEAM</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs sm:text-sm uppercase tracking-widest font-medium">
            Setup your scouting session
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Match Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-primary rounded-full" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Match</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 bg-white/5 rounded-xl border border-white/5">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Fetching...
                </span>
              </div>
            ) : (
              <Select value={selectedMatch?.match_id || ''} onValueChange={handleMatchSelect}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 h-12 rounded-xl text-foreground hover:bg-white/10 transition-all font-mono">
                  <SelectValue placeholder="CHOOSE A MATCH..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 rounded-xl">
                  {matches.map((match) => (
                    <SelectItem
                      key={match.match_id}
                      value={match.match_id}
                      className="font-mono text-sm py-3"
                    >
                      MATCH {match.match_number} — {match.event_key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Team Selection */}
          {selectedMatch && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-primary rounded-full" />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Team</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Red Alliance */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Red Alliance</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedMatch.red_teams.map((team, index) => (
                      <button
                        key={team.team_number}
                        onClick={() => handleTeamSelect(team.team_number, 'red', (index + 1) as 1 | 2 | 3)}
                        className={cn(
                          "w-full h-[60px] px-4 rounded-xl border flex items-center justify-between transition-all group relative overflow-hidden",
                          selectedTeam === team.team_number && allianceColor === 'red' && alliancePosition === (index + 1)
                            ? "border-red-500 bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            : "border-white/5 bg-white/5 hover:bg-white/10 text-foreground"
                        )}
                      >
                        <div className="flex flex-col items-start z-10">
                          <span className="text-lg font-black tracking-tight leading-none">{team.team_number}</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase truncate max-w-[120px]",
                            selectedTeam === team.team_number && allianceColor === 'red' ? "text-white/70" : "text-muted-foreground"
                          )}>
                            {team.team_name}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-black/20 z-10",
                          selectedTeam === team.team_number && allianceColor === 'red' ? "text-white" : "text-red-400"
                        )}>
                          RED {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blue Alliance */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Blue Alliance</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedMatch.blue_teams.map((team, index) => (
                      <button
                        key={team.team_number}
                        onClick={() => handleTeamSelect(team.team_number, 'blue', (index + 1) as 1 | 2 | 3)}
                        className={cn(
                          "w-full h-[60px] px-4 rounded-xl border flex items-center justify-between transition-all group relative overflow-hidden",
                          selectedTeam === team.team_number && allianceColor === 'blue' && alliancePosition === (index + 1)
                            ? "border-blue-500 bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                            : "border-white/5 bg-white/5 hover:bg-white/10 text-foreground"
                        )}
                      >
                        <div className="flex flex-col items-start z-10">
                          <span className="text-lg font-black tracking-tight leading-none">{team.team_number}</span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase truncate max-w-[120px]",
                            selectedTeam === team.team_number && allianceColor === 'blue' ? "text-white/70" : "text-muted-foreground"
                          )}>
                            {team.team_name}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-black/20 z-10",
                          selectedTeam === team.team_number && allianceColor === 'blue' ? "text-white" : "text-blue-400"
                        )}>
                          BLUE {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 text-red-400 bg-red-500/20 p-3 rounded-lg border border-red-500/30"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className={isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!selectedMatch || !selectedTeam || !alliancePosition}
            className="ml-auto"
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default MatchDetailsForm;