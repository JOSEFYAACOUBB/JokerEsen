import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { ArrowUp } from 'lucide-react';

interface FooterProps {
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

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

          {/* Framed LinkedIn Badge Centered at the Bottom (with Cadre) */}
          <div className="pt-2">
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-2 rounded-xl bg-white hover:bg-blue-50/80 border border-slate-300 hover:border-[#0A66C2] text-[#0A66C2] text-xs sm:text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <svg className="w-4 h-4 fill-[#0A66C2] inline shrink-0" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z"/>
              </svg>
              <span>LinkedIn</span>
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
