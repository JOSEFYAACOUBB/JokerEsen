import React, { useEffect, useRef, useState, useCallback } from 'react';
import { galleryService } from '../services/galleryService';
import { LazyImage } from './LazyImage';
import type { GalleryImage } from '../types/database';

export const GalleryGrid: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 20;

  const fetchImages = useCallback(async (pageNum: number) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { images: newImages } = await galleryService.fetchImages(
        pageNum,
        PAGE_SIZE
      );

      if (pageNum === 0) {
        setImages(newImages);
      } else {
        setImages((prev) => [...prev, ...newImages]);
      }

      if (newImages.length < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching gallery images:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    fetchImages(0);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && hasMore) {
        pageRef.current += 1;
        fetchImages(pageRef.current);
      }
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [fetchImages, loading, hasMore]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F5EDE4] font-display tracking-wide uppercase">
          Galerie Joker ESEN
        </h2>
        <p className="mt-2 text-[#A66B95] text-sm sm:text-base">
          Moments immortalisés de nos événements, soirées et activités.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {images.map((image) => (
          <div key={image.id} className="group relative">
            <LazyImage
              src={image.display_url || image.cloudinary_url}
              alt={image.title || 'Gallery image'}
            />
            {image.title && (
              <div className="mt-2 text-center text-xs font-semibold text-[#F3C4A0]/80 truncate">
                {image.title}
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-sm text-[#F3C4A0]">
            <div className="w-4 h-4 border-2 border-[#B93A34] border-t-transparent rounded-full animate-spin"></div>
            <span>Chargement des photos...</span>
          </div>
        </div>
      )}

      <div ref={observerTarget} style={{ height: '20px' }} />

      {!hasMore && images.length > 0 && (
        <p className="text-center text-xs text-[#F3C4A0]/50 mt-4">
          Toutes les photos ont été chargées ✓
        </p>
      )}
    </div>
  );
};
