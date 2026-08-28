import { useState, useEffect } from 'react';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Team, type TeamMember } from './components/Team';
import { Event } from './components/Event';
import { Gallery } from './components/Gallery';
import { MembershipForm } from './components/MembershipForm';
import { LoginModal } from './components/LoginModal';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { fetchActiveEvent, getCachedEvent } from './services/eventService';
import { fetchTeamMembers, getCachedTeam, cacheTeam } from './services/teamService';
import { fetchClubSettings, getCachedSettings, cacheSettings } from './services/settingsService';

export function App() {
  // Admin View State with persistent caching across refresh & hash navigation
  const [currentView, setCurrentView] = useState<'public' | 'admin'>(() => {
    const isAuth = localStorage.getItem('joker_admin_auth') === 'true';
    const savedView = localStorage.getItem('joker_view');
    if (isAuth && (window.location.hash === '#admin' || savedView === 'admin')) {
      return 'admin';
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

  // Dynamic Event Data: Initialized immediately with local cache for zero delay
  const [eventData, setEventData] = useState(() => getCachedEvent());

  // Dynamic Executive Team Members: Initialized immediately with local cache
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

  const handleSetView = (view: 'public' | 'admin') => {
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

  // Sync hash changes (e.g. browser back/forward buttons or direct links)
  useEffect(() => {
    const onHashChange = () => {
      const isAuth = localStorage.getItem('joker_admin_auth') === 'true';
      if (window.location.hash === '#admin' && isAuth) {
        setCurrentView('admin');
        localStorage.setItem('joker_view', 'admin');
      } else if (window.location.hash !== '#admin' && localStorage.getItem('joker_view') === 'public') {
        setCurrentView('public');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Load live data from Supabase upon initial mounting
  useEffect(() => {
    async function loadInitialData() {
      try {
        // 1. Settings (Recruitment Status)
        const settings = await fetchClubSettings();
        if (settings && typeof settings.recruitment_open === 'boolean') {
          setRecruitmentOpen(settings.recruitment_open);
          cacheSettings({ recruitment_open: settings.recruitment_open });
        }

        // 2. Active Event
        const event = await fetchActiveEvent();
        if (event) {
          setEventData({
            id: event.id,
            title: event.title,
            edition: event.edition,
            date: event.date,
            location: event.location,
            program: event.program,
            bannerUrl: event.banner_url || '/images/event_banner.jpg',
          });
        }

        // 3. Team Members
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

  const handleToggleRecruitment = (isOpen: boolean) => {
    setRecruitmentOpen(isOpen);
    cacheSettings({ recruitment_open: isOpen });
  };

  if (currentView === 'admin') {
    return (
      <AdminDashboard
        onBackToPublic={() => handleSetView('public')}
        recruitmentOpen={recruitmentOpen}
        onToggleRecruitment={handleToggleRecruitment}
        eventData={eventData}
        onUpdateEvent={setEventData}
        teamMembers={teamMembers}
        onUpdateTeamMembers={handleUpdateTeam}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1A0E14] text-[#F5EDE4] selection:bg-[#B93A34] selection:text-white">

      {/* Hero owns the full-screen background AND the navbar */}
      <Hero onOpenLogin={() => setIsLoginOpen(true)} />

      <main>
        <About />
        <Team teamMembers={teamMembers} />
        <Event eventData={eventData} />
        <Gallery />
        {recruitmentOpen ? (
          <MembershipForm />
        ) : (
          <section id="join" className="py-16 bg-[#0E1714] text-center border-b border-[#F3C4A0]/15 px-4">
            <div className="max-w-md mx-auto p-8 rounded-3xl bg-[#162721] border border-[#234238] space-y-3">
              <span className="text-3xl">🔒</span>
              <h3 className="text-2xl font-black uppercase text-[#F2FAF7] font-display">Recrutement Suspendu</h3>
              <p className="text-xs text-[#A3D9C9]/80">
                Les adhésions au club JokerEsen pour la session en cours sont actuellement fermées. Suivez nos réseaux sociaux pour la prochaine vague de recrutement !
              </p>
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

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(tab) => {
          if (tab === 'admin') {
            handleSetView('admin');
          }
        }}
      />
    </div>
  );
}

export default App;
