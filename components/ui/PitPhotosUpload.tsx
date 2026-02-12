import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 6;

interface PitPhotosUploadProps {
  teamNumber: number;
  teamName: string;
  photos: (string | null)[];
  onPhotosChange: (photos: (string | null)[]) => void;
  className?: string;
}

export function PitPhotosUpload({
  teamNumber,
  teamName,
  photos,
  onPhotosChange,
  className,
}: PitPhotosUploadProps) {
  const [slotUploading, setSlotUploading] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const paddedPhotos = useCallback((): (string | null)[] => {
    const arr = [...(photos || [])];
    while (arr.length < MAX_PHOTOS) arr.push(null);
    return arr.slice(0, MAX_PHOTOS);
  }, [photos]);

  const filledCount = paddedPhotos().filter(Boolean).length;
  const canAdd = filledCount < MAX_PHOTOS;

  const uploadFile = useCallback(
    async (file: File, slotIndex: number): Promise<string | null> => {
      if (!teamNumber || teamNumber === 0) {
        setUploadError('Please select a team number first');
        return null;
      }
      setSlotUploading(slotIndex);
      setUploadError(null);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('teamNumber', teamNumber.toString());
      formData.append('teamName', teamName);

      try {
        const response = await fetch('/api/upload-robot-image', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || `Upload failed: ${response.status}`);
        }
        if (!data.directViewUrl) {
          throw new Error('No image URL returned');
        }
        return data.directViewUrl;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploadError(msg);
        return null;
      } finally {
        setSlotUploading(null);
      }
    },
    [teamNumber, teamName]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const current = paddedPhotos();
      const slotIndex = current.findIndex((p) => !p);
      if (slotIndex === -1) return;

      const url = await uploadFile(file, slotIndex);
      if (url) {
        const next = [...current];
        next[slotIndex] = url;
        onPhotosChange(next);
      }
      e.target.value = '';
    },
    [paddedPhotos, uploadFile, onPhotosChange]
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
        {list.map((url, index) => (
          <div
            key={index}
            className={cn(
              'relative aspect-square rounded-xl border border-white/10 overflow-hidden bg-white/5',
              !url && 'border-dashed'
            )}
          >
            {url ? (
              <>
                <img
                  src={url}
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
                {slotUploading === index && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleAddClick}
                disabled={!canAdd || slotUploading !== null}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {slotUploading === index ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImageIcon size={24} />
                    <span className="text-xs">Add photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
      {uploadError && (
        <p className="text-sm text-red-400 flex items-center gap-2">{uploadError}</p>
      )}
      <p className="text-[10px] text-muted-foreground/60">
        JPEG, PNG, WebP up to 10MB each. Photos are uploaded when added.
      </p>
    </div>
  );
}

export default PitPhotosUpload;
