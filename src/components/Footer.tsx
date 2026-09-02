import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { ArrowUp } from 'lucide-react';

import { getCachedClubSocials, fetchClubSettings } from '../services/settingsService';

interface FooterProps {
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [socials, setSocials] = useState(() => getCachedClubSocials());

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    // Load from Supabase to ensure fresh data across devices
    fetchClubSettings().then((settings) => {
      if (settings?.social_links) {
        setSocials(getCachedClubSocials());
      }
    }).catch(() => {});

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="w-full bg-[#F8FAFC] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 text-center border-t border-slate-200">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 flex flex-col items-center">
          
          {/* Logo Centered at Top */}
          <div className="flex justify-center">
            <a href="#" className="inline-block transition-transform duration-300 hover:scale-105">
              <Logo size="lg" showText={false} />
            </a>
          </div>

          {/* Bold Centered Tagline with Highlight */}
          <h2
            className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] uppercase tracking-tight leading-tight max-w-3xl mx-auto"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif" }}
          >
            Fais bouger la vie étudiante avec <span className="text-[#3B66FF]">JokerEsen</span>
          </h2>

          {/* ── Joker ESEN Club Social Media Links (dynamic from Admin) ── */}
          <div className="flex flex-col items-center gap-2.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Retrouvez-nous sur
            </span>
            <div className="flex items-center justify-center gap-3">
            {/* Instagram */}
            {socials.instagram && (
              <a
                href={socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Joker ESEN"
                className="group w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-transparent flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 hover:scale-110 active:scale-95"
                style={{ background: 'white' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <svg className="w-4.5 h-4.5 w-[18px] h-[18px] group-hover:fill-white fill-[#E1306C] transition-colors duration-300" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.851s-.012 3.584-.07 4.85c-.062 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.333-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.333-2.633 1.308-3.608C4.516 2.497 5.783 2.225 7.15 2.163 8.416 2.105 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.053.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.856.601 3.698 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.856-.085 3.698-.601 5.038-1.942 1.341-1.34 1.857-3.182 1.942-5.038C23.986 15.668 24 15.259 24 12c0-3.259-.014-3.667-.072-4.947-.085-1.857-.601-3.699-1.942-5.04C20.646.673 18.804.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </a>
            )}

            {/* Facebook */}
            {socials.facebook && (
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook de Joker ESEN"
                className="group w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-[#1877F2] hover:border-[#1877F2] flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <svg className="w-[18px] h-[18px] fill-[#1877F2] group-hover:fill-white transition-colors duration-300" viewBox="0 0 24 24">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
              </a>
            )}

            {/* TikTok */}
            {socials.tiktok && (
              <a
                href={socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok de Joker ESEN"
                className="group w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-[#010101] hover:border-[#010101] flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <svg className="w-[18px] h-[18px] fill-[#010101] group-hover:fill-white transition-colors duration-300" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.52V6.76a4.85 4.85 0 0 1-1.02-.07z"/>
                </svg>
              </a>
            )}

            {/* Club LinkedIn */}
            {socials.linkedin && (
              <a
                href={socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn de Joker ESEN"
                className="group w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-[#0A66C2] hover:border-[#0A66C2] flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <svg className="w-[18px] h-[18px] fill-[#0A66C2] group-hover:fill-white transition-colors duration-300" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z"/>
                </svg>
              </a>
            )}
            </div>
          </div>

          {/* Framed LinkedIn Badge — personal developer credit */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Site développé par
            </span>
            <a
              href="https://www.linkedin.com/in/youssef-ben-yaacoub-a390b8338/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-2 rounded-xl bg-white hover:bg-blue-50/80 border border-slate-300 hover:border-[#0A66C2] text-[#0A66C2] text-xs sm:text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <svg className="w-4 h-4 fill-[#0A66C2] inline shrink-0" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z"/>
              </svg>
              <span>Youssef Ben Yaacoub</span>
            </a>
          </div>


        </div>
      </footer>

      {/* ── Floating Sticky "Haut de page" Button on the Right Side ── */}
      <button
        onClick={scrollToTop}
        aria-label="Retour en haut de la page"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[#1F0E18]/95 backdrop-blur-md border border-[#F3C4A0]/30 text-[#F5EDE4] text-xs font-black uppercase tracking-wider shadow-2xl hover:bg-[#3B66FF] hover:border-[#3B66FF] hover:text-white transition-all duration-300 transform cursor-pointer group ${
          showScrollTop
            ? 'opacity-100 translate-y-0 pointer-events-auto shadow-[0_10px_30px_rgba(0,0,0,0.6)]'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <span className="hidden sm:inline group-hover:tracking-widest transition-all">Haut de page</span>
        <span className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-white text-white group-hover:text-[#3B66FF] flex items-center justify-center transition-colors">
          <ArrowUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
        </span>
      </button>
    </>
  );
};

export default Footer;
