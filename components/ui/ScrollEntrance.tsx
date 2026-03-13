import React from 'react';
import { motion } from 'framer-motion';

interface ScrollEntranceProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const ScrollEntrance: React.FC<ScrollEntranceProps> = ({ 
  children, 
  delay = 0,
  className 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.23, 1, 0.32, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
