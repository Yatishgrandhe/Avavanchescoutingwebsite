import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui';
import { BALL_RANGES, type BallTrackingPhase } from '@/lib/types';
import { Play, Square, Clock } from 'lucide-react';

const DEFAULT_PHASE: BallTrackingPhase = {
  duration_sec: null,
  balls_0_15: 0,
  balls_15_30: 0,
  balls_30_45: 0,
  balls_45_60: 0,
  balls_60_75: 0,
  balls_75_90: 0,
};

interface StopwatchBallTrackingProps {
  phaseLabel: string;
  phaseDescription: string;
  initialData?: Partial<BallTrackingPhase> | null;
  onComplete: (data: BallTrackingPhase) => void;
  onBack?: () => void;
  isDarkMode?: boolean;
  /** If true, show "Next" only after stopwatch is stopped and ball counts entered. */
  requireBallsAfterStop?: boolean;
}

export default function StopwatchBallTracking({
  phaseLabel,
  phaseDescription,
  initialData,
  onComplete,
  onBack,
  isDarkMode = true,
  requireBallsAfterStop = true,
}: StopwatchBallTrackingProps) {
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [stoppedDuration, setStoppedDuration] = useState<number | null>(
    initialData?.duration_sec ?? null
  );
  const [balls, setBalls] = useState<BallTrackingPhase>(() => ({
    ...DEFAULT_PHASE,
    duration_sec: initialData?.duration_sec ?? null,
    balls_0_15: initialData?.balls_0_15 ?? 0,
    balls_15_30: initialData?.balls_15_30 ?? 0,
    balls_30_45: initialData?.balls_30_45 ?? 0,
    balls_45_60: initialData?.balls_45_60 ?? 0,
    balls_60_75: initialData?.balls_60_75 ?? 0,
    balls_75_90: initialData?.balls_75_90 ?? 0,
  }));

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
    setStoppedDuration(null);
  }, []);

  const handleStop = useCallback(() => {
    setRunning(false);
    setStoppedDuration(elapsedSec);
    setBalls(prev => ({ ...prev, duration_sec: elapsedSec }));
  }, [elapsedSec]);

  const handleBallChange = (key: keyof BallTrackingPhase, value: number) => {
    if (key === 'duration_sec') return;
    setBalls(prev => ({ ...prev, [key]: Math.max(0, value) }));
  };

  const handleSubmit = () => {
    const payload: BallTrackingPhase = {
      duration_sec: stoppedDuration ?? elapsedSec,
      balls_0_15: balls.balls_0_15,
      balls_15_30: balls.balls_15_30,
      balls_30_45: balls.balls_30_45,
      balls_45_60: balls.balls_45_60,
      balls_60_75: balls.balls_60_75,
      balls_75_90: balls.balls_75_90,
    };
    onComplete(payload);
  };

  const totalBalls = balls.balls_0_15 + balls.balls_15_30 + balls.balls_30_45
    + balls.balls_45_60 + balls.balls_60_75 + balls.balls_75_90;
  const duration = stoppedDuration ?? (running ? elapsedSec : 0);
  const canSubmit = (stoppedDuration != null || !requireBallsAfterStop) && true;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Clock className={`w-6 h-6 ${isDarkMode ? 'text-primary' : 'text-primary'}`} />
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
              <Button
                type="button"
                onClick={handleStart}
                className="gap-2"
              >
                <Play className="w-4 h-4" /> Start
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={handleStop}
                className="gap-2"
              >
                <Square className="w-4 h-4" /> Stop
              </Button>
            )}
          </div>
        </div>

        {/* Ball ranges (shown after stop or when duration already set) */}
        {(stoppedDuration != null || (initialData?.duration_sec != null && !running)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-foreground'}`}>
              Balls scored per time range (15s increments)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {BALL_RANGES.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={balls[key as keyof BallTrackingPhase] ?? 0}
                    onChange={(e) => handleBallChange(key as keyof BallTrackingPhase, parseInt(e.target.value, 10) || 0)}
                    className={`w-full rounded-lg border px-3 py-2 text-center font-mono text-lg bg-background ${isDarkMode ? 'border-white/20 text-white' : 'border-border text-foreground'}`}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Total balls: <span className="font-bold text-foreground">{totalBalls}</span>
            </p>
          </motion.div>
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
            onClick={handleSubmit}
            disabled={requireBallsAfterStop && stoppedDuration == null && !initialData?.duration_sec}
            className={onBack ? '' : 'ml-auto'}
          >
            {onBack ? 'Next' : 'Done'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
