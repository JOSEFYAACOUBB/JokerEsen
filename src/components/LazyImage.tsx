import React, { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className = '' }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div
      ref={imgRef}
      className={`relative w-full bg-black/20 rounded-2xl overflow-hidden border border-[#F3C4A0]/10 ${className}`}
      style={{ aspectRatio: '1' }}
    >
      {imageSrc ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-[#1A0E14] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#B93A34] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={imageSrc}
            alt={alt}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full object-cover transition-all duration-500 hover:scale-105"
            style={{
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.3s, transform 0.5s ease',
            }}
          />
        </>
      ) : (
        <div className="w-full h-full bg-[#160b11] animate-pulse" />
      )}
    </div>
  );
};
