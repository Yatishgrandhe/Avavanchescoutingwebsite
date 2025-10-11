import React, { useState } from 'react';
import { useSupabase } from '@/pages/_app';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { Button } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  Home,
  AlertCircle
} from 'lucide-react';
import MatchDetailsForm from '@/components/scout/MatchDetailsForm';
import AutonomousForm from '@/components/scout/AutonomousForm';
import TeleopForm from '@/components/scout/TeleopForm';
import EndgameForm from '@/components/scout/EndgameForm';
import MiscellaneousForm from '@/components/scout/MiscellaneousForm';
import { ScoringNotes } from '@/lib/types';
import { calculateScore } from '@/lib/utils';
import { useRouter } from 'next/router';

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

export default function MobileScout() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ScoutingStep>('match-details');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      defense_rating: 1,
      comments: '',
    },
  });

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
        // Required: Match selection and team selection
        if (!formData.matchData.match_id) return false;
        if (!formData.teamNumber) return false;
        return true;
      
      case 'autonomous':
        // Autonomous form doesn't have required fields marked with *
        return true;
      
      case 'teleop':
        // Teleop form doesn't have required fields marked with *
        return true;
      
      case 'endgame':
        // Required: Endgame selection (including "none" as a valid selection)
        const hasEndgameSelection = Boolean(
          formData.endgame.endgame_park || 
          formData.endgame.endgame_shallow_cage || 
          formData.endgame.endgame_deep_cage ||
          // Check if all are false (which means "none" was selected)
          (formData.endgame.endgame_park === false && 
           formData.endgame.endgame_shallow_cage === false && 
           formData.endgame.endgame_deep_cage === false)
        );
        return hasEndgameSelection;
      
      case 'miscellaneous':
        // Required: Defense rating and comments
        if (!formData.miscellaneous.defense_rating || formData.miscellaneous.defense_rating < 1) return false;
        if (!formData.miscellaneous.comments.trim()) return false;
        return true;
      
      case 'review':
        return true;
      
      default:
        return true;
    }
  };

  const handleStepNext = (nextStep: ScoutingStep) => {
    setValidationError(null);
    
    // Skip validation for match-details as MatchDetailsForm handles its own validation
    if (currentStep === 'match-details') {
      setCurrentStep(nextStep);
      return;
    }
    
    // Validate the current step before proceeding to next step
    if (validateStep(currentStep)) {
      setCurrentStep(nextStep);
    } else {
      // Only show validation error and mark as interacted when validation fails
      setHasInteracted(true);
      let errorMessage = '';
      switch (currentStep) {
        case 'endgame':
          errorMessage = 'Please select an endgame score (including "No Endgame Score") before proceeding.';
          break;
        case 'miscellaneous':
          errorMessage = 'Please provide a defense rating and comments before proceeding.';
          break;
        default:
          errorMessage = 'Please complete all required fields before proceeding.';
      }
      setValidationError(errorMessage);
    }
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Calculate final score using the scoring values
      const autonomousPoints = calculateScore(formData.autonomous).final_score;
      const teleopPoints = calculateScore(formData.teleop).final_score;
      const endgamePoints = calculateScore(formData.endgame).final_score;
      const finalScore = autonomousPoints + teleopPoints + endgamePoints;

      const scoutingData = {
        match_id: formData.matchData.match_id,
        team_number: formData.teamNumber,
        alliance_color: formData.allianceColor,
        alliance_position: formData.alliancePosition,
        autonomous_points: autonomousPoints,
        teleop_points: teleopPoints,
        endgame_points: endgamePoints,
        final_score: finalScore,
        defense_rating: formData.miscellaneous.defense_rating,
        comments: formData.miscellaneous.comments,
        scout_id: user?.id,
        submitted_by_email: user?.email,
        submitted_by_name: user?.user_metadata?.full_name || user?.email,
        submitted_at: new Date().toISOString(),
        notes: {
          autonomous: formData.autonomous,
          teleop: formData.teleop,
          endgame: formData.endgame,
        },
      };

      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/scouting_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(scoutingData),
      });

      if (response.ok) {
        alert('Scouting data submitted successfully!');
        // Reset form or redirect
        setCurrentStep('match-details');
        setFormData({
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
            defense_rating: 1,
            comments: '',
          },
        });
        router.push('/');
      } else {
        throw new Error('Failed to submit scouting data');
      }
    } catch (error) {
      console.error('Error submitting scouting data:', error);
      alert('Error submitting scouting data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="bg-card border-b border-border p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="p-1 sm:p-2"
            >
              <Home size={18} className="sm:w-5 sm:h-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Scouting Session</h1>
          </div>
          <Badge variant="outline" className="text-xs sm:text-sm">
            Step {currentStepIndex + 1} of {steps.length}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2 mb-3 sm:mb-4">
          <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 sm:h-3" />
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
      <div className="p-4">
        <div className="min-h-[60px] mb-4">
          {validationError && hasInteracted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-500/20 text-orange-400 p-3 rounded-md text-sm text-center flex items-center justify-center"
            >
              <AlertCircle className="h-5 w-5 mr-2" />
              {validationError}
            </motion.div>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 'match-details' && (
                <MatchDetailsForm
                  onNext={(matchData, teamNumber, allianceColor, alliancePosition) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      matchData, 
                      teamNumber, 
                      allianceColor,
                      alliancePosition
                    }));
                    setValidationError(null); // Clear any validation errors
                    handleStepNext('autonomous');
                  }}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              )}

              {currentStep === 'autonomous' && (
                <AutonomousForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, autonomous: data }));
                    handleStepNext('teleop');
                  }}
                  onBack={() => setCurrentStep('match-details')}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              )}

              {currentStep === 'teleop' && (
                <TeleopForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, teleop: data }));
                    handleStepNext('endgame');
                  }}
                  onBack={() => setCurrentStep('autonomous')}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                  isDarkMode={true}
                />
              )}

              {currentStep === 'endgame' && (
                <EndgameForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, endgame: data }));
                    handleStepNext('miscellaneous');
                  }}
                  onBack={() => setCurrentStep('teleop')}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              )}

              {currentStep === 'miscellaneous' && (
                <MiscellaneousForm
                  onNext={(data) => {
                    setFormData(prev => ({ ...prev, miscellaneous: data }));
                    handleStepNext('review');
                  }}
                  onBack={() => setCurrentStep('endgame')}
                  currentStep={currentStepIndex}
                  totalSteps={steps.length}
                />
              )}

              {currentStep === 'review' && (
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
              )}
            </motion.div>
          </CardContent>
        </Card>

        {/* Mobile Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStepIndex > 0) {
                setCurrentStep(steps[currentStepIndex - 1].id as ScoutingStep);
              }
            }}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (currentStepIndex < steps.length - 1) {
                  setCurrentStep(steps[currentStepIndex + 1].id as ScoutingStep);
                }
              }}
              className="flex-1"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
