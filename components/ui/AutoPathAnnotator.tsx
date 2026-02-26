'use client';

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Maximize2, Minimize2, Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PathPoint {
  x: number;
  y: number;
}

export interface AutoPath {
  id: string;
  points: PathPoint[];
  color: string;
  comment: string;
}

const PATH_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export interface AutoPathAnnotatorRef {
  exportToBlob: () => Promise<Blob | null>;
}

interface AutoPathAnnotatorProps {
  paths: AutoPath[];
  onPathsChange: (paths: AutoPath[]) => void;
  fieldImageSrc?: string;
  className?: string;
  teamNumber?: number;
  teamName?: string;
}

export const AutoPathAnnotator = forwardRef<AutoPathAnnotatorRef, AutoPathAnnotatorProps>(function AutoPathAnnotator({
  paths,
  onPathsChange,
  fieldImageSrc = '/field-2026-rebuilt.png',
  className,
}: AutoPathAnnotatorProps, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState<'idle' | 'drawing'>('idle');
  const [currentPath, setCurrentPath] = useState<PathPoint[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState({ x: 1, y: 1, offsetX: 0, offsetY: 0 });

  const getCanvasCoords = useCallback(
    (e: React.PointerEvent | PointerEvent): PathPoint | null => {
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      if (!rect || !canvas) return null;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY),
      };
    },
    []
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!ctx || !canvas || !img || !imgLoaded) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const drawPath = (pts: PathPoint[], color: string, isActive = false) => {
      if (pts.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = isActive ? 5 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(isActive ? [] : []);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      pts.forEach((p, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === 0 || i === pts.length - 1 ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    paths.forEach((p) => drawPath(p.points, p.color, p.id === selectedPathId));
    if (currentPath.length >= 2) {
      drawPath(currentPath, PATH_COLORS[paths.length % PATH_COLORS.length], true);
    } else if (currentPath.length === 1) {
      ctx.fillStyle = PATH_COLORS[paths.length % PATH_COLORS.length];
      ctx.beginPath();
      ctx.arc(currentPath[0].x, currentPath[0].y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [paths, currentPath, selectedPathId, imgLoaded]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !container || !img || !img.naturalWidth) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scaleX = cw / iw;
    const scaleY = ch / ih;
    const s = Math.min(scaleX, scaleY);
    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = `${iw * s}px`;
    canvas.style.height = `${ih * s}px`;
    setScale({ x: s, y: s, offsetX: 0, offsetY: 0 });
  }, [imgLoaded]);

  useEffect(() => {
    if (imgLoaded) setupCanvas();
  }, [imgLoaded, setupCanvas]);

  useEffect(() => {
    const ro = new ResizeObserver(() => setupCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [setupCanvas]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const pt = getCanvasCoords(e);
    if (!pt) return;
    if (mode === 'drawing') {
      setCurrentPath((prev) => [...prev, pt]);
    } else {
      const hit = paths.find((p) =>
        p.points.some(
          (pp, i) =>
            i < p.points.length - 1 &&
            distToSegment(pt, pp, p.points[i + 1]) < 15
        )
      );
      setSelectedPathId(hit?.id ?? null);
    }
  };

  const distToSegment = (p: PathPoint, a: PathPoint, b: PathPoint) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };

  const completePath = () => {
    if (currentPath.length >= 2) {
      const color = PATH_COLORS[paths.length % PATH_COLORS.length];
      const newPath: AutoPath = {
        id: `path-${Date.now()}`,
        points: [...currentPath],
        color,
        comment: '',
      };
      onPathsChange([...paths, newPath]);
      setCurrentPath([]);
      setMode('idle');
      setSelectedPathId(newPath.id);
    }
  };

  const cancelPath = () => {
    setCurrentPath([]);
    setMode('idle');
  };

  const deletePath = (id: string) => {
    onPathsChange(paths.filter((p) => p.id !== id));
    if (selectedPathId === id) setSelectedPathId(null);
  };

  const updateComment = (id: string, comment: string) => {
    onPathsChange(
      paths.map((p) => (p.id === id ? { ...p, comment } : p))
    );
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const exportToBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imgLoaded) return null;
    const off = document.createElement('canvas');
    off.width = img.naturalWidth;
    off.height = img.naturalHeight;
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const allPaths = currentPath.length >= 2 ? [...paths, { id: 'tmp', points: currentPath, color: PATH_COLORS[paths.length % PATH_COLORS.length], comment: '' }] : paths;
    allPaths.forEach((p) => {
      if (p.points.length < 2) return;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
      ctx.stroke();
    });
    return new Promise((resolve) => off.toBlob((b) => resolve(b), 'image/png'));
  }, [paths, currentPath, imgLoaded]);

  useImperativeHandle(ref, () => ({ exportToBlob }), [exportToBlob]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (mode === 'drawing') cancelPath();
            else {
              setMode('drawing');
              setCurrentPath([]);
            }
          }}
          className={mode === 'drawing' ? 'border-primary text-primary' : ''}
        >
          <Plus className="w-4 h-4 mr-1" />
          {mode === 'drawing' ? 'Cancel Path' : 'Add Path'}
        </Button>
        {mode === 'drawing' && (
          <Button type="button" size="sm" onClick={completePath} disabled={currentPath.length < 2}>
            <Check className="w-4 h-4 mr-1" />
            Complete Path
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="ml-1">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full bg-black/30 rounded-xl overflow-hidden"
        style={{ minHeight: 280, maxHeight: isFullscreen ? '90vh' : 500 }}
      >
        <img
          ref={(el) => {
            if (el && !imageRef.current) {
              imageRef.current = el;
              if (el.complete) setImgLoaded(true);
              else el.onload = () => setImgLoaded(true);
            }
          }}
          src={fieldImageSrc}
          alt="2026 REBUILT field"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {mode === 'drawing'
          ? 'Click on the field to add points. Click "Complete Path" when done.'
          : 'Click "Add Path" to draw a new auto path, or "Fullscreen" for precise drawing.'}
      </p>

      {paths.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Paths & Comments</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {paths.map((p, idx) => (
              <div
                key={p.id}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border',
                  selectedPathId === p.id ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm font-medium truncate">Path {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 shrink-0"
                    onClick={() => deletePath(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Comment for this path..."
                  value={p.comment}
                  onChange={(e) => updateComment(p.id, e.target.value)}
                  className="flex-1 min-w-0 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default AutoPathAnnotator;
