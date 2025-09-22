import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';

interface AutonomousFormProps {
  onNext: (autonomousData: Partial<ScoringNotes>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [formData, setFormData] = useState({
    auto_leave: false,
    auto_coral_trough: 0,
    auto_coral_l2: 0,
    auto_coral_l3: 0,
    auto_coral_l4: 0,
    auto_algae_processor: 0,
    auto_algae_net: 0,
  });

  const handleInputChange = (field: keyof typeof formData, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateTotal = () => {
    return (
      (formData.auto_leave ? SCORING_VALUES.auto_leave : 0) +
      (formData.auto_coral_trough * SCORING_VALUES.auto_coral_trough) +
      (formData.auto_coral_l2 * SCORING_VALUES.auto_coral_l2) +
      (formData.auto_coral_l3 * SCORING_VALUES.auto_coral_l3) +
      (formData.auto_coral_l4 * SCORING_VALUES.auto_coral_l4) +
      (formData.auto_algae_processor * SCORING_VALUES.auto_algae_processor) +
      (formData.auto_algae_net * SCORING_VALUES.auto_algae_net)
    );
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
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
            Autonomous Period
          </CardTitle>
          <CardDescription className="text-gray-400">
            Score the autonomous period actions (first 15 seconds)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Leave Starting Zone */}
          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Leave Starting Zone</h3>
              <p className="text-gray-400 text-sm">Robot successfully leaves the starting zone</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-reef-400 font-semibold">+{SCORING_VALUES.auto_leave} pts</span>
              <input
                type="checkbox"
                checked={formData.auto_leave}
                onChange={(e) => handleInputChange('auto_leave', e.target.checked)}
                className="w-4 h-4 text-reef-600 bg-dark-600 border-dark-500 rounded focus:ring-reef-500"
              />
            </div>
          </div>

          {/* Coral Scoring */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Coral Scoring</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Coral in Trough (L1)"
                type="number"
                min="0"
                value={formData.auto_coral_trough}
                onChange={(e) => handleInputChange('auto_coral_trough', parseInt(e.target.value) || 0)}
                className="bg-dark-700 border-dark-600 text-white"
              />
              
              <Input
                label="Coral on L2 Branch"
                type="number"
                min="0"
                value={formData.auto_coral_l2}
                onChange={(e) => handleInputChange('auto_coral_l2', parseInt(e.target.value) || 0)}
                className="bg-dark-700 border-dark-600 text-white"
              />
              
              <Input
                label="Coral on L3 Branch"
                type="number"
                min="0"
                value={formData.auto_coral_l3}
                onChange={(e) => handleInputChange('auto_coral_l3', parseInt(e.target.value) || 0)}
                className="bg-dark-700 border-dark-600 text-white"
              />
              
              <Input
                label="Coral on L4 Branch"
                type="number"
                min="0"
                value={formData.auto_coral_l4}
                onChange={(e) => handleInputChange('auto_coral_l4', parseInt(e.target.value) || 0)}
                className="bg-dark-700 border-dark-600 text-white"
              />
            </div>
          </div>

          {/* Algae Scoring */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Algae Scoring</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Algae in Processor"
                type="number"
                min="0"
                value={formData.auto_algae_processor}
                onChange={(e) => handleInputChange('auto_algae_processor', parseInt(e.target.value) || 0)}
                className="bg-dark-700 border-dark-600 text-white"
              />
              
              <Input
                label="Algae on Net"
                type="number"
                min="0"
                value={formData.auto_algae_net}
                onChange={(e) => handleInputChange('auto_algae_net', parseInt(e.target.value) || 0)}
                className="bg-dark-700 border-dark-600 text-white"
              />
            </div>
          </div>

          {/* Total Points Display */}
          <div className="p-4 bg-reef-900/20 border border-reef-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total Autonomous Points:</span>
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

export default AutonomousForm;
