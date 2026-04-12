import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/Button';
import { CloudUpload, Wifi, AlertTriangle, CheckCircle2, Loader2, Gauge, X } from 'lucide-react';
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const testingRef = useRef(false);
  const wasOpenRef = useRef(false);

  const MIN_SPEED_MBPS = 5;

  /** Every time the user opens the upload guard, run a fresh speed test (do not reuse last success). */
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      testingRef.current = false;
      setStatus('idle');
      setError(null);
      setSpeed(0);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const runSpeedTest = useCallback(async () => {
    // Avoid double-running
    if (testingRef.current || status === 'success') return;
    
    testingRef.current = true;
    setStatus('testing');
    setError(null);
    setSpeed(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const TEST_DURATION_MS = 5000;
    const CHUNK_SIZE = 512 * 1024; // 512KB chunks for more stable averages per request
    const chunk = new Uint8Array(CHUNK_SIZE);
    
    // Fill buffer in 64KB increments (quota limit for getRandomValues)
    for (let i = 0; i < CHUNK_SIZE; i += 65536) {
      crypto.getRandomValues(chunk.subarray(i, i + 65536));
    }

    let totalBytesSent = 0;
    const startTime = performance.now();
    const samples: number[] = [];
    let lastUpdate = 0;

    // Overall timeout to stop the test exactly at 5s
    const testTimeout = setTimeout(() => {
      controller.abort();
    }, TEST_DURATION_MS);

    try {
      while (performance.now() - startTime < TEST_DURATION_MS) {
        if (controller.signal.aborted) break;

        const requestStart = performance.now();
        
        try {
          const response = await fetch('/api/speedtest', {
            method: 'POST',
            body: chunk,
            cache: 'no-store',
            signal: controller.signal,
            // Mode 'cors', 'no-cache', etc are defaults mostly
          });

          if (!response.ok) throw new Error('Upload server error');
          
          const requestEnd = performance.now();
          const requestDurationMs = requestEnd - requestStart;
          
          if (requestDurationMs > 10) { // Filter out near-instant responses which indicate buffering/caching
            const bitrateMbps = (CHUNK_SIZE * 8 / (requestDurationMs / 1000)) / 1000000;
            samples.push(bitrateMbps);
            totalBytesSent += CHUNK_SIZE;
            
            // UI throttle: only update speed text every 200ms
            const now = performance.now();
            if (now - lastUpdate > 200) {
              setSpeed(Number(bitrateMbps.toFixed(2)));
              lastUpdate = now;
            }
          }
        } catch (fetchErr: any) {
          if (fetchErr.name === 'AbortError') break;
          throw fetchErr;
        }
      }

      // Final calculations after loop ends
      const endTime = performance.now();
      const totalTimeElapsed = (endTime - startTime) / 1000;
      
      const realAvgMbps = totalTimeElapsed > 0 ? (totalBytesSent * 8 / totalTimeElapsed) / 1000000 : 0;
      // Stricter check: require at least 3 chunk responses and 1 Mbps min stability check
      const isConsideredStable = samples.length >= 3;

      setSpeed(Number(realAvgMbps.toFixed(2)));

      if (realAvgMbps >= MIN_SPEED_MBPS && isConsideredStable) {
        setStatus('success');
      } else if (!isConsideredStable) {
        setError('Connection interrupted or very unstable. Retesting is recommended.');
        setStatus('fail');
      } else {
        setStatus('fail');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Speed test error:', err);
        setError(err.message || 'An error occurred during upload test.');
        setStatus('fail');
      }
    } finally {
      clearTimeout(testTimeout);
      abortControllerRef.current = null;
      testingRef.current = false;
    }
  }, [status]); // Status in deps to allow re-runs



  useEffect(() => {
    let active = true;
    if (isOpen && status === 'idle' && active) {
      runSpeedTest();
    }
    
    return () => { active = false; };
  }, [isOpen, status, runSpeedTest]);

  // Handle manual cancel from button
  const handleCancelClick = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setError('Test cancelled by user.');
    setStatus('fail');
  };

  const handleReset = () => {
    setStatus('idle');
  };

  const handleDialogClose = () => {
    if (status === 'testing' && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
    // Use timeout to delay reset to idle so the UI transition looks clean
    setTimeout(() => setStatus('idle'), 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden">
        {/* Animated Background Glow */}
        <div className={cn(
          "absolute -top-24 -right-24 w-48 h-48 blur-3xl rounded-full transition-colors duration-1000 opacity-20",
          status === 'testing' ? "bg-primary" :
          status === 'success' ? "bg-emerald-500" :
          status === 'fail' ? "bg-rose-500" : "bg-primary/50"
        )} />

        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center gap-2 text-2xl font-heading font-black tracking-tight text-foreground">
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
                {/* Speedometer Visualization - Improved constant rotation */}
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
                      strokeLinecap="round"
                      strokeDasharray="440"
                      initial={{ strokeDashoffset: 440 }}
                      animate={{ strokeDashoffset: 110 }}
                      transition={{ 
                        duration: 5, 
                        ease: "linear"
                      }}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-1" />
                    <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Measuring</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm font-medium text-muted-foreground animate-pulse">Analysing upload stability (5s)...</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground tabular-nums">{speed}</span>
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-tight">Mbps</span>
                  </div>
                </div>
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
                <p className="max-w-[280px] text-xs text-muted-foreground leading-relaxed">
                  Your upload connection is stable and exceeds the 5 Mbps requirement. Reliable sync is ready.
                </p>
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
          {status === 'testing' && (
             <Button
             variant="ghost"
             onClick={handleCancelClick}
             className="w-full flex items-center justify-center gap-2 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/5 py-6 rounded-xl font-bold transition-all"
           >
             <X className="w-4 h-4" />
             CANCEL TEST
           </Button>
          )}

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
                onClick={handleDialogClose}
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
