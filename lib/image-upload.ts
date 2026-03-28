/**
 * Client-side image compression to avoid 413 (Request Entity Too Large).
 * Vercel serverless has a 4.5MB request body limit; we target 1.5MB for better fit/performance.
 */

const TARGET_MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 1200;

/**
 * Compress a File or Blob for upload. If already under target size, returns a Blob copy.
 * Otherwise resizes and re-encodes as JPEG with reduced quality until under target.
 */
export function compressImageForUpload(
  input: File | Blob,
  maxSizeBytes: number = TARGET_MAX_BYTES
): Promise<Blob> {
  const size = input.size;
  if (size <= maxSizeBytes) {
    return Promise.resolve(input instanceof File ? new Blob([input], { type: input.type }) : input);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(input);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w > h) {
          h = Math.round((h * MAX_DIMENSION) / w);
          w = MAX_DIMENSION;
        } else {
          w = Math.round((w * MAX_DIMENSION) / h);
          h = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2d not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      const tryQuality = (quality: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('toBlob failed'));
              return;
            }
            if (blob.size <= maxSizeBytes || quality <= 0.5) {
              resolve(blob);
              return;
            }
            tryQuality(Math.max(0.5, quality - 0.15));
          },
          'image/jpeg',
          quality
        );
      };

      tryQuality(0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
