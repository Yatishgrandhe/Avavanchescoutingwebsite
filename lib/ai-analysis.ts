// Local AI Analysis for Team Picking Suggestions
import { TeamStats, PickListTeam } from './types';

export interface AISuggestion {
  team_number: number;
  team_name: string;
  confidence_score: number;
  reasoning: string[];
  category: 'primary' | 'secondary' | 'specialist' | 'defensive' | 'balanced';
  compatibility_score: number;
  strengths: string[];
  weaknesses: string[];
  strategic_value: number;
}

export interface AIPickListAnalysis {
  suggestions: AISuggestion[];
  alliance_analysis: {
    total_potential_score: number;
    balanced_score: number;
    specialization_coverage: string[];
    potential_weaknesses: string[];
    strategic_recommendations: string[];
  };
}

// AI Analysis Engine
export class TeamPickAI {
  private analyzeTeamPerformance(stats: TeamStats): {
    overall_score: number;
    consistency_factor: number;
    specialization_score: number;
    reliability_score: number;
  } {
    const {
      avg_total_score,
      avg_autonomous_points,
      avg_teleop_points,
      avg_endgame_points,
      avg_defense_rating,
      total_matches,
      consistency_score
    } = stats;

    // Base performance score (0-100)
    const baseScore = Math.min(100, (avg_total_score / 100) * 100);
    
    // Consistency factor (more matches = more reliable)
    const consistencyFactor = Math.min(1, total_matches / 10);
    
    // Specialization score (how well they perform in specific areas)
    const autoSpecialization = avg_autonomous_points > 15 ? 1.2 : 1;
    const teleopSpecialization = avg_teleop_points > 40 ? 1.1 : 1;
    const endgameSpecialization = avg_endgame_points > 20 ? 1.3 : 1;
    const defenseSpecialization = avg_defense_rating > 7 ? 1.2 : 1;
    
    const specializationScore = (autoSpecialization + teleopSpecialization + endgameSpecialization + defenseSpecialization) / 4;
    
    // Reliability score based on match count and consistency
    const reliabilityScore = (consistencyFactor * 0.6) + ((consistency_score / 100) * 0.4);
    
    return {
      overall_score: baseScore * specializationScore,
      consistency_factor: consistencyFactor,
      specialization_score: specializationScore,
      reliability_score: reliabilityScore
    };
  }

  private categorizeTeam(stats: TeamStats): 'primary' | 'secondary' | 'specialist' | 'defensive' | 'balanced' {
    const { avg_total_score, avg_autonomous_points, avg_teleop_points, avg_endgame_points, avg_defense_rating } = stats;
    
    // Primary: High overall score, good at everything
    if (avg_total_score > 80 && avg_defense_rating > 6) {
      return 'primary';
    }
    
    // Specialist: Exceptional in one area
    if (avg_autonomous_points > 20 || avg_endgame_points > 25) {
      return 'specialist';
    }
    
    // Defensive: High defense rating, moderate scoring
    if (avg_defense_rating > 7 && avg_total_score > 50) {
      return 'defensive';
    }
    
    // Secondary: Solid all-around performance
    if (avg_total_score > 60) {
      return 'secondary';
    }
    
    // Balanced: Decent performance across all areas
    return 'balanced';
  }

