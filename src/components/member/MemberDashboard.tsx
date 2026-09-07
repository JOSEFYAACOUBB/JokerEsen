import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Award,
  Users,
  BookOpen,
  Trophy,
  LogOut,
  Sparkles,
  QrCode,
  CheckCircle2,
  X,
  Star,
  Download,
  Flame,
  ThumbsUp,
  Plus,
  ExternalLink,
  Shield,
  FileText,
  Code,
  Zap,
} from 'lucide-react';
import type { EventRecord } from '../../types/database';
import type {
  ClubMember,
  MemberCertificate,
  ForumIdea,
  MemberResource,
  MemberEventRegistration,
} from '../../types/member';
import {
  logoutMemberSession,
  getMemberCertificates,
  getForumIdeas,
  addForumIdea,
  voteForumIdea,
  getMemberResources,
  getMemberEventRegistrations,
  toggleEventRegistration,
  getStoredMembers,
} from '../../services/memberService';

interface MemberDashboardProps {
  member: ClubMember;
  allEvents: EventRecord[];
  onLogout: () => void;
  onGoToPublic: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member: initialMember,
  allEvents,
  onLogout,
  onGoToPublic,
}) => {
  const [currentMember, setCurrentMember] = useState<ClubMember>(initialMember);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'certificates' | 'community' | 'resources' | 'leaderboard'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Data states
  const [certificates, setCertificates] = useState<MemberCertificate[]>([]);
  const [forumIdeas, setForumIdeas] = useState<ForumIdea[]>([]);
  const [resources, setResources] = useState<MemberResource[]>([]);
  const [registrations, setRegistrations] = useState<MemberEventRegistration[]>([]);
  const [allMembers, setAllMembers] = useState<ClubMember[]>([]);

  // Modals & Active Selections
  const [selectedCertificate, setSelectedCertificate] = useState<MemberCertificate | null>(null);
  const [isNewIdeaModalOpen, setIsNewIdeaModalOpen] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaCategory, setNewIdeaCategory] = useState<ForumIdea['category']>('evenement');
  const [newIdeaDesc, setNewIdeaDesc] = useState('');
  const [selectedPassEvent, setSelectedPassEvent] = useState<EventRecord | null>(null);

  useEffect(() => {
    setCertificates(getMemberCertificates(currentMember.id));
    setForumIdeas(getForumIdeas());
    setResources(getMemberResources());
    setRegistrations(getMemberEventRegistrations(currentMember.id));
    setAllMembers(getStoredMembers());
  }, [currentMember.id]);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Level thresholds
  const getNextLevelThreshold = (points: number) => {
    if (points < 501) return { next: 'Argent', target: 501, prev: 0 };
    if (points < 1501) return { next: 'Or', target: 1501, prev: 501 };
    if (points < 3001) return { next: 'Platine', target: 3001, prev: 1501 };
    return { next: 'Platine Max', target: 5000, prev: 3001 };
  };

  const levelInfo = getNextLevelThreshold(currentMember.points);
  const levelProgress = Math.min(
    100,
    Math.max(0, ((currentMember.points - levelInfo.prev) / (levelInfo.target - levelInfo.prev)) * 100)
  );

  const handleToggleRegistration = (event: EventRecord) => {
    const { registrations: updatedRegs, isRegistered } = toggleEventRegistration(
      currentMember,
      event.id || 'evt-demo',
      event.title
    );
    setRegistrations(updatedRegs);
    setAllMembers(getStoredMembers());
    const latestSelf = getStoredMembers().find((m) => m.id === currentMember.id);
    if (latestSelf) setCurrentMember(latestSelf);

    if (isRegistered) {
      showToast(`Inscription réussie à "${event.title}" (+10 pts ajoutés !)`, 'success');
    } else {
      showToast(`Inscription annulée pour "${event.title}".`, 'info');
    }
  };

  const handlePostIdeaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle || !newIdeaDesc) return;

    const updatedIdeas = addForumIdea(currentMember, newIdeaTitle, newIdeaCategory, newIdeaDesc);
    setForumIdeas(updatedIdeas);
    setIsNewIdeaModalOpen(false);
    setNewIdeaTitle('');
    setNewIdeaDesc('');

    const latestSelf = getStoredMembers().find((m) => m.id === currentMember.id);
    if (latestSelf) setCurrentMember(latestSelf);

    showToast('Proposition enregistrée avec succès (+20 pts de contribution !)', 'success');
  };

  const handleVoteIdea = (ideaId: string) => {
    const updated = voteForumIdea(ideaId, currentMember.id);
    setForumIdeas(updated);
  };

  return (
    <div data-member-panel className="min-h-screen bg-[#F0F4F8] text-slate-900 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-blue-400/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-white">{toast.message}</span>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
        
        {/* Member Sidebar */}
        <aside className="w-full lg:w-72 bg-slate-900 text-white p-5 flex flex-col justify-between shrink-0 border-r border-slate-800">
          <div className="space-y-6">
            
            {/* Header / Brand */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center shrink-0">
                <img
                  src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                  alt="Joker ESEN"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-tight uppercase font-sans">JOKER ESEN</h1>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Espace Membre Officiel</p>
              </div>
            </div>

            {/* Member Card Snapshot */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 shadow-md">
              <div className="flex items-center gap-3">
                <img
                  src={currentMember.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                  alt={currentMember.full_name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-blue-400/50 shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-white truncate font-sans">{currentMember.full_name}</h2>
                  <p className="text-[10px] text-blue-200 truncate">{currentMember.department}</p>
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[9px] font-extrabold uppercase">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>Niveau {currentMember.level} ({currentMember.points} pts)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Tableau de Bord', icon: LayoutDashboard },
                { id: 'events', label: 'Événements & Workshops', icon: Calendar, badge: allEvents.length },
                { id: 'certificates', label: 'Mes Certificats', icon: Award, badge: certificates.length },
                { id: 'community', label: 'Communauté & Forum', icon: Users, badge: forumIdeas.length },
                { id: 'resources', label: 'Ressources & Cours', icon: BookOpen, badge: resources.length },
                { id: 'leaderboard', label: 'Classement & Badges', icon: Trophy },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="text-white">{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white text-blue-900' : 'bg-slate-800 text-slate-300'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-800 space-y-2 mt-6">
            <button
              onClick={onGoToPublic}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-white">Site Public</span>
              </span>
              <span className="text-[10px] text-slate-400">&rarr;</span>
            </button>

            <button
              onClick={() => {
                logoutMemberSession();
                onLogout();
              }}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-rose-200 font-bold">Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Digital Member Card & Gamification Progress Header */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Official Digital Pass Card */}
                <div className="lg:col-span-2 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border border-blue-500/40 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <QrCode className="w-48 h-48 text-blue-400" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[10px] font-bold uppercase tracking-wider">
                        <Shield className="w-3 h-3 text-blue-300" />
                        <span>Carte Officielle Joker ESEN</span>
                      </div>
                      <span className="font-mono text-xs text-blue-300/80">ID: {currentMember.id.toUpperCase()}</span>
                    </div>

                    <div className="flex items-start gap-4">
                      <img
                        src={currentMember.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                        alt={currentMember.full_name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-400/60 shadow-md shrink-0"
                      />
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                          {currentMember.full_name}
                        </h2>
                        <p className="text-xs text-blue-200 font-medium">{currentMember.major}</p>
                        <p className="text-[11px] text-blue-300/80 font-mono mt-0.5">{currentMember.department} · {currentMember.role.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs mt-4">
                    <div>
                      <span className="text-[10px] text-blue-300 uppercase block">Membre Depuis</span>
                      <span className="font-bold text-white">{currentMember.join_date}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-300 uppercase block">Statut Émargement</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Actif &amp; Validé</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score & Progression Box */}
                <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score de Participation</span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                        {currentMember.points} PTS
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 font-sans">
                      Rang {currentMember.level} 🏆
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Objectif suivant: <strong className="text-slate-900">{levelInfo.next}</strong> ({levelInfo.target} pts)
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                        style={{ width: `${levelProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                      <span>{currentMember.points} pts</span>
                      <span>{levelInfo.target} pts</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Inscrivez-vous aux workshops pour gagner +10 pts par événement !</span>
                  </div>
                </div>

              </div>

              {/* Activity Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Événements Suivis</span>
                    <h4 className="text-2xl font-black text-slate-900 font-sans">{currentMember.events_attended || 0}</h4>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Certificats Validés</span>
                    <h4 className="text-2xl font-black text-slate-900 font-sans">{certificates.length}</h4>
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Streak Assiduité</span>
                    <h4 className="text-2xl font-black text-slate-900 font-sans">{currentMember.streak_months || 1} mois 🔥</h4>
                  </div>
                </div>
              </div>

              {/* Badges Section */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-sans">
                      Badges d'Excellence &amp; Accomplissements ({currentMember.badges.length})
                    </h3>
                    <p className="text-xs text-slate-500">Badges attribués automatiquement lors de vos participations.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'Newcomer', icon: '🎯', desc: '1ère participation' },
                    { name: 'Knowledge Seeker', icon: '📚', desc: '5 formations accomplies' },
                    { name: 'Super Actif', icon: '🌟', desc: 'Top 10 du mois' },
                    { name: 'Mentor', icon: '🤝', desc: 'Aidé 5+ membres' },
                    { name: 'Innovateur', icon: '🚀', desc: 'Proposé 3+ projets' },
                    { name: 'Leader', icon: '👑', desc: 'Top 3 du classement' },
                    { name: 'Expert Certifié', icon: '🎓', desc: '10+ certificats' },
                    { name: 'On Fire', icon: '🔥', desc: '3 mois consécutifs actif' },
                  ].map((badge) => {
                    const isUnlocked = currentMember.badges.includes(badge.name);
                    return (
                      <div
                        key={badge.name}
                        className={`p-4 rounded-2xl border transition-all text-center space-y-1 ${
                          isUnlocked
                            ? 'bg-gradient-to-b from-amber-50 to-orange-50/40 border-amber-200 shadow-xs'
                            : 'bg-slate-50 border-slate-200/60 opacity-40 grayscale'
                        }`}
                      >
                        <div className="text-2xl">{badge.icon}</div>
                        <div className="text-xs font-bold text-slate-900">{badge.name}</div>
                        <div className="text-[10px] text-slate-500">{badge.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EVENTS & WORKSHOPS */}
          {activeTab === 'events' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                    Agenda des Formations &amp; Événements ({allEvents.length})
                  </h2>
                  <p className="text-xs text-slate-500">Inscrivez-vous en 1 clic pour garantir votre place et obtenir vos points.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allEvents.map((evt) => {
                  const isReg = registrations.some((r) => r.event_id === evt.id);
                  return (
                    <div
                      key={evt.id || evt.title}
                      className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                            {evt.edition || 'Joker Event'}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">{evt.date}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 font-sans">{evt.title}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2">{evt.program}</p>
                        <p className="text-[11px] text-slate-500 font-medium">📍 {evt.location}</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => setSelectedPassEvent(evt)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-slate-600" />
                          <span>Voir Pass QR</span>
                        </button>

                        <button
                          onClick={() => handleToggleRegistration(evt)}
                          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isReg
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                          }`}
                        >
                          <span className={isReg ? 'text-rose-700' : 'text-white'}>
                            {isReg ? 'Annuler Inscription' : 'M\'inscrire (+10 pts)'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                  Mes Certificats &amp; Accomplissements ({certificates.length})
                </h2>
                <p className="text-xs text-slate-500">Certificats officiels téléchargeables et vérifiables par les recruteurs.</p>
              </div>

              {certificates.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
                  <Award className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-sm">Aucun certificat pour le moment</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Participez à nos ateliers et formations à venir pour débloquer vos premiers certificats certifiés.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-6 rounded-3xl bg-gradient-to-br from-white to-blue-50/30 border border-blue-200/80 shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                            Certifié Joker ESEN
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{cert.certificate_code}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 font-sans">{cert.title}</h3>
                        <p className="text-xs text-slate-500">Événement: {cert.event_title}</p>
                        
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cert.skills.map((skill) => (
                            <span key={skill} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-blue-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">Délivré le {cert.issue_date}</span>
                        <button
                          onClick={() => setSelectedCertificate(cert)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                        >
                          <span className="text-white font-bold">Afficher / Imprimer</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMMUNITY & FORUM */}
          {activeTab === 'community' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                    Communauté &amp; Forum d'Idées Joker
                  </h2>
                  <p className="text-xs text-slate-500">Proposez des projets, votez pour vos idées préférées et connectez-vous avec les membres.</p>
                </div>
                <button
                  onClick={() => setIsNewIdeaModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white shrink-0" />
                  <span className="text-white font-bold">Proposer une Idée (+20 pts)</span>
                </button>
              </div>

              {/* Forum List */}
              <div className="space-y-4">
                {forumIdeas.map((idea) => {
                  const hasVoted = idea.voted_by.includes(currentMember.id);
                  return (
                    <div key={idea.id} className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={idea.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                            alt={idea.author_name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm font-sans">{idea.title}</h3>
                            <p className="text-[11px] text-slate-500">Par {idea.author_name} · le {idea.created_at}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                          {idea.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">{idea.description}</p>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <button
                          onClick={() => handleVoteIdea(idea.id)}
                          className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            hasVoted
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'text-white' : 'text-slate-600'}`} />
                          <span className={hasVoted ? 'text-white' : 'text-slate-700'}>
                            {idea.votes} Votes {hasVoted && '✓'}
                          </span>
                        </button>

                        <span className="text-slate-400 font-medium">💬 {idea.comments_count} Commentaires</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                  Bibliothèque Pédagogique &amp; Supports ({resources.length})
                </h2>
                <p className="text-xs text-slate-500">Téléchargez les slides, guides et ressources des formations passées.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resources.map((res) => (
                  <div key={res.id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        {res.category === 'slides' && <FileText className="w-5 h-5" />}
                        {res.category === 'code' && <Code className="w-5 h-5" />}
                        {res.category === 'pdf' && <BookOpen className="w-5 h-5" />}
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm font-sans">{res.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{res.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">{res.file_type} · {res.file_size}</span>
                      <a
                        href={res.file_url}
                        onClick={(e) => {
                          e.preventDefault();
                          showToast(`Téléchargement de "${res.title}"...`, 'info');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span className="text-white font-bold">Télécharger</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                  Classement Multi-Niveaux &amp; Badges (Top Members)
                </h2>
                <p className="text-xs text-slate-500">Consultez le leaderboard général des membres les plus engagés.</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="space-y-3">
                  {allMembers
                    .sort((a, b) => b.points - a.points)
                    .map((m, idx) => (
                      <div
                        key={m.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                          m.id === currentMember.id
                            ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20'
                            : 'bg-white border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                              idx === 0
                                ? 'bg-amber-400 text-amber-950'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-900'
                                : idx === 2
                                ? 'bg-amber-700 text-amber-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            #{idx + 1}
                          </span>

                          <img
                            src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                            alt={m.full_name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          />

                          <div>
                            <h3 className="font-bold text-slate-900 text-xs font-sans flex items-center gap-2">
                              <span>{m.full_name}</span>
                              {m.id === currentMember.id && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold">Vous</span>
                              )}
                            </h3>
                            <p className="text-[11px] text-slate-500">{m.department} · {m.major}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block font-black text-slate-900 text-sm font-sans">{m.points} PTS</span>
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                            {m.level}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modal: View Printable Certificate */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-400 p-8 text-center space-y-6">
            <button
              onClick={() => setSelectedCertificate(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-amber-600 font-black tracking-widest text-xs uppercase font-sans">
                CLUB JOKER ESEN — CERTIFICAT OFFICIEL
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                {selectedCertificate.title}
              </h2>
            </div>

            <p className="text-sm text-slate-600 italic">
              Le bureau exécutif du club Joker ESEN certifie que
            </p>

            <h3 className="text-3xl font-black text-blue-900 font-sans underline decoration-amber-400 decoration-4">
              {selectedCertificate.member_name}
            </h3>

            <p className="text-xs text-slate-600 max-w-lg mx-auto">
              a accompli avec succès l'atelier <strong className="text-slate-900">{selectedCertificate.event_title}</strong> et s'est distingué(e) par la maîtrise des compétences suivantes:
            </p>

            <div className="flex justify-center gap-2 flex-wrap">
              {selectedCertificate.skills.map((s) => (
                <span key={s} className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  ✓ {s}
                </span>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                <span className="block font-bold text-slate-900">{selectedCertificate.instructor}</span>
                <span>Formateur / Bureau Tech</span>
              </div>
              <div className="text-right">
                <span className="block font-mono text-[11px] text-slate-400">{selectedCertificate.certificate_code}</span>
                <span>Date: {selectedCertificate.issue_date}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4 text-white" />
                <span className="text-white font-bold">Imprimer / Imprimer au Format PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Post New Idea */}
      {isNewIdeaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-sans">Proposer une Idée / Projet</h3>
              <button onClick={() => setIsNewIdeaModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostIdeaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Titre du Projet ou de l'Idée</label>
                <input
                  type="text"
                  required
                  value={newIdeaTitle}
                  onChange={(e) => setNewIdeaTitle(e.target.value)}
                  placeholder="Ex: Organisation d'une soirée LAN Gaming"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Catégorie</label>
                <select
                  value={newIdeaCategory}
                  onChange={(e) => setNewIdeaCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                >
                  <option value="evenement">Événement</option>
                  <option value="formation">Formation / Workshop</option>
                  <option value="projet">Projet Club</option>
                  <option value="autre">Autre Initiative</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Description Détaillée</label>
                <textarea
                  required
                  rows={4}
                  value={newIdeaDesc}
                  onChange={(e) => setNewIdeaDesc(e.target.value)}
                  placeholder="Expliquez en détails votre proposition..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewIdeaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                >
                  <span className="text-white font-bold">Publier (+20 pts)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Pass for Event */}
      {selectedPassEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
            <button
              onClick={() => setSelectedPassEvent(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Pass Émargement Officiel</span>
              <h3 className="font-bold text-slate-900 text-base">{selectedPassEvent.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedPassEvent.date} · {selectedPassEvent.location}</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 text-white inline-block shadow-inner">
              <QrCode className="w-32 h-32 text-white mx-auto" />
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              MEM: {currentMember.id.toUpperCase()} | EVT: {selectedPassEvent.id || 'Joker'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
