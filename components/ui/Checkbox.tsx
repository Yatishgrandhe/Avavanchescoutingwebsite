import React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            className={cn(
              'w-4 h-4 text-reef-600 bg-dark-600 border-dark-500 rounded focus:ring-reef-500 focus:ring-2',
              error && 'border-destructive',
              className
            )}
            ref={ref}
            {...props}
          />
          {label && (
            <label className="text-sm font-medium text-foreground cursor-pointer">
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
