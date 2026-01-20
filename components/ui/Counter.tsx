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
    const newValue = value + step;
    if (newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = value - step;
    if (newValue >= min) {
      onChange(newValue);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(min);
      return;
    }
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
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
      
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDecrement();
          }}
          disabled={value <= min}
          type="button"
          className={`w-10 h-10 p-0 flex-shrink-0 ${
            isDarkMode 
              ? 'border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed' 
              : 'border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          aria-label="Decrease value"
        >
          <Minus className="w-4 h-4" />
        </Button>
        
        <div className={`min-w-[60px] sm:min-w-[80px] text-center px-3 sm:px-4 py-2 rounded-lg border flex-1 ${
          isDarkMode 
            ? 'bg-gray-700 border-gray-600 text-white' 
            : 'bg-background border-border text-foreground'
        }`}>
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            className="w-full text-center text-lg font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label={label || 'Counter value'}
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleIncrement();
          }}
          disabled={value >= max}
          type="button"
          className={`w-10 h-10 p-0 flex-shrink-0 ${
            isDarkMode 
              ? 'border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed' 
              : 'border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          aria-label="Increase value"
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
