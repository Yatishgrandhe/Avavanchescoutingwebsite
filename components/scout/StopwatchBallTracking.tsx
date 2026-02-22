import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui';
import { RunRecord, BALL_CHOICE_OPTIONS, type BallTrackingPhase } from '@/lib/types';
import { Play, Square, Clock, Plus, List } from 'lucide-react';

interface StopwatchBallTrackingProps {
  phaseLabel: string;
  phaseDescription: string;
  initialData?: Partial<BallTrackingPhase> | null;
  onComplete: (data: BallTrackingPhase) => void;
  onBack?: () => void;
  isDarkMode?: boolean;
}

export default function StopwatchBallTracking({
  phaseLabel,
  phaseDescription,
  initialData,
  onComplete,
  onBack,
  isDarkMode = true,
}: StopwatchBallTrackingProps) {
  const [runs, setRuns] = useState<RunRecord[]>(() => initialData?.runs?.length ? [...initialData.runs] : []);
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const start = Date.now() - elapsedSec * 1000;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [running, elapsedSec]);

  const handleStart = useCallback(() => {
    setRunning(true);
    setSelectedChoice(null);
  }, []);

  const handleStop = useCallback(() => {
    setRunning(false);
  }, []);

  const handleSaveRun = useCallback(() => {
    if (selectedChoice == null || selectedChoice < 0 || selectedChoice >= BALL_CHOICE_OPTIONS.length) return;
    setRuns(prev => [...prev, { duration_sec: elapsedSec, ball_choice: selectedChoice }]);
    setElapsedSec(0);
    setSelectedChoice(null);
  }, [elapsedSec, selectedChoice]);

  const handleRemoveRun = useCallback((index: number) => {
    setRuns(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleNext = useCallback(() => {
    onComplete({ runs });
  }, [runs, onComplete]);

  const duration = running ? elapsedSec : 0;
  const stoppedWithNoChoice = !running && elapsedSec > 0 && selectedChoice === null;

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
            {String(Math.floor(duration / 60)).padStart(2, '0')}:
            {String(duration % 60).padStart(2, '0')}
          </div>
          <p className="text-sm text-muted-foreground mt-1">seconds</p>
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

        {/* After stop: multiple choice for "How many balls in this run?" */}
        {!running && elapsedSec > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-foreground'}`}>
              How many balls in this run? (pick one)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BALL_CHOICE_OPTIONS.map((opt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedChoice(index)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    selectedChoice === index
                      ? 'border-primary bg-primary/20 text-primary'
                      : isDarkMode
                        ? 'border-white/20 bg-white/5 text-white hover:border-white/40'
                        : 'border-border bg-muted/50 hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              onClick={handleSaveRun}
              disabled={selectedChoice === null}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" /> Save this run
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              After saving you can start another run, or click Next below when done.
            </p>
          </motion.div>
        )}

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
                    Run {i + 1}: <strong>{run.duration_sec}s</strong> — {BALL_CHOICE_OPTIONS[run.ball_choice]?.label ?? run.ball_choice} balls
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
      </CardContent>
    </Card>
  );
}
