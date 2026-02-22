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
        <div className="px-6 pt-6">
          <div className={`w-full rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Step {currentStep} of {totalSteps}
            </span>
            <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
        </div>

        <CardContent className="space-y-4 pt-4">
          <div className={`rounded-xl p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center space-x-3 pb-2 border-b border-border/50">
              <Award className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-foreground'}`}>Auto climb (optional)</h3>
            </div>
            <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-colors mt-3 ${
              autoTowerLevel1 ? 'bg-primary/20 border-primary/50' : isDarkMode ? 'bg-white/5 border-transparent' : 'bg-muted/30 border-transparent'
            }`}>
              <span className="font-medium">L1 Climb</span>
              <span className="text-sm text-muted-foreground">+15 pts</span>
              <input
                type="checkbox"
                checked={autoTowerLevel1}
                onChange={(e) => setAutoTowerLevel1(e.target.checked)}
                className="rounded"
              />
            </label>
          </div>
          <StopwatchBallTracking
            phaseLabel="Autonomous Period"
            phaseDescription="Start the stopwatch when a run begins; stop when it ends. Pick how many balls scored in that run. You can add multiple runs."
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

export default AutonomousForm;
