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
      className="max-w-6xl mx-auto"
    >
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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
                    : 'text-green-600 bg-white border-gray-300 focus:ring-green-500'
                }`}
              />
            </div>
          </motion.div>

          {/* Coral Scoring */}
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
                CORAL Scoring
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Counter
                value={formData.auto_coral_trough}
                onChange={(value: number) => handleInputChange('auto_coral_trough', value)}
                min={0}
                max={10}
                label="Trough (L1)"
                points={SCORING_VALUES.auto_coral_trough}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.auto_coral_l2}
                onChange={(value: number) => handleInputChange('auto_coral_l2', value)}
                min={0}
                max={10}
                label="Level 2 Branch"
                points={SCORING_VALUES.auto_coral_l2}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.auto_coral_l3}
                onChange={(value: number) => handleInputChange('auto_coral_l3', value)}
                min={0}
                max={10}
                label="Level 3 Branch"
                points={SCORING_VALUES.auto_coral_l3}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.auto_coral_l4}
                onChange={(value: number) => handleInputChange('auto_coral_l4', value)}
                min={0}
                max={10}
                label="Level 4 Branch"
                points={SCORING_VALUES.auto_coral_l4}
                isDarkMode={isDarkMode}
              />
            </div>
          </motion.div>

          {/* Algae Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-teal-900/30' : 'bg-teal-100'}`}>
                <Waves className={`w-6 h-6 ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ALGAE Scoring
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Counter
                value={formData.auto_algae_processor}
                onChange={(value: number) => handleInputChange('auto_algae_processor', value)}
                min={0}
                max={10}
                label="PROCESSOR"
                points={SCORING_VALUES.auto_algae_processor}
                isDarkMode={isDarkMode}
              />
              
              <Counter
                value={formData.auto_algae_net}
                onChange={(value: number) => handleInputChange('auto_algae_net', value)}
                min={0}
                max={10}
                label="NET"
                points={SCORING_VALUES.auto_algae_net}
                isDarkMode={isDarkMode}
              />
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
