import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '../ui';
import { BallTrackingPhase, getBallChoiceScoreFromRange, type ScoringNotes, RunRecord } from '@/lib/types';
import { cn } from '@/lib/utils';
import StopwatchBallTracking from './StopwatchBallTracking';
import { normalizeShuttleConsistency } from '@/lib/scouting-notes-merge';

interface TeleopFormProps {
  onNext: (
    teleopData: Partial<ScoringNotes> &
      BallTrackingPhase & {
        shuttle?: boolean;
        shuttle_consistency?: 'consistent' | 'inconsistent';
        shuttle_runs?: RunRecord[];
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

  const progressPercentage = (currentStep / totalSteps) * 100;

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
