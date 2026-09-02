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
    if (!raw) return <p className="text-[#E8DCD5]">Concerts live, animations et rétrospective du club.</p>;
    if (raw.includes('Avantages de HTML') || raw.includes('<section>')) {
      return (
        <p className="text-[#E8DCD5] leading-relaxed">
          Concerts live, DJ sets exclusifs, buffet festif et tombola avec de nombreux lots à gagner.
        </p>
      );
    }
    
    // If it has HTML tags, render safely
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      return (
        <div
          className="rich-event-desc text-[#E8DCD5] leading-relaxed space-y-2 text-sm"
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
              <li key={index} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#E8DCD5] leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F3C4A0] shrink-0 mt-2" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <p className="text-xs sm:text-sm text-[#E8DCD5] leading-relaxed">
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

          {/* Fade Gradient (visible ONLY when collapsed & has overflow) */}
          {hasOverflow && !isExpanded && (
            <div
              className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none transition-opacity duration-300"
              style={{
                background: `linear-gradient(to top, ${bgFadeColor} 20%, rgba(20, 11, 16, 0.85) 60%, transparent 100%)`,
              }}
            />
          )}
        </div>

        {/* Toggle Button in site's accent color (F3C4A0 / B93A34) */}
        {hasOverflow && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F3C4A0] hover:text-[#E05A52] transition-colors cursor-pointer select-none font-mono uppercase tracking-wider group py-0.5"
            >
              <span>{isExpanded ? 'Voir moins' : 'Voir plus'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#B93A34] group-hover:text-[#E05A52] transition-transform duration-300 ${
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
      className="py-16 sm:py-24 bg-[#140B10] relative overflow-hidden text-[#F5EDE4] selection:bg-[#B93A34] selection:text-white border-b border-[#F3C4A0]/15"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12 sm:space-y-16">

        {/* ── Section Header ── */}
        <div className="flex flex-col items-start justify-start gap-4 animate-fade-up">
          <div className="chapter-badge">
            <span className="chapter-badge-dot" />
            <span>03 &middot; AGENDA &amp; BILLETTERIE</span>
          </div>

          <h2 className="section-headline">
            Nos Prochains Rendez-vous &amp; Archives
          </h2>

          <p className="text-[#E8DCD5] text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed">
            Réservez vos accès pour les soirées mythiques et revivez l'historique des événements majeurs du club Joker ESEN.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════
            1. EMAIL NOTIFICATION BAND
        ══════════════════════════════════════════════════════ */}
        <div
          id="newsletter-band"
          className="relative rounded-3xl p-6 sm:p-8 bg-[#1A0E15] border border-[#F3C4A0]/20 shadow-xl animate-fade-up"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B93A34]/20 border border-[#B93A34]/40 text-[#F3C4A0] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                <Bell className="w-3.5 h-3.5 text-[#F3C4A0] animate-bounce" />
                <span>ALERTES &amp; BILLETTERIE EXCLUSIVE</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black uppercase text-[#F5EDE4] tracking-tight leading-snug font-display">
                Soyez les premiers informés des billetteries
              </h3>
              <p className="text-xs sm:text-sm text-[#E8DCD5] leading-relaxed">
                Recevez directement par e-mail les ouvertures de places et les annonces exclusives du club Joker.
              </p>
            </div>

            {/* Email form */}
            <div className="w-full md:w-auto md:min-w-[360px]">
              {notifySuccess ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-[#F5EDE4] text-xs font-bold animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <span>{notifyMessage || 'Merci ! Votre inscription a été validée avec succès.'}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
                    <div className="relative w-full">
                      <Mail className="w-4 h-4 text-[#F3C4A0]/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="votre.email@esen.tn"
                        className="w-full pl-10 pr-4 py-3 rounded-full bg-[#140B10] border border-[#F3C4A0]/30 text-[#F5EDE4] text-xs sm:text-sm placeholder-[#F5EDE4]/50 focus:outline-none focus:border-[#F3C4A0] transition-colors"
                        aria-label="Adresse e-mail pour les alertes"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={notifyLoading}
                      className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-full bg-[#B93A34] hover:bg-[#E05A52] disabled:opacity-75 text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
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
                    <p className="text-[11px] text-rose-400 pl-3 font-semibold animate-fadeIn">
                      {notifyError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            2. NEXT EVENT SECTION (FEATURED EVENT)
        ══════════════════════════════════════════════════════ */}
        <div className="space-y-6 animate-fade-up">
          <div className="flex items-center justify-between border-b border-[#F3C4A0]/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#B93A34] animate-pulse" />
              <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.2em] text-[#F3C4A0] uppercase">
                À LA UNE &middot; ÉVÉNEMENT PRINCIPAL
              </span>
            </div>
            {copiedLink && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Lien copié !
              </span>
            )}
          </div>

          {/* Solid Container for Next Event with balanced columns */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0E15] border border-[#F3C4A0]/25 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Column: Clean flyer image with balanced height and no redundant text overlays */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="relative w-full h-full min-h-[300px] sm:min-h-[360px] rounded-2xl overflow-hidden bg-[#140B10] border border-[#F3C4A0]/25 shadow-lg group">
                  <img
                    src={optimizeCloudinaryUrl(bannerUrl, { width: 900, quality: 'auto' }) || bannerUrl}
                    alt={title}
                    width={588}
                    height={441}
                    decoding="async"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140B10]/80 via-transparent to-[#140B10]/20 pointer-events-none" />

                  {/* Top Floating Badge: Date with explicit Year */}
                  <div className="absolute top-4 left-4 bg-[#140B10]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#F3C4A0]/30 shadow-md">
                    <p className="text-[11px] sm:text-xs font-mono font-black text-[#F3C4A0] uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#B93A34]" />
                      <span>{dateText}</span>
                    </p>
                  </div>

                  {/* Top Floating Badge: Status */}
                  <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md shadow-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>BILLETTERIE OUVERTE</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Structured event details with clear hierarchy and aligned CTAs */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                
                {/* Header block with Edition Tag and Title */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3C4A0]/10 border border-[#F3C4A0]/30 text-[#F3C4A0] text-xs font-mono font-bold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-[#F3C4A0]" />
                      <span>{edition}</span>
                    </span>
                  </div>

                  <h3
                    className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-[#F5EDE4] tracking-tight leading-[1.15]"
                    style={{ fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif" }}
                  >
                    {title}
                  </h3>

                  {/* Key metadata pills */}
                  <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-[#E8DCD5] pt-1">
                    <span className="flex items-center gap-1.5 text-[#F3C4A0]">
                      <Calendar className="w-4 h-4 text-[#B93A34] shrink-0" />
                      <span>{dateText}</span>
                    </span>
                    <span className="text-[#F3C4A0]/40">•</span>
                    <span className="flex items-center gap-1.5 text-[#E8DCD5]">
                      <MapPin className="w-4 h-4 text-[#B93A34] shrink-0" />
                      <span>{locationText}</span>
                    </span>
                  </div>
                </div>

                {/* Structured Description / Programme */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#140B10] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#F3C4A0]/10">
                    <span className="text-[11px] font-mono font-bold text-[#F3C4A0] uppercase tracking-wider">
                      Points Forts &amp; Déroulement
                    </span>
                  </div>
                  <ExpandableEventDescription text={programText} bgFadeColor="#140B10" />
                </div>

                {/* Practical info badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#E8DCD5]">
                  <div className="p-3 rounded-xl bg-[#140B10]/70 border border-[#F3C4A0]/15">
                    <p className="font-bold text-[#F3C4A0] uppercase text-[10px] tracking-wider mb-0.5">🎟️ Entrée &amp; Accès</p>
                    <p className="line-clamp-2 leading-relaxed text-[#E8DCD5]/90">{entryInfoText || '100% Gratuite avec réservation'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#140B10]/70 border border-[#F3C4A0]/15">
                    <p className="font-bold text-[#F3C4A0] uppercase text-[10px] tracking-wider mb-0.5">✨ Ambiance</p>
                    <p className="line-clamp-2 leading-relaxed text-[#E8DCD5]/90">{ambianceInfoText || 'Musique live & animations'}</p>
                  </div>
                </div>

                {/* Optically Aligned CTA Buttons & Quick Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setIsRsvpOpen(true)}
                    className="h-12 px-7 rounded-full bg-[#B93A34] hover:bg-[#E05A52] text-white font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(185,58,52,0.4)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Ticket className="w-4 h-4 text-white" />
                    <span>RÉSERVER MA PLACE</span>
                  </button>

                  <button
                    onClick={() => setIsInfoOpen(true)}
                    className="h-12 px-5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-[#F3C4A0] hover:text-white font-bold uppercase text-xs tracking-wider border border-[#F3C4A0]/30 hover:border-[#F3C4A0] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Info className="w-4 h-4" />
                    <span>Plus de détails</span>
                  </button>

                  <button
                    onClick={handleShare}
                    title="Partager cet événement"
                    aria-label="Partager cet événement"
                    className="h-12 w-12 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-[#E8DCD5] hover:text-white border border-[#F3C4A0]/25 hover:border-[#F3C4A0] transition-all duration-200 flex items-center justify-center cursor-pointer ml-auto"
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
          
          {/* Header & Segmented Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3C4A0]/20 pb-4">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.2em] text-[#F3C4A0] uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#B93A34]" />
                <span>CALENDRIER DES ÉVÉNEMENTS</span>
              </span>
              <p className="text-[11px] text-[#E8DCD5]/70">
                {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} répertorié{filteredEvents.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Semantic Segmented Tabs (Crisp ivory active state, neutral inactive) */}
            <div className="inline-flex items-center p-1 rounded-full bg-[#1A0E15] border border-[#F3C4A0]/25 self-start sm:self-auto shadow-md">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#F5EDE4] text-[#140B10] shadow font-black'
                    : 'text-[#E8DCD5]/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Tous ({eventList.length})
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-[#F5EDE4] text-[#140B10] shadow font-black'
                    : 'text-[#E8DCD5]/80 hover:text-white hover:bg-white/10'
                }`}
              >
                À venir
              </button>
              <button
                onClick={() => setActiveTab('previous')}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'previous'
                    ? 'bg-[#F5EDE4] text-[#140B10] shadow font-black'
                    : 'text-[#E8DCD5]/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Passés &amp; Archives
              </button>
            </div>
          </div>

          {/* List of event cards */}
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-[#1A0E15] border border-[#F3C4A0]/20 rounded-3xl max-w-xl mx-auto animate-fade-up">
              <div className="text-4xl mb-3 select-none text-[#F3C4A0]/60">♦️</div>
              <p className="text-[#F5EDE4] text-sm sm:text-base font-bold uppercase tracking-wider font-display">
                Aucun événement dans cette catégorie pour le moment
              </p>
              <p className="text-[#E8DCD5]/80 text-xs mt-2 max-w-sm leading-relaxed mb-5">
                Inscrivez-vous à nos alertes pour être notifié des futures programmations du club Joker.
              </p>
              <a
                href="#newsletter-band"
                className="px-6 py-2.5 rounded-full bg-[#B93A34] text-white font-bold uppercase text-xs tracking-wider hover:bg-[#E05A52] transition-colors"
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
                    className="group relative flex flex-col sm:flex-row items-stretch gap-5 sm:gap-6 p-5 sm:p-6 rounded-3xl bg-[#1A0E15] hover:bg-[#20101B] border border-[#F3C4A0]/20 hover:border-[#F3C4A0]/45 transition-all duration-300 shadow-lg hover:shadow-2xl cursor-pointer animate-fade-up"
                  >
                    {/* Corner Suit Watermark */}
                    <div className="absolute top-3 right-4 text-xl select-none pointer-events-none opacity-10 group-hover:opacity-30 transition-opacity text-[#F3C4A0]">
                      {suitIcon}
                    </div>

                    {/* Left: Flyer Thumbnail Image */}
                    <div className="relative w-full sm:w-56 h-48 sm:h-auto shrink-0 rounded-2xl overflow-hidden bg-[#140B10] border border-[#F3C4A0]/20">
                      <img
                        src={optimizeCloudinaryUrl(evt.image, { width: 500, quality: 'auto' }) || evt.image}
                        alt={evt.title}
                        width={224}
                        height={192}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      
                      {/* Status badge on image */}
                      <div className="absolute top-3 left-3">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow backdrop-blur-md ${
                          isUpcoming
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                            : 'bg-[#140B10]/90 text-stone-300 border border-white/20'
                        }`}>
                          {isUpcoming ? 'À VENIR' : 'ARCHIVE'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Content & Action */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg sm:text-xl font-black text-[#F5EDE4] uppercase tracking-tight group-hover:text-[#F3C4A0] transition-colors font-display">
                            {evt.title}
                          </h4>
                          {evt.edition && (
                            <span className="text-[10px] font-mono text-[#F3C4A0] uppercase px-2.5 py-0.5 rounded-full bg-[#F3C4A0]/10 border border-[#F3C4A0]/25">
                              {evt.edition}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-[#E8DCD5] leading-relaxed line-clamp-2">
                          {sanitizeText(evt.description) || 'Découvrez le programme et les temps forts de cette session.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#F3C4A0]/10">
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#E8DCD5]">
                          <span className="flex items-center gap-1.5 text-[#F3C4A0]">
                            <Calendar className="w-3.5 h-3.5 text-[#B93A34]" />
                            <span>{evt.date}</span>
                          </span>
                          <span className="text-[#F3C4A0]/40">•</span>
                          <span className="flex items-center gap-1.5 text-[#E8DCD5]/80">
                            <MapPin className="w-3.5 h-3.5 text-[#B93A34]" />
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
                              className="px-5 py-2 rounded-full bg-[#B93A34] hover:bg-[#E05A52] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
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
                              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-[#B93A34] text-[#E8DCD5] hover:text-white font-bold uppercase text-xs tracking-wider border border-[#F3C4A0]/25 transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
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

      </div>

      {/* ══════════════════════════════════════════════════════
          3. UPGRADED DETAILS MODAL (FOR ARCHIVES & MORE INFO)
      ══════════════════════════════════════════════════════ */}
      {(isInfoOpen || selectedEventModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md anim-backdrop-in"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl overflow-hidden bg-[#160B12] border border-[#F3C4A0]/30 shadow-2xl space-y-0 anim-modal-in max-h-[90vh] flex flex-col"
          >
            {/* Modal Image Hero Header */}
            <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-[#140B10] shrink-0">
              <img
                src={optimizeCloudinaryUrl(selectedEventModal ? selectedEventModal.image : bannerUrl, { width: 800, quality: 'auto' }) || (selectedEventModal ? selectedEventModal.image : bannerUrl)}
                alt={selectedEventModal ? selectedEventModal.title : title}
                width={672}
                height={224}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#160B12] via-[#160B12]/40 to-black/60" />

              {/* Prominent High-Contrast Close Button */}
              <button
                onClick={() => {
                  setIsInfoOpen(false);
                  setSelectedEventModal(null);
                }}
                id="event-info-close"
                aria-label="Fermer la modal"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/70 hover:bg-[#B93A34] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-lg z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Eyebrow & Title inside Hero */}
              <div className="absolute bottom-4 left-6 right-6 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#140B10]/90 border border-[#F3C4A0]/30 text-[#F3C4A0]">
                    {selectedEventModal?.category === 'previous' ? '🏛️ ARCHIVE & PATRIMOINE DU CLUB' : '🎟️ DÉTAILS DE L\'ÉVÉNEMENT'}
                  </span>
                  {(selectedEventModal?.edition || (!selectedEventModal && edition)) && (
                    <span className="text-[10px] font-mono text-[#E8DCD5]/80 uppercase">
                      &middot; {selectedEventModal ? selectedEventModal.edition : edition}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white uppercase leading-tight font-display drop-shadow-md">
                  {selectedEventModal ? selectedEventModal.title : title}
                </h3>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1">
              
              {/* Structured Description / Retrospective */}
              {Boolean((selectedEventModal ? selectedEventModal.description : programText)?.trim()) && (
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-[#F3C4A0]/20 space-y-3">
                  <div className="flex items-center gap-2 text-[#F3C4A0] text-xs font-mono font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#B93A34]" />
                    <span>
                      {selectedEventModal?.category === 'previous' ? 'Rétrospective & Histoire' : 'Description & Programme'}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-[#E8DCD5]">
                    {renderFormattedDescription(selectedEventModal ? selectedEventModal.description : programText)}
                  </div>
                </div>
              )}

              {/* Practical Information */}
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-[#F3C4A0]/20 space-y-3">
                <p className="text-xs font-mono text-[#F3C4A0] uppercase font-bold tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#B93A34]" />
                  <span>Informations Pratiques</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-[#E8DCD5]">
                  {(selectedEventModal?.date || (!selectedEventModal && dateText)) && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/20 border border-white/5">
                      <Calendar className="w-4 h-4 text-[#F3C4A0] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#F3C4A0] text-[10px] uppercase">Date &amp; Horaire</p>
                        <p className="text-[#E8DCD5]">{selectedEventModal ? selectedEventModal.date : dateText}</p>
                      </div>
                    </div>
                  )}

                  {(selectedEventModal?.location || (!selectedEventModal && locationText)) && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/20 border border-white/5">
                      <MapPin className="w-4 h-4 text-[#F3C4A0] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#F3C4A0] text-[10px] uppercase">Lieu</p>
                        <p className="text-[#E8DCD5]">{selectedEventModal ? selectedEventModal.location : locationText}</p>
                      </div>
                    </div>
                  )}

                  {/* Entrée & Accès */}
                  {(() => {
                    const entry = (selectedEventModal ? selectedEventModal.entry_info : entryInfoText)?.trim();
                    const access = (selectedEventModal ? selectedEventModal.access_info : accessInfoText)?.trim();
                    if (!entry && !access) return null;
                    return (
                      <div className="sm:col-span-2 flex items-start gap-2.5 p-2.5 rounded-xl bg-black/20 border border-white/5">
                        <Ticket className="w-4 h-4 text-[#F3C4A0] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[#F3C4A0] text-[10px] uppercase">Entrée &amp; Conditions d'accès</p>
                          <p className="text-[#E8DCD5]">{[entry, access].filter(Boolean).join(' — ')}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ambiance */}
                  {(() => {
                    const ambiance = (selectedEventModal ? selectedEventModal.ambiance_info : ambianceInfoText)?.trim();
                    if (!ambiance) return null;
                    return (
                      <div className="sm:col-span-2 flex items-start gap-2.5 p-2.5 rounded-xl bg-black/20 border border-white/5">
                        <Sparkles className="w-4 h-4 text-[#F3C4A0] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[#F3C4A0] text-[10px] uppercase">Ambiance &amp; Expérience</p>
                          <p className="text-[#E8DCD5]">{ambiance}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Footer with Archive Navigation and Clear Primary CTA */}
            <div className="p-4 sm:p-6 bg-[#12080E] border-t border-[#F3C4A0]/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              {/* Previous / Next Navigation for Archives */}
              {selectedEventModal && eventList.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleModalNavigate('prev')}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#E8DCD5] hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                    title="Événement précédent"
                    aria-label="Événement précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-[#E8DCD5]/60">
                    Parcourir les éditions
                  </span>
                  <button
                    onClick={() => handleModalNavigate('next')}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-[#E8DCD5] hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
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
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-[#E8DCD5]/70 hover:text-white uppercase tracking-wider cursor-pointer"
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
                    className="px-6 py-2.5 rounded-full bg-[#B93A34] hover:bg-[#E05A52] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg flex items-center gap-2"
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
                    className="px-6 py-2.5 rounded-full bg-[#F3C4A0] hover:bg-[#F3C4A0]/90 text-[#14080F] font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    <span>Voir les Photos dans la Galerie</span>
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
          style={{ background: 'rgba(0,0,0,0.92)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto bg-[#160B12] border border-[#F3C4A0]/30 shadow-2xl anim-modal-in"
          >
            <button
              onClick={() => setIsRsvpOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-[#B93A34] text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fermer la modal"
            >
              <X className="w-4 h-4" />
            </button>

            {rsvpSubmitted ? (
              <div className="text-center py-8 space-y-4 anim-modal-in">
                <svg className="w-20 h-20 mx-auto" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="36" fill="rgba(243,187,153,0.12)" stroke="#F3C4A0" strokeWidth="2.5" />
                  <path
                    d="M22 40 L34 52 L58 28"
                    stroke="#F3C4A0"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="100"
                    strokeDashoffset="100"
                    style={{ animation: 'checkmarkDraw 600ms cubic-bezier(0.16,1,0.3,1) 100ms both' }}
                  />
                </svg>
                <h3 className="text-2xl font-black uppercase text-white font-display">
                  Pass Réservé !
                </h3>
                <p className="text-sm text-[#E8DCD5]">
                  Merci <strong className="text-white">{name}</strong> ! Votre confirmation a été envoyée à <span className="text-[#F3C4A0] font-semibold">{email}</span>.
                </p>
                <div className="pt-2">
                  <a
                    href={getGoogleCalendarUrl(title, dateText, locationText, programText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#F3C4A0] text-xs font-bold uppercase tracking-wider transition-colors"
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
                  <h3 className="text-2xl font-black uppercase text-white font-display tracking-tight">
                    Pass Billetterie Joker
                  </h3>
                  <p className="text-xs font-mono font-bold text-[#F3C4A0] tracking-wider">
                    Entrée 100% gratuite &middot; Réservé aux étudiants ESEN
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#F3C4A0] uppercase tracking-wider mb-1.5">
                    Nom et Prénom
                  </label>
                  <div className={`relative ${nameError ? 'anim-shake' : ''}`}>
                    <User className="w-4 h-4 text-[#F3C4A0] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Yasmine Mansouri"
                      className={`input-cabaret w-full pl-10 pr-4 py-3 rounded-full bg-[#0D0608]/80 border text-[#F5EDE4] text-xs sm:text-sm ${
                        nameError ? 'border-[#E05A52] input-error' : 'border-[#F3C4A0]/30'
                      }`}
                      required
                    />
                  </div>
                  {nameError && <p className="text-[10px] text-[#E05A52] mt-1 pl-4">Ce champ est requis</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#F3C4A0] uppercase tracking-wider mb-1.5">
                    Adresse E-mail
                  </label>
                  <div className={`relative ${emailError ? 'anim-shake' : ''}`}>
                    <Mail className="w-4 h-4 text-[#F3C4A0] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yasmine@esen.tn"
                      className={`input-cabaret w-full pl-10 pr-4 py-3 rounded-full bg-[#0D0608]/80 border text-[#F5EDE4] text-xs sm:text-sm ${
                        emailError ? 'border-[#E05A52] input-error' : 'border-[#F3C4A0]/30'
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
