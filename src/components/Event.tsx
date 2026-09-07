import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  User,
  Mail,
  X,
  Info,
  Bell,
  History,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check
} from 'lucide-react';

import { getCachedAllEvents } from '../services/eventService';
import { subscribeToNewsletter } from '../services/brevoService';
import { optimizeCloudinaryUrl } from '../lib/cloudinary';
import type { EventRecord } from '../types/database';

interface EventItem {
  id: string;
  title: string;
  category: 'upcoming' | 'previous';
  date: string;
  location: string;
  description: string;
  image: string;
  ticketAvailable?: boolean;
  edition?: string;
  access_info?: string;
  entry_info?: string;
  ambiance_info?: string;
}

interface EventProps {
  eventData?: {
    title: string;
    edition: string;
    date: string;
    location: string;
    program: string;
    bannerUrl: string;
    banner_url?: string;
    access_info?: string;
    entry_info?: string;
    ambiance_info?: string;
  };
  events?: EventRecord[];
}

export const Event: React.FC<EventProps> = ({ eventData, events }) => {
  // Modal states
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedEventModal, setSelectedEventModal] = useState<EventItem | null>(null);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  // Copy share feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Email Notification Banner State (Brevo Integration)
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyError, setNotifyError] = useState('');

  // Active filter tab (All, Upcoming, Previous)
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'previous'>('all');

  // Fallback defaults for the main Next Event
  const title = eventData?.title || 'Joker Carnival Night 2026';
  const edition = eventData?.edition || 'Édition Spéciale · 10ème Anniversaire';
  const dateText = eventData?.date || 'Samedi 26 Octobre 2026 · 20h00';
  const locationText = eventData?.location || 'Grand Cour & Amphi ESEN, Campus Manouba';
  const rawProgram = eventData?.program || '';
  const isJunk = rawProgram.includes('Avantages de HTML') || rawProgram.includes('<section>');
  const programText = isJunk
    ? 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.'
    : (rawProgram || 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.');
  const bannerUrl = eventData?.bannerUrl || eventData?.banner_url || '/images/event_banner.jpg';
  const accessInfoText = eventData?.access_info || 'Ouvert aux étudiants munis de leur réservation / pass gratuit.';
  const entryInfoText = eventData?.entry_info || '100% Gratuite avec réservation préalable en ligne.';
  const ambianceInfoText = eventData?.ambiance_info || 'Musique live, animations, buffet & tombola du club Joker ESEN.';

  // Dynamic previous and upcoming events list from Supabase / Props
  const sourceEvents: EventRecord[] = events && events.length > 0 ? events : getCachedAllEvents();
  const eventList: EventItem[] = sourceEvents.map((evt, idx) => ({
    id: evt.id || `evt-${idx}`,
    title: evt.title,
    category: evt.category || (evt.is_active ? 'upcoming' : 'previous'),
    date: evt.date,
    location: evt.location,
    description: evt.program,
    image: evt.banner_url || '/images/event_banner.jpg',
    ticketAvailable: evt.ticket_available ?? (evt.category === 'upcoming' || evt.is_active),
    edition: evt.edition,
    access_info: evt.access_info,
    entry_info: evt.entry_info,
    ambiance_info: evt.ambiance_info,
  }));

  const filteredEvents = activeTab === 'all'
    ? eventList
    : eventList.filter((item) => item.category === activeTab);

  // Helper to sanitize any raw HTML tags
  const sanitizeText = (text: string) => {
    if (!text) return '';
    return text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  };

  // Helper to structure wall-of-text descriptions into readable highlights
  const renderFormattedDescription = (raw?: string) => {
    if (!raw) return <p className="text-[#2A2020]/80">Concerts live, animations et rétrospective du club.</p>;
    if (raw.includes('Avantages de HTML') || raw.includes('<section>')) {
      return (
        <p className="text-[#2A2020]/80 leading-relaxed">
          Concerts live, DJ sets exclusifs, buffet festif et tombola avec de nombreux lots à gagner.
        </p>
      );
    }
    
    // If it has HTML tags, render safely
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      return (
        <div
          className="rich-event-desc text-[#2A2020]/80 leading-relaxed space-y-2 text-sm"
          dangerouslySetInnerHTML={{ __html: raw }}
        />
      );
    }

    // Split by bullet delimiters or newlines for structured reading hierarchy
    const cleanText = sanitizeText(raw);
    const parts = cleanText.split(/·|•|\n+/).map(p => p.trim()).filter(Boolean);

    if (parts.length > 1) {
      return (
        <div className="space-y-2.5">
          <ul className="space-y-2">
            {parts.map((point, index) => (
              <li key={index} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#2A2020]/80 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7D3F4A] shrink-0 mt-2" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <p className="text-xs sm:text-sm text-[#2A2020]/80 leading-relaxed">
        {cleanText}
      </p>
    );
  };

  // Expandable Description Subcomponent (Max 4 lines with bottom fade gradient and smooth transition)
  const ExpandableEventDescription: React.FC<{
    text?: string;
    bgFadeColor?: string;
  }> = ({ text = '', bgFadeColor = '#140B10' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [scrollHeight, setScrollHeight] = useState<number | undefined>(undefined);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = textRef.current;
      if (!el) return;

      const evaluateOverflow = () => {
        // Line height for text-xs/sm is approx 20-22px. 4 lines corresponds to ~88px-96px.
        const naturalHeight = el.scrollHeight;
        setScrollHeight(naturalHeight);
        setHasOverflow(naturalHeight > 105);
      };

      evaluateOverflow();
      window.addEventListener('resize', evaluateOverflow);
      return () => window.removeEventListener('resize', evaluateOverflow);
    }, [text]);

    return (
      <div className="space-y-1">
        <div
          ref={textRef}
          style={{
            maxHeight: isExpanded ? `${(scrollHeight || 500) + 30}px` : (hasOverflow ? '6rem' : 'none'),
            transition: 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="relative overflow-hidden"
        >
          {renderFormattedDescription(text)}

          {/* Fade Gradient (visible ONLY when collapsed & has overflow) — fades to #FFFFFF (card bg) */}
          {hasOverflow && !isExpanded && (
            <div
              className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none transition-opacity duration-300"
              style={{
                background: `linear-gradient(to top, ${bgFadeColor} 20%, rgba(255, 255, 255, 0.85) 60%, transparent 100%)`,
              }}
            />
          )}
        </div>

        {/* Toggle Button (Deep Plum #7D3F4A) */}
        {hasOverflow && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7D3F4A] hover:text-[#5C1F2E] transition-colors cursor-pointer select-none font-mono uppercase tracking-wider group py-0.5"
            >
              <span>{isExpanded ? 'Voir moins' : 'Voir plus'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#7D3F4A] group-hover:text-[#5C1F2E] transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;

    setNotifyLoading(true);
    setNotifyError('');

    try {
      const res = await subscribeToNewsletter(notifyEmail, {
        source: 'Agenda Billetterie Band',
      });

      if (res.success) {
        setNotifySuccess(true);
        setNotifyMessage(res.message);
        setTimeout(() => {
          setNotifySuccess(false);
          setNotifyMessage('');
          setNotifyEmail('');
        }, 5000);
      } else {
        setNotifyError(res.message || 'Erreur lors de l’inscription.');
        setTimeout(() => setNotifyError(''), 4000);
      }
    } catch (err: any) {
      setNotifyError('Une erreur réseau est survenue. Réessayez.');
      setTimeout(() => setNotifyError(''), 4000);
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    if (!name.trim()) { setNameError(true); setTimeout(() => setNameError(false), 400); hasError = true; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError(true); setTimeout(() => setEmailError(false), 400); hasError = true; }
    if (hasError) return;

    setRsvpLoading(true);
    setTimeout(() => {
      setRsvpLoading(false);
      setRsvpSubmitted(true);
      setTimeout(() => {
        setIsRsvpOpen(false);
        setRsvpSubmitted(false);
        setName('');
        setEmail('');
      }, 3000);
    }, 1200);
  };

  const openEventDetails = (eventItem: EventItem) => {
    setSelectedEventModal(eventItem);
  };

  // Modal navigation (Previous / Next event)
  const handleModalNavigate = (direction: 'prev' | 'next') => {
    if (!selectedEventModal) return;
    const currentIndex = eventList.findIndex(e => e.id === selectedEventModal.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'next'
      ? (currentIndex + 1) % eventList.length
      : (currentIndex - 1 + eventList.length) % eventList.length;

    setSelectedEventModal(eventList[newIndex]);
  };

  const handleShare = () => {
    const url = window.location.href.split('#')[0] + '#event';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Google Calendar URL generator helper
  const getGoogleCalendarUrl = (evtTitle: string, evtDate: string, evtLocation: string, evtDesc: string) => {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
      text: evtTitle,
      details: `${evtDate}\n\n${evtDesc}`,
      location: evtLocation,
    });
    return `${baseUrl}&${params.toString()}`;
  };

  return (
    <section
      id="event"
      className="py-16 sm:py-24 bg-[#FAF7F5] relative overflow-hidden text-[#2A2020] selection:bg-[#7D3F4A] selection:text-white border-b border-[#EDE4DE]"
    >
      {/* Dot-grid texture background — Global Rule 5 */}
      <div className="dot-grid opacity-20 pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12 sm:space-y-16">

        {/* ── Compact Header (Section 03) ── */}
        <div className="relative flex flex-col items-start justify-start gap-2 animate-fade-up">
          {/* Faded section numeral — Global Rule 4 */}
          <div className="section-numeral numeral-s3" aria-hidden="true">03</div>
          {/* Soft plum glow behind headline — Global Rule 4 */}
          <div className="section-glow glow-s3" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-3">
            <div className="chapter-badge chapter-badge-s3 relative z-10">
              <span className="chapter-badge-dot" />
              <span>03 &middot; NOS RENDEZ-VOUS</span>
            </div>
            <h2 className="section-headline headline-s3 text-2xl sm:text-3xl relative z-10">
              NOS RENDEZ-VOUS &amp; ARCHIVES
            </h2>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            1. NEXT EVENT SECTION (FEATURED EVENT FIRST)
        ══════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#EDE4DE] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7D3F4A] animate-pulse" />
              <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.2em] text-[#7D3F4A] uppercase">
                À LA UNE &middot; ÉVÉNEMENT PRINCIPAL
              </span>
            </div>
            {copiedLink && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Lien copié !
              </span>
            )}
          </div>

          {/* Light Container for Next Event */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFFFF] border border-[#EDE4DE] shadow-[0_8px_28px_rgba(43,15,18,0.12)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Column: Clean flyer image */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="relative w-full h-full min-h-[300px] sm:min-h-[360px] rounded-2xl overflow-hidden bg-[#FAF7F5] border border-[#EDE4DE] shadow-sm group">
                  <img
                    src={optimizeCloudinaryUrl(bannerUrl, { width: 640, quality: 'auto' }) || bannerUrl}
                    alt={title}
                    width={588}
                    height={441}
                    decoding="async"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2A2020]/75 via-transparent to-transparent pointer-events-none" />

                  {/* Top-Left Floating Badge: Edition Tag (semi-transparent dark scrim pill) */}
                  {edition && (
                    <div className="absolute top-4 left-4 bg-[#1A1013]/60 text-white backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-medium tracking-wide px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <span>{edition}</span>
                    </div>
                  )}

                  {/* Bottom-Right Floating Badge: Status badge "PLACES OUVERTES" (solid forest green fill, high-contrast) */}
                  <div className="absolute bottom-4 right-4 bg-[#2D6A4F] text-white border border-[#1B4332] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>PLACES OUVERTES</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Structured event details with standardized 24px vertical scale */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                
                {/* Header block — Title first, 16px space-y-4 to clean 2-fact metadata line */}
                <div className="space-y-4">
                  <h3
                    className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-[#2A2020] tracking-tight leading-[1.15]"
                    style={{ fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif" }}
                  >
                    {title}
                  </h3>

                  {/* Clean 2-fact metadata line with clear spacing between Date & Location */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-normal text-[#5C1F2E]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#5C1F2E] shrink-0" />
                      <span>{dateText}</span>
                    </span>
                    <span className="text-[#5C1F2E]/40 font-normal px-1">·</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#5C1F2E] shrink-0" />
                      <span>{locationText}</span>
                    </span>
                  </div>
                </div>

                {/* Structured Description / Programme (Individual Place #1) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#F0EBE7] border border-[#EDE4DE] space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#EDE4DE]">
                    <span className="text-[11px] font-mono font-bold text-[#7D3F4A] uppercase tracking-wider">
                      Points Forts &amp; Déroulement
                    </span>
                  </div>
                  <ExpandableEventDescription text={programText} bgFadeColor="#F0EBE7" />
                </div>

                {/* Practical info badges (Individual Places #2 & #3) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#2A2020]/80">
                  <div className="p-3.5 rounded-xl bg-[#FAF7F5] border border-[#EDE4DE]">
                    <p className="font-bold text-[#7D3F4A] uppercase text-[10px] tracking-wider mb-1">🎟️ Entrée &amp; Accès</p>
                    <p className="line-clamp-2 leading-relaxed text-[#2A2020]/80">{entryInfoText || '100% Gratuite avec réservation'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FAF7F5] border border-[#EDE4DE]">
                    <p className="font-bold text-[#7D3F4A] uppercase text-[10px] tracking-wider mb-1">✨ Ambiance</p>
                    <p className="line-clamp-2 leading-relaxed text-[#2A2020]/80">{ambianceInfoText || 'Musique live & animations'}</p>
                  </div>
                </div>

                {/* CTA Button Row: Grouped together with 12px gap, share icon attached to primary action */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsRsvpOpen(true)}
                    className="px-6 py-3 rounded-full bg-[#7D3F4A] hover:bg-[#5C1F2E] text-white font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(43,15,18,0.2)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Ticket className="w-4 h-4 text-white" />
                    <span>RÉSERVER MA PLACE</span>
                  </button>

                  <button
                    onClick={handleShare}
                    title="Partager cet événement"
                    aria-label="Partager cet événement"
                    className="p-3 rounded-full bg-[#F0EBE7] hover:bg-[#E5DDD7] text-[#2A2020] border border-[#E5DDD7] transition-all duration-200 flex items-center justify-center cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            3. UPCOMING & PREVIOUS EVENTS LIST (CALENDAR)
        ══════════════════════════════════════════════════════ */}
        <div className="space-y-6 pt-4">
          
          {/* Header & Segmented Filter Tabs (French only) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EDE4DE] pb-4">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.2em] text-[#7D3F4A] uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#7D3F4A]" />
                <span>CALENDRIER DES ÉVÉNEMENTS</span>
              </span>
              <p className="text-[11px] text-[#2A2020]/70">
                {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} répertorié{filteredEvents.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Semantic Segmented Tabs (French only) */}
            <div className="inline-flex items-center p-1 rounded-full bg-[#F0EBE7] border border-[#E5DDD7] self-start sm:self-auto shadow-sm">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#FFFFFF] text-[#B93A34] shadow border border-[#E5DDD7] font-black'
                    : 'text-[#2A2020]/75 hover:text-[#2A2020] hover:bg-white/50'
                }`}
              >
                TOUS ({eventList.length})
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-[#FFFFFF] text-[#B93A34] shadow border border-[#E5DDD7] font-black'
                    : 'text-[#2A2020]/75 hover:text-[#2A2020] hover:bg-white/50'
                }`}
              >
                À VENIR
              </button>
              <button
                onClick={() => setActiveTab('previous')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'previous'
                    ? 'bg-[#FFFFFF] text-[#B93A34] shadow border border-[#E5DDD7] font-black'
                    : 'text-[#2A2020]/75 hover:text-[#2A2020] hover:bg-white/50'
                }`}
              >
                ARCHIVES
              </button>
            </div>
          </div>

          {/* List of event cards */}
          {filteredEvents.length === 0 ? (
            /* Empty State Fallback (Global Rule 4) */
            <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-[#FFFFFF] border border-[#E5DDD7] shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-3xl max-w-xl mx-auto animate-fade-up">
              <div className="text-4xl mb-3 select-none text-[#B93A34]">♦️</div>
              <p className="text-[#2A2020] text-sm sm:text-base font-bold uppercase tracking-wider font-display">
                Aucun événement à venir pour le moment
              </p>
              <p className="text-[#2A2020]/75 text-xs mt-2 max-w-sm leading-relaxed mb-5">
                Inscrivez-vous à notre newsletter pour être notifié des prochaines programmations du club Joker ESEN.
              </p>
              <a
                href="#newsletter-band"
                className="px-6 py-2.5 rounded-full bg-[#B93A34] text-white font-bold uppercase text-xs tracking-wider hover:bg-[#A32E29] transition-colors"
              >
                Recevoir les alertes
              </a>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {filteredEvents.map((evt, idx) => {
                const isUpcoming = evt.category === 'upcoming';
                const suitIcon = ['♠', '♥', '♦', '♣'][idx % 4];

                return (
                  <div
                    key={evt.id}
                    onClick={() => openEventDetails(evt)}
                    className={`group relative flex flex-col ${idx % 2 === 1 ? 'sm:flex-row-reverse' : 'sm:flex-row'} items-stretch gap-5 sm:gap-6 p-5 sm:p-6 rounded-3xl bg-[#FFFFFF] hover:bg-[#FAF7F5] border border-[#E5DDD7] hover:border-[#7D3F4A]/50 transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-md cursor-pointer animate-fade-up`}
                  >
                    {/* Corner Suit Watermark in Deep Plum */}
                    <div className="absolute top-3 right-4 text-xl select-none pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity text-[#7D3F4A]">
                      {suitIcon}
                    </div>

                    {/* Left: Flyer Thumbnail Image */}
                    <div className="relative w-full sm:w-56 h-48 sm:h-auto shrink-0 rounded-2xl overflow-hidden bg-[#F0EBE7] border border-[#E5DDD7]">
                      <img
                        src={optimizeCloudinaryUrl(evt.image, { width: 380, quality: 'auto' }) || evt.image}
                        alt={evt.title}
                        width={224}
                        height={192}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      
                      {/* Status badge on image */}
                      <div className="absolute top-3 left-3">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow backdrop-blur-md ${
                          isUpcoming
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-800 text-stone-200'
                        }`}>
                          {isUpcoming ? 'À VENIR' : 'ARCHIVE'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Content & Action */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg sm:text-xl font-black text-[#2A2020] uppercase tracking-tight group-hover:text-[#7D3F4A] transition-colors font-display">
                            {evt.title}
                          </h4>
                          {evt.edition && (
                            <span className="text-[10px] font-mono text-[#7D3F4A] uppercase px-2.5 py-0.5 rounded-full bg-[#7D3F4A]/10 border border-[#7D3F4A]/25">
                              {evt.edition}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-[#2A2020]/75 leading-relaxed line-clamp-2">
                          {sanitizeText(evt.description) || 'Découvrez le programme et les temps forts de cette session.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E5DDD7]">
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#2A2020]/80">
                          <span className="flex items-center gap-1.5 text-[#7D3F4A]">
                            <Calendar className="w-3.5 h-3.5 text-[#7D3F4A]" />
                            <span>{evt.date}</span>
                          </span>
                          <span className="text-[#2A2020]/30">•</span>
                          <span className="flex items-center gap-1.5 text-[#2A2020]/75">
                            <MapPin className="w-3.5 h-3.5 text-[#7D3F4A]" />
                            <span>{evt.location}</span>
                          </span>
                        </div>

                        {/* Action CTA */}
                        <div className="flex items-center gap-2">
                          {isUpcoming ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRsvpOpen(true);
                              }}
                              className="px-5 py-2 rounded-full bg-[#7D3F4A] hover:bg-[#5C1F2E] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <Ticket className="w-3.5 h-3.5 text-white" />
                              <span>RÉSERVER</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventDetails(evt);
                              }}
                              className="px-4 py-2 rounded-full bg-[#F0EBE7] hover:bg-[#7D3F4A] text-[#2A2020] hover:text-white font-bold uppercase text-xs tracking-wider border border-[#E5DDD7] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>REVIVRE L'ÉVÉNEMENT</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            3. EMAIL NOTIFICATION BAND (Closing CTA for Section 03)
        ══════════════════════════════════════════════════════ */}
        <div
          id="newsletter-band"
          className="relative rounded-3xl p-6 sm:p-8 bg-[#F0EBE7] border border-[#E5DDD7] shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D3F4A]/10 border border-[#7D3F4A]/30 text-[#7D3F4A] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                <Bell className="w-3.5 h-3.5 text-[#7D3F4A] animate-bounce" />
                <span>ACCÈS PRIORITAIRE</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black uppercase text-[#2A2020] tracking-tight leading-snug font-display">
                Sois le premier au courant de nos prochains coups.
              </h3>
              <p className="text-xs sm:text-sm text-[#2A2020]/75 leading-relaxed">
                Reçois direct dans ta boîte mail : ouvertures de places, surprises et coups d&apos;avance du club.
              </p>
            </div>

            {/* Email form */}
            <div className="w-full md:w-auto md:min-w-[360px]">
              {notifySuccess ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-[#2A2020] text-xs font-bold animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span>{notifyMessage || 'Merci ! Votre inscription a été validée avec succès.'}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="relative w-full">
                      <Mail className="w-4 h-4 text-[#7D3F4A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="votre.email@esen.tn"
                        className="w-full pl-10 pr-4 py-3 rounded-full bg-[#FFFFFF] border border-[#EDE4DE] text-[#2A2020] text-xs sm:text-sm placeholder-[#2A2020]/45 focus:outline-none focus:border-[#7D3F4A] transition-colors"
                        aria-label="Adresse e-mail pour les alertes"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={notifyLoading}
                      className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-full bg-[#7D3F4A] hover:bg-[#5C1F2E] disabled:opacity-75 text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {notifyLoading ? (
                        <>
                          <span className="anim-btn-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF' }} />
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <span>S'inscrire</span>
                      )}
                    </button>
                  </form>
                  {notifyError && (
                    <p className="text-[11px] text-rose-600 pl-3 font-semibold animate-fadeIn">
                      {notifyError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          3. UPGRADED DETAILS MODAL (FOR ARCHIVES & MORE INFO)
      ══════════════════════════════════════════════════════ */}
      {(isInfoOpen || selectedEventModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md anim-backdrop-in"
          style={{ background: 'rgba(255,255,255,0.85)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl overflow-hidden bg-[#FFFFFF] border border-[#E5DDD7] shadow-2xl space-y-0 anim-modal-in max-h-[90vh] flex flex-col"
          >
            {/* Modal Image Hero Header */}
            <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-[#F5F2F0] shrink-0">
              <img
                src={optimizeCloudinaryUrl(selectedEventModal ? selectedEventModal.image : bannerUrl, { width: 800, quality: 'auto' }) || (selectedEventModal ? selectedEventModal.image : bannerUrl)}
                alt={selectedEventModal ? selectedEventModal.title : title}
                width={672}
                height={224}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF]/40 to-black/30" />

              {/* Prominent High-Contrast Close Button */}
              <button
                onClick={() => {
                  setIsInfoOpen(false);
                  setSelectedEventModal(null);
                }}
                id="event-info-close"
                aria-label="Fermer la modal"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-[#7D3F4A] text-[#2A2020] hover:text-white flex items-center justify-center border border-[#E5DDD7] transition-all cursor-pointer shadow-lg z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Eyebrow & Title inside Hero */}
              <div className="absolute bottom-4 left-6 right-6 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/90 border border-[#E5DDD7] text-[#7D3F4A]">
                    {selectedEventModal?.category === 'previous' ? '🏛️ ARCHIVE & PATRIMOINE DU CLUB' : '🎟️ DÉTAILS DE L\'ÉVÉNEMENT'}
                  </span>
                  {(selectedEventModal?.edition || (!selectedEventModal && edition)) && (
                    <span className="text-[10px] font-mono text-[#2A2020]/80 uppercase">
                      &middot; {selectedEventModal ? selectedEventModal.edition : edition}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-[#2A2020] uppercase leading-tight font-display drop-shadow-sm">
                  {selectedEventModal ? selectedEventModal.title : title}
                </h3>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1 text-[#2A2020]">
              
              {/* Structured Description / Retrospective */}
              {Boolean((selectedEventModal ? selectedEventModal.description : programText)?.trim()) && (
                <div className="p-5 rounded-2xl bg-[#F0EBE7] border border-[#E5DDD7] space-y-3">
                  <div className="flex items-center gap-2 text-[#7D3F4A] text-xs font-mono font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#7D3F4A]" />
                    <span>
                      {selectedEventModal?.category === 'previous' ? 'Rétrospective & Histoire' : 'Description & Programme'}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-[#2A2020]/90">
                    {renderFormattedDescription(selectedEventModal ? selectedEventModal.description : programText)}
                  </div>
                </div>
              )}

              {/* Practical Information */}
              <div className="p-5 rounded-2xl bg-[#F0EBE7] border border-[#E5DDD7] space-y-3">
                <p className="text-xs font-mono text-[#7D3F4A] uppercase font-bold tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#7D3F4A]" />
                  <span>Informations Pratiques</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-[#2A2020]">
                  {(selectedEventModal?.date || (!selectedEventModal && dateText)) && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#E5DDD7]">
                      <Calendar className="w-4 h-4 text-[#7D3F4A] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#7D3F4A] text-[10px] uppercase">Date &amp; Horaire</p>
                        <p className="text-[#2A2020]">{selectedEventModal ? selectedEventModal.date : dateText}</p>
                      </div>
                    </div>
                  )}

                  {(selectedEventModal?.location || (!selectedEventModal && locationText)) && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#E5DDD7]">
                      <MapPin className="w-4 h-4 text-[#7D3F4A] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#7D3F4A] text-[10px] uppercase">Lieu</p>
                        <p className="text-[#2A2020]">{selectedEventModal ? selectedEventModal.location : locationText}</p>
                      </div>
                    </div>
                  )}

                  {/* Entrée & Accès */}
                  {(() => {
                    const entry = (selectedEventModal ? selectedEventModal.entry_info : entryInfoText)?.trim();
                    const access = (selectedEventModal ? selectedEventModal.access_info : accessInfoText)?.trim();
                    if (!entry && !access) return null;
                    return (
                      <div className="sm:col-span-2 flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#E5DDD7]">
                        <Ticket className="w-4 h-4 text-[#7D3F4A] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[#7D3F4A] text-[10px] uppercase">Entrée &amp; Conditions d'accès</p>
                          <p className="text-[#2A2020]">{[entry, access].filter(Boolean).join(' — ')}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ambiance */}
                  {(() => {
                    const ambiance = (selectedEventModal ? selectedEventModal.ambiance_info : ambianceInfoText)?.trim();
                    if (!ambiance) return null;
                    return (
                      <div className="sm:col-span-2 flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#E5DDD7]">
                        <Sparkles className="w-4 h-4 text-[#7D3F4A] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[#7D3F4A] text-[10px] uppercase">Ambiance &amp; Expérience</p>
                          <p className="text-[#2A2020]">{ambiance}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Footer with Archive Navigation and Clear Primary CTA */}
            <div className="p-4 sm:p-6 bg-[#F0EBE7] border-t border-[#E5DDD7] flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* Previous / Next Navigation for Archives */}
              {selectedEventModal && eventList.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleModalNavigate('prev')}
                    className="p-2 rounded-full bg-[#FFFFFF] hover:bg-[#E5DDD7] text-[#2A2020] border border-[#E5DDD7] text-xs transition-colors cursor-pointer"
                    title="Événement précédent"
                    aria-label="Événement précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-[#2A2020]/60">
                    Parcourir les éditions
                  </span>
                  <button
                    onClick={() => handleModalNavigate('next')}
                    className="p-2 rounded-full bg-[#FFFFFF] hover:bg-[#E5DDD7] text-[#2A2020] border border-[#E5DDD7] text-xs transition-colors cursor-pointer"
                    title="Événement suivant"
                    aria-label="Événement suivant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsInfoOpen(false);
                    setSelectedEventModal(null);
                  }}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#2A2020]/70 hover:text-[#2A2020] uppercase tracking-wider cursor-pointer"
                >
                  Fermer
                </button>
              )}

              {/* Contextual Action Button */}
              <div className="flex items-center gap-3">
                {(!selectedEventModal || (selectedEventModal.ticketAvailable && selectedEventModal.category !== 'previous')) ? (
                  <button
                    onClick={() => {
                      setIsInfoOpen(false);
                      setSelectedEventModal(null);
                      setIsRsvpOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-full bg-[#7D3F4A] hover:bg-[#5C1F2E] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg flex items-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>Réserver un Pass</span>
                  </button>
                ) : (
                  <a
                    href="#gallery"
                    onClick={() => {
                      setIsInfoOpen(false);
                      setSelectedEventModal(null);
                    }}
                    className="px-6 py-2.5 rounded-full bg-[#7D3F4A] hover:bg-[#5C1F2E] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    <span>Voir les Photos</span>
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          4. RSVP TICKET MODAL
      ══════════════════════════════════════════════════════ */}
      {isRsvpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md anim-backdrop-in"
          style={{ background: 'rgba(255,255,255,0.85)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto bg-[#FFFFFF] border border-[#E5DDD7] shadow-2xl anim-modal-in"
          >
            <button
              onClick={() => setIsRsvpOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#F0EBE7] hover:bg-[#7D3F4A] text-[#2A2020] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#E5DDD7]"
              aria-label="Fermer la modal"
            >
              <X className="w-4 h-4" />
            </button>

            {rsvpSubmitted ? (
              <div className="text-center py-8 space-y-4 anim-modal-in">
                <svg className="w-20 h-20 mx-auto" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="36" fill="rgba(125,63,74,0.12)" stroke="#7D3F4A" strokeWidth="2.5" />
                  <path
                    d="M22 40 L34 52 L58 28"
                    stroke="#7D3F4A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="100"
                    strokeDashoffset="100"
                    style={{ animation: 'checkmarkDraw 600ms cubic-bezier(0.16,1,0.3,1) 100ms both' }}
                  />
                </svg>
                <h3 className="text-2xl font-black uppercase text-[#2A2020] font-display">
                  Pass Réservé !
                </h3>
                <p className="text-sm text-[#2A2020]/90">
                  Merci <strong className="text-[#2A2020]">{name}</strong> ! Votre confirmation a été envoyée à <span className="text-[#7D3F4A] font-semibold">{email}</span>.
                </p>
                <div className="pt-2">
                  <a
                    href={getGoogleCalendarUrl(title, dateText, locationText, programText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F0EBE7] hover:bg-[#E5DDD7] text-[#7D3F4A] text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Ajouter à mon Agenda</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRsvpSubmit} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="text-3xl mb-2">🎟️</div>
                  <h3 className="text-2xl font-black uppercase text-[#2A2020] font-display tracking-tight">
                    Pass Billetterie Joker
                  </h3>
                  <p className="text-xs font-mono font-bold text-[#7D3F4A] tracking-wider">
                    Entrée 100% gratuite &middot; Réservé aux étudiants ESEN
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#7D3F4A] uppercase tracking-wider mb-1.5">
                    Nom et Prénom
                  </label>
                  <div className={`relative ${nameError ? 'anim-shake' : ''}`}>
                    <User className="w-4 h-4 text-[#7D3F4A] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Votre nom et prénom"
                      className={`input-cabaret w-full pl-10 pr-4 py-3 rounded-full bg-white border text-[#2A2020] text-xs sm:text-sm ${
                        nameError ? 'border-[#E05A52] input-error' : 'border-[#E5DDD7]'
                      }`}
                      required
                    />
                  </div>
                  {nameError && <p className="text-[10px] text-[#E05A52] mt-1 pl-4">Ce champ est requis</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#7D3F4A] uppercase tracking-wider mb-1.5">
                    Adresse E-mail
                  </label>
                  <div className={`relative ${emailError ? 'anim-shake' : ''}`}>
                    <Mail className="w-4 h-4 text-[#7D3F4A] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom.prenom@esen.tn"
                      className={`input-cabaret w-full pl-10 pr-4 py-3 rounded-full bg-white border text-[#2A2020] text-xs sm:text-sm ${
                        emailError ? 'border-[#E05A52] input-error' : 'border-[#E5DDD7]'
                      }`}
                      required
                    />
                  </div>
                  {emailError && <p className="text-[10px] text-[#E05A52] mt-1 pl-4">Email valide requis</p>}
                </div>

                <button
                  type="submit"
                  disabled={rsvpLoading}
                  className="w-full py-3.5 rounded-full bg-[#B93A34] hover:bg-[#E05A52] disabled:opacity-80 text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_18px_rgba(185,58,52,0.4)] cursor-pointer flex items-center justify-center gap-2"
                >
                  {rsvpLoading ? (
                    <><span className="anim-btn-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF' }} /> Envoi en cours...</>
                  ) : (
                    'Confirmer ma Réservation'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Event;
