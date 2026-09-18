import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Layers, Calendar } from 'lucide-react';
import { galleryService, getSavedAlbums, type AlbumMeta } from '../services/galleryService';
import { optimizeCloudinaryUrl } from '../lib/cloudinary';

export interface AlbumPhoto {
  id: string | number;
  url: string;
  caption: string;
}

export interface GalleryAlbum {
  id: string | number;
  title: string;
  category: string;
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
        const savedMetaList = getSavedAlbums();
        const savedMetaMap = new Map<string, AlbumMeta>();
        savedMetaList.forEach((meta) => {
          if (meta.name) {
            savedMetaMap.set(meta.name.toLowerCase().trim(), meta);
          }
        });

        const { images } = await galleryService.fetchImages(0, 100);
        if (images && images.length > 0) {
          // Group images by album name (stored in img.description or img.title)
          const albumMap = new Map<string, AlbumPhoto[]>();
          const albumMeta = new Map<string, { date: string; cover: string; category: string }>();

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

              // Check saved metadata first
              const savedMeta = savedMetaMap.get(rawAlbumName.toLowerCase()) || savedMetaMap.get(albumName.toLowerCase());

              // Guess category based on title or keywords if no saved meta
              let category = savedMeta?.category || 'Soirées';
              if (!savedMeta?.category) {
                const lower = (rawAlbumName + ' ' + (img.title || '')).toLowerCase();
                if (lower.includes('workshop') || lower.includes('formation') || lower.includes('design') || lower.includes('talk') || lower.includes('conférence')) {
                  category = 'Workshops';
                } else if (lower.includes('teambuilding') || lower.includes('integration') || lower.includes('intégration') || lower.includes('olympiade') || lower.includes('sortie')) {
                  category = 'Teambuilding';
                }
              }

              const formattedDate = savedMeta?.date || (img.created_at
                ? new Date(img.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                : 'Session Récente');

              albumMeta.set(albumName, {
                date: formattedDate,
                cover: savedMeta?.coverUrl || photoUrl,
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
          // If no custom photos uploaded, apply any saved album metadata on curated albums
          const enhancedDefaults = curatedDefaultAlbums.map((a) => {
            const saved = savedMetaMap.get(a.title.toLowerCase().trim());
            if (saved) {
              return {
                ...a,
                category: saved.category || a.category,
                coverImage: saved.coverUrl || a.coverImage,
                date: saved.date || a.date,
              };
            }
            return a;
          });
          setAlbums(enhancedDefaults);
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

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    albums.forEach((item) => {
      if (item.category && item.category.trim()) {
        cats.add(item.category.trim());
      }
    });
    return ['Tous', ...Array.from(cats)];
  }, [albums]);

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
      className="pb-16 sm:pb-24 lg:pb-28 bg-[#FAF7F5] text-[#2A2020] relative overflow-hidden border-b border-[#E5DDD7]"
    >
      {/* ── TILED PHOTO COLLAGE MOSAIC HEADER (~40-50vh desktop, ~30vh mobile) ── */}
      <div className="w-full h-[30vh] sm:h-[45vh] lg:h-[50vh] relative overflow-hidden bg-[#1A1013] mb-8 sm:mb-12">
        {/* Tightly Tiled 6-Photo Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 h-full w-full gap-0 overflow-hidden select-none">
          <div className="col-span-2 md:col-span-2 h-full overflow-hidden relative">
            <img
              src={optimizeCloudinaryUrl(albums[0]?.coverImage || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800', { width: 800, quality: 'auto' })}
              alt="Joker Event 1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-1 md:col-span-1 h-full overflow-hidden relative hidden sm:block">
            <img
              src={optimizeCloudinaryUrl(albums[1]?.coverImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600', { width: 600, quality: 'auto' })}
              alt="Joker Event 2"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-1 md:col-span-1 h-full overflow-hidden relative">
            <img
              src={optimizeCloudinaryUrl(albums[2]?.coverImage || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=600', { width: 600, quality: 'auto' })}
              alt="Joker Event 3"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-1 md:col-span-1 h-full overflow-hidden relative hidden md:block">
            <img
              src={optimizeCloudinaryUrl(albums[3]?.coverImage || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600', { width: 600, quality: 'auto' })}
              alt="Joker Event 4"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="col-span-1 md:col-span-1 h-full overflow-hidden relative hidden md:block">
            <img
              src={optimizeCloudinaryUrl(albums[4]?.coverImage || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=600', { width: 600, quality: 'auto' })}
              alt="Joker Event 5"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Full-bleed dark gradient scrim over entire collage (Global Rule 8 Exception) */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, rgba(26,16,19,0.88) 0%, rgba(26,16,19,0.45) 50%, rgba(26,16,19,0.2) 100%)',
          }}
        />

