import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui';
import { BallTrackingPhase, BALL_CHOICE_OPTIONS } from '@/lib/types';
import { Award } from 'lucide-react';
import StopwatchBallTracking from './StopwatchBallTracking';

interface AutonomousFormProps {
  onNext: (autonomousData: BallTrackingPhase & { auto_fuel_active_hub?: number; auto_tower_level1?: boolean }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<BallTrackingPhase> & { auto_fuel_active_hub?: number; auto_tower_level1?: boolean };
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const [autoTowerLevel1, setAutoTowerLevel1] = useState(!!initialData?.auto_tower_level1);
  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleComplete = (data: BallTrackingPhase) => {
    const totalFuel = (data.runs ?? []).reduce(
      (sum, r) => sum + (BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0),
      0
    );
    onNext({
      ...data,
      auto_fuel_active_hub: Math.round(totalFuel * 10) / 10,
      auto_tower_level1: autoTowerLevel1,
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
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Auto climb</h3>
            </div>
            <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-all mt-3 ${autoTowerLevel1 ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/5'
              }`}>
              <div className="flex flex-col">
                <span className="text-sm font-bold">L1 CLIMB</span>
                <span className="text-[10px] text-muted-foreground uppercase">+15 points</span>
              </div>
              <input
                type="checkbox"
                checked={autoTowerLevel1}
                onChange={(e) => setAutoTowerLevel1(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
            </label>
          </div>

          <div className="pt-2">
            <StopwatchBallTracking
              phaseLabel="Auto Fuel"
              phaseDescription="Track scoring runs during autonomous"
              initialData={initialData}
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