  private generateReasoning(stats: TeamStats, analysis: any, category: string): string[] {
    const reasons: string[] = [];
    const { avg_total_score, avg_autonomous_points, avg_teleop_points, avg_endgame_points, avg_defense_rating, total_matches, consistency_score } = stats;
    
    // Performance-based reasons
    if (avg_total_score > 80) {
      reasons.push(`High scoring potential (${avg_total_score.toFixed(1)} avg)`);
    } else if (avg_total_score > 60) {
      reasons.push(`Solid scoring ability (${avg_total_score.toFixed(1)} avg)`);
    }
    
    // Consistency reasons
    if (consistency_score > 80) {
      reasons.push(`Highly consistent performance (${consistency_score.toFixed(1)}%)`);
    } else if (consistency_score > 60) {
      reasons.push(`Reliable performance (${consistency_score.toFixed(1)}%)`);
    }
    
    // Match count reasons
    if (total_matches > 10) {
      reasons.push(`Well-scouted with ${total_matches} matches`);
    } else if (total_matches > 5) {
      reasons.push(`Moderate scouting data (${total_matches} matches)`);
    }
    
    // Specialization reasons
    if (avg_autonomous_points > 15) {
      reasons.push(`Strong autonomous performance (${avg_autonomous_points.toFixed(1)} pts)`);
    }
    if (avg_endgame_points > 20) {
      reasons.push(`Excellent endgame capability (${avg_endgame_points.toFixed(1)} pts)`);
    }
    if (avg_defense_rating > 7) {
      reasons.push(`Strong defensive play (${avg_defense_rating.toFixed(1)}/10)`);
    }
    
    // Category-specific reasons
    switch (category) {
      case 'primary':
        reasons.push('Well-rounded team suitable for first pick');
        break;
      case 'specialist':
        reasons.push('Specialized capabilities for specific strategies');
        break;
      case 'defensive':
        reasons.push('Strong defensive capabilities for alliance protection');
        break;
      case 'secondary':
        reasons.push('Solid backup option for alliance depth');
        break;
      case 'balanced':
        reasons.push('Balanced performance across all game aspects');
        break;
    }
    
    return reasons;
  }

  private identifyStrengths(stats: TeamStats): string[] {
    const strengths: string[] = [];
    const { avg_total_score, avg_autonomous_points, avg_teleop_points, avg_endgame_points, avg_defense_rating, consistency_score } = stats;
    
    if (avg_total_score > 70) strengths.push('High scoring potential');
    if (avg_autonomous_points > 15) strengths.push('Strong autonomous phase');
    if (avg_teleop_points > 40) strengths.push('Effective teleop performance');
    if (avg_endgame_points > 20) strengths.push('Excellent endgame execution');
    if (avg_defense_rating > 7) strengths.push('Strong defensive capabilities');
    if (consistency_score > 75) strengths.push('Consistent performance');
    
    return strengths;
  }

  private identifyWeaknesses(stats: TeamStats): string[] {
    const weaknesses: string[] = [];
    const { avg_total_score, avg_autonomous_points, avg_teleop_points, avg_endgame_points, avg_defense_rating, consistency_score } = stats;
    
    if (avg_total_score < 50) weaknesses.push('Lower scoring potential');
    if (avg_autonomous_points < 10) weaknesses.push('Weak autonomous phase');
    if (avg_teleop_points < 30) weaknesses.push('Limited teleop effectiveness');
    if (avg_endgame_points < 15) weaknesses.push('Poor endgame performance');
    if (avg_defense_rating < 5) weaknesses.push('Limited defensive capabilities');
    if (consistency_score < 60) weaknesses.push('Inconsistent performance');
    
    return weaknesses;
  }

  private calculateCompatibility(currentPickList: PickListTeam[], teamStats: TeamStats): number {
    if (currentPickList.length === 0) return 1.0;
    
    const currentStrengths = currentPickList.map(team => {
      if (!team.stats) return [];
      return this.identifyStrengths(team.stats);
    }).flat();
    
    const newTeamStrengths = this.identifyStrengths(teamStats);
    const newTeamWeaknesses = this.identifyWeaknesses(teamStats);
    
    // Calculate how well this team complements the current list
    let compatibility = 0.5; // Base compatibility
    
    // Bonus for filling gaps
    const currentWeaknesses = currentPickList.map(team => {
      if (!team.stats) return [];
      return this.identifyWeaknesses(team.stats);
    }).flat();
    
    const filledGaps = newTeamStrengths.filter(strength => 
      currentWeaknesses.some(weakness => 
        weakness.toLowerCase().includes(strength.toLowerCase().split(' ')[0])
      )
    ).length;
    
    compatibility += (filledGaps / 5) * 0.3;
    
    // Penalty for redundancy
    const redundantStrengths = newTeamStrengths.filter(strength =>
      currentStrengths.some(currentStrength =>
        currentStrength.toLowerCase().includes(strength.toLowerCase().split(' ')[0])
      )
    ).length;
    
    compatibility -= (redundantStrengths / 5) * 0.2;
    
    return Math.max(0, Math.min(1, compatibility));
  }

