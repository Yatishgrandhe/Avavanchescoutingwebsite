import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui';
import { BallTrackingPhase, getBallChoiceScoreFromRange, RunRecord } from '@/lib/types';
import StopwatchBallTracking from './StopwatchBallTracking';

interface AutonomousFormProps {
  onNext: (autonomousData: BallTrackingPhase & { auto_fuel_active_hub?: number }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<BallTrackingPhase> & { auto_fuel_active_hub?: number };
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep: _currentStep,
  totalSteps: _totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const handleComplete = (runs: RunRecord[]) => {
    const totalFuel = (runs || []).reduce(
      (sum, r) => sum + getBallChoiceScoreFromRange(r.ball_choice),
      0
    );
    onNext({
      runs,
      auto_fuel_active_hub: Math.round(totalFuel * 10) / 10,
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
