/**
 * 2026 REBUILT: Shows each shooting run in auto and teleop with time, ball range (multiple choice), and estimated pts.
 */
import React from 'react';
import { getRunsForDisplay, parseNotes, type ScoutingRowShuttleMeta } from '@/lib/analytics';
import { Clock, Target, Award, Zap } from 'lucide-react';
import { cn, formatDurationSec } from '@/lib/utils';

interface ScoutingRunsBreakdownProps {
  notes: any;
  /** DB row fields when notes JSON predates shuttle-in-teleop (optional). */
  shuttleRow?: ScoutingRowShuttleMeta;
  className?: string;
  compact?: boolean;
}

export function ScoutingRunsBreakdown({ notes, shuttleRow, className, compact }: ScoutingRunsBreakdownProps) {
  const { auto, teleop, shuttle, autoClimbPts, teleopClimbPts, estimatedTotal } = getRunsForDisplay(notes);
  const teleopMeta = parseNotes(notes, shuttleRow).teleop;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Auto runs */}
      <div>
        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5" /> Autonomous fuel runs
        </h4>
        {auto.length > 0 ? (
          <ul className={compact ? 'space-y-1' : 'space-y-2'}>
            {auto.map((run, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-center justify-between text-sm',
                  compact ? 'py-1 px-2 rounded bg-white/5' : 'py-2 px-3 rounded-lg bg-white/5 border border-white/5'
                )}
              >
                <span className="font-mono text-muted-foreground">
                  Run {i + 1}: {formatDurationSec(run.duration_sec)}
                </span>
                <span className="text-foreground font-medium">{run.ballLabel} balls</span>
                <span className="text-blue-400 font-bold">→ {run.estPts} pts</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No auto runs recorded</p>
        )}
        {autoClimbPts > 0 && (
          <p className={cn('text-xs text-green-400 mt-1', compact ? 'mt-1' : 'mt-2')}>
            <Award className="w-3 h-3 inline mr-1" /> Auto climb L1: +{autoClimbPts} pts
          </p>
        )}
      </div>

      {/* Teleop runs */}
      <div>
        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2 mb-2">
          <Target className="w-3.5 h-3.5" /> Teleop fuel runs
        </h4>
        {teleop.length > 0 ? (
          <ul className={compact ? 'space-y-1' : 'space-y-2'}>
            {teleop.map((run, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-center justify-between text-sm',
                  compact ? 'py-1 px-2 rounded bg-white/5' : 'py-2 px-3 rounded-lg bg-white/5 border border-white/5'
                )}
              >
                <span className="font-mono text-muted-foreground">
                  Run {i + 1}: {formatDurationSec(run.duration_sec)}
                </span>
                <span className="text-foreground font-medium">{run.ballLabel} balls</span>
                <span className="text-orange-400 font-bold">→ {run.estPts} pts</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No teleop runs recorded</p>
        )}
      </div>

      {/* Shuttle runs */}
      <div>
        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5" /> Shuttling runs
        </h4>
        {shuttle && shuttle.length > 0 ? (
          <ul className={compact ? 'space-y-1' : 'space-y-2'}>
            {shuttle.map((run, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-center justify-between text-sm',
                  compact ? 'py-1 px-2 rounded bg-white/5' : 'py-2 px-3 rounded-lg bg-white/5 border border-white/5'
                )}
              >
                <span className="font-mono text-muted-foreground">
                  Run {i + 1}: {formatDurationSec(run.duration_sec)}
                </span>
                <span className="text-foreground font-medium">{run.ballLabel} balls</span>
                <span className="text-amber-400 font-bold italic">SHUTTLE</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No shuttle runs recorded</p>
        )}
        {teleopClimbPts > 0 && (
          <p className={cn('text-xs text-green-400 mt-1', compact ? 'mt-1' : 'mt-2')}>
            <Award className="w-3 h-3 inline mr-1" /> Climb: +{teleopClimbPts} pts
          </p>
        )}
        {(teleopMeta.shuttle === true || teleopMeta.shuttle === false) && (
          <div
            className={cn(
              'mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs',
              compact ? 'mt-1' : 'mt-3'
            )}
          >
            <span className="font-bold text-amber-400/90 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 shrink-0" /> Shuttle
            </span>
            <span className="text-foreground">
              Robot shuttles: <strong>{teleopMeta.shuttle ? 'Yes' : 'No'}</strong>
            </span>
            {teleopMeta.shuttle && teleopMeta.shuttle_consistency && (
              <span className="text-foreground">
                Consistency:{' '}
                <strong className="capitalize">{teleopMeta.shuttle_consistency}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-white/10">
        <p className="text-xs font-bold text-foreground">
          Estimated score (2026): <span className="text-primary">{estimatedTotal}</span> pts
        </p>
      </div>
    </div>
  );
}
