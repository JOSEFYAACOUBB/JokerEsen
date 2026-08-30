import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Layers, Image as ImageIcon, Calendar, Sparkles } from 'lucide-react';
import { galleryService } from '../services/galleryService';

export interface AlbumPhoto {
  id: string | number;
  url: string;
  caption: string;
}

export interface GalleryAlbum {
  id: string | number;
  title: string;
  category: 'Soirées' | 'Workshops' | 'Teambuilding';
  date: string;
  coverImage: string;
  photos: AlbumPhoto[];
}

// Clean up raw numeric or hashed filenames (e.g. 670287388_18134076106534463_4142846693203060533_n)
const formatHumanReadableTitle = (rawName?: string): string => {
  if (!rawName || !rawName.trim()) return 'Moments Joker ESEN';
  const trimmed = rawName.trim();

  // If name is a long sequence of numbers/underscores (Facebook/Instagram/Camera filename)
  if (/^[\d_-]+([a-z0-9_-]+)?$/i.test(trimmed) && (trimmed.length > 15 || /^\d{5,}/.test(trimmed))) {
    return 'Souvenirs & Événements Joker';
  }

  // Remove trailing file extensions if any
  return trimmed.replace(/\.(jpe?g|png|webp|gif|svg)$/i, '');
};

export const Gallery: React.FC = () => {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  
  // Selected Album for Modal View
  const [activeAlbum, setActiveAlbum] = useState<GalleryAlbum | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number>(0);

  // Load uploaded Cloudinary photos from Supabase & build real albums
  useEffect(() => {
    async function loadCloudinaryGallery() {
      setLoading(true);
      try {
        const { images } = await galleryService.fetchImages(0, 100);
        if (images && images.length > 0) {
          // Group images by album name (stored in img.description or img.title)
          const albumMap = new Map<string, AlbumPhoto[]>();
          const albumMeta = new Map<string, { date: string; cover: string; category: 'Soirées' | 'Workshops' | 'Teambuilding' }>();

          images.forEach((img, idx) => {
            const rawAlbumName = img.description?.trim() || img.title?.trim() || 'Événements Joker';
            const albumName = formatHumanReadableTitle(rawAlbumName);
            const photoUrl = img.display_url || img.cloudinary_url;
            const cleanCaption = img.title && !/^[\d_-]+$/.test(img.title) ? formatHumanReadableTitle(img.title) : '';

            const photoItem: AlbumPhoto = {
              id: img.id || idx,
              url: photoUrl,
              caption: cleanCaption,
            };

            if (!albumMap.has(albumName)) {
              albumMap.set(albumName, []);
              
              // Guess category based on title or keywords
              const lower = (rawAlbumName + ' ' + (img.title || '')).toLowerCase();
              let category: 'Soirées' | 'Workshops' | 'Teambuilding' = 'Soirées';
              if (lower.includes('workshop') || lower.includes('formation') || lower.includes('design') || lower.includes('talk') || lower.includes('conférence')) {
                category = 'Workshops';
              } else if (lower.includes('teambuilding') || lower.includes('integration') || lower.includes('intégration') || lower.includes('olympiade') || lower.includes('sortie')) {
                category = 'Teambuilding';
              }

              const formattedDate = img.created_at
                ? new Date(img.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                : 'Session Récente';

              albumMeta.set(albumName, {
                date: formattedDate,
                cover: photoUrl,
                category,
              });
            }

            albumMap.get(albumName)!.push(photoItem);
          });

          const constructedAlbums: GalleryAlbum[] = Array.from(albumMap.entries()).map(([title, photos], i) => {
            const meta = albumMeta.get(title)!;
            return {
              id: `album-${i}-${title}`,
              title,
              category: meta.category,
              date: meta.date,
              coverImage: meta.cover,
              photos,
            };
          });

          setAlbums(constructedAlbums);
        } else {
          setAlbums([]);
        }
      } catch (err) {
        console.warn('Could not load gallery images:', err);
        setAlbums([]);
      } finally {
        setLoading(false);
      }
    }

    loadCloudinaryGallery();
  }, []);

  const categories = ['Tous', 'Soirées', 'Workshops', 'Teambuilding'];

  const filteredAlbums = activeCategory === 'Tous'
    ? albums
    : albums.filter((item) => item.category === activeCategory);

  const openAlbum = (album: GalleryAlbum) => {
    setActiveAlbum(album);
    setPhotoIndex(0);
  };

  const closeAlbum = () => {
    setActiveAlbum(null);
    setPhotoIndex(0);
  };

  const prevPhoto = useCallback(() => {
    if (activeAlbum) {
      setPhotoIndex((prev) => (prev - 1 + activeAlbum.photos.length) % activeAlbum.photos.length);
    }
  }, [activeAlbum]);

  const nextPhoto = useCallback(() => {
    if (activeAlbum) {
      setPhotoIndex((prev) => (prev + 1) % activeAlbum.photos.length);
    }
  }, [activeAlbum]);

  // Keyboard navigation for modal
  useEffect(() => {
    if (!activeAlbum) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAlbum();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAlbum, prevPhoto, nextPhoto]);

  return (
    <section id="gallery" className="py-16 sm:py-24 lg:py-28 bg-[#1A0E14] relative overflow-hidden bg-suits-dark-watermark border-b border-[#F3C4A0]/15">

      {/* Ambient background glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #B93A34 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Section Header - 100% Centered ── */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-12 sm:mb-16 max-w-3xl mx-auto">
          
          {/* Centered Badge */}
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#A66B95]/15 border border-[#A66B95]/35 text-[#F3C4A0] text-xs font-bold tracking-widest uppercase shadow-sm"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F3C4A0] animate-pulse" />
            <span>04 &middot; ARCHIVES &amp; SOUVENIRS</span>
          </div>

          {/* Centered Big Heading */}
          <h2
            className="font-black uppercase text-[#F5EDE4] leading-tight"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(2.2rem, 5.5vw, 4.2rem)',
              letterSpacing: '-0.02em',
            }}
          >
            Galerie Événements
          </h2>

          {/* Centered Subtitle */}
          <p
            className="text-[#F5EDE4]/70 text-xs sm:text-sm max-w-lg mx-auto font-medium"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Revivez l'énergie unique de nos soirées, masterclasses et teambuildings à l'ESEN Manouba.
          </p>

          {/* ── Centered Category Filter Capsule ── */}
          {albums.length > 0 && (
            <div className="pt-2">
              <div className="inline-flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 bg-[#12070D]/80 border border-[#F3C4A0]/25 backdrop-blur-xl rounded-full p-1.5 shadow-xl">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-4 sm:px-6 py-2 text-[11px] sm:text-xs font-bold uppercase rounded-full transition-all duration-300 cursor-pointer"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      letterSpacing: '0.08em',
                      background: activeCategory === cat ? '#B93A34' : 'transparent',
                      color: activeCategory === cat ? '#ffffff' : 'rgba(245,237,228,0.7)',
                      boxShadow: activeCategory === cat ? '0 4px 16px rgba(185,58,52,0.45)' : 'none',
                      transform: activeCategory === cat ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Responsive Grid of Albums ── */}
        {loading ? (
          <div className="py-20 text-center text-[#F3C4A0]/60 space-y-3">
            <div className="w-8 h-8 border-2 border-[#B93A34] border-t-transparent rounded-full animate-spin mx-auto" />
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Chargement des souvenirs...
            </p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="py-16 sm:py-20 text-center rounded-3xl bg-[#1F0E18]/60 border border-dashed border-[#F3C4A0]/20 max-w-lg mx-auto p-8 space-y-4 shadow-xl backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#B93A34]/15 border border-[#B93A34]/30 flex items-center justify-center mx-auto text-[#F3C4A0]">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3
              className="text-xl sm:text-2xl font-black uppercase text-[#F5EDE4]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {albums.length === 0 ? 'Aucun album photo pour le moment' : 'Aucun album dans cette catégorie'}
            </h3>
            <p
              className="text-xs sm:text-sm text-[#F5EDE4]/60 max-w-sm mx-auto leading-relaxed"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {albums.length === 0
                ? 'Les albums photos officiels des événements et teambuildings seront bientôt publiés par le club Joker ESEN !'
                : 'Sélectionnez "Tous" pour voir l\'ensemble des albums disponibles.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {filteredAlbums.map((album) => {
              return (
                <div
                  key={album.id}
                  onClick={() => openAlbum(album)}
                  className="group relative rounded-3xl overflow-hidden cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-500 hover:shadow-[0_24px_60px_rgba(185,58,52,0.3)] hover:-translate-y-1.5 min-h-[320px] sm:min-h-[360px] flex flex-col justify-between p-6 bg-[#160B12]"
                  style={{
                    border: '1.5px solid rgba(243,196,160,0.18)',
                  }}
                >
                  {/* Photo with zoom effect */}
                  <img
                    src={album.coverImage}
                    alt={album.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-90 group-hover:brightness-100"
                  />

                  {/* Multi-stage dark gradient for crisp readability */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(13,6,8,0.95) 0%, rgba(13,6,8,0.4) 50%, rgba(13,6,8,0.7) 100%)',
                    }}
                  />

                  {/* Top row: Category pill + Photo count badge (Both with Plus Jakarta Sans) */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span
                      className="px-3.5 py-1.5 text-[11px] font-black uppercase rounded-full text-white shadow-lg backdrop-blur-md"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: album.category === 'Soirées' ? '#B93A34' : album.category === 'Workshops' ? '#4E4F9E' : '#A66B95',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {album.category}
                    </span>

                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-black/60 backdrop-blur-md border border-white/10 shadow-sm"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      <Layers className="w-3.5 h-3.5 text-[#F3C4A0]" />
                      <span>{album.photos.length} photos</span>
                    </div>
                  </div>

                  {/* Bottom info: Album Title, Date & Action CTA */}
                  <div className="relative z-10 space-y-2 pt-16">
                    <div
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#F3C4A0] uppercase tracking-wider"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{album.date}</span>
                    </div>

                    <h3
                      className="text-xl sm:text-2xl font-black text-[#F5EDE4] uppercase leading-tight group-hover:text-[#F3C4A0] transition-colors"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}
                    >
                      {album.title}
                    </h3>

                    <div
                      className="flex items-center gap-2 text-xs font-bold text-[#F3C4A0] pt-1 group-hover:underline"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      <span>Explorer l'album</span>
                      <span className="group-hover:translate-x-1.5 transition-transform font-bold">&rarr;</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Modern Album Lightbox Modal (Fully responsive, no cut-off, all thumbnails clearly visible) ── */}
      {activeAlbum && activeAlbum.photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300 overflow-y-auto"
          onClick={closeAlbum}
        >
          <div
            className="relative w-full max-w-5xl my-auto rounded-3xl bg-[#14080F] border border-[#F3C4A0]/30 flex flex-col shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden"
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed at Top) */}
            <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#F3C4A0]/15 bg-[#1B0B15]">
              <div className="min-w-0 pr-4">
                <div
                  className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#F3C4A0]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  <span>{activeAlbum.category}</span>
                  <span>&middot;</span>
                  <span>{activeAlbum.date}</span>
                </div>
                <h3
                  className="text-lg sm:text-xl font-black text-[#F5EDE4] uppercase truncate mt-0.5"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}
                >
                  {activeAlbum.title}
                </h3>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="px-3.5 py-1 rounded-full bg-white/10 text-xs font-black text-[#F3C4A0] tabular-nums"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {photoIndex + 1} / {activeAlbum.photos.length}
                </span>
                <button
                  onClick={closeAlbum}
                  className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-[#B93A34] flex items-center justify-center transition-colors cursor-pointer shadow-md"
                  title="Fermer (Échap)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Photo Viewport (Scales nicely to leave room for thumbnails) */}
            <div className="flex-1 min-h-[260px] sm:min-h-[380px] max-h-[50vh] sm:max-h-[56vh] bg-black/90 flex items-center justify-center p-3 sm:p-5 relative overflow-hidden">
              <img
                src={activeAlbum.photos[photoIndex]?.url}
                alt={activeAlbum.photos[photoIndex]?.caption || activeAlbum.title}
                className="max-h-[46vh] sm:max-h-[52vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300"
              />

              {/* Prev / Next navigation arrows */}
              {activeAlbum.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1F0E18]/85 text-[#F5EDE4] hover:bg-[#B93A34] hover:text-white border border-[#F3C4A0]/20 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xl hover:scale-105"
                    title="Photo précédente (Flèche gauche)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1F0E18]/85 text-[#F5EDE4] hover:bg-[#B93A34] hover:text-white border border-[#F3C4A0]/20 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xl hover:scale-105"
                    title="Photo suivante (Flèche droite)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Strip: Caption + Clean, 100% visible Thumbnails (No cut-off) */}
            <div className="shrink-0 p-4 sm:p-5 bg-[#180A13] border-t border-[#F3C4A0]/15 space-y-3">
              {activeAlbum.photos[photoIndex]?.caption && (
                <p
                  className="text-xs sm:text-sm text-[#F5EDE4] text-center font-semibold truncate max-w-md mx-auto"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {activeAlbum.photos[photoIndex]?.caption}
                </p>
              )}

              {/* Fully visible thumbnail strip */}
              {activeAlbum.photos.length > 1 && (
                <div className="flex items-center justify-center gap-3 overflow-x-auto py-1.5 px-2 max-w-2xl mx-auto scrollbar-thin">
                  {activeAlbum.photos.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setPhotoIndex(idx)}
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-300 cursor-pointer ${
                        photoIndex === idx
                          ? 'border-[#B93A34] scale-110 shadow-[0_0_16px_rgba(185,58,52,0.7)] opacity-100 ring-2 ring-[#B93A34]/50'
                          : 'border-white/20 opacity-40 hover:opacity-90 hover:border-white/50'
                      }`}
                    >
                      <img
                        src={p.url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback icon if individual photo URL is unreachable
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </section>
  );
};

export default Gallery;
