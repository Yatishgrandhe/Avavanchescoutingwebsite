import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Counter } from '../ui';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';

interface TeleopFormProps {
  onNext: (teleopData: Partial<ScoringNotes>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
}

const TeleopForm: React.FC<TeleopFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
}) => {
  const [formData, setFormData] = useState({
    teleop_coral_trough: 0,
    teleop_coral_l2: 0,
    teleop_coral_l3: 0,
    teleop_coral_l4: 0,
    teleop_algae_processor: 0,
    teleop_algae_net: 0,
  });

  const handleInputChange = (field: keyof typeof formData, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateTotal = () => {
    return (
      (formData.teleop_coral_trough * SCORING_VALUES.teleop_coral_trough) +
      (formData.teleop_coral_l2 * SCORING_VALUES.teleop_coral_l2) +
      (formData.teleop_coral_l3 * SCORING_VALUES.teleop_coral_l3) +
      (formData.teleop_coral_l4 * SCORING_VALUES.teleop_coral_l4) +
      (formData.teleop_algae_processor * SCORING_VALUES.teleop_algae_processor) +
      (formData.teleop_algae_net * SCORING_VALUES.teleop_algae_net)
    );
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto min-h-[500px]"
    >
      <Card className="bg-card border-border">
        {/* Progress Bar */}
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

        <CardHeader className="text-center">
          <CardTitle className="text-foreground text-2xl font-bold">
            Teleop Period
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Score the teleop period actions (2 minutes 15 seconds)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Coral Scoring */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-lg">Coral Scoring</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              <Counter
                value={formData.teleop_coral_trough}
                onChange={(value: number) => handleInputChange('teleop_coral_trough', value)}
                min={0}
                max={20}
                label="Trough (L1)"
                points={SCORING_VALUES.teleop_coral_trough}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.teleop_coral_l2}
                onChange={(value: number) => handleInputChange('teleop_coral_l2', value)}
                min={0}
                max={20}
                label="Level 2 Branch"
                points={SCORING_VALUES.teleop_coral_l2}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.teleop_coral_l3}
                onChange={(value: number) => handleInputChange('teleop_coral_l3', value)}
                min={0}
                max={20}
                label="Level 3 Branch"
                points={SCORING_VALUES.teleop_coral_l3}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.teleop_coral_l4}
                onChange={(value: number) => handleInputChange('teleop_coral_l4', value)}
                min={0}
                max={20}
                label="Level 4 Branch"
                points={SCORING_VALUES.teleop_coral_l4}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Algae Scoring */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-lg">Algae Scoring</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              <Counter
                value={formData.teleop_algae_processor}
                onChange={(value: number) => handleInputChange('teleop_algae_processor', value)}
                min={0}
                max={20}
                label="PROCESSOR"
                points={SCORING_VALUES.teleop_algae_processor}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.teleop_algae_net}
                onChange={(value: number) => handleInputChange('teleop_algae_net', value)}
                min={0}
                max={20}
                label="NET"
                points={SCORING_VALUES.teleop_algae_net}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Total Points Display */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold">Total Teleop Points:</span>
              <span className="text-primary text-2xl font-bold">{calculateTotal()}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Previous
          </Button>
          
          <Button
            onClick={() => onNext(formData)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TeleopForm;
