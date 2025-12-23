import React, { useState } from 'react';
import { useSupabase } from '@/pages/_app';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { Button } from '../components/ui';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Target,
  Zap,
  Trophy,
  FileText,
  Eye,
  AlertCircle
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
import { cn } from '@/lib/utils';

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

export default function Scout() {
  const { user, loading } = useSupabase();
  const [currentStep, setCurrentStep] = useState<ScoutingStep>('match-details');
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
      defense_rating: 0,
      comments: '',
    },
  });

  const steps = [
    { id: 'match-details', title: 'Match', icon: Target, description: "Setup" },
    { id: 'autonomous', title: 'Auto', icon: Zap, description: "Phase 1" },
    { id: 'teleop', title: 'Teleop', icon: Target, description: "Phase 2" },
    { id: 'endgame', title: 'Endgame', icon: Trophy, description: "Phase 3" },
    { id: 'miscellaneous', title: 'Notes', icon: FileText, description: "Extra" },
    { id: 'review', title: 'Review', icon: Eye, description: "Finalize" },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

  const handleStepNext = (nextStep: ScoutingStep) => {
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/scouting_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(scoutingData),
      });

      if (response.ok) {
        // Success animation or toast ideally
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
            defense_rating: 0,
            comments: '',
          },
        });
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

  if (!user) return null;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header & Progress */}
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                  Match Scouting
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="glass border-white/10 text-xs">
                    Match {formData.matchData.match_number || '-'}
                  </Badge>
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <ChevronRight size={14} />
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                </div>
              </div>

              {/* Desktop Progress Steps */}
              <div className="hidden lg:flex items-center bg-black/20 backdrop-blur-xl p-1.5 rounded-full border border-white/5">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.id} className="flex items-center">
                      <motion.div
                        className={cn(
                          "relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all duration-300",
                          isCompleted ? "bg-primary text-primary-foreground" :
                            isCurrent ? "bg-white text-black scale-110" : "text-muted-foreground hover:bg-white/5"
                        )}
                        onClick={() => {
                          // Only allow clicking provided specific conditions if needed, 
                          // typically in linear flows we might restriction jumping forward
                          if (index < currentStepIndex) {
                            // Can go back
                            setCurrentStep(step.id as ScoutingStep);
                          }
                        }}
                      >
                        {isCompleted ? <CheckCircle size={14} /> : <span>{index + 1}</span>}

                        {isCurrent && (
                          <motion.span
                            layoutId="step-glow"
                            className="absolute inset-0 rounded-full bg-white/50 blur-md -z-10"
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </motion.div>

                      {index < steps.length - 1 && (
                        <div className={cn(
                          "w-6 h-0.5 mx-1 transition-colors duration-300",
                          index < currentStepIndex ? "bg-primary/50" : "bg-white/5"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Progress Bar */}
            <div className="lg:hidden">
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{steps[currentStepIndex].title}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden relative min-h-[500px] flex flex-col">
            {/* Background styling element */}
            <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-32 bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="p-6 md:p-8 flex-1 relative z-10">
              <AnimatePresence mode="wait">
                {currentStep === 'match-details' && (
                  <motion.div
                    key="match-details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
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
                        handleStepNext('autonomous');
                      }}
                      currentStep={currentStepIndex}
                      totalSteps={steps.length}
                      initialData={{
                        matchData: formData.matchData.match_id ? formData.matchData : undefined,
                        teamNumber: formData.teamNumber || undefined,
                        allianceColor: formData.allianceColor,
                        alliancePosition: formData.alliancePosition,
                      }}
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
                        handleStepNext('teleop');
                      }}
                      onBack={() => setCurrentStep('match-details')}
                      currentStep={currentStepIndex}
                      totalSteps={steps.length}
                      initialData={formData.autonomous}
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
                        handleStepNext('endgame');
                      }}
                      onBack={() => setCurrentStep('autonomous')}
                      currentStep={currentStepIndex}
                      totalSteps={steps.length}
                      isDarkMode={true}
                      initialData={formData.teleop}
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
                        handleStepNext('miscellaneous');
                      }}
                      onBack={() => setCurrentStep('teleop')}
                      currentStep={currentStepIndex}
                      totalSteps={steps.length}
                      initialData={formData.endgame}
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
                        handleStepNext('review');
                      }}
                      onBack={() => setCurrentStep('endgame')}
                      currentStep={currentStepIndex}
                      totalSteps={steps.length}
                      initialData={formData.miscellaneous}
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
                    <div className="space-y-8">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-foreground">Review & Submit</h2>
                        <p className="text-muted-foreground">Double check your data before finalizing</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Target size={16} className="text-primary" /> Match Info
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                              <span className="text-muted-foreground">Match</span>
                              <span className="font-mono">{formData.matchData.match_number}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                              <span className="text-muted-foreground">Team</span>
                              <span className="font-mono text-primary font-bold">{formData.teamNumber}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-white/5 rounded-lg">
                              <span className="text-muted-foreground">Alliance</span>
                              <Badge variant={formData.allianceColor === 'red' ? 'destructive' : 'default'}>
                                {formData.allianceColor.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="glass bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Trophy size={16} className="text-yellow-500" /> Score Preview
                          </h3>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center py-1">
                              <span className="text-sm text-muted-foreground">Autonomous</span>
                              <span className="font-mono">{calculateScore(formData.autonomous).final_score}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-sm text-muted-foreground">Teleop</span>
                              <span className="font-mono">{calculateScore(formData.teleop).final_score}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-sm text-muted-foreground">Endgame</span>
                              <span className="font-mono">{calculateScore(formData.endgame).final_score}</span>
                            </div>
                            <div className="border-t border-white/10 my-2 pt-2 flex justify-between items-center font-bold text-lg">
                              <span>Total</span>
                              <span className="text-primary">{
                                calculateScore(formData.autonomous).final_score +
                                calculateScore(formData.teleop).final_score +
                                calculateScore(formData.endgame).final_score
                              }</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep('miscellaneous')}
                          className="flex-1 h-12 border-white/10 hover:bg-white/5"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25"
                        >
                          {isSubmitting ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Submitting...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle size={18} /> Confirm & Submit
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
