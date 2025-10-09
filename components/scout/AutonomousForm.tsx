import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Checkbox, Counter } from '../ui';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';
import { Play, TreePine, Waves, CheckCircle } from 'lucide-react';

interface AutonomousFormProps {
  onNext: (autonomousData: Partial<ScoringNotes>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
}) => {
  const [formData, setFormData] = useState({
    auto_leave: false,
    auto_l1: false,
    auto_l2: false,
    auto_l3: false,
    auto_l4: false,
    auto_move_off_line: false,
    auto_clean_reef_low: false,
    auto_clean_reef_high: false,
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
      (formData.auto_l1 ? SCORING_VALUES.auto_coral_trough : 0) +
      (formData.auto_l2 ? SCORING_VALUES.auto_coral_l2 : 0) +
      (formData.auto_l3 ? SCORING_VALUES.auto_coral_l3 : 0) +
      (formData.auto_l4 ? SCORING_VALUES.auto_coral_l4 : 0) +
      (formData.auto_clean_reef_low ? SCORING_VALUES.auto_algae_processor : 0) +
      (formData.auto_clean_reef_high ? SCORING_VALUES.auto_algae_net : 0)
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
      <Card className="bg-card border-border">
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className={`w-full rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Step {currentStep} of {totalSteps}
            </span>
            <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
        </div>

        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center space-x-3 mb-4"
          >
            <Play className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <CardTitle className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Autonomous Period
            </CardTitle>
          </motion.div>
          <CardDescription className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Score the autonomous period actions (first 15 seconds)
          </CardDescription>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mt-4 p-4 rounded-lg ${
              isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <span className={`font-semibold text-lg ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              Current Score: {calculateTotal()} points
            </span>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-8">
          {/* Leave Starting Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 rounded-xl space-y-3 sm:space-y-0 ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <CheckCircle className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Leave Starting Zone
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Robot successfully leaves the starting zone
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`font-bold text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                +{SCORING_VALUES.auto_leave} pts
              </span>
              <input
                type="checkbox"
                checked={formData.auto_leave}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('auto_leave', e.target.checked)}
                className={`w-5 h-5 rounded border-2 ${
                  isDarkMode 
                    ? 'text-green-600 bg-gray-600 border-gray-500 focus:ring-green-500' 
                    : 'text-green-600 bg-background border-border focus:ring-green-500'
                }`}
              />
            </div>
          </motion.div>

          {/* What can you do in auto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                <TreePine className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                What can you do in auto
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'auto_l1', label: 'L1', points: SCORING_VALUES.auto_coral_trough },
                { key: 'auto_l2', label: 'L2', points: SCORING_VALUES.auto_coral_l2 },
                { key: 'auto_l3', label: 'L3', points: SCORING_VALUES.auto_coral_l3 },
                { key: 'auto_l4', label: 'L4', points: SCORING_VALUES.auto_coral_l4 },
                { key: 'auto_move_off_line', label: 'Move off of the starting line ONLY', points: 0 },
                { key: 'auto_clean_reef_low', label: 'Clean the reef (LOW algae)', points: SCORING_VALUES.auto_algae_processor },
                { key: 'auto_clean_reef_high', label: 'Clean the reef (HIGH algae)', points: SCORING_VALUES.auto_algae_net },
              ].map((option) => (
                <div key={option.key} className={`flex items-center justify-between p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={option.key}
                      checked={formData[option.key as keyof typeof formData] as boolean}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(option.key as keyof typeof formData, e.target.checked)}
                      className={`w-5 h-5 rounded border-2 ${
                        isDarkMode 
                          ? 'text-primary bg-gray-600 border-gray-500 focus:ring-primary' 
                          : 'text-primary bg-background border-border focus:ring-primary'
                      }`}
                    />
                    <label htmlFor={option.key} className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </label>
                  </div>
                  {option.points > 0 && (
                    <span className={`font-bold text-sm ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      +{option.points} pts
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Total Points Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`p-6 rounded-xl border-2 ${
              isDarkMode 
                ? 'bg-blue-900/20 border-blue-700' 
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Total Autonomous Points:
              </span>
              <span className={`text-3xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {calculateTotal()}
              </span>
            </div>
          </motion.div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              onClick={onBack}
              
            >
              Previous
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => onNext(formData)}
              
            >
              Next: Teleop
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AutonomousForm;
