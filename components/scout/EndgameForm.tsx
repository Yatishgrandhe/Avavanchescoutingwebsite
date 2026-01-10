import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Counter } from '../ui';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';
import { Fuel } from 'lucide-react';

interface EndgameFormProps {
  onNext: (endgameData: Partial<ScoringNotes>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  initialData?: Partial<ScoringNotes>;
}

const EndgameForm: React.FC<EndgameFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    endgame_fuel: (initialData?.endgame_fuel as number) || 0,
  });

  // Sync initialData with state when it changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        endgame_fuel: (initialData.endgame_fuel as number) || 0,
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof typeof formData, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateTotal = () => {
    return formData.endgame_fuel * SCORING_VALUES.endgame_fuel;
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]"
    >
      <Card className="bg-card border-border">
        {/* Progress Bar */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full"
            />
          </div>
        </div>

        <CardHeader className="text-center px-3 sm:px-6">
          <CardTitle className="text-foreground text-lg sm:text-xl lg:text-2xl font-bold">
            Endgame
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm sm:text-base">
            Score the endgame actions (last 30 seconds: 0:30-0:00)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
          {/* FUEL Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg bg-blue-900/30`}>
                <Fuel className={`w-6 h-6 text-blue-400`} />
              </div>
              <h3 className={`text-xl font-semibold text-white`}>
                FUEL Scoring
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              <Counter
                value={formData.endgame_fuel}
                onChange={(value: number) => handleInputChange('endgame_fuel', value)}
                min={0}
                max={100}
                label="FUEL in HUB"
                points={SCORING_VALUES.endgame_fuel}
                isDarkMode={true}
              />
            </div>
            <div className={`text-sm text-gray-400`}>
              Note: During Endgame (last 30 seconds), both HUBs are active. Every FUEL correctly scored = 1 point.
            </div>
            <div className={`text-sm text-gray-400`}>
              Note: TOWER climbs (LEVEL 2 and LEVEL 3) can also be scored during Endgame and are tracked in the Teleop form.
            </div>
          </motion.div>

          {/* Total Points Display */}
          <div className="p-3 sm:p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm sm:text-base">Total Endgame Points:</span>
              <span className="text-primary text-xl sm:text-2xl font-bold">{calculateTotal()}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between px-3 sm:px-6 pb-3 sm:pb-6">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Previous
          </Button>
          
          <Button
            onClick={() => {
              const scoringNotes: Partial<ScoringNotes> = {
                endgame_fuel: formData.endgame_fuel,
              };
              onNext(scoringNotes);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default EndgameForm;
