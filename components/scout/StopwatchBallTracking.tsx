import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui';
import { RunRecord, type BallTrackingPhase } from '@/lib/types';
import { formatDurationSec } from '@/lib/utils';
import { Play, Square, Clock, List } from 'lucide-react';

interface StopwatchBallTrackingProps {
  phaseLabel: string;
  phaseDescription: string;
  initialData?: RunRecord[] | null;
  onComplete?: (runs: RunRecord[]) => void;
  onRunsChange?: (runs: RunRecord[]) => void;
  onBack?: () => void;
  isDarkMode?: boolean;
  hideNextButton?: boolean;
}

export default function StopwatchBallTracking({
  phaseLabel,
  phaseDescription,
  initialData,
  onComplete,
  onRunsChange,
  onBack,
  isDarkMode = true,
  hideNextButton = false,
}: StopwatchBallTrackingProps) {
  const [runs, setRuns] = useState<RunRecord[]>(() => initialData?.length ? [...initialData] : []);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 10);
    return () => clearInterval(id);
  }, [running]);

  const handleStart = useCallback(() => {
    setElapsedMs(0);
    setRunning(true);
  }, []);

  const handleStop = useCallback(() => {
    setRunning(false);
    const newRun = { duration_sec: Math.round((elapsedMs / 1000) * 1000) / 1000, ball_choice: 0 };
    setRuns(prev => {
      const next = [...prev, newRun];
      onRunsChange?.(next);
      return next;
    });
    setElapsedMs(0);
  }, [elapsedMs, onRunsChange]);

  const handleRemoveRun = useCallback((index: number) => {
    setRuns(prev => {
      const next = prev.filter((_, i) => i !== index);
      onRunsChange?.(next);
      return next;
    });
  }, [onRunsChange]);

  const handleNext = useCallback(() => {
    onComplete?.(runs);
  }, [runs, onComplete]);

  const updateRunsInternal = useCallback((newRuns: RunRecord[]) => {
    setRuns(newRuns);
    onRunsChange?.(newRuns);
  }, [onRunsChange]);

  const durationSec = running ? elapsedMs / 1000 : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl font-bold">{phaseLabel}</CardTitle>
        </div>
        <CardDescription>{phaseDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stopwatch */}
        <div className={`rounded-xl p-6 text-center ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-muted/50 border border-border'}`}>
          <div className={`text-4xl font-mono font-bold tabular-nums ${isDarkMode ? 'text-white' : 'text-foreground'}`}>
            {formatDurationSec(durationSec)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">seconds (with milliseconds)</p>
          <div className="flex justify-center gap-3 mt-4">
            {!running ? (
              <Button type="button" onClick={handleStart} className="gap-2">
                <Play className="w-4 h-4" /> Start
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={handleStop} className="gap-2">
                <Square className="w-4 h-4" /> Stop
              </Button>
            )}
          </div>
        </div>

        {/* List of saved runs */}
        {runs.length > 0 && (
          <div className="space-y-2">
            <h3 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-foreground'}`}>
              <List className="w-4 h-4" /> Saved runs ({runs.length})
            </h3>
            <ul className="space-y-2">
              {runs.map((run, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}
                >
                  <span>
                    Run {i + 1}: <strong>{formatDurationSec(run.duration_sec)}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveRun(i)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {!hideNextButton && (
          <div className="flex justify-between pt-4">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              className={onBack ? '' : 'ml-auto'}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
