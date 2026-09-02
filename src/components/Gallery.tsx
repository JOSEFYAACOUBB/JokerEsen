import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Layers, Calendar } from 'lucide-react';
import { galleryService } from '../services/galleryService';
import { optimizeCloudinaryUrl } from '../lib/cloudinary';

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

// Curated realistic default albums across all categories (High density - 9 albums)
export const curatedDefaultAlbums: GalleryAlbum[] = [
  {
    id: 'album-soir-1',
    title: 'Joker Carnival Night & Live DJ',
    category: 'Soirées',
    date: 'Octobre 2025',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p1', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200', caption: 'Ambiance explosive sur le dancefloor' },
      { id: 'p2', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200', caption: 'Set live & lights par les DJs invités' },
      { id: 'p3', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1200', caption: 'Scène principale & confettis' },
    ],
  },
  {
    id: 'album-soir-2',
    title: 'Cyber Night & Esport Arena',
    category: 'Soirées',
    date: 'Mai 2025',
    coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p4', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200', caption: 'Finale Valorant inter-universitaire' },
      { id: 'p5', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=1200', caption: 'Stand rétrogaming & tournoi FIFA' },
    ],
  },
  {
    id: 'album-soir-3',
    title: 'Gala Annuel & Remise des Trophées',
    category: 'Soirées',
    date: 'Juin 2024',
    coverImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p6', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200', caption: 'Cérémonie officielle et cocktail dînatoire' },
      { id: 'p7', url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&q=80&w=1200', caption: "Célébration des réussites de l'année" },
    ],
  },
  {
    id: 'album-work-1',
    title: 'Masterclass UI/UX & Design Sprint',
    category: 'Workshops',
    date: 'Février 2025',
    coverImage: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p8', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=1200', caption: 'Idéation collaborative & wireframing' },
      { id: 'p9', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200', caption: 'Travail en équipe et pitchs finaux' },
    ],
  },
  {
    id: 'album-work-2',
    title: 'DJ Academy & Production Audio',
    category: 'Workshops',
    date: 'Novembre 2024',
    coverImage: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p10', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1200', caption: 'Initiation au mix numérique et platines' },
    ],
  },
  {
    id: 'album-work-3',
    title: 'Communication & Événementiel 360°',
    category: 'Workshops',
    date: 'Décembre 2024',
    coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p11', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200', caption: 'Stratégie de communication pour festivals' },
    ],
  },
  {
    id: 'album-team-1',
    title: 'Joker Integration Day & Welcome Pack',
    category: 'Teambuilding',
    date: 'Septembre 2025',
    coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p12', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1200', caption: 'Accueil festif des nouveaux étudiants ESEN' },
      { id: 'p13', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=1200', caption: 'Jeux de cohésion et animations musicales' },
    ],
  },
  {
    id: 'album-team-2',
    title: 'Olympiades & Beach Games',
    category: 'Teambuilding',
    date: 'Mai 2024',
    coverImage: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p14', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=1200', caption: "Défis sportifs et cohésion d'équipe" },
    ],
  },
  {
    id: 'album-team-3',
    title: 'Weekend de Rentrée & Retraite Club',
    category: 'Teambuilding',
    date: 'Octobre 2024',
    coverImage: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=800&h=600',
    photos: [
      { id: 'p15', url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=1200', caption: 'Partage, convivialité et esprit Joker' },
    ],
  },
];

