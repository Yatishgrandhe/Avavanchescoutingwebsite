import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', animated = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const LogoComponent = () => (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Outer triangle - dark blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-md transform rotate-45 border border-white/20 animate-glow"></div>
      
      {/* Middle layer - medium blue */}
      <div className="absolute inset-1 bg-gradient-to-br from-blue-500 to-blue-700 rounded-sm transform rotate-45 animate-float"></div>
      
      {/* Inner lightning bolt/A shape - bright blue-purple */}
      <div className="absolute inset-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-sm transform rotate-45"></div>
      
      {/* Additional geometric elements */}
      <div className="absolute top-1 left-1 w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
      <div className="absolute bottom-1 right-1 w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <LogoComponent />
      </motion.div>
    );
  }

  return <LogoComponent />;
};

export default Logo;
