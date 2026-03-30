import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/Button';
import { BallTrackingPhase, getBallChoiceScoreFromRange, RunRecord } from '@/lib/types';
import { Award, Play, Square, Clock } from 'lucide-react';
import { formatDurationSec } from '@/lib/utils';
import StopwatchBallTracking from './StopwatchBallTracking';

interface AutonomousFormProps {
  onNext: (autonomousData: BallTrackingPhase & { auto_fuel_active_hub?: number; auto_tower_level1?: boolean; auto_climb_sec?: number }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<BallTrackingPhase> & { auto_fuel_active_hub?: number; auto_tower_level1?: boolean; auto_climb_sec?: number | null };
}

const AutonomousForm: React.FC<AutonomousFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const [autoTowerLevel1, setAutoTowerLevel1] = useState(!!initialData?.auto_tower_level1);
  const [autoClimbSec, setAutoClimbSec] = useState<number | ''>(initialData?.auto_climb_sec != null ? Number(initialData.auto_climb_sec) : '');
  const [autoClimbTimerRunning, setAutoClimbTimerRunning] = useState(false);
  const [autoClimbElapsedMs, setAutoClimbElapsedMs] = useState(0);
  const [showAutoClimbPopup, setShowAutoClimbPopup] = useState(false);
  const [pendingAutoClimbSec, setPendingAutoClimbSec] = useState(0);

  useEffect(() => {
    if (!autoClimbTimerRunning) return;
    const start = Date.now();
    const id = setInterval(() => {
      setAutoClimbElapsedMs(Date.now() - start);
    }, 10);
    return () => clearInterval(id);
  }, [autoClimbTimerRunning]);

  const handleAutoClimbTimerStart = useCallback(() => {
    setAutoClimbElapsedMs(0);
    setAutoClimbTimerRunning(true);
    setShowAutoClimbPopup(false);
  }, []);

  const handleAutoClimbTimerStop = useCallback(() => {
    setAutoClimbTimerRunning(false);
    setPendingAutoClimbSec(Math.round((autoClimbElapsedMs / 1000) * 1000) / 1000);
    setShowAutoClimbPopup(true);
  }, [autoClimbElapsedMs]);

  const handleAutoClimbSave = useCallback(() => {
    setAutoClimbSec(Math.round(pendingAutoClimbSec * 1000) / 1000);
    setAutoClimbElapsedMs(0);
    setPendingAutoClimbSec(0);
    setShowAutoClimbPopup(false);
  }, [pendingAutoClimbSec]);

  const handleAutoClimbCancel = useCallback(() => {
    setShowAutoClimbPopup(false);
    setAutoClimbElapsedMs(0);
    setPendingAutoClimbSec(0);
  }, []);

  const handleAutoClimbClear = useCallback(() => {
    setAutoClimbSec('');
  }, []);

  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleComplete = (runs: RunRecord[]) => {
    const totalFuel = (runs || []).reduce(
      (sum, r) => sum + getBallChoiceScoreFromRange(r.ball_choice),
      0
    );
    onNext({
      runs,
      auto_fuel_active_hub: Math.round(totalFuel * 10) / 10,
      auto_tower_level1: autoTowerLevel1,
      auto_climb_sec: autoClimbSec !== '' && !Number.isNaN(Number(autoClimbSec)) ? Math.round(Number(autoClimbSec) * 1000) / 1000 : undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto min-h-[500px]"
    >
      <Card className="bg-card border-border">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Auto climb: L1 + CLANK speed */}
          <div className={`rounded-xl p-3 sm:p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Auto climb</h3>
            </div>
            <label className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-all mt-3 ${autoTowerLevel1 ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/5'
              }`}>
              <div className="flex flex-col">
                <span className="text-sm font-bold">L1 CLIMB</span>
                <span className="text-[10px] text-muted-foreground uppercase">+15 points</span>
              </div>
              <input
                type="checkbox"
                checked={autoTowerLevel1}
                onChange={(e) => setAutoTowerLevel1(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
            </label>

            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center space-x-2 pb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">CLANK speed (auto climb time)</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Time in seconds — +2 pts ≤3s, -2 pts &gt;6s</p>
              <div className={`rounded-lg p-3 font-mono text-lg ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-muted/30 border border-border'}`}>
                {autoClimbTimerRunning ? formatDurationSec(autoClimbElapsedMs / 1000) : autoClimbSec !== '' ? formatDurationSec(Number(autoClimbSec)) : '—'}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {!autoClimbTimerRunning ? (
                  <Button type="button" size="sm" onClick={handleAutoClimbTimerStart} className="gap-1">
                    <Play className="w-3.5 h-3.5" /> Start
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="destructive" onClick={handleAutoClimbTimerStop} className="gap-1">
                    <Square className="w-3.5 h-3.5" /> Stop
                  </Button>
                )}
                {autoClimbSec !== '' && !autoClimbTimerRunning && (
                  <Button type="button" size="sm" variant="outline" onClick={handleAutoClimbClear}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <Dialog open={showAutoClimbPopup} onOpenChange={(open) => !open && handleAutoClimbCancel()}>
              <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>CLANK speed (auto climb time)</DialogTitle>
                  <DialogDescription>
                    Time: <strong>{formatDurationSec(pendingAutoClimbSec)}</strong>. Save this as auto climb speed (CLANK)?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={handleAutoClimbCancel}>Cancel</Button>
                  <Button type="button" onClick={handleAutoClimbSave}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="pt-2">
            <StopwatchBallTracking
              phaseLabel="Auto Fuel"
              phaseDescription="Track scoring runs during autonomous"
              initialData={initialData?.runs}
              onComplete={handleComplete}
              onBack={onBack}
              isDarkMode={isDarkMode}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AutonomousForm;
