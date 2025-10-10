import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { Button } from '../ui';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Target,
  Zap,
  Trophy,
  FileText,
  Eye,
  ArrowLeft,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import MatchDetailsForm from './MatchDetailsForm';
import AutonomousForm from './AutonomousForm';
import TeleopForm from './TeleopForm';
import EndgameForm from './EndgameForm';
import MiscellaneousForm from './MiscellaneousForm';
import { ScoringNotes } from '@/lib/types';
import { calculateScore } from '@/lib/utils';

type ScoutingStep = 'match-details' | 'autonomous' | 'teleop' | 'endgame' | 'miscellaneous' | 'review';

interface FormData {
  matchData: {
    match_id: string;
    event_key: string;
    match_number: number;
    red_teams: Array<{
      team_number: number;
      team_name: string;
      team_color: string;
    }>;
    blue_teams: Array<{
      team_number: number;
      team_name: string;
      team_color: string;
    }>;
  };
  teamNumber: number;
  allianceColor: 'red' | 'blue';
  alliancePosition: 1 | 2 | 3;
  autonomous: Partial<ScoringNotes>;
  teleop: Partial<ScoringNotes>;
  endgame: Partial<ScoringNotes>;
  miscellaneous: {
    defense_rating: number;
    comments: string;
  };
}

interface MobileScoutFormProps {
  onSubmit: (data: FormData) => void;
  user: any;
}

