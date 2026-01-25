import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Counter, Badge } from '../ui';
import { SCORING_VALUES, ScoringNotes } from '@/lib/types';
import { Fuel, TrendingUp, CheckCircle, Plus, X, ArrowLeft, ArrowRight, Trophy } from 'lucide-react';

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
  // Initialize fuel shifts - exactly 4 shifts as requested
  const [fuelShifts, setFuelShifts] = useState<number[]>([0, 0, 0, 0]);

  const [formData, setFormData] = useState({
    teleop_tower_level1: (initialData?.teleop_tower_level1 as boolean) || false,
    teleop_tower_level2: (initialData?.teleop_tower_level2 as boolean) || false,
    teleop_tower_level3: (initialData?.teleop_tower_level3 as boolean) || false,
  });

  // Sync initialData with state when it changes
  useEffect(() => {
    if (initialData) {
      if (initialData.teleop_fuel_shifts && Array.isArray(initialData.teleop_fuel_shifts)) {
        const shifts = [...initialData.teleop_fuel_shifts];
        // Ensure we have exactly 4 values
        while (shifts.length < 4) shifts.push(0);
        setFuelShifts(shifts.slice(0, 4));
      } else if (initialData.teleop_fuel_active_hub) {
        // Fallback if only total is provided
        setFuelShifts([initialData.teleop_fuel_active_hub as number, 0, 0, 0]);
      }

      setFormData({
        teleop_tower_level1: (initialData.teleop_tower_level1 as boolean) || false,
        teleop_tower_level2: (initialData.teleop_tower_level2 as boolean) || false,
        teleop_tower_level3: (initialData.teleop_tower_level3 as boolean) || false,
      });
    }
  }, [initialData]);

  const handleShiftChange = (index: number, value: number) => {
    const newShifts = [...fuelShifts];
    newShifts[index] = value;
    setFuelShifts(newShifts);
  };

  const getTotalFuel = () => {
    return fuelShifts.reduce((sum, fuel) => sum + fuel, 0);
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
      <Card className="bg-card border-border shadow-lg">
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
            Scoring for fuel (exactly 4 shifts) and tower climb
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* FUEL Scoring Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 pb-2 border-b border-border/50">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <Fuel className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                FUEL Scoring (4 Shifts)
              </h3>
            </div>

            {/* 4 Fixed Shifts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {fuelShifts.map((fuel, index) => (
                <div key={`shift-${index}`} className="relative group">
                  <div className={`absolute -top-3 left-3 px-2 text-[10px] font-bold uppercase rounded-md z-10 ${isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
                    }`}>
                    Shift {index + 1}
                  </div>
                  <Counter
                    value={fuel}
                    onChange={(value: number) => handleShiftChange(index, value)}
                    min={0}
                    max={100}
                    label=""
                    points={SCORING_VALUES.teleop_fuel_active_hub}
                    isDarkMode={isDarkMode}
                  />
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Total Teleop Fuel Sum:
                </span>
                <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
                  {getTotalFuel()}
                </span>
              </div>
              <Badge variant="outline" className={`${isDarkMode ? 'border-blue-700 text-blue-400' : 'border-blue-300 text-blue-600'}`}>
                {getTotalFuel()} points
              </Badge>
            </div>
          </div>

          {/* TOWER Scoring Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3 pb-2 border-b border-border/50">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                <TrendingUp className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                TOWER Climb
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'teleop_tower_level1', label: 'TOWER LEVEL 1', sub: 'Simple climb per robot', pts: SCORING_VALUES.teleop_tower_level1, color: 'blue' },
                { id: 'teleop_tower_level2', label: 'TOWER LEVEL 2', sub: 'BUMPERS above LOW RUNG', pts: SCORING_VALUES.teleop_tower_level2, color: 'green' },
                { id: 'teleop_tower_level3', label: 'TOWER LEVEL 3', sub: 'BUMPERS above MID RUNG', pts: SCORING_VALUES.teleop_tower_level3, color: 'purple' },
              ].map((level) => (
                <motion.div
                  key={level.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    const isCurrentlyChecked = formData[level.id as keyof typeof formData] as boolean;
                    if (!isCurrentlyChecked) {
                      handleInputChange('teleop_tower_level1', level.id === 'teleop_tower_level1');
                      handleInputChange('teleop_tower_level2', level.id === 'teleop_tower_level2');
                      handleInputChange('teleop_tower_level3', level.id === 'teleop_tower_level3');
                    } else {
                      handleInputChange(level.id as keyof typeof formData, false);
                    }
                  }}
                  className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all border-2 ${formData[level.id as keyof typeof formData]
                    ? `bg-${level.color}-500/10 border-${level.color}-500/50`
                    : 'bg-muted/30 border-transparent hover:bg-muted/50'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${formData[level.id as keyof typeof formData]
                      ? `bg-${level.color}-500 text-white`
                      : 'bg-muted text-muted-foreground'
                      }`}>
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold">{level.label}</h4>
                      <p className="text-xs text-muted-foreground">{level.sub}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${formData[level.id as keyof typeof formData] ? `text-${level.color}-500` : 'text-muted-foreground'
                      }`}>
                      +{level.pts} pts
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Final Summary Card */}
          <div className="relative overflow-hidden p-6 bg-primary/10 border border-primary/30 rounded-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy size={80} className="text-primary" />
            </div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">Estimated Score</p>
                <h3 className="text-foreground text-xl font-bold">Total Teleop Segment</h3>
              </div>
              <div className="text-4xl font-extrabold text-primary animate-pulse">
                {calculateTotal()}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between p-6 bg-muted/20">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            onClick={() => {
              onNext({
                ...formData,
                teleop_fuel_active_hub: getTotalFuel(),
                teleop_fuel_shifts: fuelShifts,
              });
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-md"
          >
            Next Section
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TeleopForm;
