/**
 * Inline team comparison panel: select up to 4 teams and compare using provided scouting data.
 * Used on view-data (past competition) Comparison tab and on analysis/comparison when competition-scoped.
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  X,
  Award,
  TrendingUp,
  Shield,
  Zap,
  Download,
  AlertCircle,
} from 'lucide-react';
import { buildTeamComparisonFromRows, type TeamComparison } from '@/lib/comparison';
import { formatScoreRange } from '@/lib/analytics';
import { cn } from '@/lib/utils';

export interface TeamComparisonPanelProps {
  teams: Array<{ team_number: number; team_name: string }>;
  scoutingData: any[];
  competitionName?: string;
  /** Use dark theme classes (default true) */
  dark?: boolean;
}

export function TeamComparisonPanel({
  teams,
  scoutingData,
  competitionName = '',
  dark = true,
}: TeamComparisonPanelProps) {
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [teamComparisons, setTeamComparisons] = useState<TeamComparison[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const availableTeams = useMemo(() => {
    const teamNumbers = new Set<number>();
    scoutingData.forEach((r: any) => {
      if (r.team_number) teamNumbers.add(r.team_number);
    });
    return teams.filter((t) => teamNumbers.has(t.team_number));
  }, [teams, scoutingData]);

  const addTeam = (teamNumber: number) => {
    if (selectedTeams.includes(teamNumber) || selectedTeams.length >= 4) return;
    setError(null);
    const teamRows = scoutingData.filter((r: any) => r.team_number === teamNumber);
    if (teamRows.length === 0) {
      setError(`No scouting data for Team ${teamNumber} in this competition`);
      return;
    }
    const team = teams.find((t) => t.team_number === teamNumber);
    const teamName = team?.team_name || `Team ${teamNumber}`;
    const comparison = buildTeamComparisonFromRows(teamNumber, teamName, teamRows);
    setSelectedTeams((prev) => [...prev, teamNumber]);
    setTeamComparisons((prev) => [...prev, comparison]);
    setInputValue('');
  };

  const removeTeam = (teamNumber: number) => {
    setSelectedTeams((prev) => prev.filter((t) => t !== teamNumber));
    setTeamComparisons((prev) => prev.filter((t) => t.team_number !== teamNumber));
  };

  const getBestTeam = (metric: keyof TeamComparison): TeamComparison | null => {
    if (teamComparisons.length === 0) return null;
    return teamComparisons.reduce((best, current) => {
      const currentVal = current[metric];
      const bestVal = best[metric];
      if (typeof currentVal === 'number' && typeof bestVal === 'number') {
        return currentVal > bestVal ? current : best;
      }
      return best;
    });
  };

  const exportComparison = () => {
    if (teamComparisons.length === 0) return;
    const csvContent = [
      ['Team Number', 'Team Name', 'Total Matches', 'Avg Autonomous', 'Avg Teleop', 'Avg Endgame', 'Avg Total Score', 'Avg Defense', 'Best Score', 'Worst Score', 'Consistency Score'],
      ...teamComparisons.map((team) => [
        team.team_number,
        team.team_name,
        team.total_matches,
        team.avg_autonomous_points,
        team.avg_teleop_points,
        team.avg_endgame_points,
        team.avg_total_score,
        team.avg_defense_rating,
        team.best_score,
        team.worst_score,
        team.consistency_score,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const selectableTeams = availableTeams.filter((t) => !selectedTeams.includes(t.team_number));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Team Comparison</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {competitionName ? `Compare teams at ${competitionName}` : 'Add up to 4 teams to compare.'}
          </p>
        </div>
        {teamComparisons.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportComparison} className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      <Card className="border border-white/10 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Select teams to compare
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Add up to 4 teams. Data is from this competition only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={inputValue || undefined}
              onValueChange={setInputValue}
              disabled={selectableTeams.length === 0}
            >
              <SelectTrigger
                className={cn(
                  'min-h-10 w-full flex-1 border-border bg-background text-foreground shadow-sm sm:min-h-11',
                  'focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                  dark && 'border-white/15 bg-muted/40'
                )}
              >
                <SelectValue
                  placeholder={
                    selectableTeams.length === 0 ? 'No teams left to add' : 'Select a team'
                  }
                />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className={cn(
                  'z-[100] max-h-[min(320px,var(--radix-select-content-available-height))] border-border bg-popover text-popover-foreground shadow-lg',
                  dark && 'border-white/10'
                )}
              >
                {selectableTeams.map((t) => (
                  <SelectItem key={t.team_number} value={String(t.team_number)}>
                    {t.team_name} ({t.team_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                const n = parseInt(inputValue, 10);
                if (!Number.isNaN(n)) addTeam(n);
              }}
              disabled={!inputValue || selectedTeams.length >= 4}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add team
            </Button>
          </div>
          {selectedTeams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {teamComparisons.map((team) => (
                <div
                  key={team.team_number}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
                >
                  <span className="font-medium text-foreground">{team.team_name}</span>
                  <span className="text-xs text-muted-foreground">({team.team_number})</span>
                  <button
                    type="button"
                    onClick={() => removeTeam(team.team_number)}
                    className="p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${team.team_name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-4 rounded-lg">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {teamComparisons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-white/10 bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Best avg score</p>
                <p className="text-xl font-bold text-foreground">{getBestTeam('avg_total_score')?.avg_total_score ?? '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{getBestTeam('avg_total_score')?.team_name ?? '—'}</p>
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Most consistent</p>
                <p className="text-xl font-bold text-foreground">{getBestTeam('consistency_score')?.consistency_score ?? '—'}%</p>
                <p className="text-xs text-muted-foreground truncate">{getBestTeam('consistency_score')?.team_name ?? '—'}</p>
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Best defense</p>
                <p className="text-xl font-bold text-foreground">{getBestTeam('avg_defense_rating')?.avg_defense_rating ?? '—'}/10</p>
                <p className="text-xs text-muted-foreground truncate">{getBestTeam('avg_defense_rating')?.team_name ?? '—'}</p>
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Highest score</p>
                <p className="text-xl font-bold text-foreground">{getBestTeam('best_score')?.best_score ?? '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{getBestTeam('best_score')?.team_name ?? '—'}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-white/10 bg-card/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-foreground">Detailed comparison</CardTitle>
              <CardDescription className="text-muted-foreground">Side-by-side for selected teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-2 font-medium">Team</th>
                      <th className="py-3 px-2 font-medium">Matches</th>
                      <th className="py-3 px-2 font-medium">Avg score</th>
                      <th className="py-3 px-2 font-medium">Auto</th>
                      <th className="py-3 px-2 font-medium">Teleop</th>
                      <th className="py-3 px-2 font-medium">Endgame</th>
                      <th className="py-3 px-2 font-medium">Defense</th>
                      <th className="py-3 px-2 font-medium">Best</th>
                      <th className="py-3 px-2 font-medium">Consistency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamComparisons.map((team) => (
                      <tr key={team.team_number} className="border-b border-white/5">
                        <td className="py-3 px-2">
                          <div className="font-medium text-foreground">{team.team_name}</div>
                          <div className="text-xs text-muted-foreground">Team {team.team_number}</div>
                        </td>
                        <td className="py-3 px-2 text-foreground">{team.total_matches}</td>
                        <td className="py-3 px-2 font-semibold text-foreground">
                          {formatScoreRange(team.total_pts_min ?? team.avg_total_score, team.total_pts_max ?? team.avg_total_score)}
                        </td>
                        <td className="py-3 px-2 text-foreground">
                          {formatScoreRange(team.auto_pts_min ?? team.avg_autonomous_points, team.auto_pts_max ?? team.avg_autonomous_points)}
                        </td>
                        <td className="py-3 px-2 text-foreground">
                          {formatScoreRange(team.teleop_pts_min ?? team.avg_teleop_points, team.teleop_pts_max ?? team.avg_teleop_points)}
                        </td>
                        <td className="py-3 px-2 text-foreground">{team.avg_endgame_points}</td>
                        <td className="py-3 px-2 text-foreground">{team.avg_defense_rating}/10</td>
                        <td className="py-3 px-2 font-semibold text-green-500">{team.best_score}</td>
                        <td className="py-3 px-2 text-foreground">{team.consistency_score}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-white/10 bg-card/50">
              <CardHeader>
                <CardTitle className="text-foreground text-base">Avg score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamComparisons.map((team, i) => {
                  const maxAvg = Math.max(...teamComparisons.map((t) => t.avg_total_score), 1);
                  const pct = (team.avg_total_score / maxAvg) * 100;
                  return (
                    <div key={team.team_number}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{team.team_name}</span>
                        <span className="font-semibold text-foreground">{team.avg_total_score}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-card/50">
              <CardHeader>
                <CardTitle className="text-foreground text-base">Consistency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {teamComparisons.map((team, i) => (
                  <div key={team.team_number}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{team.team_name}</span>
                      <span className="font-semibold text-foreground">{team.consistency_score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${team.consistency_score}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="h-full bg-green-500/80 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {availableTeams.length === 0 && (
        <Card className="border border-white/10 bg-card/50 p-8 text-center">
          <p className="text-muted-foreground">No teams with scouting data in this competition yet.</p>
        </Card>
      )}
    </div>
  );
}
