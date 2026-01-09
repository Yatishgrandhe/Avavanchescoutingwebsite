import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
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
  const router = useRouter();
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIPickListAnalysis | null>(null);
  const [coralStats, setCoralStats] = useState<CoralStats[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'balanced' | 'aggressive' | 'defensive' | 'specialist'>('balanced');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleTeamClick = (teamNumber: number) => {
    router.push(`/team/${teamNumber}`);
  };

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
      case 'primary': return <Star className="h-4 w-4 text-primary" />;
      case 'defensive': return <Shield className="h-4 w-4 text-primary" />;
      case 'specialist': return <Zap className="h-4 w-4 text-primary" />;
      default: return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'primary': return 'bg-primary/20 text-primary border-primary/20';
      case 'defensive': return 'bg-primary/20 text-primary border-primary/20';
      case 'specialist': return 'bg-primary/20 text-primary border-primary/20';
      default: return 'bg-white/10 text-muted-foreground border-white/10';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-muted-foreground';
    return 'text-muted-foreground';
  };

  return (
    <div className="glass-card rounded-xl border border-white/5 w-full flex flex-col overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm sm:text-base font-semibold text-foreground">AI Team Suggestions</h3>
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="p-4 flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="flex flex-col space-y-3 mb-3 flex-shrink-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <select
            value={analysisMode}
            onChange={(e) => setAnalysisMode(e.target.value as any)}
            className="flex-1 px-3 py-2 border border-white/10 rounded-lg text-xs sm:text-sm bg-background/50 text-foreground hover:bg-white/5 transition-colors"
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
            className="px-3 py-2 rounded-lg border-white/10 text-foreground hover:bg-white/5 transition-colors text-xs sm:text-sm"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">{showAdvanced ? 'Hide' : 'Show'} Details</span>
            <span className="sm:hidden">{showAdvanced ? 'Hide' : 'Details'}</span>
          </Button>
            </div>
          </div>

      {/* Analysis Mode Description */}
      <div className="mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20 flex-shrink-0">
        <div className="flex items-center space-x-2 mb-1">
          <Lightbulb className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-foreground">
            {analysisMode === 'balanced' && 'Balanced Strategy'}
            {analysisMode === 'aggressive' && 'Aggressive Scoring'}
            {analysisMode === 'defensive' && 'Defensive Focus'}
            {analysisMode === 'specialist' && 'Specialist Roles'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {analysisMode === 'balanced' && 'Prioritizes well-rounded teams with good scoring and defense capabilities'}
          {analysisMode === 'aggressive' && 'Focuses on high-scoring teams for offensive strategies'}
          {analysisMode === 'defensive' && 'Emphasizes defensive capabilities and endgame performance'}
          {analysisMode === 'specialist' && 'Identifies teams with exceptional skills in specific areas'}
        </p>
      </div>

      {/* AI Analysis Toggle */}
      <div className="mb-3 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAI(!showAI)}
          className="w-full px-3 py-2 rounded-lg border-white/10 text-foreground hover:bg-white/5 transition-colors text-xs"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {showAI ? 'Hide' : 'Show'} AI Analysis
        </Button>
      </div>

      {/* AI Alliance Analysis */}
      {showAI && aiAnalysis && (
        <div className="mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20 flex-shrink-0">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-foreground">AI Alliance Analysis</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Potential Score: <span className="font-semibold text-foreground">{aiAnalysis.alliance_analysis.total_potential_score.toFixed(1)}</span></div>
            <div>Balanced Score: <span className="font-semibold text-foreground">{aiAnalysis.alliance_analysis.balanced_score.toFixed(1)}</span></div>
            {aiAnalysis.alliance_analysis.strategic_recommendations.length > 0 && (
              <div className="mt-2">
                <div className="font-medium mb-1 text-foreground">Recommendations:</div>
                {aiAnalysis.alliance_analysis.strategic_recommendations.slice(0, 2).map((rec, idx) => (
                  <div key={idx} className="flex items-start space-x-1">
                    <CheckCircle className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
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
        <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/10 flex-shrink-0">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-foreground">Top Coral Scorers</span>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            {coralStats.slice(0, 3).map((coral, index) => {
              const team = availableTeams.find(t => t.team_number === coral.team_number);
              const isAlreadySelected = selectedTeamNumbers.includes(coral.team_number);
              
              return (
                <div key={coral.team_number} className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Badge variant="secondary" className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 flex-shrink-0">
                      #{index + 1}
                    </Badge>
                    <button
                      onClick={() => handleTeamClick(coral.team_number)}
                      className="flex items-center space-x-1 hover:text-primary transition-colors group min-w-0"
                    >
                      <span className="font-medium text-foreground group-hover:text-primary truncate">Team {coral.team_number}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {coral.avg_coral_points.toFixed(1)} pts
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
                      className="px-2 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-xs flex-shrink-0"
                    >
                      <Award className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                  {isAlreadySelected && (
                    <Badge variant="outline" className="text-xs border-primary/20 text-primary px-1.5 py-0.5 flex-shrink-0">
                      Selected
                    </Badge>
                  )}
                </div>
              );
            })}
            <div className="mt-2 pt-2 border-t border-white/5 text-muted-foreground">
              <div className="font-medium mb-1 text-foreground">Coral Scoring:</div>
              <div>• Trough: 2-3 pts</div>
              <div>• Level 2: 3-4 pts</div>
              <div>• Level 3: 4-6 pts</div>
              <div>• Level 4: 5-7 pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {aiSuggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-xs sm:text-sm">No AI suggestions available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add some scouting data to get AI recommendations</p>
          </div>
        ) : (
          aiSuggestions.map((suggestion, index) => (
            <div
              key={suggestion.team_number}
              className="flex flex-col sm:flex-row sm:items-start justify-between p-3 border border-white/5 rounded-lg hover:bg-white/5 transition-colors gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary text-xs px-1.5 py-0.5">
                    #{index + 1}
                  </Badge>
                  {getCategoryIcon(suggestion.category)}
                  <button
                    onClick={() => handleTeamClick(suggestion.team_number)}
                    className="flex items-center space-x-1 hover:text-primary transition-colors group"
                  >
                    <h4 className="font-semibold text-foreground text-sm group-hover:text-primary">
                      Team {suggestion.team_number}
                    </h4>
                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  <Badge className={`${getCategoryColor(suggestion.category)} text-xs px-1.5 py-0.5`}>
                    {suggestion.category}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground mb-2">
                  <div className="flex items-center space-x-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="font-medium text-foreground text-xs">Conf: {suggestion.confidence_score.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BarChart3 className="h-3 w-3 text-primary" />
                    <span className="text-xs">Strategic: {suggestion.strategic_value.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="h-3 w-3 text-primary" />
                    <span className="text-xs">Compat: {suggestion.compatibility_score.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-xs">AI Powered</span>
                  </div>
                </div>
                
                {showAdvanced && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className={`font-semibold ${getScoreColor(suggestion.confidence_score * 100)}`}>
                        {(suggestion.confidence_score * 100).toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground">Strategic:</span>
                      <span className="text-foreground">
                        {(suggestion.strategic_value * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {suggestion.reasoning.slice(0, 2).map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-white/10 text-muted-foreground px-1.5 py-0.5">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                    {suggestion.strengths.length > 0 && (
                      <div className="text-xs">
                        <span className="text-primary font-medium">Strengths: </span>
                        <span className="text-muted-foreground">{suggestion.strengths.slice(0, 2).join(', ')}</span>
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
                className="sm:ml-2 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-xs flex-shrink-0 w-full sm:w-auto"
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
        <div className="mt-3 pt-3 border-t border-white/5 flex-shrink-0">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-foreground text-sm">
                {aiSuggestions.filter(s => s.category === 'primary').length}
              </div>
              <div className="text-muted-foreground text-xs">Primary</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground text-sm">
                {aiSuggestions.filter(s => s.category === 'defensive').length}
              </div>
              <div className="text-muted-foreground text-xs">Defense</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground text-sm">
                {aiSuggestions.filter(s => s.category === 'specialist').length}
              </div>
              <div className="text-muted-foreground text-xs">Special</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground text-sm">
                {aiSuggestions.filter(s => s.confidence_score >= 0.7).length}
              </div>
              <div className="text-muted-foreground text-xs">High</div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

