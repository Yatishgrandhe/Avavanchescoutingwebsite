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
        'flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
        'bg-card text-card-foreground shadow-sm',
        'hover:border-primary/50',
        checked 
          ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
          : 'border-border',
        className
      )}
    >
      <div className="flex-1 min-w-0 pr-4">
        <span className="font-semibold text-base break-words">{label}</span>
      </div>
      <div className="flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only" // Hide default checkbox
        />
        <motion.div
          className={cn(
            'w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors duration-200',
            checked
              ? 'bg-primary border-primary'
              : 'bg-transparent border-muted-foreground/30'
          )}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence>
            {checked && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check className="w-5 h-5 text-primary-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </label>
  );
};

export { CheckboxCard };
