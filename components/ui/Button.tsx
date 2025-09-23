import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isDarkMode?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, isDarkMode = true, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            // Primary variant
            'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500': variant === 'primary',
            // Secondary variant
            'bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-500': variant === 'secondary',
            // Outline variant
            'border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white focus-visible:ring-gray-500': variant === 'outline' && isDarkMode,
            'border border-gray-300 text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500': variant === 'outline' && !isDarkMode,
            // Ghost variant
            'text-gray-300 hover:bg-gray-700 hover:text-white focus-visible:ring-gray-500': variant === 'ghost' && isDarkMode,
            'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500': variant === 'ghost' && !isDarkMode,
            // Destructive variant
            'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500': variant === 'destructive',
            // Sizes
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-8 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
