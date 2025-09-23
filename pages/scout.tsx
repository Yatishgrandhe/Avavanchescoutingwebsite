import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import MatchDetailsForm from '@/components/scout/MatchDetailsForm';
import AutonomousForm from '@/components/scout/AutonomousForm';
import TeleopForm from '@/components/scout/TeleopForm';
import EndgameForm from '@/components/scout/EndgameForm';
import MiscellaneousForm from '@/components/scout/MiscellaneousForm';
import Layout from '@/components/layout/Layout';
import { ScoringNotes } from '@/lib/types';
import { calculateScore } from '@/lib/utils';

type ScoutingStep = 'match-details' | 'autonomous' | 'teleop' | 'endgame' | 'miscellaneous' | 'review';

interface FormData {
  matchNumber: number;
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
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<ScoutingStep>('match-details');
  const [formData, setFormData] = useState<FormData>({
    matchNumber: 0,
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const steps: ScoutingStep[] = ['match-details', 'autonomous', 'teleop', 'endgame', 'miscellaneous', 'review'];
  const currentStepIndex = steps.indexOf(currentStep) + 1;
  const totalSteps = steps.length;

  const handleMatchDetailsNext = (matchNumber: number) => {
    setFormData((prev: FormData) => ({ ...prev, matchNumber }));
    setCurrentStep('autonomous');
  };

  const handleAutonomousNext = (autonomousData: Partial<ScoringNotes>) => {
    setFormData((prev: FormData) => ({ ...prev, autonomous: autonomousData }));
    setCurrentStep('teleop');
  };

  const handleAutonomousBack = () => {
    setCurrentStep('match-details');
  };

  const handleTeleopNext = (teleopData: Partial<ScoringNotes>) => {
    setFormData((prev: FormData) => ({ ...prev, teleop: teleopData }));
    setCurrentStep('endgame');
  };

  const handleTeleopBack = () => {
    setCurrentStep('autonomous');
  };

  const handleEndgameNext = (endgameData: Partial<ScoringNotes>) => {
    setFormData((prev: FormData) => ({ ...prev, endgame: endgameData }));
    setCurrentStep('miscellaneous');
  };

  const handleEndgameBack = () => {
    setCurrentStep('teleop');
  };

  const handleMiscellaneousNext = (miscData: { defense_rating: number; comments: string }) => {
    setFormData((prev: FormData) => ({ ...prev, miscellaneous: miscData }));
    setCurrentStep('review');
  };

  const handleMiscellaneousBack = () => {
    setCurrentStep('endgame');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/scouting_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit scouting data');
      }

      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          matchNumber: 0,
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
        setCurrentStep('match-details');
        setSubmitSuccess(false);
      }, 2000);
      
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Calculate total score for review
  const totalScore = calculateScore({
    ...formData.autonomous,
    ...formData.teleop,
    ...formData.endgame,
  } as ScoringNotes);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
            <p className="text-gray-400 mb-6">Please sign in with Discord to access the REEFSCAPE scouting platform.</p>
            <a
              href="/auth/signin"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Sign in with Discord
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout user={{
      name: session.user?.name || 'User',
      username: session.user?.email || undefined,
      image: session.user?.image || undefined,
    }}>
      <div className="min-h-full flex items-center justify-center">
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
                onNext={handleMatchDetailsNext}
                currentStep={currentStepIndex}
                totalSteps={totalSteps}
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
                onNext={handleAutonomousNext}
                onBack={handleAutonomousBack}
                currentStep={currentStepIndex}
                totalSteps={totalSteps}
                isDarkMode={true}
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
                onNext={handleTeleopNext}
                onBack={handleTeleopBack}
                currentStep={currentStepIndex}
                totalSteps={totalSteps}
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
                onNext={handleEndgameNext}
                onBack={handleEndgameBack}
                currentStep={currentStepIndex}
                totalSteps={totalSteps}
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
                onNext={handleMiscellaneousNext}
                onBack={handleMiscellaneousBack}
                currentStep={currentStepIndex}
                totalSteps={totalSteps}
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
              className="max-w-4xl mx-auto"
            >
              <div className="bg-dark-800 border border-dark-700 rounded-lg p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Review & Submit</h2>
                  <p className="text-gray-400">Review your scouting data before submitting</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-dark-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Match Details</h3>
                    <p className="text-gray-400">Match Number: {formData.matchNumber}</p>
                    <p className="text-gray-400">Team Number: {formData.teamNumber}</p>
                    <p className="text-gray-400">Alliance: {formData.allianceColor}</p>
                  </div>

                  <div className="bg-dark-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Total Score</h3>
                    <p className="text-avalanche-400 text-2xl font-bold">{totalScore.final_score} points</p>
                    <div className="text-sm text-gray-400 mt-2">
                      <p>Auto: {totalScore.autonomous_points} pts</p>
                      <p>Teleop: {totalScore.teleop_points} pts</p>
                      <p>Endgame: {totalScore.endgame_points} pts</p>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-700 rounded-lg p-4 mb-6">
                  <h3 className="text-white font-semibold mb-3">Additional Notes</h3>
                  <p className="text-gray-400">Defense Rating: {formData.miscellaneous.defense_rating}/10</p>
                  {formData.miscellaneous.comments && (
                    <div className="mt-2">
                      <p className="text-gray-400">Comments:</p>
                      <p className="text-white">{formData.miscellaneous.comments}</p>
                    </div>
                  )}
                </div>

                {submitSuccess && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
                    <p className="text-green-400 text-center">Scouting data submitted successfully!</p>
                  </div>
                )}

                {submitError && (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
                    <p className="text-red-400 text-center">{submitError}</p>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={handleBack}
                    disabled={submitting}
                    className="px-4 py-2 bg-dark-700 text-white rounded-md hover:bg-dark-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-avalanche-600 text-white rounded-md hover:bg-avalanche-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Data'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
