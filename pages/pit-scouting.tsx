import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui';
import { 
  Wrench, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  Save,
  Camera,
  FileText,
  Settings,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { validatePitScoutingStep, getStepErrorMessage, validatePitScoutingForm, ValidationResult } from '@/lib/form-validation';

interface Team {
  team_number: number;
  team_name: string;
  team_color?: string;
}

interface PitScoutingData {
  teamNumber: number;
  robotName: string;
  driveType: string;
  driveTrainOther?: string; // For "Other" drivetrain option
  autonomousCapabilities: string[];
  teleopCapabilities: string[];
  endgameCapabilities: string[];
  robotDimensions: {
    length?: number;
    width?: number;
    height?: number;
  };
  weight?: number;
  programmingLanguage: string;
  notes: string;
}

export default function PitScouting() {
  const { user, loading } = useSupabase();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PitScoutingData>({
    teamNumber: 0,
    robotName: '',
    driveType: '',
    driveTrainOther: '',
    autonomousCapabilities: [],
    teleopCapabilities: [],
    endgameCapabilities: [],
    robotDimensions: {
      height: 0,
    },
    weight: 0,
    programmingLanguage: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const totalSteps = 3;

  // Load teams from database
  useEffect(() => {
    const loadTeams = async () => {
      setLoadingTeams(true);
      setTeamsError(null);
      
      try {
        const { data: teamsData, error } = await supabase
          .from('teams')
          .select('team_number, team_name, team_color')
          .order('team_number');

        if (error) {
          throw new Error('Failed to load teams');
        }

        setTeams(teamsData || []);
      } catch (err) {
        console.error('Error loading teams:', err);
        setTeamsError(err instanceof Error ? err.message : 'Failed to load teams');
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeams();
  }, []);

  const validateStep = (step: number): ValidationResult => {
    return validatePitScoutingStep(step, formData);
  };

  const handleNext = () => {
    setValidationError(null);
    setHasInteracted(true);
    
    const validation = validateStep(currentStep);
    setValidationErrors(validation.errors);
    
    if (validation.isValid) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Show validation error
      const errorMessage = getStepErrorMessage(currentStep, validation.errors);
      setValidationError(errorMessage);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    setValidationError(null);

    try {
      // Validate user authentication
      if (!user) {
        throw new Error('User not authenticated. Please sign in and try again.');
      }

      // Validate entire form
      const validation = validatePitScoutingForm(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        const errorMessage = 'Please fix the following errors before submitting: ' + 
          Object.values(validation.errors).join(', ');
        throw new Error(errorMessage);
      }

      // Prepare the data with submitter information
      const submissionData = {
        team_number: formData.teamNumber,
        robot_name: formData.robotName,
        drive_type: formData.driveType === 'Other' ? formData.driveTrainOther : formData.driveType,
        drive_train_details: {
          type: formData.driveType === 'Other' ? formData.driveTrainOther : formData.driveType,
          auto_capabilities: formData.autonomousCapabilities.join(', '),
          teleop_capabilities: formData.teleopCapabilities.join(', '),
          drive_camps: 0, // Default value
          playoff_driver: 'TBD' // Default value
        },
        autonomous_capabilities: formData.autonomousCapabilities,
        teleop_capabilities: formData.teleopCapabilities,
        endgame_capabilities: formData.endgameCapabilities,
        robot_dimensions: formData.robotDimensions,
        weight: formData.weight,
        programming_language: formData.programmingLanguage,
        notes: formData.notes,
        strengths: [],
        weaknesses: [],
        overall_rating: 0,
        submitted_by: user.id,
        submitted_by_email: user.email,
        submitted_by_name: user.user_metadata?.full_name || user.email,
        submitted_at: new Date().toISOString(),
      };

      console.log('User info:', { id: user.id, email: user.email });
      console.log('Pit scouting data:', submissionData);
      
      // Submit to Supabase
      const { data, error } = await supabase
        .from('pit_scouting_data')
        .insert([submissionData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to save pit scouting data: ${error.message}`);
      }
      
      console.log('Successfully saved pit scouting data:', data);
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          teamNumber: 0,
          robotName: '',
          driveType: '',
          driveTrainOther: '',
          autonomousCapabilities: [],
          teleopCapabilities: [],
          endgameCapabilities: [],
          robotDimensions: { height: 0 },
          weight: 0,
          programmingLanguage: '',
          notes: '',
        });
        setCurrentStep(1);
        setSubmitSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setSubmitting(false);
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
    const router = useRouter();
    router.push('/');
    return null;
  }

  return (
    <Layout>
      <div className="min-h-full p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 sm:mb-6 md:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3 sm:mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                  Pit Scouting
                </h1>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
                  Comprehensive robot analysis and documentation
                </p>
              </div>
            </div>
          </motion.div>

          {/* Progress Indicator */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm font-medium text-foreground">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="w-full rounded-full h-2 bg-muted">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Form Steps */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full mx-auto px-4"
              >
                <Card>
                  <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Settings className="w-6 h-6 text-muted-foreground" />
          <span>Basic Information</span>
        </CardTitle>
        <CardDescription>
          Enter basic team and robot information
        </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {teamsError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm text-center flex items-center justify-center"
                      >
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {teamsError}
                      </motion.div>
                    )}

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

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Team Number <span className="text-destructive">*</span>
                        </label>
                        {loadingTeams ? (
                          <div className="flex items-center justify-center h-10 px-3 py-2 rounded-md border border-input bg-background">
                            <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Loading teams...</span>
                          </div>
                        ) : (
                          <Select 
                            value={formData.teamNumber ? formData.teamNumber.toString() : ''} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, teamNumber: parseInt(value) || 0 }))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a team" />
                            </SelectTrigger>
                            <SelectContent>
                              {teams.length === 0 ? (
                                <SelectItem value="no-teams" disabled>No teams found in database</SelectItem>
                              ) : (
                                teams.map((team) => (
                                  <SelectItem key={team.team_number} value={team.team_number.toString()}>
                                    {team.team_number} - {team.team_name || 'Unknown Team'}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Robot Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="Enter robot name"
                          value={formData.robotName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, robotName: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Drive Train Selection */}
                      <div>
                        <label className="block text-sm font-medium mb-3">
                          Drive Train <span className="text-destructive">*</span>
                        </label>
                        <div className="space-y-3">
                          {['8-wheel tan', 'Swerve'].map((option) => (
                            <label key={option} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="driveType"
                                value={option}
                                checked={formData.driveType === option}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  driveType: e.target.value,
                                  driveTrainOther: '' // Clear other when selecting predefined option
                                }))}
                                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2 flex-shrink-0"
                              />
                              <span className="text-sm font-medium flex-1">{option}</span>
                            </label>
                          ))}
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="driveType"
                              value="Other"
                              checked={formData.driveType === 'Other'}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                driveType: e.target.value 
                              }))}
                              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2 flex-shrink-0"
                            />
                            <span className="text-sm font-medium flex-shrink-0">Other:</span>
                            <Input
                              placeholder="Specify drive train type"
                              value={formData.driveTrainOther || ''}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                driveTrainOther: e.target.value 
                              }))}
                              disabled={formData.driveType !== 'Other'}
                              className="flex-1 max-w-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Programming Language
                        </label>
                        <Input
                          placeholder="e.g., Java, Python, C++"
                          value={formData.programmingLanguage}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, programmingLanguage: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Length (in) <span className="text-muted-foreground text-xs">(Optional)</span>
                        </label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={formData.robotDimensions.length?.toString() || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                            ...prev, 
                            robotDimensions: { ...prev.robotDimensions, length: e.target.value ? parseFloat(e.target.value) : undefined }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Width (in) <span className="text-muted-foreground text-xs">(Optional)</span>
                        </label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={formData.robotDimensions.width?.toString() || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                            ...prev, 
                            robotDimensions: { ...prev.robotDimensions, width: e.target.value ? parseFloat(e.target.value) : undefined }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Height (in) <span className="text-muted-foreground text-xs">(Optional)</span>
                        </label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={formData.robotDimensions.height?.toString() || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                            ...prev, 
                            robotDimensions: { ...prev.robotDimensions, height: e.target.value ? parseFloat(e.target.value) : undefined }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Weight (lbs) <span className="text-muted-foreground text-xs">(Optional)</span>
                        </label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={formData.weight?.toString() || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, weight: e.target.value ? parseFloat(e.target.value) : undefined }))}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
        <Button onClick={handleNext}>
          Next <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full mx-auto px-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3 text-white">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <span>Capabilities Assessment</span>
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Assess robot capabilities for each game period
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 sm:space-y-8">
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

                    {/* Autonomous Capabilities */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg border">
                      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Question 2: What can they do in auto</h3>
                      <div className="space-y-3">
                        {['L1', 'L2', 'L3', 'L4', 'Move off of the starting line ONLY', 'Clean the reef (LOW algae)', 'Clean the reef (HIGH algae)'].map((option) => (
                          <div key={option} className="flex items-center space-x-3 p-3 rounded-lg bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input
                              type="checkbox"
                              id={`auto-${option}`}
                              checked={formData.autonomousCapabilities.includes(option)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    autonomousCapabilities: [...prev.autonomousCapabilities, option]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    autonomousCapabilities: prev.autonomousCapabilities.filter(cap => cap !== option)
                                  }));
                                }
                              }}
                            />
                            <label 
                              htmlFor={`auto-${option}`}
                              className="flex-1 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                            >
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Teleop Capabilities */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg border">
                      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Question 3: What can they do during teleop</h3>
                      <div className="space-y-3">
                        {['L1', 'L2', 'L3', 'L4', 'Processor', 'Barge', 'Defense'].map((option) => (
                          <div key={option} className="flex items-center space-x-3 p-3 rounded-lg bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <input
                              type="checkbox"
                              id={`teleop-${option}`}
                              checked={formData.teleopCapabilities.includes(option)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    teleopCapabilities: [...prev.teleopCapabilities, option]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    teleopCapabilities: prev.teleopCapabilities.filter(cap => cap !== option)
                                  }));
                                }
                              }}
                            />
                            <label 
                              htmlFor={`teleop-${option}`}
                              className="flex-1 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                            >
                              {option}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} className="bg-card/10 border-border/30 text-foreground hover:bg-card/20">
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
        <Button onClick={handleNext}>
          Next <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full mx-auto px-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3 text-white">
                      <FileText className="w-6 h-6 text-yellow-400" />
                      <span>Analysis & Notes</span>
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Document strengths, weaknesses, and observations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
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

                    {/* Endgame Capabilities */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-lg border">
                      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Question 4: What can they do during endgame</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                          Select Endgame Capability
                        </label>
                        <Select
                          value={formData.endgameCapabilities[0] || ''}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            endgameCapabilities: value ? [value] : []
                          }))}
                        >
                          <SelectTrigger className="w-full bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                            <SelectValue placeholder="Select an endgame capability" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                            {['Shallow Climb', 'Deep Climb', 'Park', 'None'].map((option) => (
                              <SelectItem 
                                key={option} 
                                value={option}
                                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>


                    {/* General Notes */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">General Notes</h3>
                      <textarea
                        className="w-full h-32 sm:h-40 lg:h-44 xl:h-48 px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                        placeholder="Add any additional observations, strategies, or notable capabilities..."
                        value={formData.notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ 
                          ...prev, 
                          notes: e.target.value
                        }))}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} className="bg-card/10 border-border/30 text-foreground hover:bg-card/20">
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
        <Button onClick={handleSubmit}>
          Submit <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
