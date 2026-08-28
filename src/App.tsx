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
import { fetchClubSettings } from './services/settingsService';

export function App() {
  const [currentView, setCurrentView] = useState<'public' | 'admin'>('public');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState(true);

  // Dynamic Event Data: Initialized immediately with local cache for zero delay
  const [eventData, setEventData] = useState(() => getCachedEvent());

  // Dynamic Executive Team Members: Initialized immediately with local cache
  // One-time migration: clear old fake placeholder names from cache
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const FAKE_DEFAULT_NAMES = ['Yasmine Ben Salem', 'Youssef Trabelsi', 'Sarra Chaabane', 'Amine Karray', 'Nour El Hoda Gharbi', 'Kahlil Ferjani'];
    const cached = getCachedTeam();
    const hasFakePlaceholders = cached.some((m) => FAKE_DEFAULT_NAMES.includes(m.name));
    if (hasFakePlaceholders) {
      // Wipe the fake cache so Supabase data (or empty) is used
      cacheTeam([]);
      return [];
    }
    return cached;
  });

  // Load live data from Supabase upon initial mounting
  useEffect(() => {
    async function loadInitialData() {
      try {
        // 1. Settings (Recruitment Status)
        const settings = await fetchClubSettings();
        if (settings && typeof settings.recruitment_open === 'boolean') {
          setRecruitmentOpen(settings.recruitment_open);
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
        if (dbTeam && dbTeam.length > 0) {
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

  if (currentView === 'admin') {
    return (
      <AdminDashboard
        onBackToPublic={() => setCurrentView('public')}
        recruitmentOpen={recruitmentOpen}
        onToggleRecruitment={setRecruitmentOpen}
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
          setCurrentView('admin');
        } else {
          setIsLoginOpen(true);
        }
      }} />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(tab) => {
          if (tab === 'admin') {
            setCurrentView('admin');
          }
        }}
      />
    </div>
  );
}

export default App;
