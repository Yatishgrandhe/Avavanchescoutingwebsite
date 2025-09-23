import React, { useState } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Circle,
  Target,
  Zap,
  Trophy,
  FileText,
  Eye
} from 'lucide-react';
import MatchDetailsForm from '@/components/scout/MatchDetailsForm';
import AutonomousForm from '@/components/scout/AutonomousForm';
import TeleopForm from '@/components/scout/TeleopForm';
import EndgameForm from '@/components/scout/EndgameForm';
import MiscellaneousForm from '@/components/scout/MiscellaneousForm';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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
  autonomous: Partial<ScoringNotes>;
  teleop: Partial<ScoringNotes>;
  endgame: Partial<ScoringNotes>;
  miscellaneous: {
    defense_rating: number;
    comments: string;
  };
}

export default function Scout() {
  const { user, loading } = useSupabase();
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
    autonomous: {},
    teleop: {},
    endgame: {},
    miscellaneous: {
      defense_rating: 0,
      comments: '',
    },
  });

  const steps = [
    { id: 'match-details', title: 'Match Details', icon: Target },
    { id: 'autonomous', title: 'Autonomous', icon: Zap },
    { id: 'teleop', title: 'Teleop', icon: Target },
    { id: 'endgame', title: 'Endgame', icon: Trophy },
    { id: 'miscellaneous', title: 'Miscellaneous', icon: FileText },
    { id: 'review', title: 'Review', icon: Eye },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleSubmit = async () => {
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
        autonomous_points: autonomousPoints,
        teleop_points: teleopPoints,
        endgame_points: endgamePoints,
        final_score: finalScore,
        defense_rating: formData.miscellaneous.defense_rating,
        comments: formData.miscellaneous.comments,
        notes: {
          autonomous: formData.autonomous,
          teleop: formData.teleop,
          endgame: formData.endgame,
        },
      };

      const response = await fetch('/api/scouting_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          autonomous: {},
          teleop: {},
          endgame: {},
          miscellaneous: {
            defense_rating: 0,
            comments: '',
          },
        });
      } else {
        throw new Error('Failed to submit scouting data');
      }
    } catch (error) {
      console.error('Error submitting scouting data:', error);
      alert('Error submitting scouting data. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // ProtectedRoute will handle the redirect
  }

  return (
    <ProtectedRoute>
    <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Scouting Session</h1>
                <p className="text-muted-foreground">
                  Collect comprehensive match data for FRC 2025
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                Step {currentStepIndex + 1} of {steps.length}
              </Badge>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                      ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                        isCurrent ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <Separator className="w-8 mx-4" orientation="horizontal" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <Card>
            <CardContent className="p-6">
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
                      onNext={(matchData, teamNumber, allianceColor) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          matchData, 
                          teamNumber, 
                          allianceColor 
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
                        setCurrentStep('endgame');
                      }}
                      onBack={() => setCurrentStep('autonomous')}
                      currentStep={currentStepIndex}
                      totalSteps={steps.length}
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
                        setCurrentStep('miscellaneous');
                      }}
                      onBack={() => setCurrentStep('teleop')}
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
                        setCurrentStep('review');
                      }}
                      onBack={() => setCurrentStep('endgame')}
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
                        <h2 className="text-2xl font-bold mb-2">Review Scouting Data</h2>
                        <p className="text-muted-foreground">
                          Please review your data before submitting
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg text-white font-inter flex items-center space-x-2">
                              <Target className="w-5 h-5 text-blue-400" />
                              <span>Match Details</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-inter">Match ID:</span>
                              <span className="font-medium text-white font-inter">{formData.matchData.match_id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-inter">Event:</span>
                              <span className="font-medium text-white font-inter">{formData.matchData.event_key}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-inter">Match Number:</span>
                              <span className="font-medium text-white font-inter">{formData.matchData.match_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-inter">Team:</span>
                              <span className="font-medium text-white font-inter">{formData.teamNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-inter">Alliance:</span>
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
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
            <span>Total Score:</span>
            <span className="text-primary">{calculateScore(formData.autonomous).final_score + calculateScore(formData.teleop).final_score + calculateScore(formData.endgame).final_score} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Defense Rating:</span>
                              <span className="font-medium">{formData.miscellaneous.defense_rating}/10</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep('miscellaneous')}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
        <Button
          onClick={handleSubmit}
          size="lg"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Submit Scouting Data
        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
