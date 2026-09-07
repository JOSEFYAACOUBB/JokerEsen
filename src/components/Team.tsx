import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { InstagramIcon, LinkedinIcon } from './SocialIcons';
import { getCachedClubSocials } from '../services/settingsService';
import { optimizeCloudinaryUrl } from '../lib/cloudinary';

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
      className="py-16 sm:py-24 bg-[#FAF7F5] text-[#2A2020] relative overflow-hidden border-b border-[#E5DDD7]"
    >
      {/* Dot-grid texture background — Global Rule 5 */}
      <div className="dot-grid opacity-20 pointer-events-none" aria-hidden="true" />

      {/* ── Section Header - Standardized Left Aligned (Royal Blue Accent #4B5B9E) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-12 relative animate-fade-up">
        {/* Faded section numeral — Global Rule 4 */}
        <div className="section-numeral numeral-s2" aria-hidden="true">02</div>
        {/* Soft blue glow behind headline — Global Rule 4 */}
        <div className="section-glow glow-s2" aria-hidden="true" />

        <div className="flex flex-col items-start justify-start gap-3 relative z-10">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="chapter-badge chapter-badge-s2 shrink-0">
              <span className="chapter-badge-dot" />
              <span>02 &middot; LEADERSHIP &amp; TALENTS</span>
            </div>
            <h2 className="section-headline headline-s2">
              LE BUREAU EXÉCUTIF
            </h2>
          </div>

          <p className="section-subtitle">
            Les visages, stratèges et créatifs qui font battre le cœur du Joker ESEN.
          </p>
        </div>
      </div>

      {/* ── Photos Carousel Track ── */}
      <div className="max-w-7xl mx-auto">
        {members.length === 0 ? (
          /* Empty State Fallback (Global Rule 4) */
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-[#FFFFFF] border border-[#EDE4DE] shadow-[0_4px_16px_rgba(43,15,18,0.08)] rounded-3xl max-w-xl mx-auto animate-fade-up">
            <div className="text-4xl sm:text-5xl mb-3 select-none text-[#4B5B9E]">&#9824;&#65039;</div>
            <p className="text-[#2A2020] text-sm sm:text-base font-bold uppercase tracking-wider font-display">
              Bureau Exécutif à configurer
            </p>
            <p className="section-subtitle text-[#5C1F2E] text-xs mt-2 max-w-sm leading-relaxed">
              Connectez-vous au panneau d&apos;administration pour ajouter les membres de l&apos;équipe.
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
              const suitColor = '#4B5B9E'; // Royal Blue per member card (Section 02 rule)
              const clubSocials = getCachedClubSocials();
              const instaUrl = member.socials?.instagram && member.socials.instagram !== '#' && member.socials.instagram.trim() !== ''
                ? member.socials.instagram
                : (clubSocials.instagram || 'https://www.instagram.com/joker_esen/');
              const linkedinUrl = member.socials?.linkedin && member.socials.linkedin !== '#' && member.socials.linkedin.trim() !== ''
                ? member.socials.linkedin
                : (clubSocials.linkedin || 'https://www.linkedin.com/company/jokeresen/');

              return (
                <div
                  key={member.name}
                  className={`team-card shrink-0 w-[270px] xs:w-[310px] sm:w-[350px] md:w-[360px] rounded-3xl overflow-hidden relative cursor-pointer group transition-all duration-200 bg-[#FFFFFF] animate-fade-up stagger-${(index % 4) + 1} ${
                    isActive
                      ? 'h-[460px] sm:h-[520px] md:h-[540px] opacity-100 translate-y-0 grayscale-0 shadow-[0_12px_32px_rgba(43,15,18,0.18)] border-2 border-[#4B5B9E]'
                      : 'h-[400px] sm:h-[450px] md:h-[460px] opacity-70 translate-y-3 sm:translate-y-4 grayscale-[40%] shadow-[0_4px_16px_rgba(43,15,18,0.08)] border border-[#EDE4DE]'
                  }`}
                  onClick={() => scrollTo(index)}
                >
                  {/* Photo */}
                  <img
                    src={optimizeCloudinaryUrl(member.avatar, { width: 380, quality: 'auto' }) || member.avatar}
                    alt={member.name}
                    width={360}
                    height={540}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />

                  {/* Royal Blue Card-Suit Badge top left (Section 02) */}
                  <div
                    className="absolute top-4 left-4 w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black shadow-md bg-white border border-[#4B5B9E]/40 badge-shadow"
                    style={{ color: suitColor }}
                  >
                    {suitSymbol}
                  </div>

                  {/* Bottom info strip with 65% opacity overlay (Section 02 overlay tuning) */}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-5 sm:px-6 pb-5 sm:pb-6 pt-14 sm:pt-16"
                    style={{
                      background: 'linear-gradient(to top, rgba(43,15,18,0.92) 50%, rgba(43,15,18,0.65) 80%, transparent)',
                    }}
                  >
                    <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 text-[#C8D4F0]">
                      <span>{suitSymbol}</span>
                      <span>{member.role}</span>
                    </p>
                    <h3 className="text-lg sm:text-2xl font-black text-[#FFFFFF] font-display uppercase leading-tight">
                      {member.name}
                    </h3>

                    {/* Social links */}
                    {isActive && (
                      <div className="flex gap-2.5 mt-3">
                        <a
                          href={instaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-full bg-white/20 text-white hover:bg-[#4B5B9E] hover:text-white transition-colors border border-white/30 cursor-pointer"
                          title={`Instagram - ${member.name}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <InstagramIcon className="w-4 h-4" />
                        </a>
                        <a
                          href={linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-full bg-white/20 text-white hover:bg-[#4B5B9E] hover:text-white transition-colors border border-white/30 cursor-pointer"
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

      {/* ── Navigation Controls (High contrast arrows & Amber dots) — only when > 1 member (Global Rule 4) ── */}
      {members.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handlePrev}
            className="w-11 h-11 rounded-full bg-[#4B5B9E] text-white hover:bg-[#3A4A8D] hover:scale-105 transition-all duration-200 shadow-[0_4px_16px_rgba(43,15,18,0.12)] flex items-center justify-center cursor-pointer active:scale-95"
            title="Précédent"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-1">
            {members.map((member, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                aria-label={`Aller au membre ${index + 1} : ${member.name}`}
                className="p-3 flex items-center justify-center cursor-pointer -m-1"
              >
                <span
                  className="transition-all duration-200 rounded-full block"
                  style={{
                    width: index === activeIndex ? '28px' : '8px',
                    height: '8px',
                    background: index === activeIndex ? '#4B5B9E' : 'rgba(75, 91, 158, 0.3)',
                  }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-11 h-11 rounded-full bg-[#4B5B9E] text-white hover:bg-[#3A4A8D] hover:scale-105 transition-all duration-200 shadow-[0_4px_16px_rgba(43,15,18,0.12)] flex items-center justify-center cursor-pointer active:scale-95"
            title="Suivant"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

    </section>
  );
};
