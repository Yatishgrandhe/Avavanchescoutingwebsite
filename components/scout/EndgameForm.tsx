import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';

interface EndgameFormProps {
  onNext: (endgameData: Partial<ScoringNotes>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

const EndgameForm: React.FC<EndgameFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [formData, setFormData] = useState({
    endgame_score: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSelectChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error when user makes a selection
    if (validationError) {
      setValidationError(null);
    }
  };

  const calculateTotal = () => {
    switch (formData.endgame_score) {
      case 'park':
        return SCORING_VALUES.endgame_park;
      case 'shallow':
        return SCORING_VALUES.endgame_shallow_cage;
      case 'deep':
        return SCORING_VALUES.endgame_deep_cage;
      default:
        return 0;
    }
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
            Score the endgame actions (during teleop period)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
          {/* Validation Error */}
          {validationError && (
            <div className="bg-orange-500/20 text-orange-400 p-2 sm:p-3 rounded-md text-xs sm:text-sm text-center flex items-center justify-center">
              <span>{validationError}</span>
            </div>
          )}

          {/* Endgame Score Dropdown */}
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm sm:text-base font-medium text-foreground">
              Endgame Score <span className="text-destructive">*</span>
            </label>
            <p className="text-muted-foreground text-xs sm:text-sm">Select the endgame score achieved during teleop period</p>
            <Select 
              value={formData.endgame_score} 
              onValueChange={(value) => handleSelectChange('endgame_score', value)}
            >
              <SelectTrigger className="w-full bg-background border-border text-foreground">
                <SelectValue placeholder="Select endgame score..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="none" className="text-foreground hover:bg-muted">No Endgame Score</SelectItem>
                <SelectItem value="park" className="text-foreground hover:bg-muted">Park in the BARGE ZONE (+{SCORING_VALUES.endgame_park} points)</SelectItem>
                <SelectItem value="shallow" className="text-foreground hover:bg-muted">Off-the-ground via shallow CAGE (+{SCORING_VALUES.endgame_shallow_cage} points)</SelectItem>
                <SelectItem value="deep" className="text-foreground hover:bg-muted">Off-the-ground via deep CAGE (+{SCORING_VALUES.endgame_deep_cage} points)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              // Validate required field
              if (!formData.endgame_score) {
                setValidationError('Please select an endgame score before proceeding.');
                return;
              }

              // Convert dropdown selection to ScoringNotes format
              const scoringNotes: Partial<ScoringNotes> = {
                endgame_park: formData.endgame_score === 'park' ? true : false,
                endgame_shallow_cage: formData.endgame_score === 'shallow' ? true : false,
                endgame_deep_cage: formData.endgame_score === 'deep' ? true : false,
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
