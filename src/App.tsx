import { useState } from 'react';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Team, defaultTeamMembers, type TeamMember } from './components/Team';
import { Event } from './components/Event';
import { Gallery } from './components/Gallery';
import { MembershipForm } from './components/MembershipForm';
import { LoginModal } from './components/LoginModal';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/admin/AdminDashboard';

export function App() {
  const [currentView, setCurrentView] = useState<'public' | 'admin'>('public');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState(true);

  // Dynamic Event Data managed by Admin Panel
  const [eventData, setEventData] = useState({
    title: 'Joker Carnival Night 2026',
    edition: 'Édition Spéciale · 10ème Anniversaire',
    date: 'Samedi 26 Octobre 2026 · 20h00',
    location: 'Grand Cour & Amphi ESEN, Campus Manouba',
    program: 'Concerts live · DJ set · Buffet · Tombola',
    bannerUrl: '/images/event_banner.jpg',
  });

  // Dynamic Executive Team Members managed by Admin Panel
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers);

  if (currentView === 'admin') {
    return (
      <AdminDashboard
        onBackToPublic={() => setCurrentView('public')}
        recruitmentOpen={recruitmentOpen}
        onToggleRecruitment={setRecruitmentOpen}
        eventData={eventData}
        onUpdateEvent={setEventData}
        teamMembers={teamMembers}
        onUpdateTeamMembers={setTeamMembers}
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

      <Footer onOpenAdmin={() => setCurrentView('admin')} />

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

