import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui';
import { BallTrackingPhase, BALL_RANGES, SCORING_VALUES, type ScoringNotes } from '@/lib/types';
import { Fuel, TrendingUp, CheckCircle, ArrowLeft, ArrowRight, Trophy } from 'lucide-react';
import StopwatchBallTracking from './StopwatchBallTracking';

interface TeleopFormProps {
  onNext: (teleopData: Partial<ScoringNotes> & Partial<BallTrackingPhase>) => void;
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
  const [towerLevel1, setTowerLevel1] = useState(!!initialData?.teleop_tower_level1);
  const [towerLevel2, setTowerLevel2] = useState(!!initialData?.teleop_tower_level2);
  const [towerLevel3, setTowerLevel3] = useState(!!initialData?.teleop_tower_level3);

  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleComplete = (data: BallTrackingPhase) => {
    const totalBalls = data.balls_0_15 + data.balls_15_30 + data.balls_30_45
      + data.balls_45_60 + data.balls_60_75 + data.balls_75_90;
    const shifts = [data.balls_0_15, data.balls_15_30, data.balls_30_45, data.balls_45_60, data.balls_60_75, data.balls_75_90];
    let climbPoints = 0;
    if (towerLevel3) climbPoints = SCORING_VALUES.teleop_tower_level3;
    else if (towerLevel2) climbPoints = SCORING_VALUES.teleop_tower_level2;
    else if (towerLevel1) climbPoints = SCORING_VALUES.teleop_tower_level1;

    onNext({
      ...data,
      teleop_fuel_active_hub: totalBalls,
      teleop_fuel_shifts: shifts,
      teleop_tower_level1: towerLevel1,
      teleop_tower_level2: towerLevel2,
      teleop_tower_level3: towerLevel3,
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
            <div className="grid grid-cols-1 gap-2 mt-3">
              {[
                { id: 'teleop_tower_level1', label: 'LEVEL 1', pts: SCORING_VALUES.teleop_tower_level1, set: setTowerLevel1, val: towerLevel1 },
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
                        if (level.id === 'teleop_tower_level1') { setTowerLevel2(false); setTowerLevel3(false); }
                        if (level.id === 'teleop_tower_level2') { setTowerLevel1(false); setTowerLevel3(false); }
                        if (level.id === 'teleop_tower_level3') { setTowerLevel1(false); setTowerLevel2(false); }
                      }
                    }}
                    className="rounded"
                  />
                </label>
              ))}
            </div>
          </div>

          <StopwatchBallTracking
            phaseLabel="Teleop Period"
            phaseDescription="Start when teleop begins; stop when it ends. Then enter balls scored in each 15-second range."
            initialData={initialData}
            onComplete={handleComplete}
            onBack={onBack}
            isDarkMode={isDarkMode}
            requireBallsAfterStop={true}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeleopForm;
