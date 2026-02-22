import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
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
  const [showBallChoicePopup, setShowBallChoicePopup] = useState(false);
  const [pendingDuration, setPendingDuration] = useState(0);

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
    setShowBallChoicePopup(false);
  }, []);

  const handleStop = useCallback(() => {
    setRunning(false);
    setPendingDuration(elapsedSec);
    setSelectedChoice(null);
    setShowBallChoicePopup(true);
  }, [elapsedSec]);

  const handleSaveRun = useCallback(() => {
    if (selectedChoice == null || selectedChoice < 0 || selectedChoice >= BALL_CHOICE_OPTIONS.length) return;
    setRuns(prev => [...prev, { duration_sec: pendingDuration, ball_choice: selectedChoice }]);
    setElapsedSec(0);
    setPendingDuration(0);
    setSelectedChoice(null);
    setShowBallChoicePopup(false);
  }, [pendingDuration, selectedChoice]);

  const handleClosePopup = useCallback(() => {
    setShowBallChoicePopup(false);
    setSelectedChoice(null);
    setPendingDuration(0);
    setElapsedSec(0);
  }, []);

  const handleRemoveRun = useCallback((index: number) => {
    setRuns(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleNext = useCallback(() => {
    onComplete({ runs });
  }, [runs, onComplete]);

  const duration = running ? elapsedSec : 0;

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

        {/* Popup: multiple choice for ball count when run ends */}
        <Dialog open={showBallChoicePopup} onOpenChange={(open) => !open && handleClosePopup()}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>How many balls scored?</DialogTitle>
              <DialogDescription>
                Run ended at <strong>{pendingDuration}s</strong>. Pick the ball count for this run.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
              {BALL_CHOICE_OPTIONS.map((opt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedChoice(index)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    selectedChoice === index
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-border bg-muted/50 hover:border-primary/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClosePopup}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveRun} disabled={selectedChoice === null} className="gap-2">
                <Plus className="w-4 h-4" /> Save this run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
