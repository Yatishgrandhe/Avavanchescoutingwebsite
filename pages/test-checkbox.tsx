import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function TestCheckbox() {
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checkedOptions, setCheckedOptions] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">Checkbox Test Page</h1>
        
        {/* Test 1: Basic Checkbox */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-6 rounded-lg border"
        >
          <h2 className="text-xl font-semibold mb-4">Test 1: Basic Checkbox</h2>
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={checked1}
              onChange={(e) => setChecked1(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-lg">Basic checkbox test</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Status: {checked1 ? 'Checked' : 'Unchecked'}
          </p>
        </motion.div>

        {/* Test 2: Checkbox with Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-6 rounded-lg border"
        >
          <h2 className="text-xl font-semibold mb-4">Test 2: Checkbox with Label</h2>
          <label className="flex items-center space-x-4 cursor-pointer">
            <input
              type="checkbox"
              checked={checked2}
              onChange={(e) => setChecked2(e.target.checked)}
              className="cursor-pointer"
            />
            <span className="text-lg">Checkbox with label wrapper</span>
          </label>
          <p className="text-sm text-muted-foreground mt-2">
            Status: {checked2 ? 'Checked' : 'Unchecked'}
          </p>
        </motion.div>

        {/* Test 3: Multiple Checkboxes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-lg border"
        >
          <h2 className="text-xl font-semibold mb-4">Test 3: Multiple Checkboxes</h2>
          <div className="space-y-3">
            {['Option 1', 'Option 2', 'Option 3', 'Option 4'].map((option, index) => (
              <div key={option} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={checkedOptions.includes(option)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCheckedOptions(prev => [...prev, option]);
                    } else {
                      setCheckedOptions(prev => prev.filter(opt => opt !== option));
                    }
                  }}
                  className="cursor-pointer"
                />
                <span className="text-lg">{option}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Selected: {checkedOptions.length > 0 ? checkedOptions.join(', ') : 'None'}
          </p>
        </motion.div>

        {/* Mobile Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-900/20 p-6 rounded-lg border border-blue-700"
        >
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Mobile Test Instructions</h2>
          <ul className="space-y-2 text-sm">
            <li>• Test on mobile device in portrait mode</li>
            <li>• Checkboxes should be properly sized (24px on mobile)</li>
            <li>• Checkmark should be visible when checked</li>
            <li>• Text should not overlap with checkbox</li>
            <li>• Touch targets should be easy to tap</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
