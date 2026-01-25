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
  AlertCircle,
  Cpu,
  Ruler,
  Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { validatePitScoutingStep, getStepErrorMessage, validatePitScoutingForm, ValidationResult } from '@/lib/form-validation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import RobotImageUpload, { RobotImageUploadRef } from '@/components/ui/RobotImageUpload';

interface Team {
  team_number: number;
  team_name: string;
  team_color?: string;
}

interface PitScoutingData {
  teamNumber: number;
  robotName: string;
  robotImageUrl: string | null;
  driveType: string;
  driveTrainOther?: string;
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
  shootingLocations: string[];
  programmingLanguage: string;
  notes: string;
}

export default function PitScouting() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const { id, edit } = router.query;
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PitScoutingData>({
    teamNumber: 0,
    robotName: '',
    robotImageUrl: null,
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
    shootingLocations: [],
    programmingLanguage: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [scoutedTeamNumbers, setScoutedTeamNumbers] = useState<Set<number>>(new Set());
  const robotImageUploadRef = React.useRef<RobotImageUploadRef>(null);

  const totalSteps = 3;

  useEffect(() => {
    const loadTeams = async () => {
      setLoadingTeams(true);
      setTeamsError(null);

      try {
        const [teamsResult, scoutedResult] = await Promise.all([
          supabase.from('teams').select('team_number, team_name, team_color').order('team_number'),
          supabase.from('pit_scouting_data').select('team_number')
        ]);

        if (teamsResult.error) throw new Error('Failed to load teams');
        if (scoutedResult.error) console.warn('Failed to load scouted teams:', scoutedResult.error);

        setTeams(teamsResult.data || []);

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

  useEffect(() => {
    const loadExistingData = async () => {
      if (edit === 'true' && id && typeof id === 'string') {
        setIsEditMode(true);
        setEditingId(id);

        try {
          const { data: existingData, error } = await supabase
            .from('pit_scouting_data')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw new Error('Failed to load existing data');

          if (existingData) {
            setFormData({
              teamNumber: existingData.team_number,
              robotName: existingData.robot_name || '',
              robotImageUrl: existingData.robot_image_url || null,
              driveType: existingData.drive_type || '',
              driveTrainOther: existingData.drive_type === 'Other' ? existingData.drive_type : '',
              autonomousCapabilities: existingData.autonomous_capabilities || [],
              teleopCapabilities: existingData.teleop_capabilities || [],
              canClimb: existingData.drive_train_details?.can_climb || false,
              climbLevels: existingData.drive_train_details?.climb_levels || [],
              navigationLocations: existingData.drive_train_details?.navigation_locations || [],
              ballHoldAmount: existingData.drive_train_details?.ball_hold_amount || 0,
              downtimeStrategy: existingData.drive_train_details?.downtime_strategy || [],
              robotDimensions: existingData.robot_dimensions || { height: 0 },
              weight: existingData.weight || 0,
              cameraCount: existingData.camera_count || 0,
              shootingLocations: existingData.shooting_locations || [],
              programmingLanguage: existingData.programming_language || '',
              notes: existingData.notes || '',
            });
          }
        } catch (err) {
          console.error('Error loading existing data:', err);
          setSubmitError('Failed to load existing data for editing');
        }
      }
    };

    loadExistingData();
  }, [edit, id]);

  const validateStep = (step: number): ValidationResult => {
    return validatePitScoutingStep(step, formData);
  };

  const handleNext = async () => {
    setValidationError(null);
    setHasInteracted(true);

    const validation = validateStep(currentStep);
    setValidationErrors(validation.errors);

    if (validation.isValid) {
      // If we're on step 1 and have a new image to upload, do it now 
      // before the component unmounts during step transition
      if (currentStep === 1 && robotImageUploadRef.current?.hasFile()) {
        try {
          setSubmitting(true);
          console.log('[PitScouting] Uploading image during step transition...');
          const uploadedUrl = await robotImageUploadRef.current.uploadImage();
          if (uploadedUrl) {
            // Update formData with the new URL
            setFormData(prev => ({ ...prev, robotImageUrl: uploadedUrl }));
            console.log('[PitScouting] Step 1 image upload successful:', uploadedUrl);
          }
        } catch (error) {
          console.error('[PitScouting] Image upload failed during step transition:', error);
          setValidationError(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
          setSubmitting(false);
          return; // Stay on step 1 if upload fails
        } finally {
          setSubmitting(false);
        }
      }

      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      if (Object.keys(validation.errors).length > 0) {
        const errorMessage = getStepErrorMessage(currentStep, validation.errors);
        setValidationError(errorMessage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);
      setValidationError(null);

      if (!user) throw new Error('User not authenticated. Please sign in and try again.');

      // Upload image if a file is selected (always upload new files)
      let imageUrl = formData.robotImageUrl;

      // Always try to upload if ref exists and has a file
      if (robotImageUploadRef.current) {
        const hasFile = robotImageUploadRef.current.hasFile();
        console.log('Form submission - Image upload check:', {
          hasFile,
          currentImageUrl: imageUrl,
          formDataRobotImageUrl: formData.robotImageUrl
        });

        // Try to upload if hasFile returns true
        if (hasFile) {
          console.log('[PitScouting] Uploading image before form submission...');
          console.log('[PitScouting] Calling uploadImage() method...');
          try {
            const uploadedUrl = await robotImageUploadRef.current.uploadImage();
            console.log('[PitScouting] Image upload completed:', uploadedUrl);

            if (uploadedUrl && typeof uploadedUrl === 'string' && uploadedUrl.startsWith('http')) {
              imageUrl = uploadedUrl;
              setFormData(prev => ({ ...prev, robotImageUrl: uploadedUrl }));
              console.log('Image URL set for database save:', imageUrl);
            } else if (uploadedUrl === null) {
              // Upload returned null - this means no file was selected or upload was skipped
              console.warn('Upload returned null - no file was uploaded');
              // Don't throw error, just use existing imageUrl
            } else {
              console.error('Invalid upload URL received:', uploadedUrl);
              throw new Error(`Invalid image URL received: ${uploadedUrl}`);
            }
          } catch (error) {
            console.error('Error uploading image during form submission:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            // Always throw upload errors - they should be shown to the user
            throw new Error(`Failed to upload image: ${errorMsg}`);
          }
        } else {
          console.log('[PitScouting] No new file to upload, using existing imageUrl:', imageUrl);
          console.log('[PitScouting] hasFile() returned false - upload skipped');
        }
      } else {
        console.warn('robotImageUploadRef.current is null - cannot upload image');
      }

      const validation = validatePitScoutingForm(formData);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        const errorMessage = 'Please fix the errors before submitting: ' + Object.values(validation.errors).join(', ');
        throw new Error(errorMessage);
      }

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
          shooting_locations: formData.shootingLocations,
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
        shooting_locations: formData.shootingLocations,
        programming_language: formData.programmingLanguage,
        robot_image_url: imageUrl,
        photos: imageUrl ? [imageUrl] : [],
        notes: formData.notes,
        strengths: [],
        weaknesses: [],
        submitted_by: user.id,
        submitted_by_email: user.email,
        submitted_by_name: user?.user_metadata?.full_name || user?.email,
        submitted_at: new Date().toISOString(),
      };

      console.log('[PitScouting] Final submission data:', {
        team: submissionData.team_number,
        imageUrl: submissionData.robot_image_url,
        photos: submissionData.photos
      });

      console.log('Saving to database with imageUrl:', imageUrl);
      console.log('Submission data robot_image_url:', submissionData.robot_image_url);

      let error;

      if (isEditMode && editingId) {
        const { submitted_by, submitted_by_email, submitted_by_name, submitted_at, ...updateFields } = submissionData;
        console.log('Updating existing record:', editingId);
        const result = await supabase
          .from('pit_scouting_data')
          .update(updateFields)
          .eq('id', editingId);
        error = result.error;
        if (result.data) console.log('Update result:', result.data);
      } else {
        console.log('Inserting new record');
        const result = await supabase
          .from('pit_scouting_data')
          .insert([submissionData])
          .select();
        error = result.error;
        if (result.data) console.log('Insert result:', result.data);
      }

      if (error) {
        console.error('Database save error:', error);
        throw new Error(`Failed to save pit scouting data: ${error.message}`);
      }

      console.log('Database save successful!');

      setSubmitSuccess(true);

      setTimeout(() => {
        if (isEditMode) {
          router.push('/pit-scouting-data');
        } else {
          setFormData({
            teamNumber: 0,
            robotName: '',
            robotImageUrl: null,
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
            shootingLocations: [],
            programmingLanguage: '',
            notes: '',
          });
          setCurrentStep(1);
        }
        setSubmitSuccess(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 2000);

    } catch (error) {
      console.error('Form submission error:', error);
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
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              {isEditMode ? 'Edit Robot Profile' : 'Pit Scouting'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditMode ? 'Updating technical specifications' : 'Document robot capabilities and specs'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-1 text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <span className={cn("w-2 h-2 rounded-full mr-2", currentStep === 1 ? "bg-primary" : "bg-primary/50")} />
              Step {currentStep} of {totalSteps}
            </div>
          </div>
        </motion.div>

        {/* Validation/Status Messages */}
        <AnimatePresence>
          {validationError && hasInteracted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3 text-sm"
            >
              <AlertCircle size={18} />
              {validationError}
            </motion.div>
          )}
          {teamsError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center gap-3 text-sm"
            >
              <AlertCircle size={18} />
              {teamsError}
            </motion.div>
          )}
          {submitSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-green-500/10 border border-green-500/20 text-green-200 p-4 rounded-xl flex items-center gap-3 text-sm"
            >
              <CheckCircle size={18} />
              Data saved successfully! Redirecting...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Card */}
        <div className="glass-card rounded-2xl border border-white/5 relative min-h-[600px] flex flex-col">
          <div className="p-6 md:p-8 flex-1">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <Wrench size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Robot Specifications</h2>
                      <p className="text-sm text-muted-foreground">Basic team info & physical attributes</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Team Number <span className="text-red-400">*</span></label>
                        {loadingTeams ? (
                          <div className="glass-input h-10 flex items-center px-3 text-muted-foreground text-sm gap-2">
                            <Loader2 size={14} className="animate-spin" /> Loading...
                          </div>
                        ) : (
                          <Select
                            value={formData.teamNumber ? formData.teamNumber.toString() : ''}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, teamNumber: parseInt(value) || 0 }))}
                          >
                            <SelectTrigger className="glass-input w-full border-white/10">
                              <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                            <SelectContent className="glass border-white/10 max-h-[300px]">
                              {teams.length === 0 ? (
                                <SelectItem value="no-teams" disabled>No teams found</SelectItem>
                              ) : (
                                teams.map((team) => (
                                  <SelectItem key={team.team_number} value={team.team_number.toString()} className="focus:bg-white/10">
                                    <span className={scoutedTeamNumbers.has(team.team_number) ? "text-green-400" : ""}>
                                      {team.team_number}
                                    </span>
                                    <span className="text-muted-foreground ml-2">
                                      - {team.team_name}
                                    </span>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Robot Name <span className="text-red-400">*</span></label>
                        <Input
                          value={formData.robotName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, robotName: e.target.value }))}
                          placeholder="e.g. Avalanche"
                          className="glass-input border-white/10 placeholder:text-muted-foreground/30"
                        />
                      </div>

                      {/* Robot Image Upload */}
                      <RobotImageUpload
                        ref={robotImageUploadRef}
                        teamNumber={formData.teamNumber}
                        currentImageUrl={formData.robotImageUrl}
                        onImageUploaded={(url) => setFormData(prev => ({ ...prev, robotImageUrl: url }))}
                      />

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Programming Language</label>
                        <Input
                          value={formData.programmingLanguage}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, programmingLanguage: e.target.value }))}
                          placeholder="Java, Python, C++"
                          className="glass-input border-white/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Drive Train <span className="text-red-400">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Tank Drive', 'Swerve Drive'].map((type) => (
                            <div
                              key={type}
                              onClick={() => setFormData(prev => ({ ...prev, driveType: type, driveTrainOther: '' }))}
                              className={cn(
                                "cursor-pointer p-3 rounded-xl border transition-all text-sm font-medium text-center",
                                formData.driveType === type
                                  ? "bg-primary/20 border-primary/50 text-white"
                                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                              )}
                            >
                              {type}
                            </div>
                          ))}
                          <div
                            onClick={() => setFormData(prev => ({ ...prev, driveType: 'Other' }))}
                            className={cn(
                              "col-span-2 cursor-pointer p-3 rounded-xl border transition-all text-sm font-medium flex items-center gap-2",
                              formData.driveType === 'Other'
                                ? "bg-primary/20 border-primary/50 text-white"
                                : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                            )}
                          >
                            <span>Other</span>
                            {formData.driveType === 'Other' && (
                              <input
                                type="text"
                                autoFocus
                                placeholder="Specify..."
                                value={formData.driveTrainOther}
                                onChange={(e) => setFormData(prev => ({ ...prev, driveTrainOther: e.target.value }))}
                                className="bg-transparent border-none outline-none text-white placeholder:text-white/30 w-full ml-2"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Ruler size={14} /> Dimensions (in) & Weight (lbs)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {['Length', 'Width', 'Height', 'Weight'].map((metric) => (
                            <div key={metric} className="space-y-1">
                              <span className="text-[10px] text-muted-foreground uppercase pl-1">{metric}</span>
                              <Input
                                type="number"
                                placeholder="0"
                                className="glass-input text-center h-9 border-white/10 px-1"
                                value={
                                  metric === 'Weight'
                                    ? formData.weight || ''
                                    : formData.robotDimensions[metric.toLowerCase() as keyof typeof formData.robotDimensions] || ''
                                }
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  if (metric === 'Weight') {
                                    const val = inputValue === '' ? undefined : parseFloat(inputValue);
                                    setFormData(prev => ({ ...prev, weight: isNaN(val as number) ? undefined : val }));
                                  } else {
                                    const val = inputValue === '' ? undefined : parseFloat(inputValue);
                                    setFormData(prev => ({
                                      ...prev,
                                      robotDimensions: {
                                        ...prev.robotDimensions,
                                        [metric.toLowerCase()]: isNaN(val as number) ? undefined : val
                                      }
                                    }));
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Camera size={14} /> Number of Cameras
                        </label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="glass-input text-center h-9 border-white/10"
                          value={formData.cameraCount || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, cameraCount: val >= 0 ? val : 0 }));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Robot Capabilities</h2>
                      <p className="text-sm text-muted-foreground">Autonomous and Teleop features</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Autonomous */}
                    <div className="space-y-4">
                      <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                        <Badge className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Auto</Badge> Capabilities
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {['Score FUEL in active HUB', 'TOWER LEVEL 1 climb'].map((opt) => (
                          <div
                            key={opt}
                            onClick={() => {
                              const active = formData.autonomousCapabilities.includes(opt);
                              setFormData(prev => ({
                                ...prev,
                                autonomousCapabilities: active
                                  ? prev.autonomousCapabilities.filter(c => c !== opt)
                                  : [...prev.autonomousCapabilities, opt]
                              }));
                            }}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all",
                              formData.autonomousCapabilities.includes(opt)
                                ? "bg-blue-500/10 border-blue-500/40 text-blue-100"
                                : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                            )}
                          >
                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              formData.autonomousCapabilities.includes(opt) ? "bg-blue-500 border-blue-500" : "border-muted-foreground/50")}>
                              {formData.autonomousCapabilities.includes(opt) && <CheckCircle size={12} className="text-white" />}
                            </div>
                            <span className="text-sm font-medium">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Teleop */}
                    <div className="space-y-4">
                      <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                        <Badge className="bg-green-500/10 text-green-400 hover:bg-green-500/20">Teleop</Badge> Capabilities
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {['Score FUEL in active HUB', 'TOWER LEVEL 2 climb', 'TOWER LEVEL 3 climb'].map((opt) => (
                          <div
                            key={opt}
                            onClick={() => {
                              const active = formData.teleopCapabilities.includes(opt);
                              setFormData(prev => ({
                                ...prev,
                                teleopCapabilities: active
                                  ? prev.teleopCapabilities.filter(c => c !== opt)
                                  : [...prev.teleopCapabilities, opt]
                              }));
                            }}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all",
                              formData.teleopCapabilities.includes(opt)
                                ? "bg-green-500/10 border-green-500/40 text-green-100"
                                : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                            )}
                          >
                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              formData.teleopCapabilities.includes(opt) ? "bg-green-500 border-green-500" : "border-muted-foreground/50")}>
                              {formData.teleopCapabilities.includes(opt) && <CheckCircle size={12} className="text-white" />}
                            </div>
                            <span className="text-sm font-medium">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shooting/Passing Locations Checklist - Added here as requested */}
                    <div className="col-span-full space-y-4 pt-4 border-t border-white/5">
                      <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                        <Target size={20} className="text-primary" /> Shooting/Passing Locations
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {['Bump fire', 'Alliance wall', 'Half field', 'Full field'].map((loc) => (
                          <div
                            key={loc}
                            onClick={() => {
                              const active = formData.shootingLocations.includes(loc);
                              setFormData(prev => ({
                                ...prev,
                                shootingLocations: active
                                  ? prev.shootingLocations.filter(l => l !== loc)
                                  : [...prev.shootingLocations, loc]
                              }));
                            }}
                            className={cn(
                              "p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all",
                              formData.shootingLocations.includes(loc)
                                ? "bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                                : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                            )}
                          >
                            <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors",
                              formData.shootingLocations.includes(loc) ? "bg-primary border-primary" : "border-muted-foreground/50")}>
                              {formData.shootingLocations.includes(loc) && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <span className="font-medium">{loc}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        Identify locations the robot can effectively shoot or pass from based on their strategy.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Final Observations</h2>
                      <p className="text-sm text-muted-foreground">Climb capabilities, navigation, strategy & overall rating</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      {/* Can Climb */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Can they climb? <span className="text-red-400">*</span></label>
                        <div className="flex gap-3">
                          {['Yes', 'No'].map((opt) => (
                            <div
                              key={opt}
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                canClimb: opt === 'Yes',
                                climbLevels: opt === 'No' ? [] : prev.climbLevels
                              }))}
                              className={cn(
                                "flex-1 cursor-pointer p-3 rounded-xl border transition-all text-sm font-medium text-center",
                                (opt === 'Yes' && formData.canClimb) || (opt === 'No' && !formData.canClimb)
                                  ? "bg-primary/20 border-primary/50 text-white"
                                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                              )}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Climb Levels */}
                      {formData.canClimb && (
                        <div className="space-y-3">
                          <label className="text-sm font-medium">What level(s) can they climb? <span className="text-red-400">*</span></label>
                          <div className="grid grid-cols-1 gap-2">
                            {['LEVEL 1', 'LEVEL 2', 'LEVEL 3'].map((level) => (
                              <div
                                key={level}
                                onClick={() => {
                                  const active = formData.climbLevels.includes(level);
                                  setFormData(prev => ({
                                    ...prev,
                                    climbLevels: active
                                      ? prev.climbLevels.filter(l => l !== level)
                                      : [...prev.climbLevels, level]
                                  }));
                                }}
                                className={cn(
                                  "p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all",
                                  formData.climbLevels.includes(level)
                                    ? "bg-blue-500/10 border-blue-500/40 text-blue-100"
                                    : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                                )}
                              >
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                  formData.climbLevels.includes(level) ? "bg-blue-500 border-blue-500" : "border-muted-foreground/50")}>
                                  {formData.climbLevels.includes(level) && <CheckCircle size={12} className="text-white" />}
                                </div>
                                <span className="text-sm font-medium">{level}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Navigation Locations */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Where can they go? <span className="text-red-400">*</span></label>
                        <div className="grid grid-cols-1 gap-2">
                          {['Trench', 'Bump', 'Both'].map((location) => (
                            <div
                              key={location}
                              onClick={() => {
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
                              className={cn(
                                "p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all",
                                (location === 'Both' && formData.navigationLocations.includes('Trench') && formData.navigationLocations.includes('Bump')) ||
                                  (location !== 'Both' && formData.navigationLocations.includes(location))
                                  ? "bg-green-500/10 border-green-500/40 text-green-100"
                                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                              )}
                            >
                              <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                ((location === 'Both' && formData.navigationLocations.includes('Trench') && formData.navigationLocations.includes('Bump')) ||
                                  (location !== 'Both' && formData.navigationLocations.includes(location)))
                                  ? "bg-green-500 border-green-500" : "border-muted-foreground/50")}>
                                {((location === 'Both' && formData.navigationLocations.includes('Trench') && formData.navigationLocations.includes('Bump')) ||
                                  (location !== 'Both' && formData.navigationLocations.includes(location))) &&
                                  <CheckCircle size={12} className="text-white" />}
                              </div>
                              <span className="text-sm font-medium">{location}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ball Hold Amount */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ball Hold Amount <span className="text-red-400">*</span></label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.ballHoldAmount || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, ballHoldAmount: val }));
                          }}
                          placeholder="Number of balls"
                          className="glass-input border-white/10 placeholder:text-muted-foreground/30"
                        />
                      </div>

                      {/* Strategy During Downtime */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Strategy during downtime <span className="text-red-400">*</span></label>
                        <div className="grid grid-cols-1 gap-2">
                          {['Defend', 'Grab more balls'].map((strategy) => (
                            <div
                              key={strategy}
                              onClick={() => {
                                const active = formData.downtimeStrategy.includes(strategy);
                                setFormData(prev => ({
                                  ...prev,
                                  downtimeStrategy: active
                                    ? prev.downtimeStrategy.filter(s => s !== strategy)
                                    : [...prev.downtimeStrategy, strategy]
                                }));
                              }}
                              className={cn(
                                "p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all",
                                formData.downtimeStrategy.includes(strategy)
                                  ? "bg-purple-500/10 border-purple-500/40 text-purple-100"
                                  : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                              )}
                            >
                              <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                formData.downtimeStrategy.includes(strategy) ? "bg-purple-500 border-purple-500" : "border-muted-foreground/50")}>
                                {formData.downtimeStrategy.includes(strategy) && <CheckCircle size={12} className="text-white" />}
                              </div>
                              <span className="text-sm font-medium">{strategy}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Additional Notes</label>
                        <textarea
                          className="w-full h-32 rounded-xl bg-background/50 border border-white/10 p-4 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none resize-none transition-all"
                          placeholder="Observations about driver skill, cycle times, reliability..."
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* The overall rating card was removed as requested */}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-6 border-t border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-sm rounded-b-2xl">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="text-muted-foreground hover:text-white"
            >
              <ArrowLeft size={16} className="mr-2" /> Back
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 text-white min-w-[120px]">
                Next <ArrowRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }}
                disabled={submitting}
                type="button"
                className={cn("min-w-[140px]", submitting ? "opacity-80" : "hover:scale-105 active:scale-95 transition-transform bg-primary hover:bg-primary/90 text-white")}
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</>
                ) : (
                  <><Save size={16} className="mr-2" /> Submit Data</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