export const Gallery: React.FC = () => {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  
  // Selected Album for Modal View
  const [activeAlbum, setActiveAlbum] = useState<GalleryAlbum | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number>(0);

  // Animation states
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const [closeAnimating, setCloseAnimating] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

          if (constructedAlbums.length > 0) {
            setAlbums(constructedAlbums);
          } else {
            setAlbums(curatedDefaultAlbums);
          }
        } else {
          setAlbums(curatedDefaultAlbums);
        }
      } catch (err) {
        console.warn('Could not load gallery images, using curated albums:', err);
        setAlbums(curatedDefaultAlbums);
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
    setSlideDir(null);
    setSlideKey(k => k + 1);
  };

  const animatedClose = () => {
    if (closeAnimating) return;
    setCloseAnimating(true);
    closeTimerRef.current = setTimeout(() => {
      setActiveAlbum(null);
      setPhotoIndex(0);
      setCloseAnimating(false);
    }, 150);
  };

  const closeAlbum = () => animatedClose();

  const prevPhoto = useCallback(() => {
    if (activeAlbum) {
      setSlideDir('right');
      setSlideKey(k => k + 1);
      setPhotoIndex((prev) => (prev - 1 + activeAlbum.photos.length) % activeAlbum.photos.length);
    }
  }, [activeAlbum]);

  const nextPhoto = useCallback(() => {
    if (activeAlbum) {
      setSlideDir('left');
      setSlideKey(k => k + 1);
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
    <section
      id="gallery"
      className="py-16 sm:py-24 lg:py-28 bg-[#140B10] relative overflow-hidden border-b border-[#F3C4A0]/15"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Section Header - Standardized Left Aligned (Global Rules 1 & 2) ── */}
        <div className="flex flex-col items-start justify-start gap-4 mb-10 sm:mb-14 animate-fade-up">
          
          {/* Top-Left Badge */}
          <div className="chapter-badge">
            <span className="chapter-badge-dot" />
            <span>04 &middot; ARCHIVES &amp; SOUVENIRS</span>
          </div>

          {/* Left-Aligned Big Heading */}
          <h2 className="section-headline">
            Galerie Événements &amp; Souvenirs
          </h2>

          {/* Left-Aligned Subtitle */}
          <p className="text-[#F5EDE4]/85 text-xs sm:text-sm md:text-base max-w-xl leading-relaxed">
            Revivez l'énergie unique de nos soirées, masterclasses et teambuildings à l'ESEN Manouba.
          </p>

          {/* ── Category Filter (Distinct Outlined Pill Style) ── */}
          {albums.length > 0 && (
            <div className="pt-3">
              <div className="inline-flex items-center flex-wrap gap-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 sm:px-5 py-2 text-xs font-bold uppercase rounded-full transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#B93A34] text-white border border-[#B93A34] shadow-md scale-105'
                          : 'bg-transparent text-[#F5EDE4]/70 border border-[#F3C4A0]/25 hover:border-[#F3C4A0]/60 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ── Responsive Grid of Albums ── */}
        {loading ? (
          <div className="py-20 text-center text-[#F3C4A0]/60 space-y-3">
            <div className="w-8 h-8 border-2 border-[#B93A34] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider">
              Chargement des souvenirs...
            </p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          /* Empty State Fallback (Global Rule 4) */
          <div className="py-16 sm:py-20 text-center rounded-3xl bg-[#1A0E15] border border-[#F3C4A0]/20 max-w-lg mx-auto p-8 space-y-4 shadow-xl animate-fade-up">
            <div className="text-4xl select-none text-[#F3C4A0]/60 mx-auto">
              ♣️
            </div>
            <h3 className="text-lg sm:text-xl font-black uppercase text-[#F5EDE4] font-display">
              {albums.length === 0 ? 'Aucun album photo pour le moment' : 'Aucune photo dans cette catégorie'}
            </h3>
            <p className="text-xs sm:text-sm text-[#F5EDE4]/70 max-w-sm mx-auto leading-relaxed">
              {albums.length === 0
                ? 'Les albums photos officiels des événements et teambuildings seront bientôt publiés par le club Joker ESEN !'
                : 'Sélectionnez "Tous" pour afficher l\'ensemble de nos albums disponibles.'}
            </p>
            {activeCategory !== 'Tous' && (
              <button
                onClick={() => setActiveCategory('Tous')}
                className="mt-2 px-5 py-2 rounded-full bg-[#B93A34] hover:bg-[#E05A52] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Voir tous les albums
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {filteredAlbums.map((album, idx) => {
              const suitSymbol = ['♠', '♥', '♦', '♣'][idx % 4];
              const tagColor =
                album.category === 'Soirées'
                  ? '#B93A34'
                  : album.category === 'Workshops'
                  ? '#E05A52'
                  : '#E87A5D';

              return (
                <div
                  key={album.id}
                  onClick={() => openAlbum(album)}
                  className="gallery-card group relative rounded-3xl overflow-hidden cursor-pointer shadow-xl min-h-[320px] sm:min-h-[360px] flex flex-col justify-between p-6 bg-[#1A0E15] border border-[#F3C4A0]/18 hover:border-[#B93A34]/50 animate-fade-up"
                >
                  {/* Photo with zoom effect */}
                  <img
                    src={optimizeCloudinaryUrl(album.coverImage, { width: 600, quality: 'auto' }) || album.coverImage}
                    alt={album.title}
                    width={400}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 brightness-90 group-hover:brightness-100"
                  />

                  {/* Dark gradient for text readability (Global Rule 8 functional gradient) */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(14,8,12,0.96) 0%, rgba(14,8,12,0.45) 50%, rgba(14,8,12,0.7) 100%)',
                    }}
                  />

                  {/* Card-Suit Watermark on Hover (Global Rule 5) */}
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 text-7xl font-black select-none pointer-events-none opacity-0 group-hover:opacity-15 transition-opacity duration-400 text-[#F3C4A0]">
                    {suitSymbol}
                  </div>

                  {/* Top row: Category pill + Photo count badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span
                      className="px-3.5 py-1.5 text-[11px] font-black uppercase rounded-full text-white shadow-md"
                      style={{
                        background: tagColor,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {album.category}
                    </span>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-black/60 backdrop-blur-md border border-white/10 shadow-sm">
                      <Layers className="w-3.5 h-3.5 text-[#F3C4A0]" />
                      <span>{album.photos.length} photos</span>
                    </div>
                  </div>

                  {/* Bottom info: Album Title, Date & Action CTA */}
                  <div className="relative z-10 space-y-2 pt-16">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#F3C4A0] uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-[#B93A34]" />
                      <span>{album.date}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-[#F5EDE4] uppercase leading-tight group-hover:text-[#F3C4A0] transition-colors">
                      {album.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs font-bold text-[#F3C4A0] pt-1 group-hover:underline">
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
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-2xl overflow-y-auto ${closeAnimating ? 'anim-backdrop-out' : 'anim-backdrop-in'}`}
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={closeAlbum}
        >
          <div
            className={`relative w-full max-w-5xl my-auto rounded-3xl bg-[#14080F] border border-[#F3C4A0]/30 flex flex-col shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden ${closeAnimating ? 'anim-modal-out' : 'anim-modal-in'}`}
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
                  onClick={() => {
                    const btn = document.getElementById('gallery-close-btn');
                    if (btn) { btn.classList.add('anim-close-click'); setTimeout(() => btn.classList.remove('anim-close-click'), 310); }
                    animatedClose();
                  }}
                  id="gallery-close-btn"
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
                key={slideKey}
                src={optimizeCloudinaryUrl(activeAlbum.photos[photoIndex]?.url, { width: 1200, quality: 'auto' }) || activeAlbum.photos[photoIndex]?.url}
                alt={activeAlbum.photos[photoIndex]?.caption || activeAlbum.title}
                width={800}
                height={600}
                decoding="async"
                className={`max-h-[46vh] sm:max-h-[52vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl ${
                  slideDir === 'left' ? 'anim-photo-left' : slideDir === 'right' ? 'anim-photo-right' : 'anim-modal-in'
                }`}
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
                  {activeAlbum.photos.map((p, idx) => {
                    const isActive = photoIndex === idx;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          const dir = idx > photoIndex ? 'left' : 'right';
                          setSlideDir(dir);
                          setSlideKey(k => k + 1);
                          setPhotoIndex(idx);
                        }}
                        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'border-[#B93A34] scale-110 opacity-100'
                            : 'border-white/20 opacity-40 hover:opacity-90 hover:border-white/50'
                        } ${isActive ? 'anim-thumb-ring' : ''}`}
                      >
                        {/* Skeleton placeholder while image loads */}
                        <div className="absolute inset-0 anim-skeleton" />
                        <img
                          src={optimizeCloudinaryUrl(p.url, { width: 120, height: 120, quality: 'auto' }) || p.url}
                          alt=""
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="relative w-full h-full object-cover"
                          onLoad={(e) => {
                            const parent = (e.target as HTMLElement).parentElement;
                            const skeleton = parent?.querySelector('.anim-skeleton') as HTMLElement | null;
                            if (skeleton) skeleton.style.display = 'none';
                          }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </button>
                    );
                  })}
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
