import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { TeamStats, PickListTeam } from '@/lib/types';
import { teamPickAI, AISuggestion, AIPickListAnalysis } from '@/lib/ai-analysis';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Shield, 
  Zap, 
  Star,
  Lightbulb,
  BarChart3,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from 'lucide-react';

interface TeamSuggestion {
  team: PickListTeam;
  score: number;
  reasons: string[];
  category: 'primary' | 'secondary' | 'specialist' | 'defensive';
  compatibility: number;
}

interface CoralStats {
  team_number: number;
  total_matches: number;
  total_coral_points: number;
  avg_coral_points: number;
  autonomous_coral_points: number;
  teleop_coral_points: number;
  coral_trough_count: number;
  coral_l2_count: number;
  coral_l3_count: number;
  coral_l4_count: number;
  avg_autonomous_coral_points: number;
  avg_teleop_coral_points: number;
  avg_coral_trough_count: number;
  avg_coral_l2_count: number;
  avg_coral_l3_count: number;
  avg_coral_l4_count: number;
}

interface AdvancedTeamAnalysisProps {
  availableTeams: Array<{ team_number: number; team_name: string; stats?: TeamStats }>;
  currentPickList: PickListTeam[];
  onAddTeam: (team: PickListTeam) => void;
  selectedTeamNumbers: number[];
}

