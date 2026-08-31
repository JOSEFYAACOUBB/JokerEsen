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
    <section
      id="team"
      className="py-16 sm:py-24 bg-[#190D15] relative overflow-hidden border-b border-[#F3C4A0]/15"
    >
      {/* ── Section Header - Standardized Left Aligned (Global Rules 1 & 2) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-12 animate-fade-up">
        <div className="flex flex-col items-start justify-start gap-4">
          <div className="chapter-badge">
            <span className="chapter-badge-dot" />
            <span>02 &middot; LEADERSHIP &amp; TALENTS</span>
          </div>

          <h2 className="section-headline">
            Le Bureau Exécutif
          </h2>

          <p className="text-[#F5EDE4]/85 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed">
            Les visages, stratèges et créatifs qui font battre le cœur du Joker ESEN.
          </p>
        </div>
      </div>

      {/* ── Photos Carousel Track ── */}
      <div className="max-w-7xl mx-auto">
        {members.length === 0 ? (
          /* Empty State (Global Rule 4) */
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-[#140B10] border border-[#F3C4A0]/18 rounded-3xl max-w-xl mx-auto animate-fade-up">
            <div className="text-4xl sm:text-5xl mb-3 select-none text-[#F3C4A0]/50">♠️</div>
            <p className="text-[#F5EDE4] text-sm sm:text-base font-bold uppercase tracking-wider font-display">
              Bureau Exécutif à configurer
            </p>
            <p className="text-[#F5EDE4]/65 text-xs mt-2 max-w-sm leading-relaxed">
              Connectez-vous au panneau d'administration pour ajouter les membres de l’équipe.
            </p>
          </div>
        ) : (
          <div
            ref={trackRef}
            className={`flex gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-12 pt-2 sm:pt-4 pb-6 sm:pb-8 scrollbar-none scroll-smooth ${
              members.length === 1 ? 'justify-center' : ''
            }`}
            style={{ cursor: members.length > 1 ? 'grab' : 'default', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseDown={members.length > 1 ? onMouseDown : undefined}
            onMouseMove={members.length > 1 ? onMouseMove : undefined}
            onMouseUp={members.length > 1 ? onMouseUp : undefined}
            onMouseLeave={members.length > 1 ? onMouseUp : undefined}
            onTouchStart={members.length > 1 ? onTouchStart : undefined}
            onTouchMove={members.length > 1 ? onTouchMove : undefined}
            onTouchEnd={members.length > 1 ? onTouchEnd : undefined}
          >
            {members.map((member, index) => {
              const isActive = index === activeIndex || members.length === 1;
              const suitSymbol = ['♠', '♥', '♦', '♣'][index % 4];
              const suitColor = member.suitColor || (index % 2 === 0 ? '#B93A34' : '#F3BB99');
              const instaUrl = member.socials?.instagram && member.socials.instagram !== '#'
                ? member.socials.instagram
                : 'https://www.instagram.com/joker_esen/';
              const linkedinUrl = member.socials?.linkedin && member.socials.linkedin !== '#'
                ? member.socials.linkedin
                : 'https://www.linkedin.com/company/club-joker-esen/';

              return (
                <div
                  key={member.name}
                  className={`team-card shrink-0 w-[270px] xs:w-[310px] sm:w-[350px] md:w-[360px] rounded-3xl overflow-hidden relative cursor-pointer group transition-all duration-400 border border-[#F3C4A0]/18 shadow-xl bg-[#140B10] animate-fade-up stagger-${(index % 4) + 1} ${
                    isActive
                      ? 'h-[460px] sm:h-[520px] md:h-[540px] opacity-100 translate-y-0 grayscale-0 border-[#B93A34]/50'
                      : 'h-[400px] sm:h-[450px] md:h-[460px] opacity-60 translate-y-3 sm:translate-y-5 grayscale-[80%]'
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

                  {/* Suit badge top left (Global Rule 5) */}
                  <div
                    className="absolute top-4 left-4 w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black shadow-lg"
                    style={{ background: 'rgba(20,11,16,0.9)', color: suitColor, border: `1.5px solid ${suitColor}60` }}
                  >
                    {suitSymbol}
                  </div>

                  {/* Bottom info strip with readability overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-5 sm:px-6 pb-5 sm:pb-6 pt-14 sm:pt-16"
                    style={{
                      background: 'linear-gradient(to top, rgba(20,11,16,0.98) 60%, transparent)',
                    }}
                  >
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5"
                       style={{ color: suitColor }}>
                      <span>{suitSymbol}</span>
                      <span>{member.role}</span>
                    </p>
                    <h3 className="text-lg sm:text-2xl font-black text-[#F5EDE4] font-display uppercase leading-tight">
                      {member.name}
                    </h3>

                    {/* Social links */}
                    {isActive && (
                      <div className="flex gap-2.5 mt-3">
                        <a
                          href={instaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-full bg-white/10 text-[#F5EDE4] hover:bg-[#B93A34] hover:text-white transition-colors border border-white/15 cursor-pointer"
                          title={`Instagram - ${member.name}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <InstagramIcon className="w-4 h-4" />
                        </a>
                        <a
                          href={linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-full bg-white/10 text-[#F5EDE4] hover:bg-[#B93A34] hover:text-white transition-colors border border-white/15 cursor-pointer"
                          title={`LinkedIn - ${member.name}`}
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

      {/* ── Navigation Controls (Prev / Next & Dots) — only when > 1 member (Global Rule 4) ── */}
      {members.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handlePrev}
            className="w-11 h-11 rounded-full bg-[#B93A34] text-white hover:bg-[#F3BB99] hover:text-[#14080F] transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer active:scale-95"
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
                className="transition-all duration-300 rounded-full cursor-pointer"
                style={{
                  width: index === activeIndex ? '28px' : '8px',
                  height: '8px',
                  background: index === activeIndex ? '#B93A34' : 'rgba(243,196,160,0.25)',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-11 h-11 rounded-full bg-[#B93A34] text-white hover:bg-[#F3BB99] hover:text-[#14080F] transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer active:scale-95"
            title="Suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

    </section>
  );
};
