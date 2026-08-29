import React, { useState, useEffect } from 'react';
import type { Partner } from '../types/database';
import { fetchPartners, defaultPartners } from '../services/partnersService';

// Built-in vector icons for common partners (crisp vector render)
const builtInIcons: Record<string, React.FC<{ style?: React.CSSProperties; className?: string }>> = {
  'esen': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
    </svg>
  ),
  'redbull': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 48 24" fill="currentColor">
      <ellipse cx="12" cy="12" rx="10" ry="10" fill="#FFCC00" />
      <ellipse cx="36" cy="12" rx="10" ry="10" fill="#DB0A40" />
      <path d="M18 6 Q24 12 18 18" stroke="#fff" strokeWidth="2" fill="none"/>
      <path d="M30 6 Q24 12 30 18" stroke="#fff" strokeWidth="2" fill="none"/>
    </svg>
  ),
  'orange': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect width="24" height="24" rx="4" fill="#FF6600"/>
      <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="900" fill="white">O</text>
    </svg>
  ),
  'ooredoo': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="#ED1C24"/>
      <circle cx="9" cy="12" r="3.5" fill="white"/>
      <circle cx="15" cy="12" r="3.5" fill="white"/>
    </svg>
  ),
  'ieee': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.4L20 8.5v7L12 19.6l-8-4.1v-7L12 4.4z"/>
    </svg>
  ),
  'enactus': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12,2 22,20 2,20" fill="#FFC20E"/>
    </svg>
  ),
  'jci': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v10M7 12h10"/>
    </svg>
  ),
  'vercel': ({ style, className }) => (
    <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L24 22H0L12 2Z"/>
    </svg>
  ),
};

interface PartnersCarouselProps {
  partnersList?: Partner[];
}

export const PartnersCarousel: React.FC<PartnersCarouselProps> = ({ partnersList }) => {
  const [partners, setPartners] = useState<Partner[]>(partnersList || defaultPartners);

  useEffect(() => {
    if (partnersList) {
      setPartners(partnersList);
      return;
    }

    async function loadPartners() {
      try {
        const data = await fetchPartners();
        if (data && data.length > 0) {
          setPartners(data);
        }
      } catch (e) {
        console.warn('Failed to load partners from Supabase:', e);
      }
    }

    loadPartners();
  }, [partnersList]);

  if (partners.length === 0) return null;

  // Repeat the array so the infinite loop looks continuous
  const items =
    partners.length < 5
      ? [...partners, ...partners, ...partners, ...partners]
      : [...partners, ...partners, ...partners];

  return (
    <div className="w-full bg-[#140A10] py-14 border-t border-b border-[#F3C4A0]/15 overflow-hidden relative">
      {/* Subtle background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 pointer-events-none blur-3xl opacity-15"
        style={{ background: 'radial-gradient(ellipse, #B93A34 0%, transparent 70%)' }}
      />

      {/* Label */}
      <p className="text-center text-[11px] font-black uppercase tracking-[0.35em] text-[#F5EDE4]/65 mb-10">
        Partenaires &amp; Organisations Officielles
      </p>

      {/* Slow scrolling marquee with hover pause */}
      <div className="flex w-full overflow-hidden select-none py-4">
        <div className="flex items-center gap-14 sm:gap-20 animate-marquee whitespace-nowrap shrink-0 hover:[animation-play-state:paused]">
          {items.map((partner, index) => {
            const keyId = partner.id?.toLowerCase() || partner.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const BuiltInIcon = builtInIcons[keyId];
            const displayName = partner.name || partner.short_name;

            return (
              <div
                key={`${partner.name}-${index}`}
                className="group relative flex items-center justify-center p-3 rounded-2xl transition-all duration-300 cursor-pointer"
              >
                {/* ── BIGGER LOGO CONTAINER ── */}
                <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 transition-all duration-500 transform group-hover:scale-125 group-hover:-translate-y-1">
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={displayName}
                      className="w-full h-full object-contain filter grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 drop-shadow-md"
                    />
                  ) : BuiltInIcon ? (
                    <BuiltInIcon
                      className="w-12 h-12 sm:w-14 sm:h-14 filter grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                      style={{ color: partner.svg_color || '#F3C4A0' }}
                    />
                  ) : (
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl border border-white/10 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 shadow-inner"
                      style={{
                        backgroundColor: `${partner.svg_color || '#F3C4A0'}25`,
                        color: partner.svg_color || '#F3C4A0',
                        borderColor: `${partner.svg_color || '#F3C4A0'}40`,
                      }}
                    >
                      {partner.short_name?.charAt(0) || partner.name.charAt(0)}
                    </div>
                  )}

                  {/* Dynamic Color Glow on Hover */}
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none -z-10"
                    style={{ backgroundColor: partner.svg_color || '#F3C4A0' }}
                  />
                </div>

                {/* ── INTERACTIVE FLOATING TOOLTIP ON HOVER ── */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-30 flex flex-col items-center">
                  {/* Tooltip triangle arrow */}
                  <div
                    className="w-2 h-2 rotate-45 mb-[-4px] z-10"
                    style={{ backgroundColor: '#1F0E18', borderTop: '1px solid rgba(243,196,160,0.3)', borderLeft: '1px solid rgba(243,196,160,0.3)' }}
                  />
                  {/* Tooltip body */}
                  <div
                    className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap shadow-2xl backdrop-blur-md"
                    style={{
                      backgroundColor: '#1F0E18',
                      border: '1px solid rgba(243,196,160,0.3)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                    }}
                  >
                    <span style={{ color: partner.svg_color || '#F3C4A0' }} className="mr-1.5 font-bold">●</span>
                    <span>{displayName}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PartnersCarousel;
