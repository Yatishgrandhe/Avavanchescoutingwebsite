import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { validateMatchNumber } from '@/lib/utils';

interface MatchDetailsFormProps {
  onNext: (matchNumber: number) => void;
  onBack?: () => void;
  currentStep: number;
  totalSteps: number;
}

const MatchDetailsForm: React.FC<MatchDetailsFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [matchNumber, setMatchNumber] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!matchNumber.trim()) {
      setError('Match number is required');
      return;
    }

    if (!validateMatchNumber(matchNumber)) {
      setError('Please enter a valid match number (1-999)');
      return;
    }

    setError('');
    onNext(parseInt(matchNumber));
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-md mx-auto"
    >
      <Card className="bg-dark-800 border-dark-700">
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="w-full bg-dark-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-reef-400 to-reef-600 h-2 rounded-full"
            />
          </div>
        </div>

        <CardHeader className="text-center">
          <CardTitle className="text-white text-2xl font-bold">
            Match Details
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter the match details
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Input
            label="Match Number"
            type="number"
            placeholder="Number of match being played"
            value={matchNumber}
            onChange={(e) => {
              setMatchNumber(e.target.value);
              if (error) setError('');
            }}
            error={error}
            className="bg-dark-700 border-dark-600 text-white placeholder-gray-400"
          />
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={!onBack}
            className="border-dark-600 text-gray-300 hover:bg-dark-700 hover:text-white"
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            className="bg-reef-600 hover:bg-reef-700 text-white"
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default MatchDetailsForm;
