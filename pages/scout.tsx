import React, { useState } from 'react';
import { useSupabase } from '@/pages/_app';
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
import MiscellaneousForm from '@/components/scout/MiscellaneousForm';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ScoringNotes } from '@/lib/types';
import { calculateScore, cn, formatDurationSec } from '@/lib/utils';

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

export default function Scout() {
  const { user, loading, supabase } = useSupabase();
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
    { id: 'match-details', title: 'Match', icon: Target, description: "Setup" },
    { id: 'autonomous', title: 'Auto', icon: Zap, description: "Phase 1" },
    { id: 'teleop', title: 'Teleop', icon: Target, description: "Phase 2" },
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
      const finalScore = autonomousPoints + teleopPoints;

      const scoutingData = {
        match_id: formData.matchData.match_id,
        team_number: formData.teamNumber,
        alliance_color: formData.allianceColor,
        alliance_position: formData.alliancePosition,
        autonomous_points: autonomousPoints,
        teleop_points: teleopPoints,
        final_score: finalScore,
        autonomous_cleansing: 0,
        teleop_cleansing: 0,
        defense_rating: formData.miscellaneous.defense_rating,
        comments: formData.miscellaneous.comments,
        average_downtime: formData.miscellaneous.average_downtime ?? undefined,
        broke: formData.miscellaneous.broke ?? undefined,
        scout_id: user?.id,
        submitted_by_email: user?.email,
        submitted_by_name: formData.scoutName?.trim() || user?.email || 'Unknown',
        submitted_at: new Date().toISOString(),
        notes: {
          autonomous: formData.autonomous,
          teleop: formData.teleop,
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
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-foreground">
                    MATCH SCOUTING
                  </h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {formData.matchData.match_id ? `MATCH #${formData.matchData.match_number}` : 'NO MATCH'}
                    </Badge>
                    <span className="text-muted-foreground/40 text-xs">•</span>
                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
                      Step {currentStepIndex + 1} of {steps.length}
                    </span>
                  </div>
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
            <div className="lg:hidden px-1">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">
                  {steps[currentStepIndex].title}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums leading-none">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="glass-card rounded-2xl border border-white/5 relative min-h-[500px] flex flex-col bg-card/30 backdrop-blur-md">
            <div className="p-4 sm:p-6 md:p-8 flex-1 relative z-10">
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
                        handleStepNext('miscellaneous');
                      }}
                      onBack={() => setCurrentStep('autonomous')}
                      currentStep={currentStepIndex}
                      totalSteps={steps.length}
                      isDarkMode={true}
                      initialData={formData.teleop}
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
                      onBack={() => setCurrentStep('teleop')}
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
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Review & Submit</h2>
                        <div className="flex items-center justify-center gap-2">
                          <span className="h-px w-8 bg-primary/20" />
                          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Verification Phase</p>
                          <span className="h-px w-8 bg-primary/20" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-white/5 border-white/5 overflow-hidden group">
                          <CardHeader className="bg-white/5 border-b border-white/5 py-3">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                              <Target size={14} /> Match Configuration
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground font-medium">Match Number</span>
                              <span className="font-mono font-bold text-lg leading-none">#{formData.matchData.match_number}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground font-medium">Team Number</span>
                              <span className="font-black text-xl text-primary leading-none">{formData.teamNumber}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-3">
                              <span className="text-muted-foreground font-medium text-sm">Alliance</span>
                              <Badge
                                className={cn(
                                  "font-black tracking-widest text-[10px] border-none px-3",
                                  formData.allianceColor === 'red'
                                    ? "bg-red-500/20 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                                    : "bg-blue-500/20 text-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                                )}
                              >
                                {formData.allianceColor.toUpperCase()} {formData.alliancePosition}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/5 overflow-hidden group">
                          <CardHeader className="bg-white/5 border-b border-white/5 py-3">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-yellow-500">
                              <Trophy size={14} /> Performance Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                <span className="text-[10px] font-black text-muted-foreground uppercase block mb-1">Auto</span>
                                <span className="text-lg font-black">{calculateScore(formData.autonomous).final_score}</span>
                              </div>
                              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                <span className="text-[10px] font-black text-muted-foreground uppercase block mb-1">Teleop</span>
                                <span className="text-lg font-black">{calculateScore(formData.teleop).final_score}</span>
                              </div>
                            </div>

                            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 flex justify-between items-center">
                              <span className="text-xs font-black uppercase tracking-widest text-primary">Total Points</span>
                              <span className="text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                                {calculateScore(formData.autonomous).final_score + calculateScore(formData.teleop).final_score}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2">
                              <div className="text-center">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">Defense</span>
                                <span className="text-sm font-black">{formData.miscellaneous.defense_rating}/10</span>
                              </div>
                              <div className="text-center">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">Downtime</span>
                                <span className="text-sm font-black">{formatDurationSec(formData.miscellaneous.average_downtime ?? 0)}</span>
                              </div>
                              <div className="text-center">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase block">Broke</span>
                                <span className={cn(
                                  "text-sm font-black",
                                  formData.miscellaneous.broke ? "text-red-500" : "text-green-500"
                                )}>
                                  {formData.miscellaneous.broke ? 'YES' : 'NO'}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
