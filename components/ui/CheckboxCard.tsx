"use client"

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxCardProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const CheckboxCard: React.FC<CheckboxCardProps> = ({
  id,
  label,
  checked,
  onChange,
  className,
}) => {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-200',
        'bg-card text-card-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        checked ? 'border-primary bg-primary/10 shadow-sm' : 'border-border',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <span className="font-medium break-words">{label}</span>
      </div>
      <div className="ml-4 flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only" // Hide default checkbox
        />
        <motion.div
          className={cn(
            'w-6 h-6 rounded-md border-2 flex items-center justify-center',
            checked
              ? 'bg-primary border-primary'
              : 'bg-transparent border-muted-foreground/50'
          )}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence>
            {checked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Check className="w-4 h-4 text-primary-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </label>
  );
};

export { CheckboxCard };