export function AdvancedTeamAnalysis({ 
  availableTeams, 
  currentPickList, 
  onAddTeam, 
  selectedTeamNumbers 
}: AdvancedTeamAnalysisProps) {
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIPickListAnalysis | null>(null);
  const [coralStats, setCoralStats] = useState<CoralStats[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'balanced' | 'aggressive' | 'defensive' | 'specialist'>('balanced');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAI, setShowAI] = useState(true);

  useEffect(() => {
    generateAISuggestions();
    fetchCoralStats();
  }, [availableTeams, currentPickList, analysisMode]);

  const fetchCoralStats = async () => {
    try {
      const response = await fetch('/api/coral-stats');
      if (response.ok) {
        const data = await response.json();
        setCoralStats(data.coralStats || []);
      }
    } catch (error) {
      console.error('Error fetching coral stats:', error);
    }
  };

  const generateAISuggestions = () => {
    const analysis = teamPickAI.generatePickListAnalysis(availableTeams, currentPickList);
    setAiAnalysis(analysis);
    setAiSuggestions(analysis.suggestions);
  };

  const analyzeTeam = (team: any, currentList: PickListTeam[]) => {
    const stats = team.stats!;
    const reasons: string[] = [];
    let score = 0;
    let category: 'primary' | 'secondary' | 'specialist' | 'defensive' = 'secondary';
    let compatibility = 0;

    // Base scoring algorithm
    const baseScore = stats.avg_total_score || 0;
    const matchCount = stats.total_matches || 0;
    const defenseRating = stats.avg_defense_rating || 0;
    const autoScore = stats.avg_autonomous_points || 0;
    const teleopScore = stats.avg_teleop_points || 0;
    const endgameScore = stats.avg_endgame_points || 0;

    // Consistency factor (more matches = more reliable)
    const consistencyFactor = Math.min(matchCount / 10, 1);
    score += baseScore * consistencyFactor;
    
    if (matchCount >= 8) {
      reasons.push(`High reliability (${matchCount} matches)`);
    } else if (matchCount >= 4) {
      reasons.push(`Moderate reliability (${matchCount} matches)`);
    } else {
      reasons.push(`Limited data (${matchCount} matches)`);
    }

    // Mode-specific analysis
    switch (analysisMode) {
      case 'balanced':
        score += (autoScore + teleopScore + endgameScore) * 0.3;
        score += defenseRating * 2;
        if (baseScore > 50) {
          reasons.push('Strong overall performance');
          category = 'primary';
        }
        if (defenseRating > 3.5) {
          reasons.push('Excellent defensive capabilities');
          category = 'defensive';
        }
        break;

      case 'aggressive':
        score += autoScore * 0.5;
        score += teleopScore * 0.4;
        if (autoScore > 15) {
          reasons.push('Strong autonomous performance');
          category = 'specialist';
        }
        if (teleopScore > 30) {
          reasons.push('High teleop scoring potential');
          category = 'primary';
        }
        break;

      case 'defensive':
        score += defenseRating * 5;
        score += (autoScore + endgameScore) * 0.2;
        if (defenseRating > 4) {
          reasons.push('Elite defensive capabilities');
          category = 'defensive';
        }
        if (endgameScore > 8) {
          reasons.push('Strong endgame performance');
        }
        break;

      case 'specialist':
        const maxSpecialty = Math.max(autoScore, teleopScore, endgameScore);
        score += maxSpecialty * 0.6;
        if (autoScore > 20) {
          reasons.push('Autonomous specialist');
          category = 'specialist';
        }
        if (endgameScore > 12) {
          reasons.push('Endgame specialist');
          category = 'specialist';
        }
        break;
    }

    // Alliance compatibility analysis
    if (currentList.length > 0) {
      const currentAvgScore = currentList.reduce((sum, t) => sum + (t.stats?.avg_total_score || 0), 0) / currentList.length;
      const currentAvgDefense = currentList.reduce((sum, t) => sum + (t.stats?.avg_defense_rating || 0), 0) / currentList.length;
      
      // Complement existing strengths/weaknesses
      if (currentAvgScore < 40 && baseScore > 50) {
        compatibility += 20;
        reasons.push('Complements low-scoring alliance');
      }
      if (currentAvgDefense < 2.5 && defenseRating > 3.5) {
        compatibility += 15;
        reasons.push('Adds defensive strength');
      }
      if (currentList.length === 1 && baseScore > 60) {
        compatibility += 10;
        reasons.push('Strong second pick candidate');
      }
    } else {
      // First pick analysis
      if (baseScore > 60) {
        compatibility += 25;
        reasons.push('Excellent first pick candidate');
        category = 'primary';
      }
    }

    // Penalty for very low performance
    if (baseScore < 20) {
      score *= 0.5;
      reasons.push('Low scoring performance');
    }

    // Bonus for high consistency
    if (matchCount >= 10 && baseScore > 40) {
      score += 5;
      reasons.push('Proven consistency');
    }

    return { score, reasons, category, compatibility };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'primary': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'defensive': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'specialist': return <Zap className="h-4 w-4 text-purple-500" />;
      default: return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'primary': return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'defensive': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'specialist': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      default: return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-3 sm:p-4 rounded-xl shadow-card dark:shadow-card-dark bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 w-full min-w-[250px]">
      <div className="flex flex-col space-y-3 mb-3">
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-purple-600" />
          <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100">AI Team Suggestions</h3>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <select
            value={analysisMode}
            onChange={(e) => setAnalysisMode(e.target.value as any)}
            className="flex-1 px-2 py-2 sm:py-1 border border-border rounded text-xs sm:text-sm bg-background text-foreground"
          >
            <option value="balanced">Balanced Strategy</option>
            <option value="aggressive">Aggressive Scoring</option>
            <option value="defensive">Defensive Focus</option>
            <option value="specialist">Specialist Roles</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-2 py-2 sm:py-1 rounded border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors duration-300 text-xs sm:text-sm"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">{showAdvanced ? 'Hide' : 'Show'} Analysis Details</span>
            <span className="sm:hidden">{showAdvanced ? 'Hide' : 'Details'}</span>
          </Button>
        </div>
      </div>

      {/* Analysis Mode Description */}
      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-2 mb-1">
          <Lightbulb className="h-3 w-3 text-yellow-500" />
          <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
            {analysisMode === 'balanced' && 'Balanced Strategy'}
            {analysisMode === 'aggressive' && 'Aggressive Scoring'}
            {analysisMode === 'defensive' && 'Defensive Focus'}
            {analysisMode === 'specialist' && 'Specialist Roles'}
          </span>
        </div>
        <p className="text-xs text-blue-800 dark:text-blue-200">
          {analysisMode === 'balanced' && 'Prioritizes well-rounded teams with good scoring and defense capabilities'}
          {analysisMode === 'aggressive' && 'Focuses on high-scoring teams for offensive strategies'}
          {analysisMode === 'defensive' && 'Emphasizes defensive capabilities and endgame performance'}
          {analysisMode === 'specialist' && 'Identifies teams with exceptional skills in specific areas'}
        </p>
      </div>

      {/* AI Analysis Toggle */}
      <div className="mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAI(!showAI)}
          className="w-full px-2 py-1 rounded border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors duration-300 text-xs"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {showAI ? 'Hide' : 'Show'} AI Analysis
        </Button>
      </div>

      {/* AI Alliance Analysis */}
      {showAI && aiAnalysis && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">AI Alliance Analysis</span>
          </div>
          <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
            <div>Potential Score: <span className="font-semibold">{aiAnalysis.alliance_analysis.total_potential_score.toFixed(1)}</span></div>
            <div>Balanced Score: <span className="font-semibold">{aiAnalysis.alliance_analysis.balanced_score.toFixed(1)}</span></div>
            {aiAnalysis.alliance_analysis.strategic_recommendations.length > 0 && (
              <div className="mt-2">
                <div className="font-medium mb-1">Recommendations:</div>
                {aiAnalysis.alliance_analysis.strategic_recommendations.slice(0, 2).map((rec, idx) => (
                  <div key={idx} className="flex items-start space-x-1">
                    <CheckCircle className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coral Scoring Analysis */}
      {showAI && coralStats.length > 0 && (
        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-green-900 dark:text-green-100">Top Coral Scorers</span>
          </div>
          <div className="space-y-1 text-xs text-green-800 dark:text-green-200">
            {coralStats.slice(0, 3).map((coral, index) => {
              const team = availableTeams.find(t => t.team_number === coral.team_number);
              const isAlreadySelected = selectedTeamNumbers.includes(coral.team_number);
              
              return (
                <div key={coral.team_number} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-1 py-0.5">
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">Team {coral.team_number}</span>
                    <span className="text-green-700 dark:text-green-300">
                      {coral.avg_coral_points.toFixed(1)} avg coral pts
                    </span>
                  </div>
                  {!isAlreadySelected && (
                    <Button
                      size="sm"
                      onClick={() => onAddTeam({
                        team_number: coral.team_number,
                        team_name: team?.team_name || `Team ${coral.team_number}`,
                        pick_order: 0,
                        stats: undefined,
                      })}
                      className="px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors duration-300 text-xs"
                    >
                      <Award className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                  {isAlreadySelected && (
                    <Badge variant="outline" className="text-xs border-green-200 dark:border-green-600 text-green-700 dark:text-green-300 px-1 py-0.5">
                      Selected
                    </Badge>
                  )}
                </div>
              );
            })}
            <div className="mt-2 text-green-700 dark:text-green-300">
              <div className="font-medium mb-1">Coral Scoring Breakdown:</div>
              <div>• Trough: 2-3 pts each</div>
              <div>• Level 2: 3-4 pts each</div>
              <div>• Level 3: 4-6 pts each</div>
              <div>• Level 4: 5-7 pts each</div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {aiSuggestions.length === 0 ? (
          <div className="text-center py-4 text-neutral-500 dark:text-neutral-400">
            <Brain className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
            <p className="text-xs sm:text-sm">No AI suggestions available</p>
            <p className="text-xs text-neutral-400 mt-1">Add some scouting data to get AI recommendations</p>
          </div>
        ) : (
          aiSuggestions.map((suggestion, index) => (
            <div
              key={suggestion.team_number}
              className="flex flex-col sm:flex-row sm:items-start justify-between p-2 sm:p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-300"
            >
              <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                <div className="flex flex-wrap items-center space-x-1 mb-2">
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-1 py-0.5">
                    #{index + 1}
                  </Badge>
                  {getCategoryIcon(suggestion.category)}
                  <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base">
                    Team {suggestion.team_number}
                  </h4>
                  <Badge className={`${getCategoryColor(suggestion.category)} text-xs px-1 py-0.5`}>
                    {suggestion.category}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-neutral-600 dark:text-neutral-300 mb-2">
                  <div className="flex items-center space-x-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 text-xs">Conf: {suggestion.confidence_score.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BarChart3 className="h-3 w-3 text-green-500" />
                    <span className="text-xs">Strategic: {suggestion.strategic_value.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="h-3 w-3 text-purple-500" />
                    <span className="text-xs">Compat: {suggestion.compatibility_score.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    <span className="text-xs">AI Powered</span>
                  </div>
                </div>
                
                {showAdvanced && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">Confidence:</span>
                      <span className={`font-semibold ${getScoreColor(suggestion.confidence_score * 100)}`}>
                        {(suggestion.confidence_score * 100).toFixed(1)}%
                      </span>
                      <span className="text-neutral-500 dark:text-neutral-400">Strategic:</span>
                      <span className="text-neutral-600 dark:text-neutral-300">
                        {(suggestion.strategic_value * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {suggestion.reasoning.slice(0, 2).map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 px-1 py-0.5">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                    {suggestion.strengths.length > 0 && (
                      <div className="text-xs">
                        <span className="text-green-600 font-medium">Strengths: </span>
                        <span className="text-neutral-600 dark:text-neutral-300">{suggestion.strengths.slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={() => onAddTeam({
                  team_number: suggestion.team_number,
                  team_name: suggestion.team_name,
                  pick_order: 0,
                  stats: undefined, // Will be loaded when added
                })}
                className="ml-2 px-2 py-1 rounded bg-primary text-white hover:opacity-90 transition-opacity duration-300 text-xs flex-shrink-0"
              >
                <Award className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {aiSuggestions.length > 0 && (
        <div className="mt-3 pt-2 border-t border-neutral-200 dark:border-neutral-600">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                {aiSuggestions.filter(s => s.category === 'primary').length}
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 text-xs">Primary</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                {aiSuggestions.filter(s => s.category === 'defensive').length}
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 text-xs">Defense</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                {aiSuggestions.filter(s => s.category === 'specialist').length}
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 text-xs">Special</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                {aiSuggestions.filter(s => s.confidence_score >= 0.7).length}
              </div>
              <div className="text-neutral-500 dark:text-neutral-400 text-xs">High</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