  public analyzeTeam(team: { team_number: number; team_name: string; stats?: TeamStats }, currentPickList: PickListTeam[]): AISuggestion {
    if (!team.stats) {
      return {
        team_number: team.team_number,
        team_name: team.team_name,
        confidence_score: 0.3,
        reasoning: ['Limited scouting data available'],
        category: 'balanced',
        compatibility_score: 0.5,
        strengths: [],
        weaknesses: ['No performance data available'],
        strategic_value: 0.3
      };
    }

    const analysis = this.analyzeTeamPerformance(team.stats);
    const category = this.categorizeTeam(team.stats);
    const compatibility = this.calculateCompatibility(currentPickList, team.stats);
    
    // Calculate confidence score (0-1)
    const confidenceScore = Math.min(1, 
      (analysis.reliability_score * 0.4) + 
      (analysis.consistency_factor * 0.3) + 
      (compatibility * 0.3)
    );
    
    // Calculate strategic value (0-1)
    const strategicValue = Math.min(1,
      (analysis.overall_score / 100 * 0.4) +
      (analysis.specialization_score * 0.3) +
      (compatibility * 0.3)
    );

    return {
      team_number: team.team_number,
      team_name: team.team_name,
      confidence_score: confidenceScore,
      reasoning: this.generateReasoning(team.stats, analysis, category),
      category,
      compatibility_score: compatibility,
      strengths: this.identifyStrengths(team.stats),
      weaknesses: this.identifyWeaknesses(team.stats),
      strategic_value: strategicValue
    };
  }

  public generatePickListAnalysis(availableTeams: Array<{ team_number: number; team_name: string; stats?: TeamStats }>, currentPickList: PickListTeam[]): AIPickListAnalysis {
    const suggestions = availableTeams
      .filter(team => !currentPickList.some(picked => picked.team_number === team.team_number))
      .map(team => this.analyzeTeam(team, currentPickList))
      .sort((a, b) => (b.confidence_score * b.strategic_value) - (a.confidence_score * a.strategic_value))
      .slice(0, 10); // Top 10 suggestions

    // Analyze current alliance potential
    const currentStats = currentPickList.filter(team => team.stats).map(team => team.stats!);
    const totalPotentialScore = currentStats.reduce((sum, stats) => sum + stats.avg_total_score, 0);
    const balancedScore = currentStats.length > 0 ? totalPotentialScore / currentStats.length : 0;
    
    const allStrengths = currentStats.map(stats => this.identifyStrengths(stats)).flat();
    const allWeaknesses = currentStats.map(stats => this.identifyWeaknesses(stats)).flat();
    
    const specializationCoverage = Array.from(new Set(allStrengths));
    const potentialWeaknesses = Array.from(new Set(allWeaknesses));
    
    // Generate strategic recommendations
    const strategicRecommendations: string[] = [];
    
    if (currentPickList.length < 3) {
      strategicRecommendations.push('Consider adding a high-scoring primary team for alliance leadership');
    }
    
    if (!specializationCoverage.some(s => s.includes('autonomous'))) {
      strategicRecommendations.push('Add a team with strong autonomous capabilities');
    }
    
    if (!specializationCoverage.some(s => s.includes('endgame'))) {
      strategicRecommendations.push('Consider adding an endgame specialist for match-closing ability');
    }
    
    if (!specializationCoverage.some(s => s.includes('defensive'))) {
      strategicRecommendations.push('Add defensive capabilities to protect alliance scoring');
    }
    
    if (balancedScore < 60) {
      strategicRecommendations.push('Focus on teams with higher average scoring potential');
    }

    return {
      suggestions,
      alliance_analysis: {
        total_potential_score: totalPotentialScore,
        balanced_score: balancedScore,
        specialization_coverage: specializationCoverage,
        potential_weaknesses: potentialWeaknesses,
        strategic_recommendations: strategicRecommendations
      }
    };
  }
}

// Export singleton instance
export const teamPickAI = new TeamPickAI();
