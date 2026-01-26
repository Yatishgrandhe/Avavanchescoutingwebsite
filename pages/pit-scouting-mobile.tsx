import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
  Home,
  Menu
} from 'lucide-react';
import { useRouter } from 'next/router';
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
  canClimb: boolean;
  climbLevels: string[];
  navigationLocations: string[];
  ballHoldAmount?: number;
  downtimeStrategy: string[];
  robotDimensions: {
    length?: number;
    width?: number;
    height?: number;
  };
  weight?: number;
  cameraCount?: number;
  shootingLocationsCount?: number;
  programmingLanguage: string;
  notes: string;
  photos: string[];
  strengths: string[];
  weaknesses: string[];
  overallRating: number;
}

export default function PitScoutingMobile() {
  const { user, loading, supabase } = useSupabase();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
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
    canClimb: false,
    climbLevels: [],
    navigationLocations: [],
    ballHoldAmount: 0,
    downtimeStrategy: [],
    robotDimensions: {
      height: 0,
    },
    weight: 0,
    cameraCount: 0,
    shootingLocationsCount: 0,
    programmingLanguage: '',
    notes: '',
    photos: [],
    strengths: [],
    weaknesses: [],
    overallRating: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [scoutedTeamNumbers, setScoutedTeamNumbers] = useState<Set<number>>(new Set());

  const totalSteps = 4;

  // Load teams from database
  useEffect(() => {
    const loadTeams = async () => {
      setLoadingTeams(true);
      setTeamsError(null);
      
      try {
        // Load teams and pit scouting data in parallel
        const [teamsResult, scoutedResult] = await Promise.all([
          supabase.from('teams').select('team_number, team_name, team_color').order('team_number'),
          supabase.from('pit_scouting_data').select('team_number')
        ]);

        if (teamsResult.error) {
          throw new Error('Failed to load teams');
        }

        if (scoutedResult.error) {
          console.warn('Failed to load scouted teams:', scoutedResult.error);
        }

        setTeams(teamsResult.data || []);
        
        // Set scouted team numbers
        const scoutedNumbers = new Set<number>(scoutedResult.data?.map((item: { team_number: number }) => item.team_number) || []);
        setScoutedTeamNumbers(scoutedNumbers);
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
          can_climb: formData.canClimb,
          climb_levels: formData.climbLevels,
          navigation_locations: formData.navigationLocations,
          ball_hold_amount: formData.ballHoldAmount || 0,
          downtime_strategy: formData.downtimeStrategy,
        },
        autonomous_capabilities: formData.autonomousCapabilities,
        teleop_capabilities: formData.teleopCapabilities,
        robot_dimensions: (() => {
          const dims: { length?: number; width?: number; height?: number } = {};
          if (formData.robotDimensions.length !== undefined && formData.robotDimensions.length !== null) {
            dims.length = formData.robotDimensions.length;
          }
          if (formData.robotDimensions.width !== undefined && formData.robotDimensions.width !== null) {
            dims.width = formData.robotDimensions.width;
          }
          if (formData.robotDimensions.height !== undefined && formData.robotDimensions.height !== null) {
            dims.height = formData.robotDimensions.height;
          }
          return dims;
        })(),
        weight: formData.weight,
        camera_count: formData.cameraCount || 0,
        shooting_locations_count: formData.shootingLocationsCount || 0,
        programming_language: formData.programmingLanguage,
        notes: formData.notes,
        photos: formData.photos,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        overall_rating: formData.overallRating || 0,
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
          canClimb: false,
          climbLevels: [],
          navigationLocations: [],
          ballHoldAmount: 0,
          downtimeStrategy: [],
          robotDimensions: { height: 0 },
          weight: 0,
          cameraCount: 0,
          shootingLocationsCount: 0,
          programmingLanguage: '',
          notes: '',
          photos: [],
          strengths: [],
          weaknesses: [],
          overallRating: 1,
        });
        setCurrentStep(1);
        setSubmitSuccess(false);
        router.push('/');
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
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="p-2"
            >
              <Home size={20} />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Pit Scouting</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="p-2"
          >
            <Menu size={20} />
          </Button>
        </div>
        
        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
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
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Form Steps */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl mx-auto"
            >
              <Card>
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="flex items-center space-x-2 sm:space-x-3 text-lg sm:text-xl">
                    <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                    <span>Basic Information</span>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Enter basic team and robot information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                  {teamsError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/20 text-destructive p-3 rounded-md text-sm text-center flex items-center justify-center"
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
                                  {scoutedTeamNumbers.has(team.team_number) ? '✓ ' : ''}{team.team_number} - {team.team_name || 'Unknown Team'}
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
                  
                  <div className="space-y-4">
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

                  {/* Drive Train Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3">
                      Drive Train <span className="text-destructive">*</span>
                    </label>
                    <div className="space-y-3">
                      {['Tank Drive', 'Swerve Drive'].map((option) => (
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

                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number of Cameras <span className="text-muted-foreground text-xs">(Optional)</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.cameraCount?.toString() || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = parseInt(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, cameraCount: val >= 0 ? val : 0 }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number of Shooting Locations <span className="text-muted-foreground text-xs">(Optional)</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.shootingLocationsCount?.toString() || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = parseInt(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, shootingLocationsCount: val >= 0 ? val : 0 }));
                        }}
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
              className="w-full max-w-sm mx-auto sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    <span>Capabilities Assessment</span>
                  </CardTitle>
                  <CardDescription>
                    Assess robot capabilities for each game period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Question 2: What can they do in auto</h3>
                    <div className="space-y-3">
                      {['Score FUEL in active HUB', 'TOWER LEVEL 1 climb'].map((option) => (
                        <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
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
                            className="flex-1 text-sm font-medium text-foreground cursor-pointer"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teleop Capabilities */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Question 3: What can they do during teleop</h3>
                    <div className="space-y-3">
                      {['Score FUEL in active HUB', 'TOWER LEVEL 2 climb', 'TOWER LEVEL 3 climb'].map((option) => (
                        <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors">
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
                            className="flex-1 text-sm font-medium text-foreground cursor-pointer"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
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
              className="w-full max-w-sm mx-auto sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-warning" />
                    <span>Analysis & Notes</span>
                  </CardTitle>
                  <CardDescription>
                    Document strengths, weaknesses, and observations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  {/* Can Climb */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Can they climb? <span className="text-destructive">*</span></h3>
                    <div className="flex gap-3 mb-4">
                      {['Yes', 'No'].map((opt) => (
                        <label key={opt} className="flex items-center space-x-2 cursor-pointer flex-1">
                          <input
                            type="radio"
                            name="canClimb"
                            checked={(opt === 'Yes' && formData.canClimb) || (opt === 'No' && !formData.canClimb)}
                            onChange={() => setFormData(prev => ({ 
                              ...prev, 
                              canClimb: opt === 'Yes',
                              climbLevels: opt === 'No' ? [] : prev.climbLevels
                            }))}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                    
                    {formData.canClimb && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2 text-foreground">
                          What level(s) can they climb? <span className="text-destructive">*</span>
                        </label>
                        <div className="space-y-2">
                          {['LEVEL 1', 'LEVEL 2', 'LEVEL 3'].map((level) => (
                            <label key={level} className="flex items-center space-x-2 cursor-pointer p-2 rounded border border-input hover:bg-muted/50">
                              <input
                                type="checkbox"
                                checked={formData.climbLevels.includes(level)}
                                onChange={() => {
                                  const active = formData.climbLevels.includes(level);
                                  setFormData(prev => ({
                                    ...prev,
                                    climbLevels: active
                                      ? prev.climbLevels.filter(l => l !== level)
                                      : [...prev.climbLevels, level]
                                  }));
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{level}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Locations */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Where can they go? <span className="text-destructive">*</span></h3>
                    <div className="space-y-2">
                      {['Trench', 'Bump', 'Both'].map((location) => (
                        <label key={location} className="flex items-center space-x-2 cursor-pointer p-2 rounded border border-input hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={
                              (location === 'Both' && formData.navigationLocations.includes('Trench') && formData.navigationLocations.includes('Bump')) ||
                              (location !== 'Both' && formData.navigationLocations.includes(location))
                            }
                            onChange={() => {
                              if (location === 'Both') {
                                setFormData(prev => ({ ...prev, navigationLocations: ['Trench', 'Bump'] }));
                              } else {
                                const active = formData.navigationLocations.includes(location);
                                setFormData(prev => ({
                                  ...prev,
                                  navigationLocations: active
                                    ? prev.navigationLocations.filter(l => l !== location)
                                    : location === 'Trench' && prev.navigationLocations.includes('Bump')
                                      ? ['Trench', 'Bump']
                                      : location === 'Bump' && prev.navigationLocations.includes('Trench')
                                      ? ['Trench', 'Bump']
                                      : [...prev.navigationLocations, location]
                                }));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{location}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ball Hold Amount */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Ball Hold Amount <span className="text-destructive">*</span></h3>
                    <Input
                      type="number"
                      min="0"
                      value={formData.ballHoldAmount || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = parseInt(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, ballHoldAmount: val }));
                      }}
                      placeholder="Number of balls"
                      className="w-full"
                    />
                  </div>

                  {/* Strategy During Downtime */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Strategy during downtime <span className="text-destructive">*</span></h3>
                    <div className="space-y-2">
                      {['Defend', 'Grab more balls'].map((strategy) => (
                        <label key={strategy} className="flex items-center space-x-2 cursor-pointer p-2 rounded border border-input hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={formData.downtimeStrategy.includes(strategy)}
                            onChange={() => {
                              const active = formData.downtimeStrategy.includes(strategy);
                              setFormData(prev => ({
                                ...prev,
                                downtimeStrategy: active
                                  ? prev.downtimeStrategy.filter(s => s !== strategy)
                                  : [...prev.downtimeStrategy, strategy]
                              }));
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{strategy}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Strengths</h3>
                    <textarea
                      className="w-full h-32 px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      placeholder="List the robot's key strengths and advantages..."
                      value={formData.strengths.join(', ')}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ 
                        ...prev, 
                        strengths: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      }))}
                    />
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Weaknesses</h3>
                    <textarea
                      className="w-full h-32 px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      placeholder="List the robot's weaknesses and areas for improvement..."
                      value={formData.weaknesses.join(', ')}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ 
                        ...prev, 
                        weaknesses: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                      }))}
                    />
                  </div>

                  {/* Overall Rating */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Overall Rating</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <label className="block text-sm font-medium">
                        Rate this robot (1-10): <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="8"
                        value={formData.overallRating.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                          ...prev, 
                          overallRating: parseInt(e.target.value) || 0
                        }))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">(1 = Poor, 10 = Excellent)</span>
                    </div>
                  </div>

                  {/* General Notes */}
                  <div className="bg-muted p-4 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">General Notes</h3>
                    <textarea
                      className="w-full h-40 px-3 py-2 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                  <Button variant="outline" onClick={handleBack}>
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
              className="w-full max-w-sm mx-auto sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Camera className="w-6 h-6 text-secondary" />
                    <span>Review & Submit</span>
                  </CardTitle>
                  <CardDescription>
                    Review your pit scouting data and submit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/20 text-destructive p-3 rounded-md text-sm text-center flex items-center justify-center"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      {submitError}
                    </motion.div>
                  )}

                  {/* Debug Information */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600 text-xs text-gray-300">
                      <h4 className="font-semibold mb-2">Debug Info:</h4>
                      <p>User: {user ? `${user.email} (${user.id})` : 'Not authenticated'}</p>
                      <p>Form Data: {JSON.stringify({
                        teamNumber: formData.teamNumber,
                        robotName: formData.robotName,
                        driveType: formData.driveType,
                        autonomousCapabilities: formData.autonomousCapabilities,
                        teleopCapabilities: formData.teleopCapabilities,
                        canClimb: formData.canClimb,
                        climbLevels: formData.climbLevels,
                        navigationLocations: formData.navigationLocations,
                        ballHoldAmount: formData.ballHoldAmount,
                        downtimeStrategy: formData.downtimeStrategy,
                        overallRating: formData.overallRating
                      }, null, 2)}</p>
                    </div>
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

                  {submitSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-primary/20 text-primary p-3 rounded-md text-sm text-center flex items-center justify-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Pit scouting data submitted successfully! Redirecting...
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">Basic Information</h3>
                      <p className="text-sm text-muted-foreground">Team: {formData.teamNumber}</p>
                      <p className="text-sm text-muted-foreground">Robot: {formData.robotName || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Drive: {formData.driveType === 'Other' ? formData.driveTrainOther : formData.driveType || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Language: {formData.programmingLanguage || 'N/A'}</p>
                    </div>

                    <div className="bg-muted rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">Robot Specs</h3>
                      <p className="text-sm text-muted-foreground">
                        Dimensions: {formData.robotDimensions.length ? `${formData.robotDimensions.length}"` : 'N/A'} × {formData.robotDimensions.width ? `${formData.robotDimensions.width}"` : 'N/A'} × {formData.robotDimensions.height}"
                      </p>
                      <p className="text-sm text-muted-foreground">Weight: {formData.weight} lbs</p>
                      <p className="text-sm text-muted-foreground">Language: {formData.programmingLanguage || 'N/A'}</p>
                    </div>

                    <div className="bg-muted rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">Capabilities Summary</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Autonomous:</p>
                          <div className="space-y-1">
                            {formData.autonomousCapabilities.length > 0 ? (
                              formData.autonomousCapabilities.map((cap, index) => (
                                <p key={index} className="text-sm text-muted-foreground">• {cap}</p>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">N/A</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Teleop:</p>
                          <div className="space-y-1">
                            {formData.teleopCapabilities.length > 0 ? (
                              formData.teleopCapabilities.map((cap, index) => (
                                <p key={index} className="text-sm text-muted-foreground">• {cap}</p>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">N/A</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Can Climb:</p>
                          <p className="text-sm text-muted-foreground">{formData.canClimb ? 'Yes' : 'No'}</p>
                          {formData.canClimb && formData.climbLevels.length > 0 && (
                            <div className="mt-1">
                              <p className="text-sm text-muted-foreground font-medium">Levels:</p>
                              {formData.climbLevels.map((level, index) => (
                                <p key={index} className="text-sm text-muted-foreground">• {level}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Navigation:</p>
                          <p className="text-sm text-muted-foreground">
                            {formData.navigationLocations.length > 0 
                              ? formData.navigationLocations.join(', ')
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Ball Hold Amount:</p>
                          <p className="text-sm text-muted-foreground">{formData.ballHoldAmount || 0} balls</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">Downtime Strategy:</p>
                          <p className="text-sm text-muted-foreground">
                            {formData.downtimeStrategy.length > 0 
                              ? formData.downtimeStrategy.join(', ')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 border">
                      <h3 className="font-semibold mb-3">Overall Rating</h3>
                      <p className="text-sm text-muted-foreground">Rating: {formData.overallRating}/10</p>
                      <p className="text-sm text-muted-foreground mt-2">Notes: {formData.notes || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
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
  );
}
