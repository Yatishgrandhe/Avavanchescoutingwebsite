import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '../ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { BallTrackingPhase, BALL_CHOICE_OPTIONS, SCORING_VALUES, type ScoringNotes } from '@/lib/types';
import { TrendingUp, Award, Play, Square, Clock, Trash2, Zap } from 'lucide-react';
import StopwatchBallTracking from './StopwatchBallTracking';

interface TeleopFormProps {
  onNext: (teleopData: Partial<ScoringNotes> & BallTrackingPhase & { climb_sec?: number }) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  isDarkMode?: boolean;
  initialData?: Partial<ScoringNotes> & Partial<BallTrackingPhase> & { climb_sec?: number | null };
}

const TeleopForm: React.FC<TeleopFormProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
  isDarkMode = true,
  initialData,
}) => {
  const [towerLevel1, setTowerLevel1] = useState(!!initialData?.teleop_tower_level1);
  const [towerLevel2, setTowerLevel2] = useState(!!initialData?.teleop_tower_level2);
  const [towerLevel3, setTowerLevel3] = useState(!!initialData?.teleop_tower_level3);
  const [climbSec, setClimbSec] = useState<number | ''>(initialData?.climb_sec != null ? Number(initialData.climb_sec) : '');
  const [climbTimerRunning, setClimbTimerRunning] = useState(false);
  const [climbElapsedMs, setClimbElapsedMs] = useState(0);
  const [showClimbTimePopup, setShowClimbTimePopup] = useState(false);
  const [pendingClimbSec, setPendingClimbSec] = useState(0);

  useEffect(() => {
    if (!climbTimerRunning) return;
    const start = Date.now();
    const id = setInterval(() => {
      setClimbElapsedMs(Date.now() - start);
    }, 50);
    return () => clearInterval(id);
  }, [climbTimerRunning]);

  const handleClimbTimerStart = useCallback(() => {
    setClimbElapsedMs(0);
    setClimbTimerRunning(true);
    setShowClimbTimePopup(false);
  }, []);

  const handleClimbTimerStop = useCallback(() => {
    setClimbTimerRunning(false);
    setPendingClimbSec(Math.round((climbElapsedMs / 1000) * 1000) / 1000);
    setShowClimbTimePopup(true);
  }, [climbElapsedMs]);

  const handleClimbTimeSave = useCallback(() => {
    setClimbSec(Math.round(pendingClimbSec * 1000) / 1000);
    setClimbElapsedMs(0);
    setPendingClimbSec(0);
    setShowClimbTimePopup(false);
  }, [pendingClimbSec]);

  const handleClimbTimeCancel = useCallback(() => {
    setShowClimbTimePopup(false);
    setClimbElapsedMs(0);
    setPendingClimbSec(0);
  }, []);

  const handleClimbTimeClear = useCallback(() => {
    setClimbSec('');
  }, []);

  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleComplete = (data: BallTrackingPhase) => {
    const totalFuel = (data.runs ?? []).reduce(
      (sum, r) => sum + (BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0),
      0
    );
    onNext({
      ...data,
      teleop_fuel_active_hub: Math.round(totalFuel * 10) / 10,
      teleop_fuel_shifts: (data.runs ?? []).map(r => BALL_CHOICE_OPTIONS[r.ball_choice]?.value ?? 0),
      teleop_tower_level1: towerLevel1,
      teleop_tower_level2: towerLevel2,
      teleop_tower_level3: towerLevel3,
      climb_sec: climbSec !== '' && !Number.isNaN(Number(climbSec)) ? Number(climbSec) : undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto min-h-[500px]"
    >
      <Card className="bg-card border-border shadow-lg">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* TOWER Climb Section */}
          <div className={`rounded-xl p-3 sm:p-4 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center space-x-2 pb-2 border-b border-border/50">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Teleop Climb</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {[
                { id: 'teleop_tower_level1', label: 'LEVEL 1', pts: 10, set: setTowerLevel1, val: towerLevel1 },
                { id: 'teleop_tower_level2', label: 'LEVEL 2', pts: 20, set: setTowerLevel2, val: towerLevel2 },
                { id: 'teleop_tower_level3', label: 'LEVEL 3', pts: 30, set: setTowerLevel3, val: towerLevel3 },
              ].map((level) => (
                <label
                  key={level.id}
                  className={`flex items-center justify-between sm:flex-col sm:items-start p-2.5 rounded-lg cursor-pointer border-2 transition-all ${level.val ? 'bg-primary/20 border-primary' : 'bg-white/5 border-white/5'
                    }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-black tracking-tight">{level.label}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">+{level.pts} pts</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={level.val}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      level.set(checked);
                      if (checked) {
                        if (level.id === 'teleop_tower_level1') { setTowerLevel2(false); setTowerLevel3(false); }
                        if (level.id === 'teleop_tower_level2') { setTowerLevel1(false); setTowerLevel3(false); }
                        if (level.id === 'teleop_tower_level3') { setTowerLevel1(false); setTowerLevel2(false); }
                      }
                    }}
                    className="w-4 h-4 mt-0 sm:mt-2 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Climb time (CLANK)</span>
                  <span className="text-[9px] text-muted-foreground/60">+2 pts ≤3s, -2 pts &gt;6s</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {!climbTimerRunning ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={handleClimbTimerStart}
                    >
                      <Play className="w-3 h-3" /> Start
                    </Button>
                  ) : (
                    <>
                      <span className="font-mono text-sm tabular-nums min-w-[3.5rem]">{(climbElapsedMs / 1000).toFixed(2)}s</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-8 gap-1 text-xs"
                        onClick={handleClimbTimerStop}
                      >
                        <Square className="w-3 h-3" /> Stop
                      </Button>
                    </>
                  )}
                  {climbSec !== '' && !climbTimerRunning && (
                    <>
                      <span className="text-xs text-muted-foreground ml-1">Saved: {Number(climbSec).toFixed(2)}s</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={handleClimbTimeClear}
                        title="Delete climb time"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Dialog open={showClimbTimePopup} onOpenChange={(open) => !open && handleClimbTimeCancel()}>
              <DialogContent className="sm:max-w-xs" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Climb time
                  </DialogTitle>
                  <DialogDescription>
                    Recorded <strong>{(pendingClimbSec).toFixed(2)}s</strong>. Save for CLANK or cancel.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={handleClimbTimeCancel}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleClimbTimeSave}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="pt-2">
            <StopwatchBallTracking
              phaseLabel="Teleop Fuel"
              phaseDescription="Track scoring runs during teleoperated period"
              initialData={initialData}
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

export default TeleopForm;
