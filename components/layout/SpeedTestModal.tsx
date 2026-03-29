import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/Button';
import { CloudUpload, Wifi, AlertTriangle, CheckCircle2, Loader2, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpeedTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPass: () => void;
}

export default function SpeedTestModal({ isOpen, onClose, onPass }: SpeedTestModalProps) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [speed, setSpeed] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const MIN_SPEED_MBPS = 5;

  const runSpeedTest = useCallback(async () => {
    setStatus('testing');
    setError(null);
    setSpeed(0);

    const TEST_DURATION_MS = 5000;
    const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunk
    const chunk = new Uint8Array(CHUNK_SIZE);
    crypto.getRandomValues(chunk);

    let totalBytesSent = 0;
    const startTime = performance.now();
    const samples: number[] = [];

    try {
      while (performance.now() - startTime < TEST_DURATION_MS) {
        const chunkStart = performance.now();
        
        const response = await fetch('/api/speedtest', {
          method: 'POST',
          body: chunk,
          cache: 'no-store'
        });

        if (!response.ok) throw new Error('Upload link lost. Connection unstable.');
        
        const chunkEnd = performance.now();
        const chunkDuration = (chunkEnd - chunkStart) / 1000;
        const chunkMbps = (CHUNK_SIZE * 8 / chunkDuration) / 1000000;
        
        samples.push(chunkMbps);
        totalBytesSent += CHUNK_SIZE;
        
        // Update live speed display
        setSpeed(Number(chunkMbps.toFixed(2)));
      }

      const totalTime = (performance.now() - startTime) / 1000;
      const avgMbps = (totalBytesSent * 8 / totalTime) / 1000000;
      
      // Stability check: Must have at least 3 samples and minimum sample must be > 1 Mbps to be "stable" 
      // AND Average must be >= threshold.
      const minMbps = Math.min(...samples);
      const isStable = minMbps > 1.0; // Very basic stability check

      setSpeed(Number(avgMbps.toFixed(2)));

      if (avgMbps >= MIN_SPEED_MBPS && isStable) {
        setStatus('success');
      } else if (!isStable) {
        setError('Connection is unstable. Upload speed fluctuated too much.');
        setStatus('fail');
      } else {
        setStatus('fail');
      }
    } catch (err: any) {
      console.error('Speed test error:', err);
      setError(err.message || 'An error occurred during upload test.');
      setStatus('fail');
    }
  }, []);

  useEffect(() => {
    if (isOpen && status === 'idle') {
      runSpeedTest();
    }
  }, [isOpen, status, runSpeedTest]);

  const handleReset = () => {
    setStatus('idle');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && status !== 'testing') onClose(); }}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden">
        {/* Animated Background Glow */}
        <div className={cn(
          "absolute -top-24 -right-24 w-48 h-48 blur-3xl rounded-full transition-colors duration-1000 opacity-20",
          status === 'testing' ? "bg-primary" :
          status === 'success' ? "bg-emerald-500" :
          status === 'fail' ? "bg-rose-500" : "bg-primary/50"
        )} />

        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center gap-2 text-2xl font-heading font-black tracking-tight">
            <Gauge className={cn("w-6 h-6", status === 'testing' && "animate-pulse")} />
            CONNECTION GUARD
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80 font-medium">
            Verifying upload throughput for reliable data sync.
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 py-8 flex flex-col items-center justify-center min-h-[220px]">
          <AnimatePresence mode="wait">
            {status === 'testing' && (
              <motion.div
                key="testing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Speedometer Visualization */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted-foreground/10"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray="440"
                      animate={{ strokeDashoffset: [440, 220, 100, 300] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-1" />
                    <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Measuring</span>
                  </div>
                </div>
                <p className="text-sm font-medium animate-pulse text-muted-foreground">Analysing upload stability (5s)...</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-4xl font-black text-foreground">{speed} <span className="text-lg text-muted-foreground">Mbps</span></h3>
                  <p className="text-sm font-semibold text-emerald-500/80 uppercase tracking-widest">Great Connection</p>
                </div>
                  Your upload connection is stable and exceeds the 5 Mbps requirement. Reliable sync is ready.
              </motion.div>
            )}

            {status === 'fail' && (
              <motion.div
                key="fail"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center mb-2 ring-1 ring-rose-500/20">
                  <AlertTriangle className="w-12 h-12 text-rose-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-foreground">{speed} <span className="text-lg text-muted-foreground uppercase">Mbps</span></h3>
                  <p className="text-sm font-semibold text-rose-500 uppercase tracking-widest">Insufficient Speed</p>
                </div>
                <p className="max-w-[280px] text-xs text-muted-foreground leading-relaxed">
                  {error ? error : `Connection speed is below the required 5 Mbps. Direct upload is disabled to prevent data corruption.`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="relative z-10 flex flex-col gap-2 sm:flex-row sm:justify-center pt-4 border-t border-border/40">
          {status === 'success' && (
            <Button
              onClick={onPass}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
            >
              <CloudUpload className="w-5 h-5 mr-4" />
              START SYNC NOW
            </Button>
          )}

          {status === 'fail' && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 border-border/60 hover:bg-muted py-6 rounded-xl font-bold"
              >
                <Wifi className="w-4 h-4 mr-2" />
                RETEST
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 hover:bg-rose-500/5 text-muted-foreground py-6 rounded-xl"
              >
                CANCEL
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
