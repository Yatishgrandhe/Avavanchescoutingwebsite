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
  ArrowRight
} from 'lucide-react';
import MatchDetailsForm from './MatchDetailsForm';
import AutonomousForm from './AutonomousForm';
import TeleopForm from './TeleopForm';
import MiscellaneousForm from './MiscellaneousForm';
import { ScoringNotes } from '@/lib/types';
import { calculateScore } from '@/lib/utils';

type ScoutingStep = 'match-details' | 'autonomous' | 'teleop' | 'miscellaneous' | 'review';

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
    miscellaneous: {
      defense_rating: 0,
      comments: '',
    },
  });

  const steps = [
    { id: 'match-details', title: 'Match Details', icon: Target, shortTitle: 'Match' },
    { id: 'autonomous', title: 'Autonomous', icon: Zap, shortTitle: 'Auto' },
    { id: 'teleop', title: 'Teleop', icon: Target, shortTitle: 'Teleop' },
    { id: 'miscellaneous', title: 'Miscellaneous', icon: FileText, shortTitle: 'Misc' },
    { id: 'review', title: 'Review', icon: Eye, shortTitle: 'Review' },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id as ScoutingStep);
    }
  };

  const handleBack = () => {
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
                    setCurrentStep('autonomous');
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
                    setCurrentStep('teleop');
                  }}
                  onBack={() => setCurrentStep('match-details')}
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
                    setCurrentStep('miscellaneous');
                  }}
                  onBack={() => setCurrentStep('autonomous')}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                  isDarkMode={true}
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
                    setCurrentStep('review');
                  }}
                  onBack={() => setCurrentStep('teleop')}
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
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total Score:</span>
                            <span className="text-primary">
                              {calculateScore(formData.autonomous).final_score + 
                               calculateScore(formData.teleop).final_score} pts
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
