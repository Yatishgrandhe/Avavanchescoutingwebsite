import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui';

interface MiscellaneousFormProps {
  onNext: (miscData: { defense_rating: number; comments: string }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

const MiscellaneousForm: React.FC<MiscellaneousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [formData, setFormData] = useState({
    defense_rating: 1 as number | string,
    comments: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error when user makes changes
    if (validationError) {
      setValidationError(null);
    }
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
            Additional Notes
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Add any additional observations and comments
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6">
          {/* Validation Error */}
          {validationError && (
            <div className="bg-orange-500/20 text-orange-400 p-3 rounded-md text-sm text-center flex items-center justify-center">
              <span>{validationError}</span>
            </div>
          )}

          {/* Defense Rating */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-lg">Defense Rating <span className="text-destructive">*</span></h3>
            <Input
              type="number"
              min="1"
              max="10"
              value={formData.defense_rating === '' ? '' : formData.defense_rating.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                if (value === '') {
                  setFormData(prev => ({ ...prev, defense_rating: '' }));
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue)) {
                    setFormData(prev => ({ ...prev, defense_rating: numValue }));
                  }
                }
              }}
              className="bg-background border-border text-foreground"
              placeholder="Rate the team's defensive play from 1-10"
            />
            <p className="text-muted-foreground text-sm">
              1 = No defense, 10 = Exceptional defensive play
            </p>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-lg">Comments <span className="text-destructive">*</span></h3>
            <textarea
              value={formData.comments}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('comments', e.target.value)}
              className="w-full h-24 sm:h-32 lg:h-36 xl:h-40 bg-background border border-border text-foreground rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
              placeholder="Add any additional observations, strategies observed, or notable robot capabilities..."
            />
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
            onClick={() => {
              // Validate required fields
              const defenseRating = formData.defense_rating === '' ? 0 : Number(formData.defense_rating);
              const comments = formData.comments.trim();
              
              if (!defenseRating || defenseRating < 1 || defenseRating > 10) {
                setValidationError('Please provide a defense rating between 1 and 10.');
                return;
              }
              
              if (!comments) {
                setValidationError('Please provide comments before proceeding.');
                return;
              }

              onNext({
                defense_rating: defenseRating,
                comments: comments
              });
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

export default MiscellaneousForm;
