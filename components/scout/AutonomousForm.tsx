import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '../ui';
import { BallTrackingPhase, getBallChoiceScoreFromRange, RunRecord } from '@/lib/types';
import StopwatchBallTracking from './StopwatchBallTracking';
import { Clock, Play, Square } from 'lucide-react';
import { cn, formatDurationSec } from '@/lib/utils';

interface AutonomousFormProps {
  onNext: (
    autonomousData: BallTrackingPhase & {
      auto_fuel_active_hub?: number;
      auto_climb?: boolean;
      auto_climb_level?: 'L1' | 'L2' | 'L3';
      auto_climb_sec?: number;
      auto_tower_level1?: boolean;
    }
  ) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<BallTrackingPhase> & {
    auto_fuel_active_hub?: number;
    auto_climb?: boolean;
    auto_climb_level?: 'L1' | 'L2' | 'L3';
    auto_climb_sec?: number | null;
    auto_tower_level1?: boolean;
  };
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep: _currentStep,
  totalSteps: _totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const [autoClimb, setAutoClimb] = useState<boolean>(initialData?.auto_climb === true || Boolean(initialData?.auto_tower_level1));
  const [autoClimbLevel, setAutoClimbLevel] = useState<'L1' | 'L2' | 'L3'>(
    initialData?.auto_climb_level || (initialData?.auto_tower_level1 ? 'L1' : 'L1')
  );
  const [climbTimerRunning, setClimbTimerRunning] = useState(false);
  const [climbElapsedMs, setClimbElapsedMs] = useState(0);
  const [autoClimbSec, setAutoClimbSec] = useState<number | null>(
    initialData?.auto_climb_sec != null && !Number.isNaN(Number(initialData.auto_climb_sec))
      ? Number(initialData.auto_climb_sec)
      : null
  );

  useEffect(() => {
    if (!climbTimerRunning) return;
    const start = Date.now();
    const id = setInterval(() => {
      setClimbElapsedMs(Date.now() - start);
    }, 10);
    return () => clearInterval(id);
  }, [climbTimerRunning]);

  const handleClimbTimerStart = useCallback(() => {
    setClimbElapsedMs(0);
    setClimbTimerRunning(true);
  }, []);

  const handleClimbTimerStop = useCallback(() => {
    setClimbTimerRunning(false);
    setAutoClimbSec(Math.round((climbElapsedMs / 1000) * 1000) / 1000);
    setClimbElapsedMs(0);
  }, [climbElapsedMs]);

  const handleComplete = (runs: RunRecord[]) => {
    const totalFuel = (runs || []).reduce(
      (sum, r) => sum + getBallChoiceScoreFromRange(r.ball_choice),
      0
    );
    onNext({
      runs,
      auto_fuel_active_hub: Math.round(totalFuel * 10) / 10,
      auto_climb: autoClimb,
      auto_climb_level: autoClimb ? autoClimbLevel : undefined,
      auto_climb_sec: autoClimb ? (autoClimbSec ?? undefined) : undefined,
      auto_tower_level1: autoClimb && autoClimbLevel === 'L1',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto min-h-[500px]"
    >
      <Card className="bg-card border-border">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className={`rounded-xl p-3 sm:p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-primary mb-3">Auto Climb</h3>
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 h-[38px] w-[180px]">
              <button
                type="button"
                onClick={() => setAutoClimb(true)}
                className={cn(
                  'flex-1 rounded-lg text-[11px] font-bold transition-all',
                  autoClimb ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-white/5'
                )}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setAutoClimb(false)}
                className={cn(
                  'flex-1 rounded-lg text-[11px] font-bold transition-all',
                  !autoClimb ? 'bg-white/15 text-white' : 'text-muted-foreground hover:bg-white/5'
                )}
              >
                NO
              </button>
            </div>

            {autoClimb && (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(['L1', 'L2', 'L3'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAutoClimbLevel(level)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-[11px] font-bold border transition-all uppercase tracking-wider',
                        autoClimbLevel === level
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl p-4 border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    Climb timer
                  </div>
                  <div className="font-mono text-lg mb-3">
                    {climbTimerRunning
                      ? formatDurationSec(climbElapsedMs / 1000)
                      : autoClimbSec != null
                        ? formatDurationSec(autoClimbSec)
                        : '0.000s'}
                  </div>
                  <div className="flex gap-2">
                    {!climbTimerRunning ? (
                      <Button type="button" onClick={handleClimbTimerStart} size="sm" className="gap-2">
                        <Play className="w-4 h-4" /> Start
                      </Button>
                    ) : (
                      <Button type="button" variant="destructive" onClick={handleClimbTimerStop} size="sm" className="gap-2">
                        <Square className="w-4 h-4" /> Stop
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="pt-2">
            <StopwatchBallTracking
              phaseLabel="Auto Fuel"
              phaseDescription="Track scoring run timing during autonomous"
              initialData={initialData?.runs}
              onComplete={handleComplete}
              onBack={onBack}
              isDarkMode={isDarkMode}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AutonomousForm;
