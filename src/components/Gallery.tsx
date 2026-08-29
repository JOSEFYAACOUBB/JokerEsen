import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Layers, Image as ImageIcon } from 'lucide-react';
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
          // Group images by album name (stored in img.description)
          const albumMap = new Map<string, AlbumPhoto[]>();
          const albumMeta = new Map<string, { date: string; cover: string; category: 'Soirées' | 'Workshops' | 'Teambuilding' }>();

          images.forEach((img, idx) => {
            const albumName = (img.description && img.description.trim()) || 'Événements Joker';
            const photoUrl = img.display_url || img.cloudinary_url;
            const photoItem: AlbumPhoto = {
              id: img.id || idx,
              url: photoUrl,
              caption: img.title || albumName,
            };

            if (!albumMap.has(albumName)) {
              albumMap.set(albumName, []);
              
              // Guess or assign category
              const lower = albumName.toLowerCase();
              let category: 'Soirées' | 'Workshops' | 'Teambuilding' = 'Soirées';
              if (lower.includes('workshop') || lower.includes('formation') || lower.includes('design') || lower.includes('talk')) {
                category = 'Workshops';
              } else if (lower.includes('teambuilding') || lower.includes('integration') || lower.includes('intégration') || lower.includes('olympiade')) {
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

  const prevPhoto = () => {
    if (activeAlbum) {
      setPhotoIndex((prev) => (prev - 1 + activeAlbum.photos.length) % activeAlbum.photos.length);
    }
  };

  const nextPhoto = () => {
    if (activeAlbum) {
      setPhotoIndex((prev) => (prev + 1) % activeAlbum.photos.length);
    }
  };

  const categoryColors: Record<string, string> = {
    Soirées: '#B93A34',
    Workshops: '#4E4F9E',
    Teambuilding: '#A66B95',
  };

  return (
    <section id="gallery" className="py-16 sm:py-24 bg-[#1A0E14] relative overflow-hidden bg-suits-dark-watermark border-b border-[#F3C4A0]/15">

      {/* Ambient glow blobs */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(185,58,52,0.07) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(78,79,158,0.07) 0%, transparent 70%)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Section Header - Split Placement ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-14">
          
          {/* Left Column: Title & Badge */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#A66B95]/15 border border-[#A66B95]/35 text-[#F3C4A0] text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#A66B95] animate-pulse" />
              <span>04 &middot; ARCHIVES &amp; SOUVENIRS</span>
            </div>
            <h2
              className="font-black uppercase text-[#F5EDE4] leading-none"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif",
                fontSize: 'clamp(2.2rem, 5.5vw, 4.8rem)',
                letterSpacing: '-0.02em',
              }}
            >
              Galerie Événements
            </h2>
            <p className="text-[#F5EDE4]/60 text-xs sm:text-sm">
              Revivez l'énergie de nos soirées, masterclasses et teambuildings.
            </p>
          </div>

          {/* Right Column: Filter Tabs (only if albums exist) */}
          {albums.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-white/[0.06] border border-white/10 backdrop-blur-md rounded-full p-1.5 sm:p-2 self-start lg:self-end shadow-lg">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3.5 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase rounded-full transition-all duration-300 cursor-pointer"
                  style={{
                    letterSpacing: '0.08em',
                    background: activeCategory === cat ? '#3B66FF' : 'transparent',
                    color: activeCategory === cat ? '#ffffff' : 'rgba(245,237,228,0.7)',
                    boxShadow: activeCategory === cat ? '0 4px 14px rgba(59,102,255,0.4)' : 'none',
                    transform: activeCategory === cat ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* ── Responsive Grid of Albums ── */}
        {loading ? (
          <div className="py-20 text-center text-[#F3C4A0]/60 space-y-3">
            <div className="w-8 h-8 border-2 border-[#3B66FF] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider">Chargement des albums...</p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="py-16 sm:py-20 text-center rounded-3xl bg-[#1F0E18]/60 border border-dashed border-[#F3C4A0]/20 max-w-lg mx-auto p-8 space-y-4 shadow-xl backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#3B66FF]/15 border border-[#3B66FF]/30 flex items-center justify-center mx-auto text-[#93C5FD]">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-[#F5EDE4] font-display">
              {albums.length === 0 ? 'Aucun album photo pour le moment' : 'Aucun album dans cette catégorie'}
            </h3>
            <p className="text-xs sm:text-sm text-[#F5EDE4]/60 max-w-sm mx-auto leading-relaxed">
              {albums.length === 0
                ? 'Les albums photos officiels des événements et teambuildings seront bientôt publiés par le club Joker ESEN !'
                : 'Sélectionnez "Tous" pour voir l\'ensemble des albums disponibles.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredAlbums.map((album) => {
              const accentColor = categoryColors[album.category] ?? '#B93A34';

              return (
                <div
                  key={album.id}
                  onClick={() => openAlbum(album)}
                  className="group relative rounded-3xl overflow-hidden cursor-pointer shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-[0_24px_50px_rgba(185,58,52,0.25)] min-h-[300px] sm:min-h-[340px] flex flex-col justify-end"
                  style={{
                    border: '1.5px solid rgba(243,196,160,0.18)',
                  }}
                >
                  {/* Photo */}
                  <img
                    src={album.coverImage}
                    alt={album.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Always-on dark gradient */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(13,6,8,0.95) 0%, rgba(13,6,8,0.35) 55%, transparent 100%)',
                    }}
                  />

                  {/* Hover colour wash */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 30% 70%, ${accentColor}, transparent 70%)` }}
                  />

                  {/* Top row: category pill + photo count */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <span
                      className="px-3 py-1 text-[10px] font-bold uppercase rounded-full text-white shadow-md backdrop-blur-md"
                      style={{ background: '#3B66FF', letterSpacing: '0.12em', boxShadow: '0 3px 12px rgba(59,102,255,0.45)' }}
                    >
                      {album.category}
                    </span>

                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: '#EEF2FF',
                        color: '#1A3FBF',
                        boxShadow: '0 2px 8px rgba(59,102,255,0.15)',
                      }}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{album.photos.length} photos</span>
                    </div>
                  </div>

                  {/* Bottom content: Album title, date & CTA */}
                  <div className="relative z-10 p-5 sm:p-6 space-y-2">
                    <span className="text-[11px] font-bold text-[#F3C4A0]/70 uppercase tracking-wider">
                      {album.date}
                    </span>

                    <h3 className="text-lg sm:text-xl font-black text-[#F5EDE4] font-display uppercase leading-snug group-hover:text-[#F3C4A0] transition-colors">
                      {album.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs font-bold text-[#3B66FF] pt-1">
                      <span>Voir l'album</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Album Lightbox Modal ── */}
      {activeAlbum && activeAlbum.photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={closeAlbum}
        >
          <div
            className="relative w-full max-w-5xl max-h-[95vh] rounded-3xl bg-[#140A10] border border-[#F3C4A0]/25 overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3C4A0]/15 bg-[#1F0E18]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3B66FF]">
                  {activeAlbum.category} &middot; {activeAlbum.date}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#F5EDE4] font-display uppercase truncate max-w-sm sm:max-w-md">
                  {activeAlbum.title}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#F3C4A0]/70">
                  {photoIndex + 1} / {activeAlbum.photos.length}
                </span>
                <button
                  onClick={closeAlbum}
                  className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-[#B93A34] flex items-center justify-center transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Viewport */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[480px] bg-black/80 flex items-center justify-center p-4">
              <img
                src={activeAlbum.photos[photoIndex]?.url}
                alt={activeAlbum.photos[photoIndex]?.caption}
                className="max-h-[60vh] sm:max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />

              {/* Prev / Next controls */}
              {activeAlbum.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 text-white hover:bg-[#3B66FF] flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                    title="Précédente"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 text-white hover:bg-[#3B66FF] flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
                    title="Suivante"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Caption & Thumbnails */}
            <div className="p-4 bg-[#1F0E18] border-t border-[#F3C4A0]/15 space-y-3">
              <p className="text-xs sm:text-sm text-[#F5EDE4] text-center font-medium">
                {activeAlbum.photos[photoIndex]?.caption}
              </p>

              {/* Thumbnail Strip */}
              {activeAlbum.photos.length > 1 && (
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                  {activeAlbum.photos.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setPhotoIndex(idx)}
                      className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        photoIndex === idx
                          ? 'border-[#3B66FF] scale-105 opacity-100'
                          : 'border-transparent opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
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
