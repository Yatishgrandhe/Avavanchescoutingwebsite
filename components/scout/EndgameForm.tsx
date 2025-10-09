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

  const handleSelectChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateTotal = () => {
    switch (formData.endgame_score) {
      case 'park':
        return SCORING_VALUES.endgame_park;
      case 'shallow':
        return SCORING_VALUES.endgame_shallow_cage;
      case 'deep':
        return SCORING_VALUES.endgame_deep_cage;
      case 'park_shallow':
        return SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_shallow_cage;
      case 'park_deep':
        return SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_deep_cage;
      case 'shallow_deep':
        return SCORING_VALUES.endgame_shallow_cage + SCORING_VALUES.endgame_deep_cage;
      case 'all':
        return SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_shallow_cage + SCORING_VALUES.endgame_deep_cage;
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
      className="max-w-6xl mx-auto"
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
            Endgame
          </CardTitle>
          <CardDescription className="text-gray-400">
            Score the endgame actions (during teleop period)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Endgame Score Dropdown */}
          <div className="p-4 bg-dark-700 rounded-lg">
            <div className="mb-3">
              <h3 className="text-white font-medium">Endgame Score <span className="text-red-500">*</span></h3>
              <p className="text-gray-400 text-sm">Select the endgame score achieved</p>
            </div>
            <Select 
              value={formData.endgame_score} 
              onValueChange={(value) => handleSelectChange('endgame_score', value)}
            >
              <SelectTrigger className="w-full bg-dark-600 border-dark-500 text-white">
                <SelectValue placeholder="Select endgame score" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="none" className="text-white hover:bg-gray-700 bg-gray-800">No Endgame Score</SelectItem>
                <SelectItem value="park" className="text-white hover:bg-gray-700 bg-gray-800">Park in Barge Zone (+{SCORING_VALUES.endgame_park} pts)</SelectItem>
                <SelectItem value="shallow" className="text-white hover:bg-gray-700 bg-gray-800">Shallow Cage (+{SCORING_VALUES.endgame_shallow_cage} pts)</SelectItem>
                <SelectItem value="deep" className="text-white hover:bg-gray-700 bg-gray-800">Deep Cage (+{SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
                <SelectItem value="park_shallow" className="text-white hover:bg-gray-700 bg-gray-800">Park + Shallow Cage (+{SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_shallow_cage} pts)</SelectItem>
                <SelectItem value="park_deep" className="text-white hover:bg-gray-700 bg-gray-800">Park + Deep Cage (+{SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
                <SelectItem value="shallow_deep" className="text-white hover:bg-gray-700 bg-gray-800">Shallow + Deep Cage (+{SCORING_VALUES.endgame_shallow_cage + SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
                <SelectItem value="all" className="text-white hover:bg-gray-700 bg-gray-800">All Endgame Actions (+{SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_shallow_cage + SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Total Points Display */}
          <div className="p-4 bg-reef-900/20 border border-reef-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total Endgame Points:</span>
              <span className="text-reef-400 text-2xl font-bold">{calculateTotal()}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-dark-600 text-gray-300 hover:bg-dark-700 hover:text-white"
          >
            Previous
          </Button>
          
          <Button
            onClick={() => {
              // Convert dropdown selection to ScoringNotes format
              const scoringNotes: Partial<ScoringNotes> = {
                endgame_park: formData.endgame_score === 'park' || formData.endgame_score === 'park_shallow' || formData.endgame_score === 'park_deep' || formData.endgame_score === 'all',
                endgame_shallow_cage: formData.endgame_score === 'shallow' || formData.endgame_score === 'park_shallow' || formData.endgame_score === 'shallow_deep' || formData.endgame_score === 'all',
                endgame_deep_cage: formData.endgame_score === 'deep' || formData.endgame_score === 'park_deep' || formData.endgame_score === 'shallow_deep' || formData.endgame_score === 'all',
              };
              onNext(scoringNotes);
            }}
            className="bg-reef-600 hover:bg-reef-700 text-white"
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default EndgameForm;
