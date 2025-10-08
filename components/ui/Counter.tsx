import React from 'react';
import { Button } from '../ui';
import { Plus, Minus } from 'lucide-react';

interface CounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  points?: number;
  isDarkMode?: boolean;
  className?: string;
}

const Counter: React.FC<CounterProps> = ({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  label,
  points,
  isDarkMode = true,
  className = ''
}) => {
  const handleIncrement = () => {
    if (value < max) {
      onChange(value + step);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - step);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {label}
          </label>
          {points && (
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {points} pts each
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrement}
          disabled={value <= min}
          className={`w-10 h-10 p-0 ${
            isDarkMode 
              ? 'border-gray-600 hover:bg-gray-700 disabled:opacity-50' 
              : 'border-gray-300 hover:bg-gray-100 disabled:opacity-50'
          }`}
        >
          <Minus className="w-4 h-4" />
        </Button>
        
        <div className={`min-w-[60px] text-center px-4 py-2 rounded-lg border ${
          isDarkMode 
            ? 'bg-gray-700 border-gray-600 text-white' 
            : 'bg-background border-border text-foreground'
        }`}>
          <span className="text-lg font-semibold">{value}</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrement}
          disabled={value >= max}
          className={`w-10 h-10 p-0 ${
            isDarkMode 
              ? 'border-gray-600 hover:bg-gray-700 disabled:opacity-50' 
              : 'border-gray-300 hover:bg-gray-100 disabled:opacity-50'
          }`}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {points && (
        <div className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Total: {value * points} points
        </div>
      )}
    </div>
  );
};

export default Counter;
