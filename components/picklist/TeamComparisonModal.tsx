import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { TeamStatsCard, TeamComparison } from './TeamStatsCard';
import { PickListTeam, TeamStats } from '@/lib/types';
import { BarChart3, TrendingUp, Shield, Target, Users, X } from 'lucide-react';

interface TeamComparisonModalProps {
  teams: PickListTeam[];
  isOpen: boolean;
  onClose: () => void;
}

export function TeamComparisonModal({ teams, isOpen, onClose }: TeamComparisonModalProps) {
  if (!isOpen) return null;

  const teamsWithStats = teams.filter(team => team.stats);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Team Comparison</h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {teamsWithStats.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Team Stats Available
              </h3>
              <p className="text-gray-600">
                Add teams with scouting data to see detailed comparisons.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Stats Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamsWithStats.map((team) => (
                  <TeamStatsCard
                    key={team.team_number}
                    teamNumber={team.team_number}
                    teamName={team.team_name}
                    stats={team.stats!}
                    pickOrder={team.pick_order}
                    notes={team.notes}
                  />
                ))}
              </div>

              {/* Detailed Comparison Table */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-900">Team</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900">Matches</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900">Avg Score</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900">Auto</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900">Teleop</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900">Endgame</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900">Defense</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamsWithStats.map((team) => (
                        <tr key={team.team_number} className="border-b border-gray-100">
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">#{team.pick_order}</Badge>
                              <div>
                                <div className="font-medium text-gray-900">
                                  Team {team.team_number}
                                </div>
                                <div className="text-xs text-gray-500">{team.team_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 text-gray-900">
                            {team.stats!.total_matches}
                          </td>
                          <td className="text-right py-3 px-2">
                            <span className="font-semibold text-blue-600">
                              {team.stats!.avg_total_score.toFixed(1)}
                            </span>
                          </td>
                          <td className="text-right py-3 px-2 text-gray-900">
                            {team.stats!.avg_autonomous_points.toFixed(1)}
                          </td>
                          <td className="text-right py-3 px-2 text-gray-900">
                            {team.stats!.avg_teleop_points.toFixed(1)}
                          </td>
                          <td className="text-right py-3 px-2 text-gray-900">
                            {team.stats!.avg_endgame_points.toFixed(1)}
                          </td>
                          <td className="text-right py-3 px-2">
                            <span className={`font-semibold ${
                              team.stats!.avg_defense_rating >= 4 ? 'text-green-600' :
                              team.stats!.avg_defense_rating >= 3 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {team.stats!.avg_defense_rating.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Alliance Analysis */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alliance Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                      Strengths
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {getAllianceStrengths(teamsWithStats).map((strength, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Target className="h-4 w-4 mr-2 text-yellow-500" />
                      Considerations
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {getAllianceConsiderations(teamsWithStats).map((consideration, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>{consideration}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions for alliance analysis
function getAllianceStrengths(teams: PickListTeam[]): string[] {
  const strengths: string[] = [];
  
  const avgScore = teams.reduce((sum, team) => sum + (team.stats?.avg_total_score || 0), 0) / teams.length;
  const avgDefense = teams.reduce((sum, team) => sum + (team.stats?.avg_defense_rating || 0), 0) / teams.length;
  const totalMatches = teams.reduce((sum, team) => sum + (team.stats?.total_matches || 0), 0);

  if (avgScore > 60) {
    strengths.push(`High average scoring potential (${avgScore.toFixed(1)} pts)`);
  }
  if (avgDefense > 3.5) {
    strengths.push(`Strong defensive capabilities (${avgDefense.toFixed(1)}/5)`);
  }
  if (totalMatches > 20) {
    strengths.push(`Well-scouted teams (${totalMatches} total matches)`);
  }

  const autoSpecialists = teams.filter(team => (team.stats?.avg_autonomous_points || 0) > 15).length;
  if (autoSpecialists > 0) {
    strengths.push(`${autoSpecialists} autonomous specialist(s)`);
  }

  const endgameSpecialists = teams.filter(team => (team.stats?.avg_endgame_points || 0) > 10).length;
  if (endgameSpecialists > 0) {
    strengths.push(`${endgameSpecialists} endgame specialist(s)`);
  }

  return strengths.length > 0 ? strengths : ['Teams selected for potential'];
}

function getAllianceConsiderations(teams: PickListTeam[]): string[] {
  const considerations: string[] = [];
  
  const avgScore = teams.reduce((sum, team) => sum + (team.stats?.avg_total_score || 0), 0) / teams.length;
  const avgDefense = teams.reduce((sum, team) => sum + (team.stats?.avg_defense_rating || 0), 0) / teams.length;

  if (avgScore < 40) {
    considerations.push('Lower average scoring - may need strategic play');
  }
  if (avgDefense < 2.5) {
    considerations.push('Limited defensive capabilities');
  }

  const lowMatchTeams = teams.filter(team => (team.stats?.total_matches || 0) < 5).length;
  if (lowMatchTeams > 0) {
    considerations.push(`${lowMatchTeams} team(s) with limited scouting data`);
  }

  const inconsistentTeams = teams.filter(team => {
    const matches = team.stats?.total_matches || 0;
    return matches > 0 && matches < 8;
  }).length;
  
  if (inconsistentTeams > 0) {
    considerations.push(`${inconsistentTeams} team(s) may have inconsistent performance`);
  }

  return considerations.length > 0 ? considerations : ['Teams appear well-balanced'];
}

interface QuickComparisonProps {
  teams: PickListTeam[];
  onOpenComparison: () => void;
}

export function QuickComparison({ teams, onOpenComparison }: QuickComparisonProps) {
  const teamsWithStats = teams.filter(team => team.stats);
  
  if (teamsWithStats.length < 2) {
    return null;
  }

  const avgScore = teamsWithStats.reduce((sum, team) => sum + (team.stats?.avg_total_score || 0), 0) / teamsWithStats.length;
  const avgDefense = teamsWithStats.reduce((sum, team) => sum + (team.stats?.avg_defense_rating || 0), 0) / teamsWithStats.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Alliance Preview</h3>
        <Button size="sm" onClick={onOpenComparison}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Compare Teams
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Target className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-gray-500">Avg Score</p>
            <p className="font-semibold text-gray-900">{avgScore.toFixed(1)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-green-500" />
          <div>
            <p className="text-gray-500">Avg Defense</p>
            <p className="font-semibold text-gray-900">{avgDefense.toFixed(1)}/5</p>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {teamsWithStats.length} teams with stats • {teams.length - teamsWithStats.length} teams pending data
        </p>
      </div>
    </Card>
  );
}
