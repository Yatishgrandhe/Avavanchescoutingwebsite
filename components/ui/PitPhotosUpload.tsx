import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlCacheRef = useRef<Map<number, string>>(new Map());

  const paddedPhotos = useCallback((): PhotoItem[] => {
    const arr = [...(photos || [])];
    while (arr.length < MAX_PHOTOS) arr.push(null);
    return arr.slice(0, MAX_PHOTOS);
  }, [photos]);

  const filledCount = paddedPhotos().filter(Boolean).length;
  const canAdd = filledCount < MAX_PHOTOS;

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
      if (!file.type.startsWith('image/')) {
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

  const handleAddClick = () => {
    if (!canAdd) return;
    fileInputRef.current?.click();
  };

  const handleRemove = (index: number) => {
    const current = paddedPhotos();
    const next = current.map((p, i) => (i === index ? null : p));
    onPhotosChange(next);
  };

  const list = paddedPhotos();

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium flex items-center gap-2">
        <Camera size={14} />
        Pit Photos (up to {MAX_PHOTOS})
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((item, index) => {
          const previewUrl = getPreviewUrl(item, index);
          return (
          <div
            key={index}
            className={cn(
              'relative aspect-square rounded-xl border border-white/10 overflow-hidden bg-white/5',
              !item && 'border-dashed'
            )}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt={`Pit photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAddClick}
                disabled={!canAdd}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors disabled:opacity-50"
              >
                <>
                  <ImageIcon size={24} />
                  <span className="text-xs">Add photo</span>
                </>
              </button>
            )}
          </div>
        );})}
      </div>
      {uploadError && (
        <p className="text-sm text-red-400 flex items-center gap-2">{uploadError}</p>
      )}
      <p className="text-[10px] text-muted-foreground/60">
        JPEG, PNG, WebP up to 10MB each. Photos are uploaded when you submit the form.
      </p>
    </div>
  );
}

export default PitPhotosUpload;
