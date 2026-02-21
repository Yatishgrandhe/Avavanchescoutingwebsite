import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Counter } from '../ui';

interface MiscellaneousFormProps {
  onNext: (miscData: { defense_rating: number; comments: string; average_downtime: number | null; broke: boolean | null }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  initialData?: { defense_rating: number; comments: string; average_downtime?: number | null; broke?: boolean | null };
}

const MiscellaneousForm: React.FC<MiscellaneousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    defense_rating: (initialData?.defense_rating as number) ?? 0,
    comments: initialData?.comments || '',
    average_downtime: initialData?.average_downtime ?? null as number | null,
    broke: initialData?.broke ?? null as boolean | null,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync initialData with state when it changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        defense_rating: (initialData.defense_rating as number) ?? 0,
        comments: initialData.comments || '',
        average_downtime: initialData.average_downtime ?? null,
        broke: initialData.broke ?? null,
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean | null) => {
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
            Additional Notes
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm sm:text-base">
            Add any additional observations and comments
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
          {/* Validation Error */}
          {validationError && (
            <div className="bg-orange-500/20 text-orange-400 p-2 sm:p-3 rounded-md text-xs sm:text-sm text-center flex items-center justify-center">
              <span>{validationError}</span>
            </div>
          )}

          {/* Defense Rating */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="text-foreground font-semibold text-base sm:text-lg">Defense Rating <span className="text-destructive">*</span></h3>
            <div className="max-w-xs">
              <Counter
                value={typeof formData.defense_rating === 'number' ? formData.defense_rating : 0}
                onChange={(value: number) => handleInputChange('defense_rating', value)}
                min={0}
                max={10}
                step={1}
                label="Rate the team's defensive play"
                isDarkMode={true}
              />
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              0 = No defense, 10 = Exceptional defensive play
            </p>
          </div>

          {/* Comments */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="text-foreground font-semibold text-base sm:text-lg">Comments</h3>
            <textarea
              value={formData.comments}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('comments', e.target.value)}
              className="w-full h-20 sm:h-24 md:h-32 lg:h-36 bg-background border border-border text-foreground rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
              placeholder="Add any additional observations, strategies observed, or notable robot capabilities. Note: Include which HUB was active/inactive (determined by Auto performance), TOWER climb timing, and any other relevant details..."
            />
          </div>

          {/* Average Downtime */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="text-foreground font-semibold text-base sm:text-lg">Average Downtime (seconds)</h3>
            <input
              type="number"
              min={0}
              step={0.5}
              value={formData.average_downtime ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;
                handleInputChange('average_downtime', v === '' ? null : parseFloat(v));
              }}
              className="w-full max-w-xs bg-background border border-border text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
              placeholder="e.g. 15 (leave blank if none)"
            />
            <p className="text-muted-foreground text-xs sm:text-sm">
              Estimated average time the robot was disabled or not operating (in seconds). Leave blank if no significant downtime.
            </p>
          </div>

          {/* Broke or Not */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="text-foreground font-semibold text-base sm:text-lg">Robot Broke?</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="broke"
                  checked={formData.broke === true}
                  onChange={() => handleInputChange('broke', true)}
                  className="rounded-full border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="broke"
                  checked={formData.broke === false}
                  onChange={() => handleInputChange('broke', false)}
                  className="rounded-full border-border text-primary focus:ring-primary"
                />
                <span className="text-foreground">No</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="broke"
                  checked={formData.broke === null}
                  onChange={() => handleInputChange('broke', null)}
                  className="rounded-full border-border text-primary focus:ring-primary"
                />
                <span className="text-muted-foreground">Unknown / N/A</span>
              </label>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Did the robot break or stop working during the match?
            </p>
          </div>

          {/* Game Mechanics Notes */}
          <div className="space-y-2 sm:space-y-4">
            <h3 className="text-foreground font-semibold text-base sm:text-lg">Important Game Mechanics Notes</h3>
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-md p-3 sm:p-4 space-y-2 text-xs sm:text-sm text-foreground">
              <p className="font-semibold">Active vs Inactive HUB:</p>
              <p className="text-muted-foreground">The Alliance with more FUEL scored in Auto determines which goal becomes inactive during Shifts 2 and 4 in Teleop. FUEL in inactive HUB scores 0 points.</p>
              
              <p className="font-semibold mt-3">TOWER Points Evaluation:</p>
              <p className="text-muted-foreground">TOWER points are evaluated about 3 seconds after the match ends or when all robots have come to rest.</p>
              
              <p className="font-semibold mt-3">FUEL Scoring Evaluation:</p>
              <p className="text-muted-foreground">FUEL scoring is evaluated for up to 3 seconds after AUTO and after the match end to catch late-entering FUEL.</p>
              
              <p className="font-semibold mt-3">Endgame (Last 30 seconds):</p>
              <p className="text-muted-foreground">During Endgame (0:30-0:00), both HUBs are active, so every FUEL correctly scored = 1 point.</p>
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
              // Validate required fields
              const defenseRating = typeof formData.defense_rating === 'number' ? formData.defense_rating : 0;
              const comments = formData.comments.trim();
              
              if (defenseRating < 0 || defenseRating > 10) {
                setValidationError('Please provide a defense rating between 0 and 10.');
                return;
              }

              onNext({
                defense_rating: defenseRating,
                comments: comments,
                average_downtime: formData.average_downtime,
                broke: formData.broke,
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
