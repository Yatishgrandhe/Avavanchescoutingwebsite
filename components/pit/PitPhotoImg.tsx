import React, { useEffect, useState } from 'react';

type PitPhotoImgProps = {
  urls: string[];
  alt: string;
  className?: string;
  /** When all URLs fail (or list empty), show this image instead of placeholder. */
  fallbackSrc?: string | null;
  /** Shown when no usable image and no fallbackSrc. */
  placeholder?: React.ReactNode;
  referrerPolicy?: React.ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  loading?: React.ImgHTMLAttributes<HTMLImageElement>['loading'];
};

/**
 * Renders the first loadable URL from `urls`, advancing on `onError` so broken DB URLs
 * do not hide later valid photos.
 */
export function PitPhotoImg({
  urls,
  alt,
  className = 'w-full h-full object-cover',
  fallbackSrc = null,
  placeholder = null,
  referrerPolicy = 'no-referrer',
  loading = 'lazy',
}: PitPhotoImgProps) {
  const [idx, setIdx] = useState(0);
  const key = urls.join('\0');
  useEffect(() => {
    setIdx(0);
  }, [key]);

  if (urls.length === 0) {
    if (fallbackSrc) {
      return <img src={fallbackSrc} alt={alt} className={className} referrerPolicy={referrerPolicy} loading={loading} />;
    }
    return <>{placeholder}</>;
  }

  if (idx >= urls.length) {
    if (fallbackSrc) {
      return <img src={fallbackSrc} alt={alt} className={className} referrerPolicy={referrerPolicy} loading={loading} />;
    }
    return <>{placeholder}</>;
  }

  return (
    <img
      src={urls[idx]}
      alt={alt}
      className={className}
      referrerPolicy={referrerPolicy}
      loading={loading}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
