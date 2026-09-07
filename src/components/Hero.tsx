import React from 'react';
import { PartnersCarousel } from './PartnersCarousel';
import { Logo } from './Logo';
import { ChevronDown } from 'lucide-react';

interface HeroProps {
  onOpenLogin: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenLogin }) => {
  return (
    <>
      {/* Full-viewport Hero section — background image with balanced photo overlay */}
      <section
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{
          backgroundImage: 'url("https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_1920,c_limit/v1788313989/background-image.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Photo gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-[#FAF7F5] pointer-events-none" />

        {/* ── NAVBAR overlaid on the hero image ── */}
        <div className="relative z-20 w-full px-4 sm:px-10 py-5 sm:py-7 flex items-center justify-between">
          <a href="#" className="flex items-center">
            <Logo size="md" showText={true} />
          </a>

          {/* SE CONNECTER — outlined style, consistent with light-theme */}
          <button
            onClick={onOpenLogin}
            className="px-6 py-2.5 rounded-full bg-transparent hover:bg-white/10 text-white font-bold text-xs sm:text-sm tracking-wider uppercase border border-white/50 hover:border-white transition-all duration-200 cursor-pointer backdrop-blur-md"
          >
            Se Connecter
          </button>
        </div>

        {/* ── HERO CONTENT — reduced vertical space on mobile (Global Rule 10) ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pb-6 sm:pb-16 pt-2 sm:pt-0 space-y-5 sm:space-y-8">

          {/* 2-Color Split Headline */}
          <h1 className="text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tight leading-[1.1] sm:leading-[1.05] max-w-5xl mx-auto uppercase drop-shadow-2xl break-words">
            <span className="text-white block mb-2 sm:mb-3 drop-shadow-md">Des Événements Épiques,</span>
            <span className="text-[#A73541] block drop-shadow-2xl">Une Vie Étudiante Unique !</span>
          </h1>

          {/* REJOINDRE LE CLUB — solid Crimson Red #A73541 */}
          <a
            href="#join"
            className="inline-flex items-center gap-3 sm:gap-4 pl-6 sm:pl-8 pr-2 sm:pr-3 py-2.5 sm:py-3 rounded-full bg-[#A73541] text-white font-bold text-sm sm:text-base shadow-xl shadow-[#A73541]/40 hover:bg-[#8C2D3A] hover:scale-105 active:scale-95 transition-all duration-200 max-w-full cursor-pointer group"
          >
            <span className="tracking-wide uppercase font-black text-xs sm:text-sm">Rejoindre le Club</span>
            <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-[#A73541] group-hover:text-[#8C2D3A] flex items-center justify-center font-black text-base sm:text-lg shadow-md shrink-0 transition-colors">
              ↗
            </span>
          </a>

          {/* ── Scroll-down indicator (Global Rule 10) ── */}
          <button
            type="button"
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer focus:outline-none mt-2"
            aria-label="Défiler vers le bas"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Découvrir</span>
            <ChevronDown className="w-5 h-5 text-white animate-bounce" />
          </button>
        </div>

        {/* Bottom fade into light off-white section */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#FAF7F5] via-[#FAF7F5]/80 to-transparent pointer-events-none" />
      </section>

      {/* Partners strip sits right below the hero */}
      <PartnersCarousel />
    </>
  );
};

