import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { TeamStats, PickListTeam } from '@/lib/types';
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
  CheckCircle
} from 'lucide-react';

interface TeamSuggestion {
  team: PickListTeam;
  score: number;
  reasons: string[];
  category: 'primary' | 'secondary' | 'specialist' | 'defensive';
  compatibility: number;
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
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'balanced' | 'aggressive' | 'defensive' | 'specialist'>('balanced');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    generateSuggestions();
  }, [availableTeams, currentPickList, analysisMode]);

  const generateSuggestions = () => {
    const filteredTeams = availableTeams.filter(team => 
      !selectedTeamNumbers.includes(team.team_number) && team.stats
    );

    const suggestions: TeamSuggestion[] = filteredTeams.map(team => {
      const analysis = analyzeTeam(team, currentPickList);
      return {
        team: {
          team_number: team.team_number,
          team_name: team.team_name,
          pick_order: 0,
          stats: team.stats,
        },
        score: analysis.score,
        reasons: analysis.reasons,
        category: analysis.category,
        compatibility: analysis.compatibility,
      };
    });

    // Sort by score and compatibility
    suggestions.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) < 0.1) {
        return b.compatibility - a.compatibility;
      }
      return scoreDiff;
    });

    setSuggestions(suggestions.slice(0, 10)); // Top 10 suggestions
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
      case 'primary': return 'bg-yellow-100 text-yellow-800';
      case 'defensive': return 'bg-blue-100 text-blue-800';
      case 'specialist': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">AI Team Suggestions</h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={analysisMode}
            onChange={(e) => setAnalysisMode(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
            <option value="defensive">Defensive</option>
            <option value="specialist">Specialist</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Analysis
          </Button>
        </div>
      </div>

      {/* Analysis Mode Description */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-medium text-gray-900">
            {analysisMode === 'balanced' && 'Balanced Strategy'}
            {analysisMode === 'aggressive' && 'Aggressive Scoring'}
            {analysisMode === 'defensive' && 'Defensive Focus'}
            {analysisMode === 'specialist' && 'Specialist Roles'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {analysisMode === 'balanced' && 'Prioritizes well-rounded teams with good scoring and defense'}
          {analysisMode === 'aggressive' && 'Focuses on high-scoring teams for offensive strategies'}
          {analysisMode === 'defensive' && 'Emphasizes defensive capabilities and endgame performance'}
          {analysisMode === 'specialist' && 'Identifies teams with exceptional skills in specific areas'}
        </p>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No suggestions available. Add some scouting data to get AI recommendations.</p>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <div
              key={suggestion.team.team_number}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-gray-100">
                    #{index + 1}
                  </Badge>
                  {getCategoryIcon(suggestion.category)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      Team {suggestion.team.team_number}
                    </h4>
                    <span className="text-sm text-gray-600">
                      {suggestion.team.team_name}
                    </span>
                    <Badge className={getCategoryColor(suggestion.category)}>
                      {suggestion.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>{suggestion.team.stats?.avg_total_score.toFixed(1)} avg</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <BarChart3 className="h-3 w-3" />
                      <span>{suggestion.team.stats?.total_matches} matches</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>{suggestion.team.stats?.avg_defense_rating.toFixed(1)} defense</span>
                    </span>
                  </div>
                  
                  {showAdvanced && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-gray-500">Reasons:</span>
                        <span className={`text-xs font-semibold ${getScoreColor(suggestion.score)}`}>
                          Score: {suggestion.score.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Compatibility: {suggestion.compatibility.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.reasons.slice(0, 3).map((reason, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={() => onAddTeam(suggestion.team)}
                className="ml-4"
              >
                <Award className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats */}
      {suggestions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {suggestions.filter(s => s.category === 'primary').length}
              </div>
              <div className="text-gray-500">Primary Picks</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {suggestions.filter(s => s.category === 'defensive').length}
              </div>
              <div className="text-gray-500">Defensive</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {suggestions.filter(s => s.category === 'specialist').length}
              </div>
              <div className="text-gray-500">Specialists</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {suggestions.filter(s => s.score >= 70).length}
              </div>
              <div className="text-gray-500">High Score</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
