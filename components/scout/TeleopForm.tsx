import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '../ui';
import { BallTrackingPhase, BALL_CHOICE_OPTIONS, SCORING_VALUES, type ScoringNotes } from '@/lib/types';
import { TrendingUp, CheckCircle, Award } from 'lucide-react';
import StopwatchBallTracking from './StopwatchBallTracking';

interface TeleopFormProps {
  onNext: (teleopData: Partial<ScoringNotes> & BallTrackingPhase & { climb_sec?: number }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<ScoringNotes> & Partial<BallTrackingPhase> & { climb_sec?: number | null };
}

const TeleopForm: React.FC<TeleopFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const [towerLevel2, setTowerLevel2] = useState(!!initialData?.teleop_tower_level2);
  const [towerLevel3, setTowerLevel3] = useState(!!initialData?.teleop_tower_level3);
  const [climbSec, setClimbSec] = useState<number | ''>(initialData?.climb_sec != null ? Number(initialData.climb_sec) : '');

  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleComplete = (data: BallTrackingPhase) => {
    const totalFuel = (data.runs ?? []).reduce(
      (sum, r) => sum + (BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0),
      0
    );
    onNext({
      ...data,
      teleop_fuel_active_hub: Math.round(totalFuel * 10) / 10,
      teleop_fuel_shifts: (data.runs ?? []).map(r => BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0),
      teleop_tower_level1: false,
      teleop_tower_level2: towerLevel2,
      teleop_tower_level3: towerLevel3,
      climb_sec: climbSec !== '' && !Number.isNaN(Number(climbSec)) ? Number(climbSec) : undefined,
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
        <div className="px-6 pt-6">
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full"
            />
          </div>
        </div>

        <CardContent className="space-y-6">
          {/* TOWER Climb (optional) – first so user can set before clicking Next */}
          <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center space-x-3 pb-2 border-b border-border/50">
              <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-foreground'}`}>TOWER Climb (optional)</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Only L2 and L3 (no L1 in teleop). One climb per match.</p>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {[
                { id: 'teleop_tower_level2', label: 'LEVEL 2', pts: SCORING_VALUES.teleop_tower_level2, set: setTowerLevel2, val: towerLevel2 },
                { id: 'teleop_tower_level3', label: 'LEVEL 3', pts: SCORING_VALUES.teleop_tower_level3, set: setTowerLevel3, val: towerLevel3 },
              ].map((level) => (
                <label
                  key={level.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                    level.val ? 'bg-primary/20 border-primary/50' : isDarkMode ? 'bg-white/5 border-transparent' : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <span className="font-medium">{level.label}</span>
                  <span className="text-sm text-muted-foreground">+{level.pts} pts</span>
                  <input
                    type="checkbox"
                    checked={level.val}
                    onChange={(e) => {
                      level.set(e.target.checked);
                      if (e.target.checked) {
                        if (level.id === 'teleop_tower_level2') setTowerLevel3(false);
                        if (level.id === 'teleop_tower_level3') setTowerLevel2(false);
                      }
                    }}
                    className="rounded"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Climb time (sec) — for CLANK speed adjustment</label>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                placeholder="e.g. 3"
                value={climbSec === '' ? '' : climbSec}
                onChange={(e) => setClimbSec(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className={`w-24 px-2 py-1.5 rounded border text-sm ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}
              />
              <span className="text-[10px] text-muted-foreground ml-2">+2 if ≤3s, -2 if &gt;6s</span>
            </div>
          </div>

          <StopwatchBallTracking
            phaseLabel="Teleop Period"
            phaseDescription="Start the stopwatch for each run; stop when it ends. Pick how many balls scored in that run. You can add multiple runs."
            initialData={initialData}
            onComplete={handleComplete}
            onBack={onBack}
            isDarkMode={isDarkMode}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeleopForm;
