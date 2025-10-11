export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationErrors {
  [key: string]: string;
}

export function validateField(value: any, rules: ValidationRule): string | null {
  if (rules.required && (value === undefined || value === null || value === '')) {
    return 'This field is required';
  }

  if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
    return `Minimum value is ${rules.min}`;
  }

  if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
    return `Maximum value is ${rules.max}`;
  }

  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return 'Invalid format';
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

export function validateForm(data: any, rules: { [key: string]: ValidationRule }): ValidationErrors {
  const errors: ValidationErrors = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Common validation rules
export const commonRules = {
  required: { required: true },
  teamNumber: { 
    required: true, 
    min: 1, 
    max: 9999,
    custom: (value: number) => {
      if (value < 1 || value > 9999) return 'Team number must be between 1 and 9999';
      return null;
    }
  },
  defenseRating: {
    required: true,
    min: 1,
    max: 10,
    custom: (value: number) => {
      if (value < 1 || value > 10) return 'Defense rating must be between 1 and 10';
      return null;
    }
  },
  comments: {
    max: 500,
    custom: (value: string) => {
      if (value && value.length > 500) return 'Comments must be less than 500 characters';
      return null;
    }
  }
};
