import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
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
  Settings
} from 'lucide-react';

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
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);
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
      // TODO: Implement pit scouting data submission to Supabase
      console.log('Pit scouting data:', formData);
      
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

  if (!session) {
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
    <Layout user={{
      name: session.user?.name || 'User',
      username: session.user?.email || undefined,
      image: session.user?.image || undefined,
    }}>
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
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Settings className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span>Basic Information</span>
                    </CardTitle>
                    <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Enter basic team and robot information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Team Number"
                        type="number"
                        placeholder="Enter team number"
                        value={formData.teamNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, teamNumber: parseInt(e.target.value) || 0 }))}
                        isDarkMode={isDarkMode}
                      />
                      <Input
                        label="Robot Name"
                        placeholder="Enter robot name"
                        value={formData.robotName}
                        onChange={(e) => setFormData(prev => ({ ...prev, robotName: e.target.value }))}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Drive Type"
                        placeholder="e.g., Tank Drive, Swerve, Mecanum"
                        value={formData.driveType}
                        onChange={(e) => setFormData(prev => ({ ...prev, driveType: e.target.value }))}
                        isDarkMode={isDarkMode}
                      />
                      <Input
                        label="Programming Language"
                        placeholder="e.g., Java, Python, C++"
                        value={formData.programmingLanguage}
                        onChange={(e) => setFormData(prev => ({ ...prev, programmingLanguage: e.target.value }))}
                        isDarkMode={isDarkMode}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Input
                        label="Length (inches)"
                        type="number"
                        placeholder="0"
                        value={formData.robotDimensions.length || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          robotDimensions: { ...prev.robotDimensions, length: parseFloat(e.target.value) || 0 }
                        }))}
                        isDarkMode={isDarkMode}
                      />
                      <Input
                        label="Width (inches)"
                        type="number"
                        placeholder="0"
                        value={formData.robotDimensions.width || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          robotDimensions: { ...prev.robotDimensions, width: parseFloat(e.target.value) || 0 }
                        }))}
                        isDarkMode={isDarkMode}
                      />
                      <Input
                        label="Height (inches)"
                        type="number"
                        placeholder="0"
                        value={formData.robotDimensions.height || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          robotDimensions: { ...prev.robotDimensions, height: parseFloat(e.target.value) || 0 }
                        }))}
                        isDarkMode={isDarkMode}
                      />
                    </div>

                    <Input
                      label="Weight (lbs)"
                      type="number"
                      placeholder="0"
                      value={formData.weight || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                      isDarkMode={isDarkMode}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button onClick={handleNext} isDarkMode={isDarkMode}>
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
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <CheckCircle className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span>Capabilities Assessment</span>
                    </CardTitle>
                    <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Assess robot capabilities for each game period
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Capabilities assessment will be implemented based on your requirements
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        This section will be customized when you provide the specific requirements
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} isDarkMode={isDarkMode}>
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
                    <Button onClick={handleNext} isDarkMode={isDarkMode}>
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
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <FileText className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <span>Analysis & Notes</span>
                    </CardTitle>
                    <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Document strengths, weaknesses, and observations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Analysis and notes section will be implemented based on your requirements
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        This section will be customized when you provide the specific requirements
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} isDarkMode={isDarkMode}>
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
                    <Button onClick={handleNext} isDarkMode={isDarkMode}>
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
                <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
                  <CardHeader>
                    <CardTitle className={`flex items-center space-x-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Camera className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span>Review & Submit</span>
                    </CardTitle>
                    <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
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
                      <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4`}>
                        <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Basic Information</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Team: {formData.teamNumber}</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Robot: {formData.robotName || 'N/A'}</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Drive: {formData.driveType || 'N/A'}</p>
                      </div>

                      <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-4`}>
                        <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Robot Specs</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Dimensions: {formData.robotDimensions.length}" × {formData.robotDimensions.width}" × {formData.robotDimensions.height}"
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Weight: {formData.weight} lbs</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Language: {formData.programmingLanguage || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBack} isDarkMode={isDarkMode}>
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting} isDarkMode={isDarkMode}>
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
