import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Counter } from '../ui';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

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


        <CardHeader className="text-center px-3 sm:px-6">
          <CardTitle className="text-foreground text-lg sm:text-xl lg:text-2xl font-bold">
            Additional Notes
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm sm:text-base">
            Add any additional observations and comments
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-3 sm:px-6 py-4">
          {/* Validation Error */}
          {validationError && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center border border-destructive/20">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Defense Rating */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Defense Rating</h3>
                  <Badge variant="outline" className="font-mono text-primary border-primary/20 bg-primary/5">
                    {formData.defense_rating}/10
                  </Badge>
                </div>
                <div className="px-1">
                  <Counter
                    value={typeof formData.defense_rating === 'number' ? formData.defense_rating : 0}
                    onChange={(value: number) => handleInputChange('defense_rating', value)}
                    min={0}
                    max={10}
                    step={1}
                    isDarkMode={true}
                  />
                </div>
              </div>

              {/* Average Downtime & Broke */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Downtime (sec)</h3>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={formData.average_downtime ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const v = e.target.value;
                      handleInputChange('average_downtime', v === '' ? null : parseFloat(v));
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 font-mono text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Robot Broke?</h3>
                  <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 h-[42px]">
                    <button
                      type="button"
                      onClick={() => handleInputChange('broke', true)}
                      className={cn(
                        "flex-1 rounded-lg text-xs font-bold transition-all",
                        formData.broke === true ? "bg-destructive text-white shadow-lg" : "text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('broke', false)}
                      className={cn(
                        "flex-1 rounded-lg text-xs font-bold transition-all",
                        formData.broke === false ? "bg-green-600 text-white shadow-lg" : "text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      NO
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2 flex flex-col h-full">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scout Observations</h3>
              <textarea
                value={formData.comments}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('comments', e.target.value)}
                className="flex-1 min-h-[120px] bg-white/5 border border-white/10 text-foreground rounded-xl px-4 py-3 resize-none focus:ring-1 focus:ring-primary outline-none text-sm leading-relaxed"
                placeholder="Notes on robot behavior, specific scores missed, etc..."
              />
            </div>
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

          {/* Game Mechanics (Simplified) */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
            <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-3">Quick Reference</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] leading-tight">
              <div className="space-y-1">
                <span className="font-bold text-foreground/80 block uppercase">HUB Status</span>
                <p className="text-muted-foreground">Inactive HUB (determined by Auto) scores 0 pts during Shifts 2 & 4.</p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-foreground/80 block uppercase">Endgame</span>
                <p className="text-muted-foreground">Last 30s: All HUBs active. TOWER pts evaluated when robots stop.</p>
              </div>
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
