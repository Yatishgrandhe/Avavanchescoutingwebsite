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

interface Team {
  team_number: number;
  team_name: string;
  team_color?: string;
}

interface PitScoutingData {
  teamNumber: number;
  robotName: string;
  driveType: string;
  autonomousCapabilities: string;
  teleopCapabilities: string;
  endgameCapabilities: string;
  robotDimensions: {
    length?: number;
    width?: number;
    height?: number;
  };
  weight?: number;
  programmingLanguage: string;
  notes: string;
  overallRating: number;
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
    autonomousCapabilities: '',
    teleopCapabilities: '',
    endgameCapabilities: '',
    robotDimensions: {
      height: 0,
    },
    weight: 0,
    programmingLanguage: '',
    notes: '',
    overallRating: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const totalSteps = 4;

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

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
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

    try {
      // Prepare the data with submitter information
      const submissionData = {
        ...formData,
        submitted_by: user?.id,
        submitted_by_email: user?.email,
        submitted_by_name: user?.user_metadata?.full_name || user?.email,
        submitted_at: new Date().toISOString(),
      };

      console.log('Pit scouting data:', submissionData);
      
      // TODO: Implement pit scouting data submission to Supabase
      // This would be something like:
      // const { data, error } = await supabase
      //   .from('pit_scouting_data')
      //   .insert([submissionData]);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          teamNumber: 0,
          robotName: '',
          driveType: '',
          autonomousCapabilities: '',
          teleopCapabilities: '',
          endgameCapabilities: '',
          robotDimensions: { height: 0 },
          weight: 0,
          programmingLanguage: '',
          notes: '',
          overallRating: 0,
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
      <div className="min-h-full p-4 md:p-6 lg:p-8">
        <div className="w-full mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 md:mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wrench className="w-8 h-8 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Pit Scouting
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Comprehensive robot analysis and documentation
                </p>
              </div>
            </div>
          </motion.div>

          {/* Progress Indicator */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-muted-foreground">
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
                                <SelectItem value="" disabled>No teams found in database</SelectItem>
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Drive Type
                        </label>
                        <Input
                          placeholder="e.g., Tank, Swerve, Mecanum"
                          value={formData.driveType}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, driveType: e.target.value }))}
                        />
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
                          value={formData.robotDimensions.length || ''}
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
                          value={formData.robotDimensions.width || ''}
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
                          value={formData.robotDimensions.height || ''}
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
                          value={formData.weight || ''}
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
                  <CardContent className="space-y-4 sm:space-y-6">
                    {/* Autonomous Capabilities */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Autonomous Capabilities</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          What can the robot do in autonomous? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          className="w-full h-24 sm:h-32 lg:h-36 xl:h-40 px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                          placeholder="Describe their autonomous capabilities (e.g., Leave starting zone, Score coral in trough, Score algae in processor, etc.)..."
                          value={formData.autonomousCapabilities}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ 
                            ...prev, 
                            autonomousCapabilities: e.target.value
                          }))}
                        />
                      </div>
                    </div>

                    {/* Teleop Capabilities */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Teleop Capabilities</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          What can the robot do during teleop? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          className="w-full h-24 sm:h-32 lg:h-36 xl:h-40 px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                          placeholder="Describe their teleop capabilities (e.g., Score coral on branches, Score algae in processor/net, Park in barge zone, etc.)..."
                          value={formData.teleopCapabilities}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ 
                            ...prev, 
                            teleopCapabilities: e.target.value
                          }))}
                        />
                      </div>
                    </div>

                    {/* Endgame Capabilities */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Endgame Capabilities</h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          What can the robot do in endgame? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          className="w-full h-24 sm:h-32 lg:h-36 xl:h-40 px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                          placeholder="Describe their endgame capabilities (e.g., Park in barge zone, Shallow cage, Deep cage, etc.)..."
                          value={formData.endgameCapabilities}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ 
                            ...prev, 
                            endgameCapabilities: e.target.value
                          }))}
                        />
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
                    {/* Overall Rating */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Overall Rating</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <label className="block text-sm font-medium">
                          Rate this robot (1-10): <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          placeholder="8"
                          value={formData.overallRating || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                            ...prev, 
                            overallRating: parseInt(e.target.value) || 0
                          }))}
                          className="w-20 text-sm sm:text-base"
                        />
                        <span className="text-sm text-gray-500">(1 = Poor, 10 = Excellent)</span>
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
        <Button onClick={handleNext}>
          Next <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full mx-auto px-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3 text-white">
                      <Camera className="w-6 h-6 text-purple-400" />
                      <span>Review & Submit</span>
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      Review your pit scouting data and submit
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/20 text-red-400 p-3 rounded-md text-sm text-center flex items-center justify-center"
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        {submitError}
                      </motion.div>
                    )}

                    {submitSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-500/20 text-green-400 p-3 rounded-md text-sm text-center flex items-center justify-center"
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Pit scouting data submitted successfully! Redirecting...
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      <div className="bg-muted rounded-lg p-4 border">
                        <h3 className="font-semibold mb-3">Basic Information</h3>
                        <p className="text-sm text-muted-foreground">Team: {formData.teamNumber}</p>
                        <p className="text-sm text-muted-foreground">Robot: {formData.robotName || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Drive: {formData.driveType || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Language: {formData.programmingLanguage || 'N/A'}</p>
                      </div>

                      <div className="bg-muted rounded-lg p-4 border">
                        <h3 className="font-semibold mb-3">Robot Specs</h3>
                        <p className="text-sm text-muted-foreground">
                          Dimensions: {formData.robotDimensions.length ? `${formData.robotDimensions.length}"` : 'N/A'} × {formData.robotDimensions.width ? `${formData.robotDimensions.width}"` : 'N/A'} × {formData.robotDimensions.height}"
                        </p>
                        <p className="text-sm text-muted-foreground">Weight: {formData.weight} lbs</p>
                        <p className="text-sm text-muted-foreground">Rating: {formData.overallRating}/10</p>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">Capabilities Summary</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground"><strong>Autonomous:</strong></p>
                          <p className="text-sm text-muted-foreground">{formData.autonomousCapabilities || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground"><strong>Teleop:</strong></p>
                          <p className="text-sm text-muted-foreground">{formData.teleopCapabilities || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground"><strong>Endgame:</strong></p>
                          <p className="text-sm text-muted-foreground">{formData.endgameCapabilities || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">Notes</h3>
                      <p className="text-sm text-muted-foreground">{formData.notes || 'N/A'}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {submitting ? 'Submitting...' : 'Submit Pit Data'}
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
