import React, { useState } from 'react';
import { useSupabase } from '@/pages/_app';
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
  Home
} from 'lucide-react';
import MatchDetailsForm from '@/components/scout/MatchDetailsForm';
import AutonomousForm from '@/components/scout/AutonomousForm';
import TeleopForm from '@/components/scout/TeleopForm';
import MiscellaneousForm from '@/components/scout/MiscellaneousForm';
import { ScoringNotes } from '@/lib/types';
import { calculateScore, formatDurationSec } from '@/lib/utils';
import { useRouter } from 'next/router';
import { addToOfflineQueue } from '@/lib/offline-queue';
import { useScoutingLocks } from '@/hooks/use-scouting-locks';
import { AlertCircle, Lock } from 'lucide-react';

type ScoutingStep = 'match-details' | 'autonomous' | 'teleop' | 'miscellaneous' | 'review';

interface FormData {
  scoutName: string;
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
    average_downtime: number | null;
    broke: boolean | null;
  };
}

export default function MobileScout() {
  const { user, loading: userLoading, supabase } = useSupabase();
  const { matchScoutingLocked, loading: locksLoading } = useScoutingLocks();
  const loading = userLoading;
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ScoutingStep>('match-details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    scoutName: '',
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
      average_downtime: null,
      broke: null,
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



  const handleStepNext = (nextStep: ScoutingStep) => {
    // Forms handle their own validation, so we can proceed directly
    setCurrentStep(nextStep);
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
      const finalScore = autonomousPoints + teleopPoints;

      const misc = formData.miscellaneous;
      const scoutingData = {
        match_id: formData.matchData.match_id,
        team_number: formData.teamNumber,
        alliance_color: formData.allianceColor,
        alliance_position: formData.alliancePosition,
        autonomous_points: autonomousPoints,
        teleop_points: teleopPoints,
        final_score: finalScore,
        defense_rating: misc.defense_rating,
        comments: misc.comments,
        average_downtime: misc.average_downtime ?? undefined,
        broke: misc.broke ?? undefined,
        shuttling: formData.teleop?.shuttle === true,
        shuttling_consistency: formData.teleop?.shuttle === true ? formData.teleop?.shuttle_consistency : undefined,
        organization_id: user?.organization_id,
        scout_id: user?.id,
        submitted_by_email: user?.email,
        // Use username from user_metadata: full_name, username (Discord), or name
        submitted_by_name: formData.scoutName?.trim() || user?.email || 'Unknown',
        submitted_at: new Date().toISOString(),
        notes: {
          autonomous: formData.autonomous,
          teleop: {
            ...formData.teleop,
            shuttle: formData.teleop?.shuttle === true,
            shuttle_consistency: formData.teleop?.shuttle === true ? formData.teleop?.shuttle_consistency : undefined,
            shuttle_runs: formData.teleop?.shuttle === true ? (formData.teleop?.shuttle_runs || []) : [],
          },
        },
        miscellaneous: {
          defense_rating: misc.defense_rating,
          comments: misc.comments,
          average_downtime: misc.average_downtime,
          broke: misc.broke,
        },
      };

      try {
        await addToOfflineQueue('match-scouting', scoutingData, {
          competitionKey: formData.matchData.event_key,
          organizationId: user?.organization_id || '',
          teamNumber: formData.teamNumber,
          matchKey: formData.matchData.match_id,
        });
        
        // Dispatch event for SyncButton
        window.dispatchEvent(new Event('offline-queue-updated'));
        
        alert('Saved locally! Click "Submit Pending" in the menu to upload.');
        
        // Reset form or redirect
        setCurrentStep('match-details');
        setFormData({
          scoutName: '',
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
            average_downtime: null,
            broke: null,
          },
        });
        router.push('/');
      } catch (err) {
        throw new Error('Failed to save form locally. Your browser might not support local storage or it is full.');
      }
    } catch (error) {
      console.error('Error submitting scouting data:', error);
      alert(error instanceof Error ? error.message : 'Error saving scouting data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || (locksLoading && !userLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[100vh] bg-background">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse text-sm font-medium">Initialising mobile session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  if (!locksLoading && matchScoutingLocked) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md border-amber-500/50 bg-amber-500/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Scouting is Locked
            </CardTitle>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-2">
              An administrator has locked the match scouting form for this organization. 
              Submissions are disabled until it is unlocked in <strong>Team Management</strong>.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button variant="secondary" onClick={() => router.push('/')} className="w-full">
                <Home className="mr-2 h-4 w-4" /> Return Home
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/team-management')} className="w-full">
                Go to Team Management
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
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

        {/* Responsive Step Indicators */}
        <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1 sm:gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center min-w-0 flex-1">
                <div className={`
                  flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-colors mb-1 sm:mb-2
                  ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                    isCurrent ? 'border-primary text-primary bg-primary/10' : 'border-muted text-muted-foreground'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
                <span className={`text-xs sm:text-sm font-medium text-center leading-tight ${
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

        <Card className="mb-6 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] max-w-4xl mx-auto">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-[500px]"
              >
                {currentStep === 'match-details' && (
                  <MatchDetailsForm
                    onNext={(matchData, teamNumber, allianceColor, alliancePosition, scoutName) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        matchData, 
                        teamNumber, 
                        allianceColor,
                        alliancePosition,
                        scoutName,
                      }));
                      handleStepNext('autonomous');
                    }}
                    currentStep={currentStepIndex}
                    totalSteps={steps.length}
                    initialData={{
                      matchData: formData.matchData.match_id ? formData.matchData : undefined,
                      teamNumber: formData.teamNumber || undefined,
                      allianceColor: formData.allianceColor,
                      alliancePosition: formData.alliancePosition,
                      scoutName: formData.scoutName,
                    }}
                  />
                )}

                {currentStep === 'autonomous' && (
                  <AutonomousForm
                    onNext={(data) => {
                      setFormData(prev => ({ ...prev, autonomous: data }));
                      setCurrentStep('teleop');
                    }}
                    onBack={() => setCurrentStep('match-details')}
                    currentStep={currentStepIndex}
                    totalSteps={steps.length}
                    initialData={formData.autonomous}
                  />
                )}

                {currentStep === 'teleop' && (
                  <TeleopForm
                    onNext={(data) => {
                      setFormData(prev => ({ ...prev, teleop: data }));
                      setCurrentStep('miscellaneous');
                    }}
                    onBack={() => setCurrentStep('autonomous')}
                    currentStep={currentStepIndex}
                    totalSteps={steps.length}
                    isDarkMode={true}
                    initialData={formData.teleop}
                  />
                )}

                {currentStep === 'miscellaneous' && (
                  <MiscellaneousForm
                    onNext={(data) => {
                      setFormData((prev) => ({
                        ...prev,
                        miscellaneous: {
                          ...prev.miscellaneous,
                          ...data,
                        },
                      }));
                      setCurrentStep('review');
                    }}
                    onBack={() => setCurrentStep('teleop')}
                    onDataChange={(data) =>
                      setFormData((prev) => ({
                        ...prev,
                        miscellaneous: { ...prev.miscellaneous, ...data },
                      }))
                    }
                    currentStep={currentStepIndex}
                    totalSteps={steps.length}
                    initialData={formData.miscellaneous}
                  />
                )}

                {currentStep === 'review' && (
                  <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Review & Submit</h2>
                    <p className="text-muted-foreground text-sm">Verify fuel timing and score before submitting</p>
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
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Fuel timing</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Auto fuel:</span>
                            <span className="font-mono font-medium">{formData.autonomous?.auto_fuel_active_hub ?? 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Teleop fuel:</span>
                            <span className="font-mono font-medium">{formData.teleop?.teleop_fuel_active_hub ?? 0}</span>
                          </div>
                          {((formData.autonomous?.runs?.length ?? 0) > 0 || (formData.teleop?.runs?.length ?? 0) > 0 || (formData.teleop?.shuttle_runs?.length ?? 0) > 0) && (
                            <p className="text-xs text-muted-foreground pt-1">
                              Runs — Auto: {formData.autonomous?.runs?.length ?? 0} · Teleop: {formData.teleop?.runs?.length ?? 0} · Shuttle: {formData.teleop?.shuttle_runs?.length ?? 0}
                            </p>
                          )}
                        </div>
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Climb timing</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Auto climb:</span>
                            <span className="font-mono font-medium">
                              {formData.autonomous?.auto_climb ? `Yes ${formData.autonomous?.auto_climb_level || ''}`.trim() : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Auto climb time:</span>
                            <span className="font-mono font-medium">{formData.autonomous?.auto_climb_sec != null ? formatDurationSec(Number(formData.autonomous.auto_climb_sec)) : '—'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Teleop climb:</span>
                            <span className="font-mono font-medium">
                              {formData.teleop?.teleop_climb ? `Yes ${formData.teleop?.teleop_climb_level || ''}`.trim() : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Teleop climb time:</span>
                            <span className="font-mono font-medium">{formData.teleop?.climb_sec != null ? formatDurationSec(Number(formData.teleop.climb_sec)) : '—'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between border-t border-muted pt-2 mt-2">
                          <span className="text-muted-foreground">Defense Rating:</span>
                          <span className="font-medium">{formData.miscellaneous.defense_rating}/10</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              </motion.div>
            </div>
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
                  handleStepNext(steps[currentStepIndex + 1].id as ScoutingStep);
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
