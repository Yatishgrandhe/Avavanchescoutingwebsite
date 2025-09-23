import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
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
  autonomousCapabilities: string[];
  teleopCapabilities: string[];
  endgameCapabilities: string[];
  robotDimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  programmingLanguage: string;
  notes: string;
  photos: string[];
  strengths: string[];
  weaknesses: string[];
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
    autonomousCapabilities: [],
    teleopCapabilities: [],
    endgameCapabilities: [],
    robotDimensions: {
      length: 0,
      width: 0,
      height: 0,
    },
    weight: 0,
    programmingLanguage: '',
    notes: '',
    photos: [],
    strengths: [],
    weaknesses: [],
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
          autonomousCapabilities: [],
          teleopCapabilities: [],
          endgameCapabilities: [],
          robotDimensions: { length: 0, width: 0, height: 0 },
          weight: 0,
          programmingLanguage: '',
          notes: '',
          photos: [],
          strengths: [],
          weaknesses: [],
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
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Please sign in to access pit scouting</p>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-full p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center space-x-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wrench className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </motion.div>
              <div>
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Pit Scouting
                </h1>
                <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Comprehensive robot analysis and documentation
                </p>
              </div>
            </div>
          </motion.div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Step {currentStep} of {totalSteps}
              </span>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Team Number
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
          Robot Name
        </label>
        <Input
          placeholder="Enter robot name"
          value={formData.robotName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, robotName: e.target.value }))}
        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Drive Type
                        </label>
                        <Input
                          placeholder="e.g., Tank Drive, Swerve, Mecanum"
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Length (in)
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.robotDimensions.length || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                            ...prev, 
                            robotDimensions: { ...prev.robotDimensions, length: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Width (in)
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.robotDimensions.width || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                            ...prev, 
                            robotDimensions: { ...prev.robotDimensions, width: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Height (in)
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.robotDimensions.height || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                            ...prev, 
                            robotDimensions: { ...prev.robotDimensions, height: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Weight (lbs)
                        </label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.weight || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
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
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <p className="text-lg text-white/80">
                        Capabilities assessment will be implemented based on your requirements
                      </p>
                      <p className="text-sm text-white/60">
                        This section will be customized when you provide the specific requirements
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} className="bg-white/10 border-white/30 text-white hover:bg-white/20">
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
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <p className="text-lg text-white/80">
                        Analysis and notes section will be implemented based on your requirements
                      </p>
                      <p className="text-sm text-white/60">
                        This section will be customized when you provide the specific requirements
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} className="bg-white/10 border-white/30 text-white hover:bg-white/20">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-muted rounded-lg p-4 border">
                        <h3 className="font-semibold mb-3">Basic Information</h3>
                        <p className="text-sm text-muted-foreground">Team: {formData.teamNumber}</p>
                        <p className="text-sm text-muted-foreground">Robot: {formData.robotName || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Drive: {formData.driveType || 'N/A'}</p>
                      </div>

                      <div className="bg-muted rounded-lg p-4 border">
                        <h3 className="font-semibold mb-3">Robot Specs</h3>
                        <p className="text-sm text-muted-foreground">
                          Dimensions: {formData.robotDimensions.length}" × {formData.robotDimensions.width}" × {formData.robotDimensions.height}"
                        </p>
                        <p className="text-sm text-muted-foreground">Weight: {formData.weight} lbs</p>
                        <p className="text-sm text-muted-foreground">Language: {formData.programmingLanguage || 'N/A'}</p>
                      </div>
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
