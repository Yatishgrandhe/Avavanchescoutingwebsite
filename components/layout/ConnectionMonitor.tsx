import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ConnectionMonitor = () => {
  const [latency, setLatency] = useState<number | null>(null);
  const [status, setStatus] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'offline'>('excellent');
  const [isMeasuring, setIsMeasuring] = useState(false);

  useEffect(() => {
    const measureConnection = async () => {
      if (isMeasuring) return;
      setIsMeasuring(true);
      
      const startTime = performance.now();
      try {
        // Ping a small resource or use a HEAD request to measure latency
        const response = await fetch('/api/health-check', { method: 'HEAD', cache: 'no-store' });
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        setLatency(duration);
        
        if (duration < 150) setStatus('excellent');
        else if (duration < 300) setStatus('good');
        else if (duration < 600) setStatus('fair');
        else setStatus('poor');
      } catch (error) {
        setStatus('offline');
        setLatency(null);
      } finally {
        setIsMeasuring(false);
      }
    };

    // Initial measure
    measureConnection();
    
    // Periodic measure every 30 seconds
    const interval = setInterval(measureConnection, 30000);
    
    // Listen for online/offline events
    const handleOnline = () => measureConnection();
    const handleOffline = () => setStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-emerald-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      case 'offline': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = () => {
    if (status === 'offline') return 'Offline';
    if (latency === null) return 'Measuring...';
    return `${latency}ms`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default group">
            <div className="relative">
              {status === 'offline' ? (
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Wifi className={cn("w-3.5 h-3.5", getStatusColor())} />
              )}
              {status !== 'offline' && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                  status === 'excellent' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                  status === 'good' ? 'bg-emerald-500' :
                  status === 'fair' ? 'bg-yellow-500' : 'bg-orange-500'
                )} />
              )}
            </div>
            <span className={cn("text-[10px] font-mono font-bold tracking-tight", getStatusColor())}>
              {getStatusLabel()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="glass border-white/10 p-2 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-primary" />
              <span className="font-bold">Connection Status: <span className="capitalize">{status}</span></span>
            </div>
            <p className="text-muted-foreground">Latency to server: {latency ? `${latency}ms` : 'N/A'}</p>
            {status === 'poor' && (
              <div className="flex items-center gap-1 text-orange-400 font-medium">
                <AlertCircle className="w-3 h-3" />
                Slow upload speed detected
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
