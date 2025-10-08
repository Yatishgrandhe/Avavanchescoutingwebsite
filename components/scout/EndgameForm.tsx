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
    endgame_park: false,
    endgame_shallow_cage: false,
    endgame_deep_cage: false,
    endgame_score: '',
  });

  const handleCheckboxChange = (field: keyof typeof formData, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateTotal = () => {
    return (
      (formData.endgame_park ? SCORING_VALUES.endgame_park : 0) +
      (formData.endgame_shallow_cage ? SCORING_VALUES.endgame_shallow_cage : 0) +
      (formData.endgame_deep_cage ? SCORING_VALUES.endgame_deep_cage : 0)
    );
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
          {/* Park in Barge Zone */}
          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Park in Barge Zone</h3>
              <p className="text-gray-400 text-sm">Robot is parked in the barge zone at end of match</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-reef-400 font-semibold">+{SCORING_VALUES.endgame_park} pts</span>
              <input
                type="checkbox"
                checked={formData.endgame_park}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCheckboxChange('endgame_park', e.target.checked)}
                className="w-4 h-4 text-reef-600 bg-dark-600 border-dark-500 rounded focus:ring-reef-500"
              />
            </div>
          </div>

          {/* Shallow Cage */}
          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Shallow Cage</h3>
              <p className="text-gray-400 text-sm">Robot is lifted off ground via shallow cage</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-reef-400 font-semibold">+{SCORING_VALUES.endgame_shallow_cage} pts</span>
              <input
                type="checkbox"
                checked={formData.endgame_shallow_cage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCheckboxChange('endgame_shallow_cage', e.target.checked)}
                className="w-4 h-4 text-reef-600 bg-dark-600 border-dark-500 rounded focus:ring-reef-500"
              />
            </div>
          </div>

          {/* Deep Cage */}
          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Deep Cage</h3>
              <p className="text-gray-400 text-sm">Robot is lifted off ground via deep cage</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-reef-400 font-semibold">+{SCORING_VALUES.endgame_deep_cage} pts</span>
              <input
                type="checkbox"
                checked={formData.endgame_deep_cage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCheckboxChange('endgame_deep_cage', e.target.checked)}
                className="w-4 h-4 text-reef-600 bg-dark-600 border-dark-500 rounded focus:ring-reef-500"
              />
            </div>
          </div>

          {/* Endgame Score Dropdown */}
          <div className="p-4 bg-dark-700 rounded-lg">
            <div className="mb-3">
              <h3 className="text-white font-medium">Endgame Score</h3>
              <p className="text-gray-400 text-sm">Select the endgame score achieved</p>
            </div>
            <Select 
              value={formData.endgame_score} 
              onValueChange={(value) => handleSelectChange('endgame_score', value)}
            >
              <SelectTrigger className="w-full bg-dark-600 border-dark-500 text-white">
                <SelectValue placeholder="Select endgame score" />
              </SelectTrigger>
              <SelectContent className="bg-dark-700 border-dark-600">
                <SelectItem value="none" className="text-white hover:bg-dark-600">No Endgame Score</SelectItem>
                <SelectItem value="park" className="text-white hover:bg-dark-600">Park in Barge Zone (+{SCORING_VALUES.endgame_park} pts)</SelectItem>
                <SelectItem value="shallow" className="text-white hover:bg-dark-600">Shallow Cage (+{SCORING_VALUES.endgame_shallow_cage} pts)</SelectItem>
                <SelectItem value="deep" className="text-white hover:bg-dark-600">Deep Cage (+{SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
                <SelectItem value="park_shallow" className="text-white hover:bg-dark-600">Park + Shallow Cage (+{SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_shallow_cage} pts)</SelectItem>
                <SelectItem value="park_deep" className="text-white hover:bg-dark-600">Park + Deep Cage (+{SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
                <SelectItem value="shallow_deep" className="text-white hover:bg-dark-600">Shallow + Deep Cage (+{SCORING_VALUES.endgame_shallow_cage + SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
                <SelectItem value="all" className="text-white hover:bg-dark-600">All Endgame Actions (+{SCORING_VALUES.endgame_park + SCORING_VALUES.endgame_shallow_cage + SCORING_VALUES.endgame_deep_cage} pts)</SelectItem>
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
            onClick={() => onNext(formData)}
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
