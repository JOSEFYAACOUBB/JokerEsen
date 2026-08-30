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
      className="py-16 sm:py-24 bg-[#140B10] relative overflow-hidden border-b border-[#F3C4A0]/15"
    >
      {/* Background Decorative Glow Blobs */}
      <div
        className="absolute top-1/3 left-10 w-96 h-96 rounded-full pointer-events-none blur-[120px]"
        style={{ background: 'rgba(185,58,52,0.08)' }}
      />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 rounded-full pointer-events-none blur-[140px]"
        style={{ background: 'rgba(78,79,158,0.08)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header - Editorial Asymmetrical Placement */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 mb-12 sm:mb-16">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#B93A34]/15 border border-[#B93A34]/35 text-[#F3C4A0] text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#B93A34] animate-pulse" />
              <span>{data.badge || '01 · QUI SOMMES-NOUS'}</span>
            </div>
            <h2
              className="font-black uppercase text-[#F5EDE4] leading-[1.05]"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif",
                fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
                letterSpacing: '-0.02em',
              }}
            >
              {data.title_prefix || "Plus Qu'Un Club, "}
              <span
                style={{
                  background: 'linear-gradient(90deg, #F3C4A0, #B93A34)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {data.title_highlight || 'Une Aventure Humaine.'}
              </span>
            </h2>
          </div>
        </div>

        {/* ── BENTO GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

          {/* CARD 1: Main Story */}
          <div
            className="lg:col-span-2 lg:row-span-2 group relative rounded-3xl overflow-hidden p-6 sm:p-8 md:p-10 flex flex-col justify-between transition-all duration-500 hover:border-[#B93A34]/50"
            style={{
              background: 'linear-gradient(145deg, rgba(37,18,27,0.9), rgba(26,14,20,0.95))',
              border: '1.5px solid rgba(243,196,160,0.18)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Background image overlay */}
            <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none">
              <img
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000"
                alt="JokerEsen Team"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A0E14] via-[#1A0E14]/70 to-transparent" />
            </div>

            {/* Content Top */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
                  style={{
                    background: 'rgba(185,58,52,0.2)',
                    color: '#F3C4A0',
                    border: '1px solid rgba(185,58,52,0.4)',
                  }}
                >
                  {data.story_badge || '♠ Notre Histoire'}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-[#F3C4A0]/60 font-bold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-[#B93A34]" />
                  {data.story_location || 'ESEN Manouba'}
                </div>
              </div>

              <h3 className="text-xl sm:text-3xl lg:text-4xl font-black text-[#F5EDE4] font-display uppercase leading-tight pt-2">
                {data.story_heading || "Éveiller l'énergie créative de chaque étudiant."}
              </h3>

              <p className="text-xs sm:text-sm md:text-base text-[#F5EDE4]/75 leading-relaxed pt-1">
                {data.story_text || (
                  <>
                    Fondé en <strong className="text-[#F3C4A0] font-bold">{data.founded_year || '2016'}</strong> au sein de l'École Supérieure d'Économie Numérique, <strong className="text-[#B93A34]">JokerEsen</strong> tire son nom du Joker — symbole d'imprévisibilité joyeuse et d'atout gagnant. Notre mission est de faire vibrer le campus à travers des soirées mythiques, des projets ambitieux et une véritable synergie d'équipe.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* CARD 2: Stats Grid (2x2 mini Bento box) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
            {stats.map((stat, idx) => {
              const IconComp = (stat.icon && iconMap[stat.icon]) || Trophy;
              return (
                <div
                  key={stat.id || `${stat.label}-${idx}`}
                  className="group relative rounded-3xl p-4 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  style={{
                    background: 'rgba(37,18,27,0.75)',
                    border: '1.5px solid rgba(243,196,160,0.15)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `${stat.color}18`,
                      border: `1px solid ${stat.color}35`,
                    }}
                  >
                    <IconComp className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: stat.color }} />
                  </div>

                  <div>
                    <h4
                      className="text-2xl sm:text-4xl font-black font-display uppercase tracking-tight"
                      style={{ color: stat.color }}
                    >
                      {stat.number}
                    </h4>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#F5EDE4]/60 mt-1">
                      {stat.label}
                    </p>
                  </div>

                  {/* Corner Accent */}
                  <div
                    className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{
                      background: `radial-gradient(circle at 100% 0%, ${stat.color}, transparent 70%)`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* CARD 3: Pillars & Suits Interactive Showcase */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">
            {pillars.map((pillar) => {
              const isHovered = activeSuit === pillar.id;
              const glow = pillar.bgGlow || `${pillar.color}25`;

              return (
                <div
                  key={pillar.id || pillar.name}
                  onMouseEnter={() => setActiveSuit(pillar.id)}
                  onMouseLeave={() => setActiveSuit('all')}
                  className="group relative rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-500 cursor-pointer overflow-hidden min-h-[190px] sm:min-h-[220px]"
                  style={{
                    background: 'rgba(26,14,20,0.85)',
                    border: isHovered
                      ? `1.5px solid ${pillar.color}`
                      : '1.5px solid rgba(243,196,160,0.15)',
                    boxShadow: isHovered
                      ? `0 12px 30px ${glow}`
                      : 'none',
                    transform: isHovered ? 'translateY(-4px)' : 'none',
                  }}
                >
                  {/* Suit watermark */}
                  <div
                    className="absolute -right-2 -bottom-4 text-7xl font-black select-none pointer-events-none transition-opacity duration-300"
                    style={{
                      color: pillar.color,
                      opacity: isHovered ? 0.25 : 0.08,
                    }}
                  >
                    {pillar.suit}
                  </div>

                  {/* Top Bar */}
                  <div className="flex justify-between items-center mb-4">
                    <span
                      className="text-2xl font-black"
                      style={{ color: pillar.color }}
                    >
                      {pillar.suit}
                    </span>

                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider"
                      style={{
                        background: `${pillar.color}35`,
                        color: pillar.color,
                        border: `1px solid ${pillar.color}60`,
                      }}
                    >
                      {pillar.name}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="relative z-10 space-y-2">
                    <h4 className="text-lg sm:text-xl font-black text-[#F5EDE4] font-display uppercase tracking-wide group-hover:text-[#F3C4A0] transition-colors">
                      {pillar.title}
                    </h4>

                    <p className="text-xs text-[#F5EDE4]/70 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>

                  {/* Bottom Indicator line */}
                  <div
                    className="h-1 w-0 group-hover:w-full rounded-full transition-all duration-500 mt-4"
                    style={{ background: pillar.color }}
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
