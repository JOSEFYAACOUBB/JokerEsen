import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { InstagramIcon, LinkedinIcon } from './SocialIcons';

export interface TeamMember {
  id?: string;
  name: string;
  role: string;
  suit: string;
  suitColor: string;
  avatar: string;
  socials: { instagram?: string; linkedin?: string };
}

// No default placeholders — team members are managed entirely from the Admin Panel and persisted via Supabase + localStorage
export const defaultTeamMembers: TeamMember[] = [];

interface TeamProps {
  teamMembers?: TeamMember[];
}

export const Team: React.FC<TeamProps> = ({ teamMembers = [] }) => {
  const members = teamMembers;

  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Drag-to-scroll
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = trackRef.current?.scrollLeft ?? 0;
    if (trackRef.current) trackRef.current.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    const dx = e.clientX - dragStartX.current;
    trackRef.current.scrollLeft = scrollStartX.current - dx;
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (trackRef.current) trackRef.current.style.cursor = 'grab';
  };

  // Touch drag support for mobile devices
  const onTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartX.current = e.touches[0].clientX;
    scrollStartX.current = trackRef.current?.scrollLeft ?? 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    const dx = e.touches[0].clientX - dragStartX.current;
    trackRef.current.scrollLeft = scrollStartX.current - dx;
  };
  const onTouchEnd = () => {
    isDragging.current = false;
  };

  const scrollTo = (index: number) => {
    setActiveIndex(index);
    if (!trackRef.current) return;
    const cards = trackRef.current.querySelectorAll<HTMLElement>('.team-card');
    const card = cards[index];
    if (card) {
      const container = trackRef.current;
      const cardLeft = card.offsetLeft;
      const cardWidth = card.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScroll = cardLeft - (containerWidth / 2) + (cardWidth / 2);
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  };

  const handleNext = () => {
    const nextIndex = (activeIndex + 1) % members.length;
    scrollTo(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (activeIndex - 1 + members.length) % members.length;
    scrollTo(prevIndex);
  };

  return (
    <section id="team" className="py-16 sm:py-24 bg-[#1A0E14] relative overflow-hidden border-b border-[#F3C4A0]/15">

      {/* ── Section Header - Split Placement with Header Controls ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          
          {/* Left Column: Title & Badge */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#4E4F9E]/15 border border-[#4E4F9E]/35 text-[#F3C4A0] text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#4E4F9E] animate-pulse" />
              <span>02 &middot; LEADERSHIP &amp; TALENTS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#F5EDE4] font-display uppercase tracking-tight">
              Le Bureau
            </h2>
            <p className="text-[#F5EDE4]/60 text-xs sm:text-sm max-w-md">
              Les visages, stratèges et créatifs qui font battre le cœur du Joker ESEN.
            </p>
          </div>

          {/* Right Column: Carousel Controls & Counter Pod — only shown when there are members */}
          {members.length > 0 && (
            <div className="flex items-center gap-4 self-start md:self-end bg-white/[0.04] border border-white/10 p-2 sm:p-2.5 rounded-2xl backdrop-blur-md">
              <div className="px-3 text-xs font-black tracking-wider text-[#F3C4A0] font-mono">
                0{activeIndex + 1} <span className="text-white/30">/</span> 0{members.length}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-[#3B66FF] text-white transition-all duration-200 flex items-center justify-center shadow-md active:scale-95"
                  title="Membre précédent"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-[#3B66FF] text-white transition-all duration-200 flex items-center justify-center shadow-md active:scale-95"
                  title="Membre suivant"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Photos Carousel Track ── */}
      <div className="max-w-7xl mx-auto">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="text-5xl mb-4">♠️</div>
            <p className="text-[#F5EDE4]/40 text-sm font-semibold uppercase tracking-widest">
              Bureau Exécutif à configurer
            </p>
            <p className="text-[#F5EDE4]/25 text-xs mt-2 max-w-xs">
              Connectez-vous au panneau d'administration pour ajouter les membres de l’équipe.
            </p>
          </div>
        ) : (
        <div
          ref={trackRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-12 pt-2 sm:pt-4 pb-6 sm:pb-8 scrollbar-none scroll-smooth"
          style={{ cursor: 'grab', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {members.map((member, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={member.name}
                className={`team-card shrink-0 w-[270px] xs:w-[310px] sm:w-[350px] md:w-[360px] rounded-3xl overflow-hidden relative cursor-pointer group transition-all duration-500 border border-[#F3C4A0]/15 shadow-xl ${
                  isActive
                    ? 'h-[460px] sm:h-[520px] md:h-[540px] opacity-100 translate-y-0 grayscale-0'
                    : 'h-[400px] sm:h-[450px] md:h-[460px] opacity-60 translate-y-3 sm:translate-y-5 grayscale-[90%]'
                }`}
                onClick={() => scrollTo(index)}
              >
                {/* Photo */}
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  draggable={false}
                />

                {/* Suit badge — top left */}
                {isActive && (
                  <div
                    className="absolute top-4 left-4 w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black shadow-lg"
                    style={{ background: 'rgba(26,14,20,0.85)', color: member.suitColor, border: `1.5px solid ${member.suitColor}65` }}
                  >
                    {member.suit}
                  </div>
                )}

                {/* Bottom info strip */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-5 sm:px-6 pb-5 sm:pb-6 pt-14 sm:pt-16"
                  style={{
                    background: 'linear-gradient(to top, rgba(26,14,20,0.98) 60%, transparent)',
                  }}
                >
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1"
                     style={{ color: member.suitColor }}>
                    {member.role}
                  </p>
                  <h3 className="text-lg sm:text-2xl font-black text-[#F5EDE4] font-display uppercase leading-tight">
                    {member.name}
                  </h3>

                  {/* Social links — only visible on active */}
                  {isActive && (
                    <div className="flex gap-2.5 mt-3">
                      <a
                        href={member.socials?.instagram || '#'}
                        className="p-2.5 rounded-full bg-white/10 text-[#F5EDE4] hover:bg-[#B93A34] transition-colors border border-white/10"
                        title="Instagram"
                        onClick={e => e.stopPropagation()}
                      >
                        <InstagramIcon className="w-4 h-4" />
                      </a>
                      <a
                        href={member.socials?.linkedin || '#'}
                        className="p-2.5 rounded-full bg-white/10 text-[#F5EDE4] hover:bg-[#4E4F9E] transition-colors border border-white/10"
                        title="LinkedIn"
                        onClick={e => e.stopPropagation()}
                      >
                        <LinkedinIcon className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* ── Navigation Controls (Prev / Next & Dots) — only when members exist ── */}
      {members.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handlePrev}
            className="w-11 h-11 rounded-full bg-[#EEF2FF] text-[#3B66FF] hover:bg-[#3B66FF] hover:text-white transition-all duration-300 shadow-md flex items-center justify-center"
            title="Précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {members.map((member, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                aria-label={`Aller au membre ${index + 1} : ${member.name}`}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: index === activeIndex ? '28px' : '8px',
                  height: '8px',
                  background: index === activeIndex ? '#3B66FF' : 'rgba(245,237,228,0.25)',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-11 h-11 rounded-full bg-[#EEF2FF] text-[#3B66FF] hover:bg-[#3B66FF] hover:text-white transition-all duration-300 shadow-md flex items-center justify-center"
            title="Suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

    </section>
  );
};
