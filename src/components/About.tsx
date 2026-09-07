import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Heart, MapPin, Sparkles, Star } from 'lucide-react';
import type { AboutData } from '../types/database';
import { fetchAboutData, defaultAboutData } from '../services/aboutService';

const iconMap: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  Calendar,
  Users,
  Trophy,
  Heart,
  Sparkles,
  Star,
};

interface AboutProps {
  initialData?: AboutData;
}

export const About: React.FC<AboutProps> = ({ initialData }) => {
  const [activeSuit, setActiveSuit] = useState<string>('all');
  const [data, setData] = useState<AboutData>(initialData || defaultAboutData);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }

    async function loadData() {
      try {
        const res = await fetchAboutData();
        if (res) {
          setData(res);
        }
      } catch (err) {
        console.warn('Error loading About data from Supabase:', err);
      }
    }

    loadData();
  }, [initialData]);

  const pillars = data.pillars || defaultAboutData.pillars;
  const stats = data.stats || defaultAboutData.stats;

  return (
    <section
      id="about"
      className="py-16 sm:py-24 bg-[#FAF7F5] text-[#2A2020] relative overflow-hidden border-b border-[#EDE4DE]"
    >
      {/* Dot-grid texture in upper background zone */}
      <div className="dot-grid" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── Section Header (Crimson Red Accent #A73541) ── */}
        <div className="relative flex flex-col items-start justify-start gap-4 mb-12 sm:mb-16 animate-fade-up">
          {/* Faded background numeral — Global Rule 4 */}
          <span className="section-numeral numeral-s1" aria-hidden="true">01</span>
          {/* Soft red glow behind headline — Global Rule 4 */}
          <div className="section-glow glow-s1" aria-hidden="true" />

          <div className="chapter-badge chapter-badge-s1 relative z-10">
            <span className="chapter-badge-dot" />
            <span>{data.badge || '01 · QUI SOMMES-NOUS'}</span>
          </div>

          <h2 className="section-headline headline-s1 max-w-3xl relative z-10">
            {data.title_prefix || "Plus Qu'Un Club, "}
            <span>
              {data.title_highlight || 'Une Aventure Humaine.'}
            </span>
          </h2>

          <p className="section-subtitle relative z-10">
            Fondé en 2016 à l'ESEN Manouba, nous faisons vibrer le campus à travers des événements uniques et une vraie synergie d'équipe.
          </p>
        </div>

        {/* ── BENTO GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

          {/* CARD 1: Main Story (Elevation 2 — featured, shadow only) */}
          <div
            className="lg:col-span-2 lg:row-span-2 group relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-10 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(43,15,18,0.16)] bg-[#FFFFFF] shadow-[0_8px_28px_rgba(43,15,18,0.12)] animate-fade-up stagger-1"
          >
            {/* Background image overlay with functional light text readability gradient */}
            <div className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=70&w=680"
                alt="JokerEsen Team"
                width={680}
                height={380}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF]/80 to-transparent" />
            </div>

            {/* Content Top */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-[#A73541]/10 text-[#A73541] border border-[#A73541]/30 badge-shadow">
                  {data.story_badge || '♠ Notre Histoire'}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-[#2A2020]/70 font-bold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-[#A73541]" />
                  {data.story_location || 'ESEN Manouba'}
                </div>
              </div>

              <h3 className="text-xl sm:text-3xl lg:text-4xl font-black text-[#2A2020] font-display uppercase leading-tight pt-2">
                {data.story_heading || "Éveiller l'énergie créative de chaque étudiant."}
              </h3>

              <p className="text-xs sm:text-sm md:text-base text-[#2A2020]/80 leading-relaxed pt-1">
                {data.story_text || (
                  <>
                    Fondé en <strong className="text-[#A73541] font-bold">{data.founded_year || '2016'}</strong> au sein de l'École Supérieure d'Économie Numérique, <strong className="text-[#A73541]">JokerEsen</strong> tire son nom du Joker — symbole d'imprévisibilité joyeuse et d'atout gagnant. Notre mission est de faire vibrer le campus à travers des soirées mythiques, des projets ambitieux et une véritable synergie d'équipe.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* CARD 2: Stats Grid with Visual Hierarchy (Emphasize 500+ & 50+ / De-emphasize 2016 & 100%) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
            {stats.map((stat, idx) => {
              const IconComp = (stat.icon && iconMap[stat.icon]) || Trophy;
              // Strong headline stats: "500+" and "50+"
              const isHeadlineStat = stat.number.includes('500') || stat.number.includes('50+') || stat.number.includes('99+') || stat.number.includes('70+');

              return (
                <div
                  key={stat.id || `${stat.label}-${idx}`}
                  className={`group relative rounded-3xl p-4 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 overflow-hidden bg-[#FFFFFF] border border-[#EDE4DE] shadow-[0_4px_16px_rgba(43,15,18,0.08)] hover:shadow-[0_12px_32px_rgba(43,15,18,0.16)] animate-fade-up stagger-${idx + 2} ${
                    isHeadlineStat ? 'ring-2 ring-[#A73541]/25' : 'opacity-90'
                  }`}
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 transition-transform duration-200 group-hover:scale-105"
                    style={{
                      background: 'rgba(167, 53, 65, 0.08)',
                      border: '1px solid rgba(167, 53, 65, 0.25)',
                    }}
                  >
                    <IconComp className="w-4 h-4 sm:w-5 sm:h-5 text-[#A73541]" />
                  </div>

                  <div>
                    <h4
                      className={`font-display uppercase tracking-tight ${
                        isHeadlineStat
                          ? 'text-4xl sm:text-5xl font-black text-[#A73541]'
                          : 'text-2xl sm:text-3xl font-bold text-[#2A2020]/75'
                      }`}
                    >
                      {stat.number}
                    </h4>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#2A2020]/70 mt-1">
                      {stat.label}
                    </p>
                  </div>

                  {/* Corner Suit Accent watermark in Crimson Red */}
                  <div
                    className="absolute top-2 right-2 text-2xl select-none pointer-events-none text-[#A73541] opacity-[0.12] group-hover:opacity-[0.25] transition-opacity"
                  >
                    {['♠', '♥', '♦', '♣'][idx % 4]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CARD 3: Pillars & Suits Interactive Showcase (4 Value Cards in Coral Accent) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">
            {pillars.map((pillar, idx) => {
              const isHovered = activeSuit === pillar.id;
              // Stagger every other card downward (Global Rule 5)
              const isEvenCard = idx % 2 === 1;

              return (
                <div
                  key={pillar.id || pillar.name}
                  onMouseEnter={() => setActiveSuit(pillar.id)}
                  onMouseLeave={() => setActiveSuit('all')}
                  className={`group relative rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden min-h-[190px] sm:min-h-[220px] bg-[#FFFFFF] animate-fade-up stagger-${(idx % 4) + 1}${isEvenCard ? ' card-stagger-even' : ''}`}
                  style={{
                    border: isHovered
                      ? '1.5px solid #A73541'
                      : '1px solid #EDE4DE',
                    boxShadow: isHovered
                      ? '0 12px 32px rgba(43, 15, 18, 0.16)'
                      : '0 4px 16px rgba(43, 15, 18, 0.08)',
                    transform: isHovered ? 'translateY(-4px)' : (isEvenCard ? 'translateY(28px)' : 'none'),
                  }}
                >
                  {/* Suit watermark — enlarged for Global Rule 7 */}
                  <div
                    className="absolute -right-3 -bottom-5 text-9xl font-black select-none pointer-events-none transition-opacity duration-200 text-[#A73541]"
                    style={{
                      opacity: isHovered ? 0.28 : 0.10,
                    }}
                  >
                    {pillar.suit}
                  </div>

                  {/* Top Bar */}
                  <div className="flex justify-between items-center mb-4">
                    <span
                      className="text-2xl font-black text-[#A73541]"
                    >
                      {pillar.suit}
                    </span>

                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-[#A73541] bg-[#A73541]/08 border border-[#A73541]/25 badge-shadow"
                    >
                      {pillar.name}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="relative z-10 space-y-2">
                    <h4 className="text-lg sm:text-xl font-black text-[#2A2020] font-display uppercase tracking-wide group-hover:text-[#A73541] transition-colors">
                      {pillar.title}
                    </h4>

                    <p className="text-xs text-[#2A2020]/75 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>

                  {/* Bottom Indicator line — only visible on hover, never persists (fixes BÉNÉVOLAT stuck state) */}
                  <div
                    className="h-0.5 w-0 group-hover:w-full rounded-full transition-all duration-300 mt-4 bg-[#A73541]"
                  />
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};

export default About;
