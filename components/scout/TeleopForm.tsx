import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '../ui';
import { BallTrackingPhase, getBallChoiceScoreFromRange, type ScoringNotes, RunRecord } from '@/lib/types';
import { cn, formatDurationSec } from '@/lib/utils';
import StopwatchBallTracking from './StopwatchBallTracking';
import { normalizeShuttleConsistency } from '@/lib/scouting-notes-merge';
import { Clock, Play, Square } from 'lucide-react';

interface TeleopFormProps {
  onNext: (
    teleopData: Partial<ScoringNotes> &
      BallTrackingPhase & {
        shuttle?: boolean;
        shuttle_consistency?: 'consistent' | 'inconsistent';
        shuttle_runs?: RunRecord[];
        teleop_climb?: boolean;
        teleop_climb_level?: 'L1' | 'L2' | 'L3';
        climb_sec?: number;
      }
  ) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<ScoringNotes> & Partial<BallTrackingPhase>;
}

const TeleopForm: React.FC<TeleopFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  // Ball tracking runs
  const [fuelRuns, setFuelRuns] = useState<RunRecord[]>(() => initialData?.runs || []);
  const [shuttle, setShuttle] = useState(initialData?.shuttle === true);
  const [shuttleConsistency, setShuttleConsistency] = useState<'consistent' | 'inconsistent'>(
    initialData?.shuttle_consistency === 'inconsistent' ? 'inconsistent' : 'consistent'
  );
  const [shuttleRuns, setShuttleRuns] = useState<RunRecord[]>(() => initialData?.shuttle_runs || []);
  const [teleopClimb, setTeleopClimb] = useState<boolean>(
    initialData?.teleop_climb === true || Boolean(initialData?.teleop_tower_level1 || initialData?.teleop_tower_level2 || initialData?.teleop_tower_level3)
  );
  const [teleopClimbLevel, setTeleopClimbLevel] = useState<'L1' | 'L2' | 'L3'>(
    initialData?.teleop_climb_level ||
      (initialData?.teleop_tower_level3 ? 'L3' : initialData?.teleop_tower_level2 ? 'L2' : 'L1')
  );
  const [climbTimerRunning, setClimbTimerRunning] = useState(false);
  const [climbElapsedMs, setClimbElapsedMs] = useState(0);
  const [climbSec, setClimbSec] = useState<number | null>(
    initialData?.climb_sec != null && !Number.isNaN(Number(initialData.climb_sec))
      ? Number(initialData.climb_sec)
      : null
  );

  const progressPercentage = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (!climbTimerRunning) return;
    const start = Date.now();
    const id = setInterval(() => {
      setClimbElapsedMs(Date.now() - start);
    }, 10);
    return () => clearInterval(id);
  }, [climbTimerRunning]);

  const handleComplete = () => {
    const totalFuel = (fuelRuns || []).reduce(
      (sum, r) => sum + getBallChoiceScoreFromRange(r.ball_choice),
      0
    );
    onNext({
      runs: fuelRuns,
      teleop_fuel_active_hub: Math.round(totalFuel * 10) / 10,
      teleop_fuel_shifts: (fuelRuns || []).map(r => getBallChoiceScoreFromRange(r.ball_choice)),
      shuttle,
      shuttle_consistency: shuttle ? normalizeShuttleConsistency(shuttleConsistency) : undefined,
      shuttle_runs: shuttle ? shuttleRuns : [],
      teleop_climb: teleopClimb,
      teleop_climb_level: teleopClimb ? teleopClimbLevel : undefined,
      climb_sec: teleopClimb ? (climbSec ?? undefined) : undefined,
      teleop_tower_level1: teleopClimb && teleopClimbLevel === 'L1',
      teleop_tower_level2: teleopClimb && teleopClimbLevel === 'L2',
      teleop_tower_level3: teleopClimb && teleopClimbLevel === 'L3',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto min-h-[500px]"
    >
      <Card className="bg-card border-border shadow-lg">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="pt-2 space-y-6">
            <StopwatchBallTracking
              phaseLabel="Teleop Fuel"
              phaseDescription="Track scoring run timing"
              initialData={fuelRuns}
              onRunsChange={setFuelRuns}
              hideNextButton={true}
              isDarkMode={isDarkMode}
            />

            <div className={`rounded-xl p-3 sm:p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Teleop Shuttling</h3>
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 h-[38px] w-[180px]">
                  <button
                    type="button"
                    onClick={() => setShuttle(true)}
                    className={cn(
                      'flex-1 rounded-lg text-[11px] font-bold transition-all',
                      shuttle ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-white/5'
                    )}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setShuttle(false)}
                    className={cn(
                      'flex-1 rounded-lg text-[11px] font-bold transition-all',
                      !shuttle ? 'bg-white/15 text-white' : 'text-muted-foreground hover:bg-white/5'
                    )}
                  >
                    NO
                  </button>
                </div>
              </div>

              {shuttle && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(['consistent', 'inconsistent'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setShuttleConsistency(option)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-[11px] font-bold border transition-all uppercase tracking-wider',
                          shuttleConsistency === option
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <StopwatchBallTracking
                    phaseLabel="Shuttling"
                    phaseDescription="Track shuttling run timing"
                    initialData={shuttleRuns}
                    onRunsChange={setShuttleRuns}
                    hideNextButton={true}
                    isDarkMode={isDarkMode}
                  />
                </div>
              )}
            </div>

            <div className={`rounded-xl p-3 sm:p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary">Teleop Climb</h3>
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 h-[38px] w-[180px]">
                  <button
                    type="button"
                    onClick={() => setTeleopClimb(true)}
                    className={cn(
                      'flex-1 rounded-lg text-[11px] font-bold transition-all',
                      teleopClimb ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-white/5'
                    )}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeleopClimb(false)}
                    className={cn(
                      'flex-1 rounded-lg text-[11px] font-bold transition-all',
                      !teleopClimb ? 'bg-white/15 text-white' : 'text-muted-foreground hover:bg-white/5'
                    )}
                  >
                    NO
                  </button>
                </div>
              </div>

              {teleopClimb && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(['L1', 'L2', 'L3'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTeleopClimbLevel(level)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-[11px] font-bold border transition-all uppercase tracking-wider',
                          teleopClimbLevel === level
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
                        : climbSec != null
                          ? formatDurationSec(climbSec)
                          : '0.000s'}
                    </div>
                    <div className="flex gap-2">
                      {!climbTimerRunning ? (
                        <Button
                          type="button"
                          onClick={() => {
                            setClimbElapsedMs(0);
                            setClimbTimerRunning(true);
                          }}
                          size="sm"
                          className="gap-2"
                        >
                          <Play className="w-4 h-4" /> Start
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            setClimbTimerRunning(false);
                            setClimbSec(Math.round((climbElapsedMs / 1000) * 1000) / 1000);
                            setClimbElapsedMs(0);
                          }}
                          size="sm"
                          className="gap-2"
                        >
                          <Square className="w-4 h-4" /> Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                Previous
              </Button>
              <Button type="button" onClick={handleComplete}>
                Next Step
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeleopForm;
