import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { TeamStats } from '@/lib/types';
import { TrendingUp, TrendingDown, Target, Shield, BarChart3 } from 'lucide-react';

interface TeamStatsCardProps {
  teamNumber: number;
  teamName: string;
  stats: TeamStats;
  pickOrder?: number;
  notes?: string;
  className?: string;
}

export function TeamStatsCard({ 
  teamNumber, 
  teamName, 
  stats, 
  pickOrder,
  notes,
  className = '' 
}: TeamStatsCardProps) {
  const getScoreColor = (score: number, maxScore: number = 100) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDefenseColor = (rating: number) => {
    if (rating >= 4) return 'text-blue-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Team {teamNumber}
          </h3>
          <p className="text-sm text-gray-600 truncate max-w-48">
            {teamName}
          </p>
        </div>
        {pickOrder && (
          <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            #{pickOrder}
          </Badge>
        )}
      </div>

      {notes && (
        <div className="mb-3 p-2 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700 italic">"{notes}"</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center space-x-2">
          <Target className="h-4 w-4 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500">Total Score</p>
            <p className={`text-sm font-semibold ${getScoreColor(stats.avg_total_score)}`}>
              {stats.avg_total_score.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-green-500" />
          <div>
            <p className="text-xs text-gray-500">Matches</p>
            <p className="text-sm font-semibold text-gray-900">
              {stats.total_matches}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <div>
            <p className="text-xs text-gray-500">Auto</p>
            <p className={`text-sm font-semibold ${getScoreColor(stats.avg_autonomous_points, 30)}`}>
              {stats.avg_autonomous_points.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <TrendingDown className="h-4 w-4 text-orange-500" />
          <div>
            <p className="text-xs text-gray-500">Teleop</p>
            <p className={`text-sm font-semibold ${getScoreColor(stats.avg_teleop_points, 50)}`}>
              {stats.avg_teleop_points.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500">Defense</span>
          <span className={`text-sm font-semibold ${getDefenseColor(stats.avg_defense_rating)}`}>
            {stats.avg_defense_rating.toFixed(1)}/10
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          Endgame: {stats.avg_endgame_points.toFixed(1)}
        </div>
      </div>
    </Card>
  );
}

interface TeamComparisonProps {
  teams: Array<{
    teamNumber: number;
    teamName: string;
    stats: TeamStats;
  }>;
}

export function TeamComparison({ teams }: TeamComparisonProps) {
  if (teams.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Team Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <TeamStatsCard
            key={team.teamNumber}
            teamNumber={team.teamNumber}
            teamName={team.teamName}
            stats={team.stats}
          />
        ))}
      </div>
    </div>
  );
}

interface QuickStatsProps {
  stats: TeamStats;
  className?: string;
}

export function QuickStats({ stats, className = '' }: QuickStatsProps) {
  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      <div className="flex items-center space-x-1">
        <Target className="h-4 w-4 text-blue-500" />
        <span className="font-semibold">{stats.avg_total_score.toFixed(1)}</span>
        <span className="text-gray-500">avg</span>
      </div>
      <div className="flex items-center space-x-1">
        <BarChart3 className="h-4 w-4 text-green-500" />
        <span className="font-semibold">{stats.total_matches}</span>
        <span className="text-gray-500">matches</span>
      </div>
      <div className="flex items-center space-x-1">
        <Shield className="h-4 w-4 text-gray-500" />
        <span className="font-semibold">{stats.avg_defense_rating.toFixed(1)}</span>
        <span className="text-gray-500">defense</span>
      </div>
    </div>
  );
}
