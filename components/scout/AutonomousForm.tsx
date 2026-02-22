import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui';
import { BallTrackingPhase } from '@/lib/types';
import { Play } from 'lucide-react';
import StopwatchBallTracking from './StopwatchBallTracking';

interface AutonomousFormProps {
  onNext: (autonomousData: Partial<BallTrackingPhase> & { auto_fuel_active_hub?: number }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<BallTrackingPhase> & { auto_fuel_active_hub?: number };
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleComplete = (data: BallTrackingPhase) => {
    const totalBalls = data.balls_0_15 + data.balls_15_30 + data.balls_30_45
      + data.balls_45_60 + data.balls_60_75 + data.balls_75_90;
    onNext({
      ...data,
      auto_fuel_active_hub: totalBalls,
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

        <StopwatchBallTracking
          phaseLabel="Autonomous Period"
          phaseDescription="Start the stopwatch when auto begins; stop when it ends. Then enter balls scored in each 15-second range."
          initialData={initialData}
          onComplete={handleComplete}
          onBack={onBack}
          isDarkMode={isDarkMode}
          requireBallsAfterStop={true}
        />
      </Card>
    </motion.div>
  );
};

export default AutonomousForm;
