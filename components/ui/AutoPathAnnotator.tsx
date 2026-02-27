'use client';

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Maximize2, Minimize2, Plus, Trash2, Check, Undo2, Pencil } from 'lucide-react';
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

/** Minimum distance between sampled points during freehand draw (px) */
const SAMPLE_DISTANCE = 6;

/** Minimum points for a valid path */
const MIN_POINTS = 3;

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
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const lastPointRef = useRef<PathPoint | null>(null);
  const isPointerDownRef = useRef(false);

  const getCanvasCoords = useCallback(
    (e: React.PointerEvent | PointerEvent): PathPoint | null => {
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      if (!rect || !canvas) return null;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  /** Draw a path with sketch-like smooth curves */
  const drawSketchPath = useCallback(
    (ctx: CanvasRenderingContext2D, pts: PathPoint[], color: string, isActive = false) => {
      if (pts.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = isActive ? 5 : 4;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      // Quadratic curves through points for smooth, sketch-like lines
      for (let i = 1; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const endX = (p1.x + p2.x) / 2;
        const endY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, endX, endY);
      }
      if (pts.length > 2) {
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
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

    paths.forEach((p) => drawSketchPath(ctx, p.points, p.color, p.id === selectedPathId));

    if (currentPath.length >= 2) {
      const color = PATH_COLORS[(editingPathId ? paths.findIndex((x) => x.id === editingPathId) : paths.length) % PATH_COLORS.length];
      drawSketchPath(ctx, currentPath, color, true);
    } else if (currentPath.length === 1) {
      const color = PATH_COLORS[paths.length % PATH_COLORS.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(currentPath[0].x, currentPath[0].y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [paths, currentPath, selectedPathId, editingPathId, imgLoaded, drawSketchPath]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !container || !img || !img.naturalWidth) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scaleX = cw / iw;
    const scaleY = ch / ih;
    const s = Math.min(scaleX, scaleY);
    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = `${iw * s}px`;
    canvas.style.height = `${ih * s}px`;
  }, [imgLoaded]);

  useEffect(() => {
    if (imgLoaded) setupCanvas();
  }, [imgLoaded, setupCanvas]);

  useEffect(() => {
    const ro = new ResizeObserver(() => setupCanvas());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [setupCanvas]);

  const addPointIfFarEnough = useCallback((pt: PathPoint) => {
    setCurrentPath((prev) => {
      const last = prev.length ? prev[prev.length - 1] : lastPointRef.current;
      if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < SAMPLE_DISTANCE) return prev;
      lastPointRef.current = pt;
      return [...prev, pt];
    });
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const pt = getCanvasCoords(e);
      if (!pt || !canvas) return;

      if (mode === 'drawing') {
        isPointerDownRef.current = true;
        lastPointRef.current = pt;
        setCurrentPath((prev) => [...prev, pt]);
        canvas.setPointerCapture(e.pointerId);
      } else {
        const hit = paths.find((p) =>
          p.points.some(
            (pp, i) =>
              i < p.points.length - 1 && distToSegment(pt, pp, p.points[i + 1]) < 18
          )
        );
        setSelectedPathId(hit?.id ?? null);
      }
    },
    [mode, paths, getCanvasCoords]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPointerDownRef.current || mode !== 'drawing') return;
      const pt = getCanvasCoords(e);
      if (pt) addPointIfFarEnough(pt);
    },
    [mode, getCanvasCoords, addPointIfFarEnough]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (canvas) canvas.releasePointerCapture?.(e.pointerId);
      isPointerDownRef.current = false;
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    isPointerDownRef.current = false;
  }, []);

  const distToSegment = (p: PathPoint, a: PathPoint, b: PathPoint) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };

  const startNewPath = () => {
    setEditingPathId(null);
    setCurrentPath([]);
    setMode('drawing');
    lastPointRef.current = null;
  };

  const completePath = useCallback(() => {
    if (currentPath.length < MIN_POINTS) return;

    const color =
      editingPathId
        ? paths.find((p) => p.id === editingPathId)?.color ?? PATH_COLORS[0]
        : PATH_COLORS[paths.length % PATH_COLORS.length];

    const newPath: AutoPath = {
      id: editingPathId ?? `path-${Date.now()}`,
      points: [...currentPath],
      color,
      comment: editingPathId ? paths.find((p) => p.id === editingPathId)?.comment ?? '' : '',
    };

    if (editingPathId) {
      onPathsChange(
        paths.map((p) => (p.id === editingPathId ? newPath : p))
      );
    } else {
      onPathsChange([...paths, newPath]);
    }

    setCurrentPath([]);
    setMode('idle');
    setEditingPathId(null);
    setSelectedPathId(newPath.id);
  }, [currentPath, editingPathId, paths, onPathsChange]);

  const cancelPath = useCallback(() => {
    setCurrentPath([]);
    setMode('idle');
    setEditingPathId(null);
  }, []);

  const undoLastPoint = useCallback(() => {
    setCurrentPath((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      lastPointRef.current = next.length ? next[next.length - 1] : null;
      return next;
    });
  }, []);

  const undoLastPath = useCallback(() => {
    if (paths.length === 0) return;
    const last = paths[paths.length - 1];
    onPathsChange(paths.slice(0, -1));
    if (selectedPathId === last.id) setSelectedPathId(paths.length > 1 ? paths[paths.length - 2].id : null);
  }, [paths, selectedPathId, onPathsChange]);

  const deletePath = useCallback(
    (id: string) => {
      onPathsChange(paths.filter((p) => p.id !== id));
      if (selectedPathId === id) setSelectedPathId(null);
      if (editingPathId === id) {
        setEditingPathId(null);
        setCurrentPath([]);
        setMode('idle');
      }
    },
    [paths, selectedPathId, editingPathId, onPathsChange]
  );

  const editPath = useCallback(
    (id: string) => {
      const path = paths.find((p) => p.id === id);
      if (!path || path.points.length < 2) return;
      setEditingPathId(id);
      setCurrentPath([...path.points]);
      setMode('drawing');
      lastPointRef.current = path.points[path.points.length - 1];
    },
    [paths]
  );

  const updateComment = useCallback(
    (id: string, comment: string) => {
      onPathsChange(paths.map((p) => (p.id === id ? { ...p, comment } : p)));
    },
    [paths, onPathsChange]
  );

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

    const allPaths =
      currentPath.length >= MIN_POINTS
        ? [
            ...paths,
            {
              id: 'tmp',
              points: currentPath,
              color: PATH_COLORS[paths.length % PATH_COLORS.length],
              comment: '',
            },
          ]
        : paths;

    allPaths.forEach((p) => {
      if (p.points.length < 2) return;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length - 1; i++) {
        const p1 = p.points[i];
        const p2 = p.points[i + 1];
        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      }
      if (p.points.length > 2) ctx.lineTo(p.points[p.points.length - 1].x, p.points[p.points.length - 1].y);
      ctx.stroke();
    });

    return new Promise((resolve) => off.toBlob((b) => resolve(b), 'image/png'));
  }, [paths, currentPath, imgLoaded]);

  useImperativeHandle(ref, () => ({ exportToBlob }), [exportToBlob]);

  const canUndoPoint = mode === 'drawing' && currentPath.length > 1;
  const canUndoPath = mode === 'idle' && paths.length > 0;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (mode === 'drawing') cancelPath();
            else startNewPath();
          }}
          className={mode === 'drawing' ? 'border-primary text-primary' : ''}
        >
          <Plus className="w-4 h-4 mr-1" />
          {mode === 'drawing' ? 'Cancel' : 'Draw Path'}
        </Button>
        {mode === 'drawing' && (
          <Button
            type="button"
            size="sm"
            onClick={completePath}
            disabled={currentPath.length < MIN_POINTS}
          >
            <Check className="w-4 h-4 mr-1" />
            Done
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={undoLastPoint}
          disabled={!canUndoPoint}
          title="Undo last stroke segment"
        >
          <Undo2 className="w-4 h-4 mr-1" />
          Undo
        </Button>
        {canUndoPath && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={undoLastPath}
            title="Remove last path"
          >
            <Undo2 className="w-4 h-4 mr-1" />
            Undo Path
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="ml-1">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
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
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {mode === 'drawing'
          ? 'Drag on the field to draw. Release to finish the stroke. Click "Done" when complete.'
          : 'Click "Draw Path" then drag to sketch a path. Select a path to edit or delete.'}
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
                    className="text-primary hover:text-primary/80 shrink-0"
                    onClick={() => editPath(p.id)}
                    title="Edit path"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 shrink-0"
                    onClick={() => deletePath(p.id)}
                    title="Delete path"
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
