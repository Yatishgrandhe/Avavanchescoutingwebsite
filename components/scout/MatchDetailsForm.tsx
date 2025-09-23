import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { ChevronDown, Loader2, AlertCircle, Target } from 'lucide-react';

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

  const handleMatchSelect = (matchId: string) => {
    const match = matches.find(m => m.match_id === matchId);
    if (match) {
      setSelectedMatch(match);
      setSelectedTeam(null);
      setAllianceColor('');
    }
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
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Step {currentStep} of {totalSteps}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
          <CardTitle className={`text-2xl font-bold font-display flex items-center justify-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Target className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span>Match & Team Selection</span>
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Select the match and team you want to scout
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Match Selection Dropdown */}
          <div className="space-y-3">
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Match
            </label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Loading matches...
                </span>
              </div>
            ) : (
              <Select value={selectedMatch?.match_id || ''} onValueChange={handleMatchSelect}>
                <SelectTrigger className={`w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                  <SelectValue placeholder="Choose a match..." />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}>
                  {matches.map((match) => (
                    <SelectItem 
                      key={match.match_id} 
                      value={match.match_id}
                      className={isDarkMode ? 'text-white hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'}
                    >
                      Match {match.match_number} - {match.event_key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Team Selection Dropdown */}
          {selectedMatch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Team to Scout
              </label>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Red Alliance */}
                <div className="space-y-2">
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    Red Alliance
                  </div>
                  <div className="space-y-2">
                    {selectedMatch.red_teams.map((team) => (
                      <motion.button
                        key={team.team_number}
                        onClick={() => handleTeamSelect(team.team_number, 'red')}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          selectedTeam === team.team_number && allianceColor === 'red'
                            ? 'border-red-500 bg-red-500/20 text-white'
                            : isDarkMode 
                              ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-600/50 text-white'
                              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="font-semibold">
                          Team {team.team_number}
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
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    Blue Alliance
                  </div>
                  <div className="space-y-2">
                    {selectedMatch.blue_teams.map((team) => (
                      <motion.button
                        key={team.team_number}
                        onClick={() => handleTeamSelect(team.team_number, 'blue')}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          selectedTeam === team.team_number && allianceColor === 'blue'
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : isDarkMode 
                              ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-600/50 text-white'
                              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-900'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="font-semibold">
                          Team {team.team_number}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {team.team_name}
                        </div>
                      </motion.button>
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