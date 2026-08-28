import React from 'react';

interface Partner {
  name: string;
  shortName: string;
  svgColor: string;
  SvgIcon: React.FC<{ style?: React.CSSProperties; className?: string }>;
}

const partners: Partner[] = [
  {
    name: 'ESEN Manouba',
    shortName: 'ESEN MANOUBA',
    svgColor: '#F3C4A0',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      </svg>
    ),
  },
  {
    name: 'Red Bull',
    shortName: 'RED BULL',
    svgColor: '#DB0A40',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 48 24" fill="currentColor">
        <ellipse cx="12" cy="12" rx="10" ry="10" fill="#FFCC00" />
        <ellipse cx="36" cy="12" rx="10" ry="10" fill="#DB0A40" />
        <path d="M18 6 Q24 12 18 18" stroke="#fff" strokeWidth="2" fill="none"/>
        <path d="M30 6 Q24 12 30 18" stroke="#fff" strokeWidth="2" fill="none"/>
      </svg>
    ),
  },
  {
    name: 'Orange Tunisie',
    shortName: 'ORANGE',
    svgColor: '#FF6600',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect width="24" height="24" rx="4" fill="#FF6600"/>
        <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="900" fill="white">O</text>
      </svg>
    ),
  },
  {
    name: 'Ooredoo',
    shortName: 'OOREDOO',
    svgColor: '#ED1C24',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#ED1C24"/>
        <circle cx="9" cy="12" r="3.5" fill="white"/>
        <circle cx="15" cy="12" r="3.5" fill="white"/>
      </svg>
    ),
  },
  {
    name: 'IEEE ESEN',
    shortName: 'IEEE ESEN',
    svgColor: '#006699',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.4L20 8.5v7L12 19.6l-8-4.1v-7L12 4.4z"/>
      </svg>
    ),
  },
  {
    name: 'Enactus',
    shortName: 'ENACTUS',
    svgColor: '#FFC20E',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12,2 22,20 2,20" fill="#FFC20E"/>
      </svg>
    ),
  },
  {
    name: 'JCI Manouba',
    shortName: 'JCI MANOUBA',
    svgColor: '#5A459C',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v10M7 12h10"/>
      </svg>
    ),
  },
  {
    name: 'Vercel',
    shortName: 'VERCEL',
    svgColor: '#F5EDE4',
    SvgIcon: ({ style, className }) => (
      <svg style={style} className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L24 22H0L12 2Z"/>
      </svg>
    ),
  },
];

export const PartnersCarousel: React.FC = () => {
  // Triple the array so the infinite loop looks seamless at 40s
  const items = [...partners, ...partners, ...partners];

  return (
    <div className="w-full bg-[#140A10] py-12 border-t border-b border-[#F3C4A0]/15 overflow-hidden">

      {/* Label */}
      <p className="text-center text-[11px] font-black uppercase tracking-[0.32em] text-[#F5EDE4]/35 mb-9">
        Partenaires & Organisations Officielles
      </p>

      {/* Slow scrolling row */}
      <div className="flex w-full overflow-hidden select-none">
        <div className="flex items-center gap-12 sm:gap-16 animate-marquee whitespace-nowrap shrink-0">
          {items.map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              className="group flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all duration-500 cursor-default"
            >
              {/* Icon: grayscale → full brand color on hover */}
              <partner.SvgIcon
                className="w-8 h-8 shrink-0 grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                style={{ color: partner.svgColor }}
              />

              {/* Name: dim → bright on hover */}
              <span className="text-[11px] font-black uppercase tracking-widest text-[#F5EDE4]/30 group-hover:text-[#F5EDE4]/90 transition-all duration-500 whitespace-nowrap">
                {partner.shortName}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
