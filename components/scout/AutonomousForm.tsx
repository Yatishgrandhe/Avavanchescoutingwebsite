import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Counter } from '../ui';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';
import { Play, Fuel, TrendingUp, CheckCircle } from 'lucide-react';

interface AutonomousFormProps {
  onNext: (autonomousData: Partial<ScoringNotes>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<ScoringNotes>;
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    auto_fuel_active_hub: (initialData?.auto_fuel_active_hub as number) || 0,
    auto_tower_level1: (initialData?.auto_tower_level1 as boolean) || false,
  });

  // Sync initialData with state when it changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        auto_fuel_active_hub: (initialData.auto_fuel_active_hub as number) || 0,
        auto_tower_level1: (initialData.auto_tower_level1 as boolean) || false,
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof typeof formData, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateTotal = () => {
    return (
      (formData.auto_fuel_active_hub * SCORING_VALUES.auto_fuel_active_hub) +
      (formData.auto_tower_level1 ? SCORING_VALUES.auto_tower_level1 : 0)
    );
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <>
      <style jsx>{`
        /* Remove conflicting checkbox styles - let globals.css handle it */
        input[type="checkbox"] {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          touch-action: manipulation !important;
          outline: none !important;
        }
        
        input[type="checkbox"]:active {
          -webkit-tap-highlight-color: transparent !important;
          background-color: transparent !important;
        }
        
        input[type="checkbox"]:focus {
          -webkit-tap-highlight-color: transparent !important;
          outline: none !important;
        }
        
        input[type="checkbox"]:hover {
          -webkit-tap-highlight-color: transparent !important;
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-6xl mx-auto min-h-[500px]"
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
            Score the autonomous period actions (first 20 seconds)
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
          {/* FUEL Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <Fuel className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                FUEL Scoring
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <Counter
                value={formData.auto_fuel_active_hub}
                onChange={(value: number) => handleInputChange('auto_fuel_active_hub', value)}
                min={0}
                max={50}
                label="FUEL in Active HUB"
                points={SCORING_VALUES.auto_fuel_active_hub}
                isDarkMode={isDarkMode}
              />
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Note: 1 point per FUEL scored in the active HUB. FUEL in inactive HUB scores 0 points.
            </div>
          </motion.div>

          {/* TOWER Scoring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                <TrendingUp className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                TOWER Climb
              </h3>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
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
                    TOWER LEVEL 1 Climb
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Robot fully supported by the lowest rung
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`font-bold text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  +{SCORING_VALUES.auto_tower_level1} pts
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.auto_tower_level1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('auto_tower_level1', e.target.checked)}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </motion.div>
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
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
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
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
            >
              Next: Teleop
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
      </motion.div>
    </>
  );
};

export default AutonomousForm;
