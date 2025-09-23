import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
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
      className="max-w-2xl mx-auto"
    >
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Step {currentStep} of {totalSteps}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <motion.div
              className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <CardHeader className="text-center">
          <CardTitle className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Match & Team Selection
          </CardTitle>
          <CardDescription className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Select the match and team you want to scout
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Match Selection */}
          <div className="space-y-3">
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Match
            </label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading matches...
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {matches.map((match) => (
                  <motion.button
                    key={match.match_id}
                    onClick={() => handleMatchSelect(match)}
                    className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                      selectedMatch?.match_id === match.match_id
                        ? 'border-blue-500 bg-blue-500/10'
                        : isDarkMode
                        ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Match {match.match_number}
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
              <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Select Team to Scout
              </div>

              {/* Red Alliance */}
              <div className="space-y-2">
                <div className={`text-sm font-medium text-red-400`}>Red Alliance</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedMatch.red_teams.map((team) => (
                    <motion.button
                      key={team.team_number}
                      onClick={() => handleTeamSelect(team.team_number, 'red')}
                      className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                        selectedTeam === team.team_number && allianceColor === 'red'
                          ? 'border-red-500 bg-red-500/10'
                          : isDarkMode
                          ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {team.team_number}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {team.team_name}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Blue Alliance */}
              <div className="space-y-2">
                <div className={`text-sm font-medium text-blue-400`}>Blue Alliance</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedMatch.blue_teams.map((team) => (
                    <motion.button
                      key={team.team_number}
                      onClick={() => handleTeamSelect(team.team_number, 'blue')}
                      className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                        selectedTeam === team.team_number && allianceColor === 'blue'
                          ? 'border-blue-500 bg-blue-500/10'
                          : isDarkMode
                          ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                          : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {team.team_number}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
              className="flex items-center space-x-2 text-red-400 bg-red-500/10 p-3 rounded-lg"
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
              isDarkMode={isDarkMode}
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!selectedMatch || !selectedTeam}
            isDarkMode={isDarkMode}
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