import React, { useState } from 'react';
import { Calendar, MapPin, Ticket, CheckCircle2, User, Mail, X, Info, Bell, History } from 'lucide-react';

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
}

interface EventProps {
  eventData?: {
    title: string;
    edition: string;
    date: string;
    location: string;
    program: string;
    bannerUrl: string;
    access_info?: string;
    entry_info?: string;
    ambiance_info?: string;
  };
}

export const Event: React.FC<EventProps> = ({ eventData }) => {
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

  // Email Notification Banner State
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);

  // Active filter tab (All, Upcoming, Previous)
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'previous'>('all');

  // Fallback defaults for the main Next Event
  const title = eventData?.title || 'JOKER CARNIVAL NIGHT 2026';
  const edition = eventData?.edition || 'Édition Spéciale · 10ème Anniversaire';
  const dateText = eventData?.date || 'Samedi 26 Octobre 2026 · 20h00';
  const locationText = eventData?.location || 'Grand Cour & Amphi ESEN, Campus Manouba';
  const rawProgram = eventData?.program || '';
  const isJunk = rawProgram.includes('Avantages de HTML') || rawProgram.includes('<section>');
  const programText = isJunk
    ? 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.'
    : (rawProgram || 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.');
  const bannerUrl = eventData?.bannerUrl || '/images/event_banner.jpg';
  const accessInfoText = eventData?.access_info || 'Ouvert aux étudiants munis de leur réservation / pass gratuit.';
  const entryInfoText = eventData?.entry_info || '100% Gratuite avec réservation préalable en ligne.';
  const ambianceInfoText = eventData?.ambiance_info || 'Musique live, animations, buffet & tombola du club Joker ESEN.';

  // Helper to render description safely without displaying raw HTML tag strings (Fix HTML bug)
  const renderFormattedDescription = (raw?: string) => {
    if (!raw) return 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola.';
    if (raw.includes('Avantages de HTML') || raw.includes('<section>')) {
      return <span>Concerts live · DJ sets exclusifs · Buffet festif &amp; Tombola avec de nombreux lots à gagner.</span>;
    }
    // If it has HTML tags, render it cleanly with parsed HTML
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      return (
        <div
          className="rich-event-desc leading-relaxed space-y-1.5"
          dangerouslySetInnerHTML={{ __html: raw }}
        />
      );
    }
    return <span>{raw}</span>;
  };

  // Curated previous and upcoming events list with standardized date format (Global Rule 6)
  const eventList: EventItem[] = [
    {
      id: 'evt-1',
      title: 'JOKER INTEGRATION DAY',
      category: 'upcoming',
      date: 'Jeudi 15 Octobre 2026 · 14h00',
      location: 'Campus ESEN Manouba',
      description: 'Journée festive d’accueil des nouveaux étudiants, jeux d’équipes, animations musicales, showcases et remise des packs de bienvenue Joker.',
      image: '/images/teambuilding.jpg',
      ticketAvailable: true,
      edition: 'Édition Promo 2026-2027',
    },
    {
      id: 'evt-2',
      title: 'CYBER NIGHT & LAN ARENA',
      category: 'previous',
      date: 'Vendredi 24 Mai 2025 · 21h00',
      location: 'ESEN Labs & Salle Polyvalente',
      description: 'Tournoi esport inter-universitaire, compétition Valorant & FIFA, stand rétro-gaming et ambiance DJ jusqu’au petit matin.',
      image: '/images/hero_deck.jpg',
      ticketAvailable: false,
      edition: 'Édition Spring 2025',
    },
    {
      id: 'evt-3',
      title: 'CREATIVE WORKSHOP & DJ ACADEMY',
      category: 'previous',
      date: 'Mercredi 12 Février 2025 · 15h00',
      location: 'Amphi B, ESEN Manouba',
      description: 'Masterclass sur la production audio, création visuelle pour festivals et initiation aux platines numériques animée par le pôle technique.',
      image: '/images/workshop.jpg',
      ticketAvailable: false,
      edition: 'Session Hiver 2025',
    },
    {
      id: 'evt-4',
      title: 'JOKER GALA & RETROSPECTIVE',
      category: 'previous',
      date: 'Samedi 18 Mai 2024 · 19h30',
      location: 'Espace Culturel Manouba',
      description: 'Célébration des réussites de l’année, remise des trophées du club Joker, cocktail dînatoire et rétrospective en images des grands projets.',
      image: '/images/about_card_fan.jpg',
      ticketAvailable: false,
      edition: 'Édition Annuelle 2024',
    },
  ];

  const filteredEvents = activeTab === 'all'
    ? eventList
    : eventList.filter((item) => item.category === activeTab);

  // Helper to sanitize any raw HTML tags in description (Bug Fix)
  const sanitizeText = (text: string) => {
    if (!text) return '';
    return text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    setNotifySuccess(true);
    setTimeout(() => {
      setNotifySuccess(false);
      setNotifyEmail('');
    }, 4000);
  };

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate with shake animation
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

  return (
    <section
      id="event"
      className="py-16 sm:py-24 bg-[#140B10] relative overflow-hidden text-[#F5EDE4] selection:bg-[#B93A34] selection:text-white border-b border-[#F3C4A0]/15"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12 sm:space-y-16">

        {/* ── Section Header - Standardized Left Aligned (Global Rules 1 & 2) ── */}
        <div className="flex flex-col items-start justify-start gap-4 animate-fade-up">
          <div className="chapter-badge">
            <span className="chapter-badge-dot" />
            <span>03 &middot; AGENDA &amp; BILLETTERIE</span>
          </div>

          <h2 className="section-headline">
            Nos Prochains Rendez-vous &amp; Archives
          </h2>

          <p className="text-[#F5EDE4]/85 text-xs sm:text-sm md:text-base max-w-xl leading-relaxed">
            Réservez vos accès pour les soirées mythiques et revivez l'historique des événements majeurs du club Joker ESEN.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════
            1. EMAIL NOTIFICATION BAND (DISTINCT CONTAINER)
        ══════════════════════════════════════════════════════ */}
        <div
          id="newsletter-band"
          className="relative rounded-3xl p-6 sm:p-8 bg-[#1A0E15] border border-[#F3C4A0]/20 shadow-xl animate-fade-up"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B93A34]/15 border border-[#B93A34]/35 text-[#F3C4A0] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                <Bell className="w-3.5 h-3.5 text-[#B93A34] animate-bounce" />
                <span>ALERTES &amp; BILLETTERIE EXCLUSIVE</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black uppercase text-[#F5EDE4] tracking-tight leading-snug font-display">
                Soyez les premiers informés des billetteries
              </h3>
              <p className="text-xs sm:text-sm text-[#F5EDE4]/75 leading-relaxed">
                Recevez directement par e-mail les ouvertures de places et les annonces surprises du club.
              </p>
            </div>

            {/* Email form with unambiguous placeholder */}
            <div className="w-full md:w-auto md:min-w-[340px]">
              {notifySuccess ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#B93A34]/20 border border-[#B93A34]/50 text-[#F3C4A0] text-xs font-bold animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-[#F3C4A0]" />
                  <span>Merci ! Votre e-mail a été enregistré avec succès.</span>
                </div>
              ) : (
                <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
                  <div className="relative w-full">
                    <Mail className="w-4 h-4 text-[#F3C4A0]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="votre.email@esen.tn"
                      className="w-full pl-10 pr-4 py-3 rounded-full bg-[#140B10] border border-[#F3C4A0]/25 text-[#F5EDE4] text-xs sm:text-sm placeholder-[#F5EDE4]/40 focus:outline-none focus:border-[#B93A34] transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-full bg-[#B93A34] hover:bg-[#E05A52] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                  >
                    S'inscrire
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            2. NEXT EVENT SECTION (FEATURED EVENT)
        ══════════════════════════════════════════════════════ */}
        <div className="space-y-6 animate-fade-up">
          <div className="flex items-center justify-between border-b border-[#F3C4A0]/15 pb-4">
            <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.2em] text-[#F3C4A0] uppercase flex items-center gap-2">
              <span>♠</span>
              <span>À LA UNE · ÉVÉNEMENT PRINCIPAL</span>
            </span>
          </div>

          {/* Solid Container for Next Event (Global Rule 8) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#1A0E15] border border-[#F3C4A0]/20 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
              {/* Left: Flyer Banner */}
              <div className="lg:col-span-7 relative group overflow-hidden rounded-2xl bg-[#140B10] border border-[#F3C4A0]/20 shadow-lg">
                <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden">
                  <img
                    src={bannerUrl}
                    alt={title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out brightness-90 contrast-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140B10]/90 via-[#140B10]/30 to-transparent" />

                  {/* Floating Date Badge Top-Left */}
                  <div className="absolute top-4 left-4 bg-[#140B10]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#F3C4A0]/30">
                    <p className="text-[11px] sm:text-xs font-mono font-black text-[#F3C4A0] uppercase tracking-wider">
                      {dateText.split('·')[0] || dateText}
                    </p>
                  </div>

                  {/* Tag pill top right */}
                  <div className="absolute top-4 right-4 bg-[#B93A34] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    {edition}
                  </div>

                  {/* Title badge overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-[10px] font-mono uppercase text-[#F3C4A0] tracking-widest font-bold">
                      CLUB JOKER ESEN PRESENTS
                    </p>
                    <p className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight line-clamp-1 drop-shadow-md">
                      {title}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Featured Event Details & Clear CTA Hierarchy */}
              <div className="lg:col-span-5 flex flex-col justify-center space-y-5">
                <div className="space-y-2">
                  <h3
                    className="text-2xl sm:text-4xl font-black uppercase text-[#F5EDE4] tracking-tight leading-[1.1]"
                    style={{ fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm sm:text-base font-semibold text-[#F3C4A0] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#B93A34]" />
                    <span>{dateText}</span>
                  </p>
                  <p className="text-xs sm:text-sm text-[#F5EDE4]/75 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#B93A34]" />
                    <span>{locationText}</span>
                  </p>
                </div>

                {/* Parsed/Cleaned Text - HTML bug fix */}
                <div className="text-xs sm:text-sm text-[#F5EDE4]/80 leading-relaxed bg-[#140B10] p-4 rounded-2xl border border-[#F3C4A0]/15">
                  {renderFormattedDescription(programText)}
                </div>

                {/* CTA Hierarchy: Primary Solid Button vs Secondary Link */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => setIsRsvpOpen(true)}
                    className="px-8 py-3.5 rounded-full bg-[#B93A34] hover:bg-[#E05A52] text-white font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(185,58,52,0.4)] flex items-center gap-2 cursor-pointer"
                  >
                    <Ticket className="w-4 h-4 text-white" />
                    <span>RÉSERVER MA PLACE</span>
                  </button>

                  <button
                    onClick={() => setIsInfoOpen(true)}
                    className="text-[#F3C4A0] hover:text-white font-bold uppercase text-xs tracking-wider underline-offset-4 hover:underline transition-colors flex items-center gap-1.5 cursor-pointer py-2 px-1"
                  >
                    <Info className="w-4 h-4 text-[#F3C4A0]" />
                    <span>Plus d'infos</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            3. UPCOMING & PREVIOUS EVENTS LIST (ROW DESIGN)
        ══════════════════════════════════════════════════════ */}
        <div className="space-y-8 pt-4">
          {/* Header & Chronological Segmented Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3C4A0]/15 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.2em] text-[#F3C4A0] uppercase">
                CALENDRIER DES ÉVÉNEMENTS
              </span>
            </div>

            {/* Segmented-Control Filter (French Labels: TOUS, À VENIR, PASSÉS) */}
            <div className="inline-flex items-center p-1 rounded-full bg-[#1A0E15] border border-[#F3C4A0]/20 self-start sm:self-auto shadow-md">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#B93A34] text-white shadow-sm'
                    : 'text-[#F5EDE4]/70 hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'upcoming'
                    ? 'bg-[#B93A34] text-white shadow-sm'
                    : 'text-[#F5EDE4]/70 hover:text-white'
                }`}
              >
                À venir
              </button>
              <button
                onClick={() => setActiveTab('previous')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'previous'
                    ? 'bg-[#B93A34] text-white shadow-sm'
                    : 'text-[#F5EDE4]/70 hover:text-white'
                }`}
              >
                Passés
              </button>
            </div>
          </div>

          {/* List of event rows OR Empty State Fallback (Global Rule 4) */}
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4 bg-[#1A0E15] border border-[#F3C4A0]/20 rounded-3xl max-w-xl mx-auto animate-fade-up">
              <div className="text-4xl mb-3 select-none text-[#F3C4A0]/50">♦️</div>
              <p className="text-[#F5EDE4] text-sm sm:text-base font-bold uppercase tracking-wider font-display">
                Aucun événement à venir pour le moment
              </p>
              <p className="text-[#F5EDE4]/70 text-xs mt-2 max-w-sm leading-relaxed mb-5">
                Inscrivez-vous à nos alertes pour être prévenu dès la publication de la prochaine billetterie.
              </p>
              <a
                href="#newsletter-band"
                className="px-6 py-2.5 rounded-full bg-[#B93A34] text-white font-bold uppercase text-xs tracking-wider hover:bg-[#E05A52] transition-colors"
              >
                Recevoir les alertes
              </a>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {filteredEvents.map((evt, idx) => {
                const isUpcoming = evt.category === 'upcoming';
                const suitIcon = ['♠', '♥', '♦', '♣'][idx % 4];

                return (
                  <div
                    key={evt.id}
                    className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8 p-5 sm:p-6 rounded-3xl bg-[#1A0E15] hover:bg-[#20101B] border border-[#F3C4A0]/18 hover:border-[#B93A34]/40 transition-all duration-300 shadow-lg animate-fade-up"
                  >
                    {/* Corner Suit Watermark (Global Rule 5) */}
                    <div className="absolute top-3 right-4 text-xl select-none pointer-events-none opacity-10 group-hover:opacity-25 transition-opacity text-[#F3C4A0]">
                      {suitIcon}
                    </div>

                    {/* Left: Flyer image */}
                    <div className="relative w-full sm:w-44 h-48 sm:h-44 shrink-0 rounded-2xl overflow-hidden bg-[#140B10] border border-[#F3C4A0]/18">
                      <img
                        src={evt.image}
                        alt={evt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 contrast-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      <div className="absolute top-2 left-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow ${
                          isUpcoming ? 'bg-[#B93A34] text-white' : 'bg-[#140B10]/90 text-[#F5EDE4]/80 border border-[#F3C4A0]/30'
                        }`}>
                          {isUpcoming ? 'À VENIR' : 'PASSÉ'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Info & CTA */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg sm:text-2xl font-black text-[#F5EDE4] uppercase tracking-tight">
                          {evt.title}
                        </h4>
                        {evt.edition && (
                          <span className="text-[10px] font-mono text-[#F3C4A0] uppercase px-2.5 py-0.5 rounded-full bg-[#B93A34]/15 border border-[#B93A34]/30">
                            {evt.edition}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-[#F5EDE4]/75 leading-relaxed line-clamp-2 sm:line-clamp-3">
                        {sanitizeText(evt.description)}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#F5EDE4]/90 pt-1">
                        <span className="flex items-center gap-1.5 text-[#F3C4A0]">
                          <Calendar className="w-3.5 h-3.5 text-[#B93A34]" />
                          {evt.date}
                        </span>
                        <span className="text-[#F3C4A0]/30">•</span>
                        <span className="flex items-center gap-1.5 text-[#F5EDE4]/65">
                          <MapPin className="w-3.5 h-3.5 text-[#B93A34]" />
                          {evt.location}
                        </span>
                      </div>

                      <div className="pt-2">
                        {isUpcoming ? (
                          <button
                            onClick={() => setIsRsvpOpen(true)}
                            className="px-6 py-2.5 rounded-full bg-[#B93A34] hover:bg-[#E05A52] text-white font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 shadow-md flex items-center gap-2 cursor-pointer"
                          >
                            <Ticket className="w-3.5 h-3.5 text-white" />
                            <span>RÉSERVER MA PLACE</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => openEventDetails(evt)}
                            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-[#B93A34] text-[#F5EDE4] hover:text-white font-bold uppercase text-xs tracking-wider border border-[#F3C4A0]/25 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>REVIVRE L'ÉVÉNEMENT</span>
                          </button>
                        )}
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
          DETAILS MODAL (FOR PREVIOUS OR MORE INFO)
      ══════════════════════════════════════════════════════ */}
      {(isInfoOpen || selectedEventModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md anim-backdrop-in"
          style={{ background: 'rgba(0,0,0,0.90)' }}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto bg-[#160B12] border border-[#F3C4A0]/30 shadow-2xl space-y-6 anim-modal-in"
          >
            <button
              onClick={() => {
                setIsInfoOpen(false);
                setSelectedEventModal(null);
              }}
              id="event-info-close"
              className="absolute top-4 right-4 p-2 rounded-full text-[#F3BB99]/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).classList.add('anim-close-click');
                setTimeout(() => (e.currentTarget as HTMLButtonElement).classList.remove('anim-close-click'), 310);
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#F3BB99] flex items-center justify-center text-[#14080F] shrink-0 font-bold">
                <Info className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#F3BB99] tracking-widest">
                  {selectedEventModal?.category === 'previous' ? 'ARCHIVE ÉVÉNEMENT' : 'DÉTAILS DE L\'ÉVÉNEMENT'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase leading-tight font-display">
                  {selectedEventModal ? selectedEventModal.title : title}
                </h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#F3C4A0]/20 space-y-2">
                <p className="text-[11px] font-mono text-[#F3BB99] uppercase font-bold tracking-wider">
                  Description &amp; Programme
                </p>
                <div className="text-[#F5EDE4]/80 leading-relaxed">
                  {renderFormattedDescription(selectedEventModal ? selectedEventModal.description : programText)}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#F3C4A0]/20 space-y-2">
                <p className="text-[11px] font-mono text-[#F3BB99] uppercase font-bold tracking-wider">
                  Informations Pratiques
                </p>
                <div className="text-[#F5EDE4]/80 space-y-1.5">
                  <p>📍 <strong className="text-white">Lieu :</strong> {selectedEventModal ? selectedEventModal.location : locationText}</p>
                  <p>📅 <strong className="text-white">Date :</strong> {selectedEventModal ? selectedEventModal.date : dateText}</p>
                  <p>🎟️ <strong className="text-white">Entrée &amp; Accès :</strong> {entryInfoText} — {accessInfoText}</p>
                  <p>✨ <strong className="text-white">Ambiance :</strong> {ambianceInfoText}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#F3C4A0]/20">
              <button
                onClick={() => {
                  setIsInfoOpen(false);
                  setSelectedEventModal(null);
                }}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-[#F3BB99]/70 hover:text-white uppercase tracking-wider cursor-pointer"
              >
                Fermer
              </button>

              {(!selectedEventModal || selectedEventModal.ticketAvailable) && (
                <button
                  onClick={() => {
                    setIsInfoOpen(false);
                    setSelectedEventModal(null);
                    setIsRsvpOpen(true);
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#F3BB99] hover:bg-[#F3C4A0] text-[#14080F] font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-105 cursor-pointer"
                >
                  Réserver un Pass
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          RSVP TICKET MODAL
      ══════════════════════════════════════════════════════ */}
      {isRsvpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md anim-backdrop-in"
          style={{ background: 'rgba(0,0,0,0.92)' }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto bg-[#160B12] border border-[#F3C4A0]/30 shadow-2xl anim-modal-in"
          >
            <button
              onClick={() => setIsRsvpOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#F3BB99]/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).classList.add('anim-close-click');
                setTimeout(() => (e.currentTarget as HTMLButtonElement).classList.remove('anim-close-click'), 310);
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {rsvpSubmitted ? (
              <div className="text-center py-8 space-y-4 anim-modal-in">
                {/* Animated SVG Checkmark */}
                <svg className="w-20 h-20 mx-auto" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="36" fill="rgba(243,187,153,0.12)" stroke="#F3BB99" strokeWidth="2.5" />
                  <path
                    d="M22 40 L34 52 L58 28"
                    stroke="#F3BB99"
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
                <p className="text-sm text-[#F5EDE4]/80">
                  Merci {name} ! Votre confirmation a été envoyée à <span className="text-[#F3BB99] font-semibold">{email}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRsvpSubmit} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="text-3xl mb-2">🎟️</div>
                  <h3 className="text-2xl font-black uppercase text-white font-display tracking-tight">
                    Pass Billetterie Joker
                  </h3>
                  <p className="text-xs font-mono font-bold text-[#F3BB99] tracking-wider">
                    Entrée gratuite · Réservé aux étudiants ESEN
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#F3BB99]/80 uppercase tracking-wider mb-1.5">
                    Nom et Prénom
                  </label>
                  <div className={`relative ${nameError ? 'anim-shake' : ''}`}>
                    <User className="w-4 h-4 text-[#F3BB99] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Yasmine Mansouri"
                      className={`input-cabaret w-full pl-10 pr-4 py-3 rounded-full bg-[#0D0608]/80 border text-[#F5EDE4] text-xs sm:text-sm ${
                        nameError ? 'border-[#E05A52] input-error' : 'border-[#F3C4A0]/25'
                      }`}
                    />
                  </div>
                  {nameError && <p className="text-[10px] text-[#E05A52] mt-1 pl-4">Ce champ est requis</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#F3BB99]/80 uppercase tracking-wider mb-1.5">
                    Adresse E-mail
                  </label>
                  <div className={`relative ${emailError ? 'anim-shake' : ''}`}>
                    <Mail className="w-4 h-4 text-[#F3BB99] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yasmine@esen.tn"
                      className={`input-cabaret w-full pl-10 pr-4 py-3 rounded-full bg-[#0D0608]/80 border text-[#F5EDE4] text-xs sm:text-sm ${
                        emailError ? 'border-[#E05A52] input-error' : 'border-[#F3C4A0]/25'
                      }`}
                    />
                  </div>
                  {emailError && <p className="text-[10px] text-[#E05A52] mt-1 pl-4">Email invalide</p>}
                </div>

                <button
                  type="submit"
                  disabled={rsvpLoading}
                  className="w-full py-3.5 rounded-full bg-[#F3BB99] hover:bg-[#F3C4A0] disabled:opacity-80 text-[#14080F] font-black uppercase text-xs tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_18px_rgba(243,187,153,0.4)] cursor-pointer flex items-center justify-center gap-2"
                >
                  {rsvpLoading ? (
                    <><span className="anim-btn-spinner" style={{ borderColor: 'rgba(20,8,15,0.3)', borderTopColor: '#14080F' }} /> Envoi en cours...</>
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