export default function MobileScoutForm({ onSubmit, user }: MobileScoutFormProps) {
  const [currentStep, setCurrentStep] = useState<ScoutingStep>('match-details');
  const [formData, setFormData] = useState<FormData>({
    matchData: {
      match_id: '',
      event_key: '',
      match_number: 0,
      red_teams: [],
      blue_teams: [],
    },
    teamNumber: 0,
    allianceColor: 'red',
    alliancePosition: 1,
    autonomous: {},
    teleop: {},
    endgame: {},
    miscellaneous: {
      defense_rating: 0,
      comments: '',
    },
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const steps = [
    { id: 'match-details', title: 'Match Details', icon: Target, shortTitle: 'Match' },
    { id: 'autonomous', title: 'Autonomous', icon: Zap, shortTitle: 'Auto' },
    { id: 'teleop', title: 'Teleop', icon: Target, shortTitle: 'Teleop' },
    { id: 'endgame', title: 'Endgame', icon: Trophy, shortTitle: 'End' },
    { id: 'miscellaneous', title: 'Miscellaneous', icon: FileText, shortTitle: 'Misc' },
    { id: 'review', title: 'Review', icon: Eye, shortTitle: 'Review' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const validateStep = (step: ScoutingStep): boolean => {
    switch (step) {
      case 'match-details':
        // Required: Match ID, Team Number, Alliance Position
        if (!formData.matchData.match_id) return false;
        if (!formData.teamNumber) return false;
        if (!formData.alliancePosition) return false;
        return true;
      
      case 'autonomous':
        // Required: At least some autonomous data
        const autonomousKeys = Object.keys(formData.autonomous);
        if (autonomousKeys.length === 0) return false;
        const hasAutonomousData = autonomousKeys.some(key => {
          const value = formData.autonomous[key as keyof typeof formData.autonomous];
          return value !== undefined && value !== null && value !== 0 && value !== '';
        });
        return hasAutonomousData;
      
      case 'teleop':
        // Required: At least some teleop data
        const teleopKeys = Object.keys(formData.teleop);
        if (teleopKeys.length === 0) return false;
        const hasTeleopData = teleopKeys.some(key => {
          const value = formData.teleop[key as keyof typeof formData.teleop];
          return value !== undefined && value !== null && value !== 0 && value !== '';
        });
        return hasTeleopData;
      
      case 'endgame':
        // Required: At least some endgame data
        const endgameKeys = Object.keys(formData.endgame);
        if (endgameKeys.length === 0) return false;
        const hasEndgameData = endgameKeys.some(key => {
          const value = formData.endgame[key as keyof typeof formData.endgame];
          return value !== undefined && value !== null && value !== 0 && value !== '';
        });
        return hasEndgameData;
      
      case 'miscellaneous':
        // Required: Defense rating (1-10)
        if (formData.miscellaneous.defense_rating === 0) return false;
        return true;
      
      case 'review':
        // Review step doesn't need validation
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    setValidationError(null);
    
    if (validateStep(currentStep)) {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStep(steps[currentStepIndex + 1].id as ScoutingStep);
      }
    } else {
      // Show validation error
      let errorMessage = '';
      switch (currentStep) {
        case 'match-details':
          errorMessage = 'Please select a match, team, and alliance position.';
          break;
        case 'autonomous':
          errorMessage = 'Please fill in at least one autonomous capability.';
          break;
        case 'teleop':
          errorMessage = 'Please fill in at least one teleop capability.';
          break;
        case 'endgame':
          errorMessage = 'Please fill in at least one endgame capability.';
          break;
        case 'miscellaneous':
          errorMessage = 'Please provide a defense rating (1-10).';
          break;
        default:
          errorMessage = 'Please complete all required fields before proceeding.';
      }
      setValidationError(errorMessage);
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id as ScoutingStep);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Mobile Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Scouting Session</h1>
          <Badge variant="outline" className="text-sm">
            Step {currentStepIndex + 1} of {steps.length}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Mobile Step Indicators */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center min-w-0 flex-1">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors mb-2
                  ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                    isCurrent ? 'border-primary text-primary bg-primary/10' : 'border-muted text-muted-foreground'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-xs font-medium text-center ${
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.shortTitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card className="mb-6 w-full max-w-sm mx-auto sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl">
        <CardContent className="p-4">
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-500/20 text-orange-400 p-3 rounded-md text-sm text-center flex items-center justify-center mb-4"
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              {validationError}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {currentStep === 'match-details' && (
              <motion.div
                key="match-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MatchDetailsForm
                  onNext={(matchData, teamNumber, allianceColor, alliancePosition) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      matchData, 
                      teamNumber, 
                      allianceColor,
                      alliancePosition
                    }));
                    handleNext();
                  }}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              </motion.div>
            )}

            {currentStep === 'autonomous' && (
              <motion.div
                key="autonomous"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AutonomousForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, autonomous: data }));
                    handleNext();
                  }}
                  onBack={handleBack}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              </motion.div>
            )}

            {currentStep === 'teleop' && (
              <motion.div
                key="teleop"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TeleopForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, teleop: data }));
                    handleNext();
                  }}
                  onBack={handleBack}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                  isDarkMode={true}
                />
              </motion.div>
            )}

            {currentStep === 'endgame' && (
              <motion.div
                key="endgame"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <EndgameForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, endgame: data }));
                    handleNext();
                  }}
                  onBack={handleBack}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              </motion.div>
            )}

            {currentStep === 'miscellaneous' && (
              <motion.div
                key="miscellaneous"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MiscellaneousForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, miscellaneous: data }));
                    handleNext();
                  }}
                  onBack={handleBack}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              </motion.div>
            )}

            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Review Scouting Data</h2>
                    <p className="text-muted-foreground text-sm">
                      Please review your data before submitting
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Target className="w-5 h-5 text-primary" />
                          <span>Match Details</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Match ID:</span>
                          <span className="font-medium">{formData.matchData.match_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Event:</span>
                          <span className="font-medium">{formData.matchData.event_key}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Match Number:</span>
                          <span className="font-medium">{formData.matchData.match_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Team:</span>
                          <span className="font-medium">{formData.teamNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Alliance:</span>
                          <Badge variant={formData.allianceColor === 'red' ? 'destructive' : 'default'}>
                            {formData.allianceColor}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Scoring Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Autonomous:</span>
                          <span className="font-medium">{calculateScore(formData.autonomous).final_score} pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Teleop:</span>
                          <span className="font-medium">{calculateScore(formData.teleop).final_score} pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Endgame:</span>
                          <span className="font-medium">{calculateScore(formData.endgame).final_score} pts</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Score:</span>
                            <span className="text-primary">
                              {calculateScore(formData.autonomous).final_score + 
                               calculateScore(formData.teleop).final_score + 
                               calculateScore(formData.endgame).final_score} pts
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Defense Rating:</span>
                          <span className="font-medium">{formData.miscellaneous.defense_rating}/10</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Mobile Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        {currentStepIndex === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Submit
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="flex-1"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
