import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input, Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui';

interface MiscellaneousFormProps {
  onNext: (miscData: { defense_rating: number; comments: string }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}

const MiscellaneousForm: React.FC<MiscellaneousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const [formData, setFormData] = useState({
    defense_rating: 0,
    comments: '',
  });

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      <Card className="bg-dark-800 border-dark-700">
        {/* Progress Bar */}
        <div className="px-6 pt-6">
          <div className="w-full bg-dark-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-r from-reef-400 to-reef-600 h-2 rounded-full"
            />
          </div>
        </div>

        <CardHeader className="text-center">
          <CardTitle className="text-white text-2xl font-bold">
            Additional Notes
          </CardTitle>
          <CardDescription className="text-gray-400">
            Add any additional observations and comments
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6">
          {/* Defense Rating */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Defense Rating <span className="text-red-500">*</span></h3>
            <Input
              type="number"
              min="1"
              max="10"
              value={formData.defense_rating}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('defense_rating', parseInt(e.target.value) || 0)}
              className="bg-black border-dark-600 text-white"
              placeholder="Rate the team's defensive play from 1-10"
            />
            <p className="text-gray-400 text-sm">
              1 = No defense, 10 = Exceptional defensive play
            </p>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Comments <span className="text-red-500">*</span></h3>
            <textarea
              value={formData.comments}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('comments', e.target.value)}
              className="w-full h-24 sm:h-32 bg-black border border-dark-600 text-white rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-reef-500 text-sm sm:text-base"
              placeholder="Add any additional observations, strategies observed, or notable robot capabilities..."
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-dark-600 text-gray-300 hover:bg-dark-700 hover:text-white"
          >
            Previous
          </Button>
          
          <Button
            onClick={() => onNext(formData)}
            className="bg-reef-600 hover:bg-reef-700 text-white"
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default MiscellaneousForm;
