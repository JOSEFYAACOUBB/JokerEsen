import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Layers } from 'lucide-react';
import { galleryService } from '../services/galleryService';

interface AlbumPhoto {
  id: number;
  url: string;
  caption: string;
}

interface GalleryAlbum {
  id: number;
  title: string;
  category: 'Soirées' | 'Workshops' | 'Teambuilding';
  date: string;
  coverImage: string;
  photos: AlbumPhoto[];
}

const defaultAlbums: GalleryAlbum[] = [
  {
    id: 1,
    title: 'Carnival Night & Concert Live 2025',
    category: 'Soirées',
    date: 'Octobre 2025',
    coverImage: '/images/event_banner.jpg',
    photos: [
      { id: 101, url: '/images/event_banner.jpg', caption: 'Grande scène & concert live du Carnival' },
      { id: 102, url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=1200', caption: 'Lumières & ambiance du carnaval sur le campus' },
      { id: 103, url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1200', caption: 'Performance DJ & jeux de lumière' },
      { id: 104, url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1200', caption: 'Feux d\'artifice & clôture de la soirée' },
      { id: 105, url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1200', caption: 'Foule d\'étudiants en délire' },
    ],
  },
  {
    id: 2,
    title: 'Workshop Creative Innovation & Design',
    category: 'Workshops',
    date: 'Novembre 2025',
    coverImage: '/images/workshop.jpg',
    photos: [
      { id: 201, url: '/images/workshop.jpg', caption: 'Session de design sprint & idéation' },
      { id: 202, url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200', caption: 'Présentation interactive des projets' },
      { id: 203, url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200', caption: 'Brainstorming & travail d\'équipe' },
      { id: 204, url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200', caption: 'Mentorat par les anciens du club' },
    ],
  },
  {
    id: 3,
    title: 'Grand Teambuilding Intégration Campus',
    category: 'Teambuilding',
    date: 'Septembre 2025',
    coverImage: '/images/teambuilding.jpg',
    photos: [
      { id: 301, url: '/images/teambuilding.jpg', caption: 'Journée d\'intégration plein air' },
      { id: 302, url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1200', caption: 'Cercle de présentation des nouveaux membres' },
      { id: 303, url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1200', caption: 'Défis & jeux d\'équipe' },
      { id: 304, url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1200', caption: 'Photo de famille JokerEsen 2025' },
    ],
  },
  {
    id: 4,
    title: 'Atelier Sponsoring & Prise de Parole',
    category: 'Workshops',
    date: 'Février 2026',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    photos: [
      { id: 401, url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200', caption: 'Masterclass négociation & pitch' },
      { id: 402, url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1200', caption: 'Intervention d\'un expert partenaire' },
      { id: 403, url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=1200', caption: 'Session de questions & réponses' },
    ],
  },
  {
    id: 5,
    title: 'Gala Annuel Joker Spirit & Masquerade',
    category: 'Soirées',
    date: 'Décembre 2025',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    photos: [
      { id: 501, url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1200', caption: 'Décoration de la salle du Gala' },
      { id: 502, url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&q=80&w=1200', caption: 'Dîner de gala & remise des prix' },
      { id: 503, url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=1200', caption: 'Lancement de confettis & célébration' },
      { id: 504, url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=1200', caption: 'Arrivée des invité(e)s sur le tapis rouge' },
    ],
  },
  {
    id: 6,
    title: "Journée d'Accueil & Olympiades Géantes",
    category: 'Teambuilding',
    date: 'Octobre 2025',
    coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800',
    photos: [
      { id: 601, url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200', caption: 'Tournoi sportif inter-filières' },
      { id: 602, url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1200', caption: 'Course de relais & ambiance' },
      { id: 603, url: 'https://images.unsplash.com/photo-1561489413-985b06da5bee?auto=format&fit=crop&q=80&w=1200', caption: 'Remise des trophées aux gagnants' },
    ],
  }
];

export const Gallery: React.FC = () => {
  const [albums, setAlbums] = useState<GalleryAlbum[]>(defaultAlbums);
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  
  // Selected Album for Modal View
  const [activeAlbum, setActiveAlbum] = useState<GalleryAlbum | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number>(0);

  // Load uploaded Cloudinary photos from Supabase
  useEffect(() => {
    async function loadCloudinaryGallery() {
      try {
        const { images } = await galleryService.fetchImages(0, 50);
        if (images && images.length > 0) {
          const livePhotos: AlbumPhoto[] = images.map((img, idx) => ({
            id: 9000 + idx,
            url: img.display_url || img.cloudinary_url,
            caption: img.title || 'Photo Joker ESEN',
          }));

          const liveAlbum: GalleryAlbum = {
            id: 999,
            title: 'Photos Récentes & Uploads Live',
            category: 'Soirées',
            date: 'Live Cloudinary',
            coverImage: livePhotos[0]?.url || defaultAlbums[0].coverImage,
            photos: livePhotos,
          };

          setAlbums([liveAlbum, ...defaultAlbums]);
        }
      } catch (err) {
        console.warn('Could not load live gallery images:', err);
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

          {/* Right Column: Filter Tabs */}
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

        </div>

        {/* ── Responsive Grid of Albums ── */}
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
                      color: '#3B66FF',
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

                  <div className="flex items-center gap-2 pt-1 text-xs font-bold text-[#3B66FF] group-hover:translate-x-1 transition-transform">
                    <span>Ouvrir l'album</span>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* ── Modal Lightbox ── */}
      {activeAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-[#1A0E14] rounded-3xl border border-[#F3C4A0]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#F3C4A0]/15 bg-[#25121B]">
              <div>
                <span className="text-xs font-bold text-[#3B66FF] uppercase tracking-wider">
                  {activeAlbum.category} &middot; {activeAlbum.date}
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-[#F5EDE4] font-display uppercase">
                  {activeAlbum.title}
                </h3>
              </div>

              <button
                onClick={closeAlbum}
                className="p-2 rounded-full text-[#F3C4A0] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Carousel Display */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] sm:min-h-[460px] overflow-hidden">
              <img
                src={activeAlbum.photos[photoIndex].url}
                alt={activeAlbum.photos[photoIndex].caption}
                className="max-h-[65vh] w-auto max-w-full object-contain mx-auto transition-all duration-300"
              />

              {/* Prev / Next Buttons */}
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-[#3B66FF] text-white backdrop-blur-md transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-[#3B66FF] text-white backdrop-blur-md transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Photo Caption Overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-center">
                <p className="text-xs sm:text-sm text-[#F5EDE4] font-medium">
                  {activeAlbum.photos[photoIndex].caption}
                </p>
                <span className="text-[10px] text-[#F3C4A0]/60 font-bold">
                  {photoIndex + 1} / {activeAlbum.photos.length}
                </span>
              </div>
            </div>

            {/* Thumbnails Row */}
            <div className="p-3 sm:p-4 bg-[#25121B] flex gap-2.5 overflow-x-auto border-t border-[#F3C4A0]/15">
              {activeAlbum.photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => setPhotoIndex(idx)}
                  className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === photoIndex
                      ? 'border-[#3B66FF] scale-105 shadow-md shadow-[#3B66FF]/40'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