        {/* Top-Left Badge overlaid on photo collage — High contrast pill */}
        <div className="absolute top-6 left-6 sm:left-12 z-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(26,16,19,0.7)] text-white border border-white/20 backdrop-blur-md shadow-md text-xs font-bold font-mono tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#4B5B9E]" />
            <span>04 &middot; ARCHIVES &amp; SOUVENIRS</span>
          </div>
        </div>

        {/* Bottom-Left Overlaid Title */}
        <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-12 right-6 max-w-4xl space-y-2 z-20">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-display uppercase tracking-tight leading-tight drop-shadow-lg">
            GALERIE ÉVÉNEMENTS &amp; SOUVENIRS
          </h2>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">

        {/* ── Category Filter Bar immediately below Full-Bleed Banner (no separate subtitle block) ── */}
        {albums.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#EDE4DE] pb-4">
            <div className="inline-flex items-center flex-wrap gap-2">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 sm:px-5 py-2 text-xs font-bold uppercase rounded-full transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#4B5B9E] text-white border border-[#4B5B9E] shadow-sm scale-105'
                        : 'bg-white text-[#2A2020]/75 border border-[#EDE4DE] hover:border-[#4B5B9E] hover:text-[#4B5B9E]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#5C1F2E] font-semibold">
              {filteredAlbums.length} album{filteredAlbums.length > 1 ? 's' : ''} d'archives
            </p>
          </div>
        )}

        {/* ── Responsive Grid of Albums ── */}
        {loading ? (
          <div className="py-20 text-center text-[#4B5B9E] space-y-3">
            <div className="w-8 h-8 border-2 border-[#4B5B9E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wider">
              Chargement des souvenirs...
            </p>
          </div>
        ) : filteredAlbums.length === 0 ? (
          /* Empty State Fallback (Global Rule 4) */
          <div className="py-16 sm:py-20 text-center rounded-3xl bg-[#FFFFFF] border border-[#EDE4DE] shadow-[0_4px_16px_rgba(43,15,18,0.08)] max-w-lg mx-auto p-8 space-y-4 animate-fade-up">
            <div className="text-4xl select-none text-[#4B5B9E] mx-auto">
              &#9827;&#65039;
            </div>
            <h3 className="text-lg sm:text-xl font-black uppercase text-[#2A2020] font-display">
              {albums.length === 0 ? 'Aucun album photo pour le moment' : 'Aucune photo dans cette catégorie'}
            </h3>
            <p className="text-xs sm:text-sm text-[#5C1F2E] max-w-sm mx-auto leading-relaxed">
              {albums.length === 0
                ? 'Les albums photos officiels des événements et teambuildings seront bientôt publiés par le club Joker ESEN !'
                : 'Sélectionnez "Tous" pour afficher l\'ensemble de nos albums disponibles.'}
            </p>
            {activeCategory !== 'Tous' && (
              <button
                onClick={() => setActiveCategory('Tous')}
                className="mt-2 px-5 py-2 rounded-full bg-[#4B5B9E] hover:bg-[#3A4A8D] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Voir tous les albums
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {filteredAlbums.map((album, idx) => {
              const suitSymbol = ['♠', '♥', '♦', '♣'][idx % 4];
              const getTagColor = (cat: string) => {
                if (cat === 'Soirées') return '#A73541';
                if (cat === 'Workshops') return '#4B5B9E';
                if (cat === 'Teambuilding') return '#7D3F4A';
                let hash = 0;
                for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
                const hue = Math.abs(hash) % 360;
                return `hsl(${hue}, 60%, 36%)`;
              };
              const tagColor = getTagColor(album.category || 'Soirées');

              return (
                <div
                  key={album.id}
                  onClick={() => openAlbum(album)}
                  className="gallery-card group relative rounded-3xl overflow-hidden cursor-pointer shadow-[0_4px_16px_rgba(43,15,18,0.08)] hover:shadow-[0_12px_32px_rgba(43,15,18,0.16)] min-h-[320px] sm:min-h-[360px] flex flex-col justify-between p-6 bg-[#FFFFFF] border border-[#EDE4DE] hover:border-[#4B5B9E]/60 animate-fade-up hover:-translate-y-1 transition-all duration-200"
                >
                  {/* Photo with zoom effect */}
                  <img
                    src={optimizeCloudinaryUrl(album.coverImage, { width: 600, quality: 'auto' }) || album.coverImage}
                    alt={album.title}
                    width={400}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Functional readability gradient overlay on photo */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(42,32,32,0.92) 0%, rgba(42,32,32,0.4) 50%, rgba(42,32,32,0.65) 100%)',
                    }}
                  />

                  {/* Card-Suit Watermark in Royal Blue (Section 04 Elevation 2) */}
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 text-7xl font-black select-none pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-300 text-[#4B5B9E]">
                    {suitSymbol}
                  </div>

                  {/* Top row: Category pill + Photo count badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span
                      className="px-3.5 py-1.5 text-[11px] font-black uppercase rounded-full text-white shadow-sm"
                      style={{
                        background: tagColor,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {album.category}
                    </span>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-black/50 backdrop-blur-md border border-white/10 shadow-sm">
                      <Layers className="w-3.5 h-3.5 text-white" />
                      <span>{album.photos.length} photos</span>
                    </div>
                  </div>

                  {/* Bottom info: Album Title, Date & Action CTA */}
                  <div className="relative z-10 space-y-2 pt-16">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FAF7F5] uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-[#4B5B9E]" />
                      <span>{album.date}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-[#FFFFFF] uppercase leading-tight group-hover:text-[#FAF7F5] transition-colors">
                      {album.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs font-bold text-[#FAF7F5] pt-1 group-hover:underline">
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
            className={`relative w-full max-w-5xl my-auto rounded-3xl bg-[#FFFFFF] border border-[#EDE4DE] flex flex-col shadow-[0_30px_90px_rgba(43,15,18,0.25)] overflow-hidden ${closeAnimating ? 'anim-modal-out' : 'anim-modal-in'}`}
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed at Top) */}
            <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#EDE4DE] bg-[#FFFFFF]">
              <div className="min-w-0 pr-4">
                <div
                  className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#4B5B9E]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  <span>{activeAlbum.category}</span>
                  <span>&middot;</span>
                  <span>{activeAlbum.date}</span>
                </div>
                <h3
                  className="text-lg sm:text-xl font-black text-[#2A2020] uppercase truncate mt-0.5"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}
                >
                  {activeAlbum.title}
                </h3>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="px-3.5 py-1 rounded-full bg-[#4B5B9E]/10 text-xs font-black text-[#4B5B9E] tabular-nums border border-[#4B5B9E]/25"
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
                  className="w-9 h-9 rounded-full bg-[#FAF7F5] text-[#2A2020] hover:bg-[#4B5B9E] hover:text-white flex items-center justify-center transition-colors cursor-pointer shadow-md border border-[#EDE4DE]"
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

              {/* Single Discrete Corner Watermark Mark — Global Rule */}
              <div className="absolute bottom-4 right-4 pointer-events-none opacity-50 backdrop-blur-sm bg-black/40 px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Joker ESEN</span>
              </div>

              {/* Prev / Next navigation arrows */}
              {activeAlbum.photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 text-[#2A2020] hover:bg-[#4B5B9E] hover:text-white border border-[#EDE4DE] flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xl hover:scale-105"
                    title="Photo précédente (Flèche gauche)"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={nextPhoto}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 text-[#2A2020] hover:bg-[#4B5B9E] hover:text-white border border-[#EDE4DE] flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-xl hover:scale-105"
                    title="Photo suivante (Flèche droite)"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Strip: Caption + Clean, 100% visible Thumbnails (No cut-off) */}
            <div className="shrink-0 p-4 sm:p-5 bg-[#FAF7F5] border-t border-[#EDE4DE] space-y-3">
              {activeAlbum.photos[photoIndex]?.caption && (
                <p
                  className="text-xs sm:text-sm text-[#2A2020] text-center font-semibold truncate max-w-md mx-auto"
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
                            ? 'border-[#4B5B9E] scale-110 opacity-100'
                            : 'border-[#EDE4DE] opacity-50 hover:opacity-90 hover:border-[#4B5B9E]/50'
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
