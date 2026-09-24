import { useState, useEffect, lazy, Suspense } from 'react';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Team, type TeamMember } from './components/Team';
import { Event } from './components/Event';
import { Gallery } from './components/Gallery';
import { MembershipForm } from './components/MembershipForm';
import { LoginModal } from './components/LoginModal';
import { MemberLoginModal } from './components/MemberLoginModal';
import { MemberDashboard } from './components/member/MemberDashboard';
import { Footer } from './components/Footer';
import { fetchAllEvents, getCachedEvent, getCachedAllEvents, cacheAllEvents } from './services/eventService';
import type { EventRecord } from './types/database';
import { fetchTeamMembers, getCachedTeam, cacheTeam } from './services/teamService';
import { fetchClubSettings, getCachedSettings, cacheSettings, updateClubSettings } from './services/settingsService';
import { getCurrentMemberSession } from './services/memberService';
import type { ClubMember } from './types/member';
import { AdminLoader, NotFoundPage } from './components/LoadingScreens';

const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));

export function App() {
  const [currentMember, setCurrentMember] = useState<ClubMember | null>(() => getCurrentMemberSession());
  const [isMemberLoginOpen, setIsMemberLoginOpen] = useState(false);

  // App View State with persistent caching across refresh & hash navigation
  const [currentView, setCurrentView] = useState<'public' | 'admin' | 'member'>(() => {
    const isAuth = localStorage.getItem('joker_admin_auth') === 'true';
    const savedView = localStorage.getItem('joker_view');
    const memberSession = getCurrentMemberSession();

    if (isAuth && (window.location.hash === '#admin' || savedView === 'admin')) {
      return 'admin';
    }
    if (memberSession && savedView === 'member') {
      return 'member';
    }
    return 'public';
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState<boolean>(() => {
    const cached = getCachedSettings();
    if (cached && typeof cached.recruitment_open === 'boolean') {
      return cached.recruitment_open;
    }
    return true;
  });

  // Dynamic All Events State
  const [allEvents, setAllEvents] = useState<EventRecord[]>(() => getCachedAllEvents());

  // Dynamic Event Data
  const [eventData, setEventData] = useState<{
    id?: string;
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
  } | null>(() => {
    const cached = getCachedEvent();
    if (!cached || !cached.is_active) return null;

    const rawProgram = cached.program || '';
    const isJunkHtml = rawProgram.includes('Avantages de HTML') || rawProgram.includes('<section>');
    const cleanProgram = isJunkHtml
      ? 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.'
      : (rawProgram || 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.');

    return {
      id: cached.id,
      title: cached.title,
      edition: cached.edition,
      date: cached.date,
      location: cached.location,
      program: cleanProgram,
      bannerUrl: cached.banner_url || 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
      banner_url: cached.banner_url || 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
      access_info: cached.access_info,
      entry_info: cached.entry_info,
      ambiance_info: cached.ambiance_info,
    };
  });

  // Dynamic Executive Team Members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const FAKE_DEFAULT_NAMES = ['Yasmine Ben Salem', 'Youssef Trabelsi', 'Sarra Chaabane', 'Amine Karray', 'Nour El Hoda Gharbi', 'Kahlil Ferjani'];
    const cached = getCachedTeam();
    const hasFakePlaceholders = cached.some((m) => FAKE_DEFAULT_NAMES.includes(m.name));
    if (hasFakePlaceholders) {
      cacheTeam([]);
      return [];
    }
    return cached;
  });

  const handleSetView = (view: 'public' | 'admin' | 'member') => {
    setCurrentView(view);
    localStorage.setItem('joker_view', view);
    if (view === 'admin') {
      window.location.hash = '#admin';
    } else {
      if (window.location.hash === '#admin') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  };

  // Sync hash changes
  useEffect(() => {
    const onHashChange = () => {
      const isAuth = localStorage.getItem('joker_admin_auth') === 'true';
      if (window.location.hash === '#admin' && isAuth) {
        setCurrentView('admin');
        localStorage.setItem('joker_view', 'admin');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Load live data from Supabase
  useEffect(() => {
    async function loadInitialData() {
      try {
        const settings = await fetchClubSettings();
        if (settings && typeof settings.recruitment_open === 'boolean') {
          setRecruitmentOpen(settings.recruitment_open);
          cacheSettings({ recruitment_open: settings.recruitment_open });
        }

        const events = await fetchAllEvents();
        if (events && events.length > 0) {
          setAllEvents(events);
          cacheAllEvents(events);
          const activeUpcoming = events.find((e) => e.is_active && (e.category === 'upcoming' || !e.category));
          if (activeUpcoming) {
            const rawProgram = activeUpcoming.program || '';
            const isJunkHtml = rawProgram.includes('Avantages de HTML') || rawProgram.includes('<section>');
            const cleanProgram = isJunkHtml
              ? 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.'
              : rawProgram;

            setEventData({
              id: activeUpcoming.id,
              title: activeUpcoming.title,
              edition: activeUpcoming.edition,
              date: activeUpcoming.date,
              location: activeUpcoming.location,
              program: cleanProgram,
              bannerUrl: activeUpcoming.banner_url || '/images/event_banner.jpg',
              banner_url: activeUpcoming.banner_url || '/images/event_banner.jpg',
              access_info: activeUpcoming.access_info,
              entry_info: activeUpcoming.entry_info,
              ambiance_info: activeUpcoming.ambiance_info,
            });
          } else {
            setEventData(null as any);
          }
        }

        const dbTeam = await fetchTeamMembers();
        if (dbTeam !== null) {
          setTeamMembers(dbTeam);
        }
      } catch (err) {
        console.warn('Error loading initial data from Supabase:', err);
      }
    }

    loadInitialData();
  }, []);

  const handleUpdateTeam = (newMembers: TeamMember[]) => {
    setTeamMembers(newMembers);
    cacheTeam(newMembers);
  };

  const handleUpdateAllEvents = (newEvents: EventRecord[]) => {
    setAllEvents(newEvents);
    cacheAllEvents(newEvents);
    const active = newEvents.find((e) => e.is_active && (e.category === 'upcoming' || !e.category));
    if (active) {
      setEventData({
        id: active.id,
        title: active.title,
        edition: active.edition,
        date: active.date,
        location: active.location,
        program: active.program,
        bannerUrl: active.banner_url || 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
        banner_url: active.banner_url || 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
        access_info: active.access_info,
        entry_info: active.entry_info,
        ambiance_info: active.ambiance_info,
      });
    } else {
      setEventData(null as any);
    }
  };

  const handleToggleRecruitment = async (isOpen: boolean) => {
    setRecruitmentOpen(isOpen);
    cacheSettings({ recruitment_open: isOpen });
    try {
      const saved = await updateClubSettings({ recruitment_open: isOpen });
      if (!saved) {
        console.warn('Failed to save recruitment status to database.');
      }
    } catch (err) {
      console.error('Error saving recruitment status:', err);
    }
  };

  // MEMBER VIEW ROUTE
  if (currentView === 'member' && currentMember) {
    return (
      <MemberDashboard
        member={currentMember}
        allEvents={allEvents}
        onLogout={() => {
          setCurrentMember(null);
          handleSetView('public');
        }}
        onGoToPublic={() => handleSetView('public')}
      />
    );
  }

  // ADMIN VIEW ROUTE
  if (currentView === 'admin') {
    return (
      <Suspense fallback={<AdminLoader />}>
        <AdminDashboard
          onBackToPublic={() => handleSetView('public')}
          recruitmentOpen={recruitmentOpen}
          onToggleRecruitment={handleToggleRecruitment}
          eventData={eventData}
          onUpdateEvent={setEventData}
          allEventsProp={allEvents}
          onUpdateAllEvents={handleUpdateAllEvents}
          teamMembers={teamMembers}
          onUpdateTeamMembers={handleUpdateTeam}
        />
      </Suspense>
    );
  }

  // MEMBER session expired / not found
  if (currentView === 'member' && !currentMember) {
    return <NotFoundPage onGoHome={() => handleSetView('public')} />;
  }

  // PUBLIC LANDING VIEW
  return (
    <div className="min-h-screen bg-[#FAF7F5] text-[#2A2020] selection:bg-[#B93A34] selection:text-white font-sans">

      {/* Hero owns full-screen background AND top navbar */}
      <Hero onOpenLogin={() => setIsLoginOpen(true)} />

      <main>
        <About />
        <Team teamMembers={teamMembers} />
        <Event eventData={eventData} events={allEvents} />
        <Gallery />
        {recruitmentOpen ? (
          <MembershipForm />
        ) : (
          <section id="join" className="py-20 sm:py-28 bg-[#FAF7F5] relative overflow-hidden border-b border-[#EDE4DE]">
            {/* Decorative blobs — identical to MembershipForm */}
            <div className="absolute top-10 left-10 w-56 h-56 bg-[#A73541]/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#4B5B9E]/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#A73541]/4 rounded-full blur-3xl pointer-events-none" />
            <div className="dot-grid opacity-20 pointer-events-none" aria-hidden="true" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="rounded-[28px] sm:rounded-[36px] bg-white p-2.5 sm:p-5 border border-[#E5DDD7] shadow-[0_8px_32px_rgba(43,15,18,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">

                {/* LEFT decorative panel */}
                <div className="lg:col-span-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-b from-[#FAF7F5] via-[#F0EBE7] to-[#FAF7F5] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border border-[#E5DDD7] min-h-[220px] sm:min-h-[280px] lg:min-h-[460px]">
                  {/* Spinning dashed ring */}
                  <div className="absolute -right-12 top-1/3 w-44 h-44 opacity-15 pointer-events-none">
                    <div className="w-full h-full border-4 border-dashed border-[#A73541] rounded-full animate-spin-slow" />
                  </div>

                  {/* Badge row */}
                  <div className="flex items-center justify-end relative z-10">
                    <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-[#E5DDD7] shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-[#A73541]/50" />
                      <span className="text-[11px] font-extrabold text-[#2A2020] uppercase tracking-wider" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>Fermé</span>
                    </div>
                  </div>

                  {/* Main copy */}
                  <div className="relative z-10 space-y-2 sm:space-y-3 my-auto py-4 sm:py-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A73541]/10 border border-[#A73541]/25 text-[#A73541] text-[10px] font-bold tracking-widest uppercase" style={{fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A73541]/50" />
                      <span>05 · RECRUTEMENT 2026</span>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-[#5C1F2E] tracking-wider uppercase">À bientôt !</p>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#A73541] font-display uppercase tracking-tight leading-tight sm:leading-none">
                      On Se Revoit<br />La Prochaine<br />Fois 👋
                    </h2>
                  </div>
                </div>

                {/* RIGHT message panel */}
                <div className="lg:col-span-7 rounded-[22px] sm:rounded-[28px] bg-white p-6 sm:p-8 lg:p-12 flex flex-col justify-center items-center text-center relative border border-[#EDE4DE] shadow-sm gap-6 sm:gap-8">

                  {/* Icon */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#FAF7F5] rounded-full flex items-center justify-center border border-[#A73541]/20 shadow-inner mx-auto">
                    <span className="text-4xl sm:text-5xl select-none">🎭</span>
                  </div>

                  {/* Heading */}
                  <div className="space-y-3">
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#2A2020] font-display uppercase tracking-tight">
                      Recrutement Terminé
                    </h3>
                    <div className="w-16 h-1 bg-[#A73541] rounded-full mx-auto" />
                  </div>

                  {/* Message */}
                  <div className="space-y-3 max-w-md">
                    <p className="text-base sm:text-lg font-bold text-[#2A2020]">
                      Nous avons fermé le recrutement pour cette session.
                    </p>
                    <p className="text-sm text-[#2A2020]/60 leading-relaxed">
                      Merci pour votre intérêt pour le club <strong className="text-[#A73541]">JokerEsen</strong> !
                      Suivez nos réseaux sociaux pour ne pas rater la prochaine vague de recrutement et restez au courant de tous nos événements.
                    </p>
                  </div>

                  {/* Social CTA */}
                  <div className="flex flex-wrap gap-3 justify-center pt-2">
                    <a
                      href="https://www.instagram.com/jokeresen/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#A73541] hover:bg-[#8C2B35] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#A73541]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      Instagram
                    </a>
                    <a
                      href="https://www.facebook.com/JokerEsen.JE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#FAF7F5] text-[#2A2020] font-bold text-xs uppercase tracking-wider border border-[#E5DDD7] shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-[#4B5B9E]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                  </div>

                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer onOpenAdmin={() => {
        const isAuth = localStorage.getItem('joker_admin_auth') === 'true';
        if (isAuth) {
          handleSetView('admin');
        } else {
          setIsLoginOpen(true);
        }
      }} />

      {/* Admin / General Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(tab, loggedInMember) => {
          if (tab === 'admin') {
            handleSetView('admin');
          } else if (tab === 'member') {
            if (loggedInMember) {
              setCurrentMember(loggedInMember);
            }
            handleSetView('member');
          }
        }}
      />

      {/* Member Login Modal */}
      <MemberLoginModal
        isOpen={isMemberLoginOpen}
        onClose={() => setIsMemberLoginOpen(false)}
        onLoginSuccess={(loggedInMember) => {
          setCurrentMember(loggedInMember);
          handleSetView('member');
        }}
        onOpenAdminLogin={() => setIsLoginOpen(true)}
      />
    </div>
  );
}

export default App;
