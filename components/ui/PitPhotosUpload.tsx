import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Camera, X, ImageIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 6;

/** File = new (not yet uploaded), string = existing URL (from edit) */
export type PhotoItem = File | string | null;

interface PitPhotosUploadProps {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  className?: string;
}

export function PitPhotosUpload({
  photos,
  onPhotosChange,
  className,
}: PitPhotosUploadProps) {
  const fileInputId = React.useId();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlCacheRef = useRef<Map<number, string>>(new Map());

  const paddedPhotos = useCallback((): PhotoItem[] => {
    const arr = [...(photos || [])];
    while (arr.length < MAX_PHOTOS) arr.push(null);
    return arr.slice(0, MAX_PHOTOS);
  }, [photos]);

  const filledSlots = paddedPhotos().filter(Boolean);
  const filledCount = filledSlots.length;
  const canAdd = filledCount < MAX_PHOTOS;

  // How many slots to show: always at least 1, grow as photos are added (max shows all 6)
  const [visibleSlots, setVisibleSlots] = useState(1);

  // If photos already loaded (edit mode), show enough slots to display them all
  useEffect(() => {
    if (filledCount > visibleSlots) setVisibleSlots(filledCount);
  }, [filledCount]);

  const objectUrls = useMemo(() => {
    const prev = urlCacheRef.current;
    prev.forEach((u) => URL.revokeObjectURL(u));
    prev.clear();
    const next = new Map<number, string>();
    paddedPhotos().forEach((p, i) => {
      if (p instanceof File) next.set(i, URL.createObjectURL(p));
    });
    urlCacheRef.current = next;
    return next;
  }, [photos]);

  useEffect(() => () => {
    urlCacheRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlCacheRef.current.clear();
  }, []);

  const getPreviewUrl = (item: PhotoItem, index: number): string | null => {
    if (!item) return null;
    if (typeof item === 'string') return item;
    return objectUrls.get(index) ?? null;
  };

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const mime = (file.type || '').toLowerCase();
      const name = (file.name || '').toLowerCase();
      const hasImageExt = /\.(jpe?g|png|gif|webp|bmp|heic)$/.test(name);
      const hasImageMime = mime.startsWith('image/') || mime === 'image';
      const looksLikeImage = hasImageMime || hasImageExt || (!mime && !name);
      if (!looksLikeImage && mime) {
        setUploadError('Please select an image file (JPEG, PNG, WebP, etc.)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Image must be smaller than 10MB');
        return;
      }
      setUploadError(null);
      const current = paddedPhotos();
      const slotIndex = current.findIndex((p) => !p);
      if (slotIndex === -1) return;
      const next = [...current];
      next[slotIndex] = file;
      onPhotosChange(next);
      e.target.value = '';
    },
    [paddedPhotos, onPhotosChange]
  );

  const handleAddClick = useCallback(() => {
    if (!canAdd) return;
    fileInputRef.current?.click();
  }, [canAdd]);

  const deleteUploadedPhoto = useCallback(async (url: string) => {
    try {
      await fetch('/api/delete-robot-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
    } catch {
      // Fire-and-forget — don't block the UI if the delete fails
    }
  }, []);

  const handleRemove = (index: number) => {
    const current = paddedPhotos();
    const removedItem = current[index];
    // If the photo is an already-uploaded URL (not a local File), delete it from storage
    if (typeof removedItem === 'string') {
      deleteUploadedPhoto(removedItem);
    }
    const next = current.map((p, i) => (i === index ? null : p));
    onPhotosChange(next);
  };

  const handleShowMore = () => {
    setVisibleSlots((v) => Math.min(v + 1, MAX_PHOTOS));
    // Trigger file picker for the new slot immediately
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const list = paddedPhotos().slice(0, visibleSlots);
  const showAddMore = canAdd && visibleSlots < MAX_PHOTOS;

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Camera size={14} />
        Pit Photos
        <span className="text-xs text-muted-foreground font-normal">
          {filledCount > 0 ? `${filledCount} / ${MAX_PHOTOS}` : `up to ${MAX_PHOTOS}`}
        </span>
      </label>

      <input
        id={fileInputId}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload pit photo"
      />

      <div className="space-y-2">
        {list.map((item, index) => {
          const previewUrl = getPreviewUrl(item, index);
          return (
            <div
              key={index}
              className={cn(
                'relative rounded-xl border overflow-hidden transition-all',
                previewUrl
                  ? 'border-white/15 bg-black/20'
                  : 'border-dashed border-white/15 bg-white/3'
              )}
            >
              {previewUrl ? (
                <div className="relative group">
                  <img
                    src={previewUrl}
                    alt={`Pit photo ${index + 1}`}
                    className="w-full max-h-56 object-contain bg-black/40"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-500/80 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X size={14} />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] text-white/60 bg-black/50 rounded px-1.5 py-0.5">
                    Photo {index + 1}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddClick}
                  disabled={!canAdd}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 py-8 text-muted-foreground hover:text-foreground hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer touch-manipulation',
                    !canAdd && 'pointer-events-none opacity-40'
                  )}
                  aria-label="Add pit photo"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="p-2 rounded-full bg-white/8 border border-white/10">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-xs">
                      {index === 0 ? 'Tap to add robot photo' : 'Tap to add photo'}
                    </span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAddMore && (
        <button
          type="button"
          onClick={handleShowMore}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/15 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/25 transition-all"
        >
          <Plus size={14} />
          Add another photo
          <span className="text-muted-foreground/50">({filledCount}/{MAX_PHOTOS})</span>
        </button>
      )}

      {uploadError && (
        <p className="text-sm text-red-400 flex items-center gap-2">{uploadError}</p>
      )}
      <p className="text-[10px] text-muted-foreground/50">
        JPEG, PNG, WebP · up to 10 MB each · uploaded on submit
      </p>
    </div>
  );
}

export default PitPhotosUpload;
