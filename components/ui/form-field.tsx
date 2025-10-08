import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
}

export function FormFieldWrapper({ 
  label, 
  required = false, 
  error, 
  children, 
  className,
  description 
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-white">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-400">{description}</p>
      )}
      {children}
      {error && (
        <div className="flex items-center space-x-1 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

interface InputFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  [key: string]: any;
}

export function InputField({ 
  label, 
  required = false, 
  error, 
  description,
  className,
  ...props 
}: InputFieldProps) {
  return (
    <FormFieldWrapper label={label} required={required} error={error} description={description}>
      <input
        className={cn(
          'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
    </FormFieldWrapper>
  );
}

interface SelectFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export function SelectField({ 
  label, 
  required = false, 
  error, 
  description,
  className,
  children,
  ...props 
}: SelectFieldProps) {
  return (
    <FormFieldWrapper label={label} required={required} error={error} description={description}>
      <select
        className={cn(
          'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </FormFieldWrapper>
  );
}

interface TextareaFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  [key: string]: any;
}

export function TextareaField({ 
  label, 
  required = false, 
  error, 
  description,
  className,
  ...props 
}: TextareaFieldProps) {
  return (
    <FormFieldWrapper label={label} required={required} error={error} description={description}>
      <textarea
        className={cn(
          'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
    </FormFieldWrapper>
  );
}
