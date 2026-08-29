import React from 'react';
import { Logo } from './Logo';

interface FooterProps {
  onOpenAdmin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'À Propos', href: '#about' },
    { label: 'Le Bureau', href: '#team' },
    { label: 'Événements', href: '#event' },
    { label: 'Galerie', href: '#gallery' },
    { label: 'Rejoindre', href: '#join' },
    { label: 'Mentions Légales', href: '#' },
    { label: 'Confidentialité', href: '#' },
  ];

  return (
    <footer className="w-full">
      {/* ── Main Footer Card Section ── */}
      <div className="bg-[#F8FAFC] py-12 sm:py-20 px-4 sm:px-6 lg:px-8 text-center border-t border-slate-200">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          
          {/* Logo Centered at Top (Only pure logo, no text, no box) */}
          <div className="flex justify-center">
            <a href="#" className="inline-block transition-transform duration-300 hover:scale-105">
              <Logo size="lg" showText={false} />
            </a>
          </div>

          {/* Bold Centered Tagline with Electric Blue Highlight */}
          <h2
            className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] uppercase tracking-tight leading-tight max-w-3xl mx-auto"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif" }}
          >
            Fais bouger la vie étudiante avec <span className="text-[#3B66FF]">JokerEsen</span>
          </h2>

          {/* Horizontal Navigation Links Row */}
          <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-2.5 sm:gap-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#475569] hover:text-[#3B66FF] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#EEF2FF] text-[#1A3FBF] hover:bg-[#3B66FF] hover:text-white transition-all duration-200 font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-sm"
              >
                Accès Admin
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── Accent Color Top Line ── */}
      <div className="h-1 w-full bg-[#3B66FF]" />

      {/* ── Dark Bottom Base Bar ── */}
      <div className="bg-[#0B0F19] py-6 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium text-center sm:text-left">
          <p>© 2016-2026 JokerEsen — Tous droits réservés. Élaboré avec passion à l'ESEN Manouba.</p>

          <button
            onClick={scrollToTop}
            className="px-5 sm:px-6 py-1.5 sm:py-2 rounded-full bg-[#EEF2FF] text-[#1A3FBF] hover:bg-[#3B66FF] hover:text-white transition-all duration-200 font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 shrink-0"
          >
            Haut de page ↑
          </button>
        </div>
      </div>
    </footer>
  );
};

