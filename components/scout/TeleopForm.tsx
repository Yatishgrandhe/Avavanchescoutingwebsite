import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Counter } from '../ui';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';
import { Fuel, TrendingUp, CheckCircle, Plus, X } from 'lucide-react';

interface TeleopFormProps {
  onNext: (teleopData: Partial<ScoringNotes>) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<ScoringNotes>;
}

const TeleopForm: React.FC<TeleopFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  // Initialize fuel shifts from initialData or create new empty array
  const initialShifts = initialData?.teleop_fuel_shifts && Array.isArray(initialData.teleop_fuel_shifts) 
    ? [...initialData.teleop_fuel_shifts] 
    : [];

  const [fuelShifts, setFuelShifts] = useState<number[]>(initialShifts);
  const [currentShiftFuel, setCurrentShiftFuel] = useState<number>(
    initialData?.teleop_fuel_active_hub && !initialData?.teleop_fuel_shifts
      ? (initialData.teleop_fuel_active_hub as number)
      : 0
  );
  
  const [formData, setFormData] = useState({
    teleop_fuel_active_hub: (initialData?.teleop_fuel_active_hub as number) || 0,
    teleop_tower_level1: (initialData?.teleop_tower_level1 as boolean) || false,
    teleop_tower_level2: (initialData?.teleop_tower_level2 as boolean) || false,
    teleop_tower_level3: (initialData?.teleop_tower_level3 as boolean) || false,
  });

  // Sync initialData with state when it changes
  useEffect(() => {
    if (initialData) {
      const shifts = initialData.teleop_fuel_shifts && Array.isArray(initialData.teleop_fuel_shifts)
        ? [...initialData.teleop_fuel_shifts]
        : [];
      setFuelShifts(shifts);
      // If there are no shifts but there's a fuel_active_hub value, set it as current shift
      setCurrentShiftFuel(
        shifts.length === 0 && initialData.teleop_fuel_active_hub
          ? (initialData.teleop_fuel_active_hub as number)
          : 0
      );
      setFormData({
        teleop_fuel_active_hub: (initialData.teleop_fuel_active_hub as number) || 0,
        teleop_tower_level1: (initialData.teleop_tower_level1 as boolean) || false,
        teleop_tower_level2: (initialData.teleop_tower_level2 as boolean) || false,
        teleop_tower_level3: (initialData.teleop_tower_level3 as boolean) || false,
      });
    }
  }, [initialData]);

  const handleAddShift = () => {
    if (currentShiftFuel > 0) {
      setFuelShifts([...fuelShifts, currentShiftFuel]);
      setCurrentShiftFuel(0);
    }
  };

  const handleRemoveShift = (index: number) => {
    const newShifts = fuelShifts.filter((_, i) => i !== index);
    setFuelShifts(newShifts);
  };

  const getTotalFuel = () => {
    // Include current shift fuel in the total
    return fuelShifts.reduce((sum, fuel) => sum + fuel, 0) + currentShiftFuel;
  };

  const getAllShifts = () => {
    // Return all shifts including current one if it has fuel
    const allShifts = [...fuelShifts];
    if (currentShiftFuel > 0) {
      allShifts.push(currentShiftFuel);
    }
    return allShifts;
  };

  const handleInputChange = (field: keyof typeof formData, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateTotal = () => {
    const totalFuel = getTotalFuel();
    let total = totalFuel * SCORING_VALUES.teleop_fuel_active_hub;
    // TOWER: Only highest level counts (mutually exclusive)
    if (formData.teleop_tower_level3) {
      total += SCORING_VALUES.teleop_tower_level3;
    } else if (formData.teleop_tower_level2) {
      total += SCORING_VALUES.teleop_tower_level2;
    } else if (formData.teleop_tower_level1) {
      total += SCORING_VALUES.teleop_tower_level1;
    }
    return total;
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
            Teleop Period
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Score the teleop period actions (last 2:20, especially last 0:30)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* FUEL Scoring */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <Fuel className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                FUEL Scoring
              </h3>
            </div>
            
            {/* Current Shift Input */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <Counter
                  value={currentShiftFuel}
                  onChange={(value: number) => setCurrentShiftFuel(value)}
                  min={0}
                  max={100}
                  label="Current Shift FUEL"
                  points={SCORING_VALUES.teleop_fuel_active_hub}
                  isDarkMode={isDarkMode}
                />
              </div>
              
              {/* Add Shift Button - Finalizes current shift and starts a new one */}
              <Button
                onClick={handleAddShift}
                disabled={currentShiftFuel === 0}
                className={`w-full sm:w-auto ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Finalize Shift & Start Next
              </Button>
            </div>

            {/* Display All Shifts */}
            {(fuelShifts.length > 0 || currentShiftFuel > 0) && (
              <div className="space-y-2">
                <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Fuel Shifts ({getAllShifts().length} shift{getAllShifts().length !== 1 ? 's' : ''}):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {fuelShifts.map((fuel, index) => (
                    <motion.div
                      key={`shift-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-100 border border-blue-300'
                      }`}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        Shift {index + 1}: {fuel} fuel ({fuel} pts)
                      </span>
                      <button
                        onClick={() => handleRemoveShift(index)}
                        className={`hover:bg-red-500/20 rounded-full p-1 transition-colors`}
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                  {currentShiftFuel > 0 && (
                    <motion.div
                      key="current-shift"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        isDarkMode ? 'bg-blue-700/50 border-2 border-blue-500' : 'bg-blue-200 border-2 border-blue-400'
                      }`}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                        Shift {fuelShifts.length + 1}: {currentShiftFuel} fuel ({currentShiftFuel} pts) - Current
                      </span>
                    </motion.div>
                  )}
                </div>
                <div className={`text-sm font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Total FUEL: {getTotalFuel()} ({getTotalFuel()} points)
                </div>
              </div>
            )}
            
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Note: 1 point per FUEL scored in the active HUB. Add multiple shifts to track fuel across the teleop period. FUEL in inactive HUB scores 0 points.
            </div>
          </div>

          {/* TOWER Scoring */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                <TrendingUp className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                TOWER Climb
              </h3>
            </div>
            
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 rounded-xl space-y-3 sm:space-y-0 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <CheckCircle className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      TOWER LEVEL 1
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      LEVEL 1 climb per robot
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`font-bold text-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    +{SCORING_VALUES.teleop_tower_level1} pts
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.teleop_tower_level1 && !formData.teleop_tower_level2 && !formData.teleop_tower_level3}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          handleInputChange('teleop_tower_level1', true);
                          handleInputChange('teleop_tower_level2', false);
                          handleInputChange('teleop_tower_level3', false);
                        } else {
                          handleInputChange('teleop_tower_level1', false);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
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
                      TOWER LEVEL 2
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      BUMPERS completely above LOW RUNG
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`font-bold text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    +{SCORING_VALUES.teleop_tower_level2} pts
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.teleop_tower_level2 && !formData.teleop_tower_level3}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          handleInputChange('teleop_tower_level2', true);
                          handleInputChange('teleop_tower_level1', false);
                          handleInputChange('teleop_tower_level3', false);
                        } else {
                          handleInputChange('teleop_tower_level2', false);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 rounded-xl space-y-3 sm:space-y-0 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <CheckCircle className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      TOWER LEVEL 3
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      BUMPERS completely above MID RUNG
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`font-bold text-lg ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    +{SCORING_VALUES.teleop_tower_level3} pts
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.teleop_tower_level3}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          handleInputChange('teleop_tower_level3', true);
                          handleInputChange('teleop_tower_level1', false);
                          handleInputChange('teleop_tower_level2', false);
                        } else {
                          handleInputChange('teleop_tower_level3', false);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Note: TOWER levels are mutually exclusive - only the highest level achieved counts. Each robot earns points for only one LEVEL.
            </div>
          </div>

          {/* Total Points Display */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold">Total Teleop Points:</span>
              <span className="text-primary text-2xl font-bold">{calculateTotal()}</span>
            </div>
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
              const totalFuel = getTotalFuel();
              // Include current shift in the shifts array when submitting
              const allShifts = currentShiftFuel > 0 
                ? [...fuelShifts, currentShiftFuel]
                : fuelShifts;
              onNext({
                ...formData,
                teleop_fuel_active_hub: totalFuel,
                teleop_fuel_shifts: allShifts.length > 0 ? allShifts : undefined,
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

export default TeleopForm;
