import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui';
import { BallTrackingPhase, getBallChoiceValue } from '@/lib/types';
import StopwatchBallTracking from './StopwatchBallTracking';

interface AutonomousFormProps {
  onNext: (autonomousData: BallTrackingPhase & { auto_fuel_active_hub?: number; auto_tower_level1?: boolean; auto_climb_sec?: number }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<BallTrackingPhase> & { auto_fuel_active_hub?: number; auto_tower_level1?: boolean; auto_climb_sec?: number | null };
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
    const totalFuel = (data.runs ?? []).reduce(
      (sum, r) => sum + getBallChoiceValue(r.ball_choice),
      0
    );
    onNext({
      ...data,
      auto_fuel_active_hub: Math.round(totalFuel * 10) / 10,
      auto_tower_level1: undefined,
      auto_climb_sec: undefined,
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
