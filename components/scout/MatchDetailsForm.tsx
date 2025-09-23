import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react';

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
  onNext: (matchData: Match, selectedTeam: number, allianceColor: 'red' | 'blue') => void;
  onBack?: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
}

const MatchDetailsForm: React.FC<MatchDetailsFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [allianceColor, setAllianceColor] = useState<'red' | 'blue' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch matches on component mount
  useEffect(() => {
    fetchMatches();
  }, []);

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

  const handleMatchSelect = (match: Match) => {
    setSelectedMatch(match);
    setSelectedTeam(null);
    setAllianceColor('');
  };

  const handleTeamSelect = (teamNumber: number, color: 'red' | 'blue') => {
    setSelectedTeam(teamNumber);
    setAllianceColor(color);
  };

  const handleNext = () => {
    if (!selectedMatch) {
      setError('Please select a match');
      return;
    }

    if (!selectedTeam) {
      setError('Please select a team to scout');
      return;
    }

    setError('');
    onNext(selectedMatch, selectedTeam, allianceColor as 'red' | 'blue');
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      <Card>
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300 font-inter">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-slate-400 font-inter">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full rounded-full h-2 bg-slate-700">
            <motion.div
              className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-white font-inter">
          Match & Team Selection
        </CardTitle>
        <CardDescription className="text-slate-300 font-inter">
          Select the match and team you want to scout
        </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Match Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-white font-inter">
              Select Match
            </label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className="ml-2 text-slate-300 font-inter">
                  Loading matches...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {matches.map((match) => (
                  <motion.button
                    key={match.match_id}
                    onClick={() => handleMatchSelect(match)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedMatch?.match_id === match.match_id
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-semibold text-white font-inter">
                      Match {match.match_number}
                    </div>
                    <div className="text-sm text-slate-400 font-inter">
                      {match.event_key}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Team Selection */}
          {selectedMatch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="text-lg font-semibold text-white font-inter">
                Select Team to Scout
              </div>

              {/* Red Alliance */}
              <div className="space-y-2">
                <div className={`text-sm font-medium text-red-400 font-inter`}>Red Alliance</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedMatch.red_teams.map((team) => (
                    <motion.button
                      key={team.team_number}
                      onClick={() => handleTeamSelect(team.team_number, 'red')}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedTeam === team.team_number && allianceColor === 'red'
                          ? 'border-red-500 bg-red-500/20 text-white'
                          : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="font-semibold text-white font-inter">
                        {team.team_number}
                      </div>
                      <div className="text-xs text-slate-400 font-inter">
                        {team.team_name}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Blue Alliance */}
              <div className="space-y-2">
                <div className={`text-sm font-medium text-blue-400 font-inter`}>Blue Alliance</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedMatch.blue_teams.map((team) => (
                    <motion.button
                      key={team.team_number}
                      onClick={() => handleTeamSelect(team.team_number, 'blue')}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedTeam === team.team_number && allianceColor === 'blue'
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="font-semibold text-white font-inter">
                        {team.team_number}
                      </div>
                      <div className="text-xs text-slate-400 font-inter">
                        {team.team_name}
                      </div>
                    </motion.button>
                  ))}
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
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!selectedMatch || !selectedTeam}
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
