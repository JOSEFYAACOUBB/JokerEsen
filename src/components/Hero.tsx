import React from 'react';
import { PartnersCarousel } from './PartnersCarousel';
import { Logo } from './Logo';

interface HeroProps {
  onOpenLogin: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenLogin }) => {
  return (
    <>
      {/* Full-viewport Hero section — navbar lives INSIDE this background image */}
      <section
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{
          backgroundImage: 'url("/images/background-image.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark gradient overlay — heavier at top (navbar area) and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A0E14]/80 via-[#1A0E14]/30 to-[#1A0E14]/85 pointer-events-none" />

        {/* ── NAVBAR overlaid on the image ── */}
        <div className="relative z-20 w-full px-4 sm:px-10 py-5 sm:py-7 flex items-center justify-between">
          <a href="#" className="flex items-center">
            <Logo size="md" showText={true} />
          </a>

          <button
            onClick={onOpenLogin}
            className="px-6 py-2.5 rounded-full bg-[#1A0E15]/90 hover:bg-[#B93A34] text-[#F5EDE4] hover:text-white font-bold text-xs sm:text-sm tracking-wider uppercase border border-[#F3C4A0]/30 hover:border-[#B93A34] transition-all duration-300 shadow-lg cursor-pointer backdrop-blur-md"
          >
            Sign In
          </button>
        </div>

        {/* ── HERO CONTENT centred over the photo ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20 space-y-6 sm:space-y-10">

          {/* 2-Color Split Headline */}
          <h1 className="text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tight leading-[1.1] sm:leading-[1.05] max-w-5xl mx-auto uppercase drop-shadow-2xl break-words">
            <span className="text-[#F5EDE4] block mb-2 sm:mb-3">Des Événements Épiques,</span>
            <span className="text-[#B93A34] block drop-shadow-2xl">Une Vie Étudiante Unique !</span>
          </h1>

          {/* CTA — Warm Crimson Pill button with circular arrow badge (Fixed from blue) */}
          <a
            href="#join"
            className="inline-flex items-center gap-3 sm:gap-4 pl-6 sm:pl-8 pr-2 sm:pr-3 py-2.5 sm:py-3 rounded-full bg-[#B93A34] text-white font-bold text-sm sm:text-base shadow-2xl shadow-[#B93A34]/45 hover:bg-[#E05A52] hover:scale-105 active:scale-95 transition-all duration-300 max-w-full cursor-pointer group"
          >
            <span className="tracking-wide uppercase font-black text-xs sm:text-sm">Rejoindre le Club</span>
            <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#14080F] text-[#F3C4A0] group-hover:text-white group-hover:bg-[#B93A34] flex items-center justify-center font-black text-base sm:text-lg shadow-md shrink-0 transition-colors">
              ↗
            </span>
          </a>
        </div>

        {/* Bottom fade into partners strip */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#140A10] to-transparent pointer-events-none" />
      </section>

      {/* Partners strip sits right below the hero */}
      <PartnersCarousel />
    </>
  );
};
