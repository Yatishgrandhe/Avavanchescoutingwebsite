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
  /** Each segment is a continuous stroke; no line connects segments */
  segments?: PathPoint[][];
  color: string;
  comment: string;
}

const PATH_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/** Minimum distance between sampled points during freehand draw (px) */
const SAMPLE_DISTANCE = 6;

/** Minimum points for a valid path (total across all segments) */
const MIN_POINTS = 3;

/** JPEG quality for compressed export (0-1) */
const EXPORT_JPEG_QUALITY = 0.85;

/** Max dimension for exported image (keeps aspect ratio) */
const EXPORT_MAX_DIM = 1600;

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
  /** Current path as segments - each segment is one continuous stroke */
  const [currentSegments, setCurrentSegments] = useState<PathPoint[][]>([]);
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

  const drawPathWithSegments = useCallback(
    (ctx: CanvasRenderingContext2D, path: AutoPath, isActive: boolean) => {
      const segs = path.segments && path.segments.length > 0 ? path.segments : (path.points.length >= 2 ? [path.points] : []);
      segs.forEach((pts) => drawSketchPath(ctx, pts, path.color, isActive));
    },
    [drawSketchPath]
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!ctx || !canvas || !img || !imgLoaded) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    paths.forEach((p) => drawPathWithSegments(ctx, p, p.id === selectedPathId));

    const totalPoints = currentSegments.flat().length;
    if (totalPoints >= 2) {
      const color = PATH_COLORS[(editingPathId ? paths.findIndex((x) => x.id === editingPathId) : paths.length) % PATH_COLORS.length];
      currentSegments.forEach((pts) => drawSketchPath(ctx, pts, color, true));
    } else if (totalPoints === 1) {
      const color = PATH_COLORS[paths.length % PATH_COLORS.length];
      ctx.fillStyle = color;
      const pt = currentSegments.flat()[0];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [paths, currentSegments, selectedPathId, editingPathId, imgLoaded, drawSketchPath, drawPathWithSegments]);

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
    setCurrentSegments((prev) => {
      const lastSeg = prev.length ? prev[prev.length - 1] : [];
      const last = lastSeg.length ? lastSeg[lastSeg.length - 1] : lastPointRef.current;
      if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < SAMPLE_DISTANCE) return prev;
      lastPointRef.current = pt;
      const next = [...prev];
      if (next.length === 0) next.push([pt]);
      else next[next.length - 1] = [...lastSeg, pt];
      return next;
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
        setCurrentSegments((prev) => {
          const next = [...prev];
          next.push([pt]);
          return next;
        });
        canvas.setPointerCapture(e.pointerId);
      } else {
        const hit = paths.find((p) => {
          const segs = p.segments && p.segments.length > 0 ? p.segments : (p.points.length >= 2 ? [p.points] : []);
          return segs.some((pts) =>
            pts.some((pp, i) => i < pts.length - 1 && distToSegment(pt, pp, pts[i + 1]) < 18)
          );
        });
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
    setCurrentSegments([]);
    setMode('drawing');
    lastPointRef.current = null;
  };

  const completePath = useCallback(() => {
    const flat = currentSegments.flat();
    if (flat.length < MIN_POINTS) return;

    const color =
      editingPathId
        ? paths.find((p) => p.id === editingPathId)?.color ?? PATH_COLORS[0]
        : PATH_COLORS[paths.length % PATH_COLORS.length];

    const newPath: AutoPath = {
      id: editingPathId ?? `path-${Date.now()}`,
      points: flat,
      segments: currentSegments.map((s) => [...s]),
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

    setCurrentSegments([]);
    setMode('idle');
    setEditingPathId(null);
    setSelectedPathId(newPath.id);
  }, [currentSegments, editingPathId, paths, onPathsChange]);

  const cancelPath = useCallback(() => {
    setCurrentSegments([]);
    setMode('idle');
    setEditingPathId(null);
  }, []);

  const undoLastPoint = useCallback(() => {
    setCurrentSegments((prev) => {
      if (prev.length === 0) return prev;
      const lastSeg = prev[prev.length - 1];
      if (lastSeg.length <= 1) {
        const next = prev.slice(0, -1);
        const newLast = next.length ? next[next.length - 1] : [];
        lastPointRef.current = newLast.length ? newLast[newLast.length - 1] : null;
        return next;
      }
      const newLastSeg = lastSeg.slice(0, -1);
      lastPointRef.current = newLastSeg[newLastSeg.length - 1];
      return [...prev.slice(0, -1), newLastSeg];
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
        setCurrentSegments([]);
        setMode('idle');
      }
    },
    [paths, selectedPathId, editingPathId, onPathsChange]
  );

  const editPath = useCallback(
    (id: string) => {
      const path = paths.find((p) => p.id === id);
      const segs = path?.segments && path.segments.length > 0 ? path.segments : (path?.points && path.points.length >= 2 ? [path.points] : []);
      if (!path || segs.length === 0) return;
      setEditingPathId(id);
      setCurrentSegments(segs.map((s) => [...s]));
      setMode('drawing');
      const lastSeg = segs[segs.length - 1];
      lastPointRef.current = lastSeg.length ? lastSeg[lastSeg.length - 1] : null;
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

    let iw = img.naturalWidth;
    let ih = img.naturalHeight;
    if (iw > EXPORT_MAX_DIM || ih > EXPORT_MAX_DIM) {
      const scale = Math.min(EXPORT_MAX_DIM / iw, EXPORT_MAX_DIM / ih);
      iw = Math.round(iw * scale);
      ih = Math.round(ih * scale);
    }

    const off = document.createElement('canvas');
    off.width = iw;
    off.height = ih;
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, iw, ih);
    ctx.drawImage(img, 0, 0, iw, ih);

    const allPaths =
      currentSegments.flat().length >= MIN_POINTS
        ? [
            ...paths,
            {
              id: 'tmp',
              points: currentSegments.flat(),
              segments: currentSegments.map((s) => [...s]),
              color: PATH_COLORS[paths.length % PATH_COLORS.length],
              comment: '',
            } as AutoPath,
          ]
        : paths;

    const scaleX = iw / img.naturalWidth;
    const scaleY = ih / img.naturalHeight;
    const scalePt = (p: PathPoint) => ({ x: p.x * scaleX, y: p.y * scaleY });

    allPaths.forEach((p) => {
      const segs = p.segments && p.segments.length > 0 ? p.segments : (p.points.length >= 2 ? [p.points] : []);
      segs.forEach((pts) => {
        if (pts.length < 2) return;
        const scaled = pts.map(scalePt);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(scaled[0].x, scaled[0].y);
        for (let i = 1; i < scaled.length - 1; i++) {
          const p1 = scaled[i];
          const p2 = scaled[i + 1];
          ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
        ctx.lineTo(scaled[scaled.length - 1].x, scaled[scaled.length - 1].y);
        ctx.stroke();
      });
    });

    return new Promise((resolve) =>
      off.toBlob((b) => resolve(b), 'image/jpeg', EXPORT_JPEG_QUALITY)
    );
  }, [paths, currentSegments, imgLoaded]);

  useImperativeHandle(ref, () => ({ exportToBlob }), [exportToBlob]);

  const currentTotalPoints = currentSegments.flat().length;
  const canUndoPoint = mode === 'drawing' && currentTotalPoints > 1;
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
            disabled={currentTotalPoints < MIN_POINTS}
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
          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-0"
          draggable={false}
          aria-hidden
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
          ? 'Drag to draw each stroke. Release and draw elsewhere for a new stroke. Click "Done" when complete.'
          : 'Click "Draw Path" then drag to sketch. Select a path to edit or delete.'}
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
