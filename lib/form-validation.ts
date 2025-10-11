export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

export function validateField(value: any, rules: ValidationRule): string | null {
  // Required field validation
  if (rules.required) {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
    if (Array.isArray(value) && value.length === 0) {
      return 'This field is required';
    }
  }

  // Skip other validations if value is empty and not required
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Numeric validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return `Minimum value is ${rules.min}`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return `Maximum value is ${rules.max}`;
    }
  }

  // String length validations
  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters`;
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

export function validateForm(data: any, rules: { [key: string]: ValidationRule }): ValidationResult {
  const errors: ValidationErrors = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules);
    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Pit scouting specific validation rules
export const pitScoutingRules = {
  teamNumber: {
    required: true,
    min: 1,
    max: 9999,
    custom: (value: number) => {
      if (!value || value < 1 || value > 9999) {
        return 'Team number must be between 1 and 9999';
      }
      return null;
    }
  },
  robotName: {
    required: true,
    minLength: 1,
    maxLength: 100,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Robot name is required';
      }
      if (value.trim().length > 100) {
        return 'Robot name must be less than 100 characters';
      }
      return null;
    }
  },
  driveType: {
    required: true,
    custom: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Drive type is required';
      }
      return null;
    }
  },
  driveTrainOther: {
    custom: (value: string, formData?: any) => {
      if (formData?.driveType === 'Other' && (!value || value.trim().length === 0)) {
        return 'Please specify the drive train type';
      }
      return null;
    }
  },
  autonomousCapabilities: {
    required: true,
    custom: (value: string[]) => {
      if (!value || value.length === 0) {
        return 'At least one autonomous capability is required';
      }
      return null;
    }
  },
  teleopCapabilities: {
    required: true,
    custom: (value: string[]) => {
      if (!value || value.length === 0) {
        return 'At least one teleop capability is required';
      }
      return null;
    }
  },
  endgameCapabilities: {
    required: true,
    custom: (value: string[]) => {
      if (!value || value.length === 0) {
        return 'At least one endgame capability is required';
      }
      return null;
    }
  },
  overallRating: {
    required: true,
    min: 1,
    max: 10,
    custom: (value: number) => {
      if (!value || value < 1 || value > 10) {
        return 'Overall rating must be between 1 and 10';
      }
      return null;
    }
  },
  programmingLanguage: {
    maxLength: 50,
    custom: (value: string) => {
      if (value && value.length > 50) {
        return 'Programming language must be less than 50 characters';
      }
      return null;
    }
  },
  notes: {
    maxLength: 1000,
    custom: (value: string) => {
      if (value && value.length > 1000) {
        return 'Notes must be less than 1000 characters';
      }
      return null;
    }
  },
  robotDimensions: {
    custom: (value: any) => {
      if (value) {
        const { length, width, height } = value;
        if (length !== undefined && (length < 0 || length > 100)) {
          return 'Length must be between 0 and 100 inches';
        }
        if (width !== undefined && (width < 0 || width > 100)) {
          return 'Width must be between 0 and 100 inches';
        }
        if (height !== undefined && (height < 0 || height > 100)) {
          return 'Height must be between 0 and 100 inches';
        }
      }
      return null;
    }
  },
  weight: {
    custom: (value: number) => {
      if (value !== undefined && value !== null && (value < 0 || value > 200)) {
        return 'Weight must be between 0 and 200 pounds';
      }
      return null;
    }
  }
};

// Step-by-step validation for pit scouting form
export function validatePitScoutingStep(step: number, formData: any): ValidationResult {
  switch (step) {
    case 1:
      return validateForm(formData, {
        teamNumber: pitScoutingRules.teamNumber,
        robotName: pitScoutingRules.robotName,
        driveType: pitScoutingRules.driveType,
        driveTrainOther: {
          custom: (value: string) => {
            if (formData.driveType === 'Other' && (!value || value.trim().length === 0)) {
              return 'Please specify the drive train type';
            }
            return null;
          }
        }
      });
    
    case 2:
      return validateForm(formData, {
        autonomousCapabilities: pitScoutingRules.autonomousCapabilities,
        teleopCapabilities: pitScoutingRules.teleopCapabilities
      });
    
    case 3:
      return validateForm(formData, {
        endgameCapabilities: pitScoutingRules.endgameCapabilities
      });
    
    case 4:
      return validateForm(formData, {
        overallRating: pitScoutingRules.overallRating
      });
    
    default:
      return { isValid: true, errors: {} };
  }
}

// Complete form validation
export function validatePitScoutingForm(formData: any): ValidationResult {
  return validateForm(formData, {
    teamNumber: pitScoutingRules.teamNumber,
    robotName: pitScoutingRules.robotName,
    driveType: pitScoutingRules.driveType,
    driveTrainOther: {
      custom: (value: string) => {
        if (formData.driveType === 'Other' && (!value || value.trim().length === 0)) {
          return 'Please specify the drive train type';
        }
        return null;
      }
    },
    autonomousCapabilities: pitScoutingRules.autonomousCapabilities,
    teleopCapabilities: pitScoutingRules.teleopCapabilities,
    endgameCapabilities: pitScoutingRules.endgameCapabilities,
    overallRating: pitScoutingRules.overallRating,
    programmingLanguage: pitScoutingRules.programmingLanguage,
    notes: pitScoutingRules.notes,
    robotDimensions: pitScoutingRules.robotDimensions,
    weight: pitScoutingRules.weight
  });
}

// Helper function to get step-specific error message
export function getStepErrorMessage(step: number, errors: ValidationErrors): string {
  const errorMessages = {
    1: 'Please select a team, enter robot name, and choose drive type.',
    2: 'Please select at least one autonomous capability and one teleop capability.',
    3: 'Please select at least one endgame capability.',
    4: 'Please provide an overall rating.'
  };
  
  return errorMessages[step as keyof typeof errorMessages] || 'Please complete all required fields before proceeding.';
}
