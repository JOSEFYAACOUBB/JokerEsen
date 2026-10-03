import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  Sparkles,
  X,
  Trophy,
  Star,
  Lightbulb,
  ThumbsUp,
  Plus,
  MessageSquare,
  Send,
  Settings,
  Check,
  Loader2,
  MapPin,
  Clock,
  ExternalLink,
  Search,
  Video,
  Phone,
  Mail,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import type { EventRecord } from '../../types/database';
import type {
  ClubMember,
  MemberEventRegistration,
  AgendaItem,
  EventFeedback,
  EventIdea,
} from '../../types/member';
import { fetchAllAgendaItems, volunteerForRole, withdrawFromRole } from '../../services/agendaService';
import { fetchAllFeedbacks, submitFeedback } from '../../services/feedbackService';
import {
  fetchAllEventIdeas,
  createEventIdea,
  toggleVoteIdea,
} from '../../services/ideaService';
import {
  logoutMemberSession,
  fetchEventRegistrationsFromDb,
  fetchMembersFromDb,
  toggleEventRegistration,
  submitMemberJustification,
  getStoredMembers,
  updateMemberProfile,
} from '../../services/memberService';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface MemberDashboardProps {
  member: ClubMember;
  allEvents?: EventRecord[];
  onLogout: () => void;
  onGoToPublic: () => void;
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; border: string; next: number }> = {
  Bronze:  { color: 'text-stone-700', bg: 'bg-stone-100', border: 'border-stone-200', next: 200 },
  Argent:  { color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', next: 600 },
  Or:      { color: 'text-amber-800', bg: 'bg-amber-50',   border: 'border-amber-200', next: 1500 },
  Platine: { color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200', next: 3000 },
};

const formatFrenchDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return dateStr
    .replace(/\b(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\b/gi, (d) => d.toLowerCase())
    .replace(/\b(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)\b/gi, (m) => m.toLowerCase());
};



export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member: initialMember,
  allEvents: _allEvents,
  onLogout,
  onGoToPublic: _onGoToPublic,
}) => {
  const [currentMember, setCurrentMember] = useState<ClubMember>(initialMember);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'points' | 'ideas' | 'settings'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedRegForJustification, setSelectedRegForJustification] = useState<MemberEventRegistration | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [isAbsenceAlertDismissed, setIsAbsenceAlertDismissed] = useState(() => {
    try { return localStorage.getItem('joker_dismissed_absence_' + initialMember.id) === 'true'; }
    catch { return false; }
  });
  const [registrations, setRegistrations] = useState<MemberEventRegistration[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [allMembers, setAllMembers] = useState<ClubMember[]>(() => getStoredMembers());

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<EventFeedback[]>([]);
  const [selectedEventForFeedback, setSelectedEventForFeedback] = useState<AgendaItem | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackAspects, setFeedbackAspects] = useState<{ organization: number; content: number; ambiance: number }>({
    organization: 0,
    content: 0,
    ambiance: 0,
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Event Ideas State
  const [ideas, setIdeas] = useState<EventIdea[]>([]);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [ideaFilter, setIdeaFilter] = useState<'all' | 'my'>('all');
  const [ideaStatusFilter, setIdeaStatusFilter] = useState<'all' | 'pending' | 'approved' | 'planned' | 'rejected'>('all');
  const [ideaSortBy, setIdeaSortBy] = useState<'votes' | 'recent'>('votes');
  const [ideaForm, setIdeaForm] = useState({
    title: '',
    category: 'Formation & Workshop',
    description: '',
    targetAudience: 'Tous les membres',
    speakerSuggestion: '',
    estimatedDuration: '2 heures',
  });
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);

  // ── Profile / Settings State ──
  const [nicknameInput, setNicknameInput] = useState(() => {
    try { return localStorage.getItem('joker_nickname_' + initialMember.id) || ''; } catch { return ''; }
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── User Dropdown Menu State ──
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (!(e.target as Element)?.closest?.('[data-action-menu]')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Agenda Filtering & Search State ──
  const [agendaCategoryFilter, setAgendaCategoryFilter] = useState<'all' | 'formation' | 'reunion' | 'evenement' | 'registered'>('all');
  const [agendaSearchQuery, setAgendaSearchQuery] = useState('');

  useEffect(() => {
    fetchEventRegistrationsFromDb().then((all) => {
      setRegistrations(all.filter((r) => r.member_id === currentMember.id));
    });
    fetchAllAgendaItems().then(setAgendaItems);
    fetchMembersFromDb().then(setAllMembers).catch(() => {});
    fetchAllFeedbacks().then(setFeedbacks).catch(() => {});
    fetchAllEventIdeas().then(setIdeas).catch(() => {});
  }, [currentMember.id]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDismissAbsenceAlert = () => {
    setIsAbsenceAlertDismissed(true);
    try { localStorage.setItem('joker_dismissed_absence_' + currentMember.id, 'true'); } catch (_) {}
  };

  const handleJustificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegForJustification || !justificationText.trim()) return;
    try {
      const updated = await submitMemberJustification(selectedRegForJustification.id, justificationText);
      setRegistrations(updated.filter((r) => r.member_id === currentMember.id));
      setSelectedRegForJustification(null);
      setJustificationText('');
      showToast("Justification transmise avec succès.", 'success');
    } catch (err) {
      console.error('Error submitting justification:', err);
      showToast("Erreur lors de la transmission de la justification.", 'error');
    }
  };

  const handleToggleRegistration = async (event: AgendaItem | EventRecord) => {
    try {
      const { registrations: updatedRegs, isRegistered, error } = await toggleEventRegistration(currentMember, event);
      if (error) {
        showToast(error, 'error');
        return;
      }
      setRegistrations(updatedRegs);
      const latestSelf = getStoredMembers().find((m) => m.id === currentMember.id);
      if (latestSelf) setCurrentMember(latestSelf);
      showToast(isRegistered ? 'Inscription réussie !' : 'Inscription annulée.', isRegistered ? 'success' : 'info');
    } catch (err) {
      console.error('Registration toggle error:', err);
      showToast("Une erreur est survenue lors de l'enregistrement.", 'error');
    }
  };

  const handleVolunteerRole = async (agendaId: string, roleId: string) => {
    const res = await volunteerForRole(agendaId, roleId, currentMember);
    if (res.success) {
      showToast(res.message, 'success');
      const updated = await fetchAllAgendaItems();
      setAgendaItems(updated);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleLeaveRole = async (agendaId: string, roleId: string) => {
    const res = await withdrawFromRole(agendaId, roleId, currentMember.id);
    if (res.success) {
      showToast(res.message, 'info');
      const updated = await fetchAllAgendaItems();
      setAgendaItems(updated);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleOpenFeedbackModal = (evt: AgendaItem) => {
    setSelectedEventForFeedback(evt);
    const existing = feedbacks.find(
      (f) => f.event_id === evt.id && f.member_id === currentMember.id
    );
    if (existing) {
      setFeedbackRating(existing.rating || 0);
      setFeedbackComment(existing.comment || '');
      setFeedbackAspects({
        organization: existing.aspects?.organization ?? 0,
        content: existing.aspects?.content ?? 0,
        ambiance: existing.aspects?.ambiance ?? 0,
      });
    } else {
      setFeedbackRating(0);
      setFeedbackComment('');
      setFeedbackAspects({ organization: 0, content: 0, ambiance: 0 });
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForFeedback || feedbackRating < 1) return;
    setIsSubmittingFeedback(true);
    try {
      const saved = await submitFeedback({
        event_id: selectedEventForFeedback.id,
        event_title: selectedEventForFeedback.title,
        member_id: currentMember.id,
        member_name: currentMember.full_name,
        member_email: currentMember.email,
        member_avatar: currentMember.avatar_url,
        rating: feedbackRating,
        comment: feedbackComment.trim(),
        aspects: feedbackAspects,
      });
      setFeedbacks((prev) => [
        saved,
        ...prev.filter(
          (f) => !(f.event_id === saved.event_id && f.member_id === saved.member_id)
        ),
      ]);
      setSelectedEventForFeedback(null);
      showToast('Votre avis a été transmis avec succès ! Merci pour votre retour.', 'success');
    } catch (_) {
      showToast("Erreur lors de l'enregistrement de votre avis.", 'error');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Idea handlers
  const handleVoteIdea = async (ideaId: string) => {
    const updated = await toggleVoteIdea(ideaId, currentMember.id);
    if (updated) {
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? updated : i)));
      const hasVotedNow = updated.votes.includes(currentMember.id);
      showToast(hasVotedNow ? 'Vote enregistré ! Merci pour votre soutien.' : 'Vote retiré.', 'info');
    }
  };

  const handleOpenIdeaModal = () => {
    setIdeaForm({
      title: '',
      category: 'Formation & Workshop',
      description: '',
      targetAudience: 'Tous les membres',
      speakerSuggestion: '',
      estimatedDuration: '2 heures',
    });
    setIsIdeaModalOpen(true);
  };

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaForm.title.trim() || !ideaForm.description.trim()) {
      showToast('Veuillez renseigner un titre et une description.', 'error');
      return;
    }

    setIsSubmittingIdea(true);
    try {
      const created = await createEventIdea({
        title: ideaForm.title.trim(),
        category: ideaForm.category,
        description: ideaForm.description.trim(),
        target_audience: ideaForm.targetAudience.trim(),
        speaker_suggestion: ideaForm.speakerSuggestion.trim(),
        estimated_duration: ideaForm.estimatedDuration.trim(),
        member_id: currentMember.id,
        member_name: currentMember.full_name,
        member_email: currentMember.email,
        member_avatar: currentMember.avatar_url,
      });

      setIdeas((prev) => [created, ...prev.filter((i) => i.id !== created.id)]);
      setIsIdeaModalOpen(false);
      showToast('Votre idée a été soumise avec succès au bureau !', 'success');
      setActiveTab('ideas');
    } catch (_) {
      showToast("Erreur lors de l'envoi de votre proposition.", 'error');
    } finally {
      setIsSubmittingIdea(false);
    }
  };

  // Points helpers
  const pts = currentMember.points ?? 0;
  const lvlCfg = LEVEL_CONFIG[currentMember.level] || LEVEL_CONFIG.Bronze;
  const prevPts = currentMember.level === 'Bronze' ? 0 : currentMember.level === 'Argent' ? 501 : currentMember.level === 'Or' ? 1501 : 3001;
  const nextPts = lvlCfg.next;
  const progress = currentMember.level === 'Platine' ? 100 : Math.min(100, Math.round(((pts - prevPts) / (nextPts - prevPts)) * 100));

  const displayName = (nicknameInput || currentMember.full_name).trim().split(' ')[0];

  return (
    <div data-member-panel className="min-h-screen bg-[#FAF9F7] text-gray-900 flex flex-col font-sans">

      {toast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-gray-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="shrink-0 flex items-center py-1.5">
              <img
                src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_480/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                alt="Joker ESEN"
                className="h-10 sm:h-11 w-auto object-contain"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 h-16">
              {[
                { id: 'overview', label: 'Tableau de bord' },
                { id: 'events',   label: 'Agenda' },
                { id: 'points',   label: 'Points & Classement' },
                { id: 'ideas',    label: 'Boîte à idées' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative h-16 flex items-center px-3.5 text-sm transition-colors cursor-pointer ${
                      isActive
                        ? 'text-gray-900 font-semibold'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#9E1B32]" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right: User Dropdown Menu */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 sm:px-2 sm:py-1.5 rounded-xl hover:bg-stone-100/80 transition-colors cursor-pointer text-gray-700 hover:text-gray-900"
                aria-expanded={isUserMenuOpen}
                title="Menu utilisateur"
              >
                <img
                  src={avatarPreview || currentMember.avatar_url || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(currentMember.full_name) + '&background=e5e7eb&color=374151')}
                  alt={currentMember.full_name}
                  className="w-8 h-8 rounded-full object-cover bg-gray-100 shrink-0"
                />
                <span className="text-sm font-medium text-gray-800 hidden sm:inline">
                  {displayName}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-gray-700' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 truncate">{currentMember.full_name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{currentMember.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('settings');
                        setIsUserMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-colors ${
                        activeTab === 'settings'
                          ? 'text-[#9E1B32] bg-[#9E1B32]/5 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span>Paramètres du profil</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logoutMemberSession();
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2.5 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-gray-400" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-24 sm:pb-8">

        {/* Absence alert */}
        {!isAbsenceAlertDismissed && registrations.some((r) => r.attendance_status === 'absent' || Boolean(r.absence_remark)) && (
          <div className="p-5 rounded-3xl bg-rose-600 text-white shadow-xl border-2 border-rose-400 space-y-3 relative">
            <button onClick={handleDismissAbsenceAlert} className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4 pr-10">
              <div className="w-10 h-10 rounded-2xl bg-white text-rose-600 flex items-center justify-center shrink-0 font-black text-lg">!</div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-200 mb-1">Signalement Officiel</div>
                <h3 className="font-black text-white text-sm">Absence non justifiee enregistree par l'administration</h3>
                <p className="text-xs text-rose-200 mt-1">Consultez l'onglet Agenda pour les détails.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW / TABLEAU DE BORD */}
        {activeTab === 'overview' && (() => {
          // 1. Calculate Rank & Members Count
          const activeMembers = allMembers.filter((m) => m.status === 'active');
          const sortedMembers = [...activeMembers].sort((a, b) => (b.points || 0) - (a.points || 0));
          let curRank = 1;
          let myRank = 1;
          sortedMembers.forEach((m, idx) => {
            if (idx > 0 && (m.points || 0) < (sortedMembers[idx - 1].points || 0)) {
              curRank = idx + 1;
            }
            if (m.id === currentMember.id) {
              myRank = curRank;
            }
          });

          // 2. Next Session Calculation
          const todayStr = new Date().toISOString().split('T')[0];
          const upcomingSessions = agendaItems
            .filter((e) => !e.date || e.date >= todayStr)
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

          const myUpcomingRegistration = registrations
            .filter((r) => r.status !== 'cancelled')
            .map((r) => ({ reg: r, evt: agendaItems.find((e) => e.id === r.event_id) }))
            .filter(({ evt }) => evt && (!evt.date || evt.date >= todayStr))
            .sort((a, b) => (a.evt?.date || '').localeCompare(b.evt?.date || ''))[0];

          const nextSession = myUpcomingRegistration?.evt || upcomingSessions[0];
          const isRegisteredToNext = Boolean(
            myUpcomingRegistration ||
            (nextSession && registrations.some((r) => r.event_id === nextSession.id && r.status !== 'cancelled'))
          );

          // 3. Latest Idea Calculation
          const myIdeas = ideas.filter((i) => i.member_id === currentMember.id);
          const latestMyIdea = myIdeas[0];
          const latestClubIdea = ideas[0];

          const statusConfig = {
            pending: { label: 'En étude', dot: 'bg-amber-500', text: 'text-amber-700' },
            approved: { label: 'Retenue', dot: 'bg-emerald-500', text: 'text-emerald-700' },
            planned: { label: 'Planifiée', dot: 'bg-sky-600', text: 'text-sky-700' },
            rejected: { label: 'Non retenue', dot: 'bg-stone-400', text: 'text-stone-500' },
          };

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Greeting */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Bonjour {displayName}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Voici le récapitulatif de vos activités et de vos prochaines sessions.
                </p>
              </div>

              {/* 1. Actionable block: Prochaine session */}
              <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900">
                    Prochaine session
                  </span>
                  {nextSession && (
                    isRegisteredToNext ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>Inscrit(e)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded font-medium">
                        À venir
                      </span>
                    )
                  )}
                </div>

                {nextSession ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <h2 className="text-base font-semibold text-gray-900 leading-snug">
                        {nextSession.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {nextSession.date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>{formatFrenchDate(nextSession.date)}{nextSession.edition ? ` · ${nextSession.edition}` : ''}</span>
                          </div>
                        )}
                        {nextSession.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{nextSession.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isRegisteredToNext ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab('events')}
                          className="text-xs font-semibold text-[#9E1B32] hover:text-[#851629] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Voir dans l'agenda</span>
                          <span>→</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleRegistration(nextSession)}
                          className="px-4 py-2 rounded-xl bg-[#9E1B32] hover:bg-[#851629] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer min-h-[44px]"
                        >
                          S'inscrire à la session
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center space-y-1">
                    <p className="text-xs text-gray-500">
                      Aucune session programmée dans l'immédiat.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('events')}
                      className="text-xs font-semibold text-[#9E1B32] hover:text-[#851629] transition-colors cursor-pointer"
                    >
                      Ouvrir l'agenda →
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Informational block: Points & Level strip */}
              <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 flex-wrap">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-gray-900 tabular-nums">{pts}</span>
                    <span className="text-xs text-gray-500 font-medium">points</span>
                  </div>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs text-stone-600">
                    Rang <strong className="text-gray-900 tabular-nums">{myRank === 1 ? '1er' : `${myRank}e`}</strong> sur {activeMembers.length} membres actifs
                  </span>
                  <span className="text-stone-300 hidden sm:inline">·</span>
                  {(() => {
                    const lvl = LEVEL_CONFIG[currentMember.level] || LEVEL_CONFIG.Bronze;
                    return (
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${lvl.bg} ${lvl.color} ${lvl.border}`}>
                        Niveau {currentMember.level || 'Bronze'}
                      </span>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('points')}
                  className="text-xs font-semibold text-[#9E1B32] hover:text-[#851629] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span>Voir le classement complet</span>
                  <span>→</span>
                </button>
              </div>

              {/* 3. Community / Proposal Block */}
              <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900">
                      {latestMyIdea ? 'Votre dernière proposition' : 'Boîte à idées'}
                    </span>
                    {latestMyIdea && (
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${(statusConfig[latestMyIdea.status] || statusConfig.pending).text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${(statusConfig[latestMyIdea.status] || statusConfig.pending).dot}`} />
                        <span>{(statusConfig[latestMyIdea.status] || statusConfig.pending).label}</span>
                      </span>
                    )}
                  </div>

                  {latestMyIdea ? (
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold text-gray-900 leading-snug">
                        {latestMyIdea.title}
                      </h2>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {latestMyIdea.description}
                      </p>
                      <div className="text-[11px] text-gray-400">
                        {latestMyIdea.votes?.length || 0} vote{(latestMyIdea.votes?.length || 0) > 1 ? 's' : ''}
                        {latestMyIdea.admin_notes ? ` · Note du bureau reçue` : ''}
                      </div>
                    </div>
                  ) : latestClubIdea ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">
                        Dernière proposition soumise par la communauté :
                      </p>
                      <h2 className="text-sm font-semibold text-gray-900 leading-snug">
                        {latestClubIdea.title}
                      </h2>
                      <div className="text-[11px] text-gray-400">
                        Proposé par {latestClubIdea.member_name} · {latestClubIdea.votes?.length || 0} vote{(latestClubIdea.votes?.length || 0) > 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-1">
                      <p className="text-xs text-gray-500">
                        Aucune idée soumise pour l'instant.
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Partagez une idée d'atelier ou de formation pour les prochains rassemblements.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  {latestMyIdea ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIdeaFilter('my');
                        setActiveTab('ideas');
                      }}
                      className="text-xs font-semibold text-[#9E1B32] hover:text-[#851629] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Suivre mes propositions</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('ideas')}
                      className="text-xs font-semibold text-[#9E1B32] hover:text-[#851629] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Participer aux votes &amp; idées</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: AGENDA */}
        {activeTab === 'events' && (() => {
          const formationCount = agendaItems.filter((e) => (e.event_type || 'formation') === 'formation').length;
          const reunionCount = agendaItems.filter((e) => e.event_type === 'reunion').length;
          const evenementCount = agendaItems.filter((e) => e.event_type === 'evenement').length;
          const myRegCount = registrations.filter((r) => agendaItems.some((e) => e.id === r.event_id)).length;

          const filteredAgendaItems = agendaItems.filter((evt) => {
            const isReg = registrations.some((r) => r.event_id === evt.id);
            const eventType = evt.event_type || 'formation';

            if (agendaCategoryFilter === 'registered' && !isReg) return false;
            if (agendaCategoryFilter !== 'all' && agendaCategoryFilter !== 'registered' && eventType !== agendaCategoryFilter) return false;

            if (agendaSearchQuery.trim()) {
              const q = agendaSearchQuery.toLowerCase();
              const matchTitle = evt.title?.toLowerCase().includes(q);
              const matchEdition = evt.edition?.toLowerCase().includes(q);
              const matchLocation = evt.location?.toLowerCase().includes(q);
              const matchProgram = evt.program?.toLowerCase().includes(q);
              const matchTrainer = evt.trainer?.name?.toLowerCase().includes(q) || evt.trainer?.formation_type?.toLowerCase().includes(q);
              if (!matchTitle && !matchEdition && !matchLocation && !matchProgram && !matchTrainer) {
                return false;
              }
            }
            return true;
          });

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header row: Title on left, outline button on right */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Agenda des formations</span>
                    <span className="text-gray-400 font-normal text-sm">({agendaItems.length})</span>
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={handleOpenIdeaModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer shrink-0 w-fit min-h-[40px]"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
                  <span>Proposer une idée</span>
                </button>
              </div>

              {/* Filters and search in one clean row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Filter tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'Toutes', count: agendaItems.length },
                    { id: 'formation', label: 'Formations', count: formationCount },
                    { id: 'reunion', label: 'Réunions', count: reunionCount },
                    { id: 'evenement', label: 'Événements', count: evenementCount },
                    { id: 'registered', label: 'Mes inscriptions', count: myRegCount },
                  ].map((tab) => {
                    const isActive = agendaCategoryFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAgendaCategoryFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                          isActive
                            ? 'bg-[#9E1B32]/10 text-[#9E1B32] font-semibold'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[11px] ${isActive ? 'text-[#9E1B32]/80 font-medium' : 'text-stone-400'}`}>
                          ({tab.count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search input */}
                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={agendaSearchQuery}
                    onChange={(e) => setAgendaSearchQuery(e.target.value)}
                    placeholder="Rechercher une session..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#9E1B32] focus:border-[#9E1B32] transition-colors min-h-[36px]"
                  />
                  {agendaSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAgendaSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions Grid */}
              {agendaItems.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/80 space-y-3 shadow-2xs">
                  <Calendar className="w-10 h-10 text-stone-300 mx-auto" />
                  <div className="space-y-1 max-w-sm mx-auto">
                    <p className="text-sm font-semibold text-stone-900">Aucune session programmée</p>
                    <p className="text-xs text-stone-500">
                      Les nouvelles sessions de formations et réunions apparaîtront ici dès leur planification.
                    </p>
                  </div>
                </div>
              ) : filteredAgendaItems.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/80 space-y-2 shadow-2xs">
                  <p className="text-xs font-medium text-stone-700">
                    {agendaCategoryFilter === 'formation'
                      ? 'Aucune formation prévue pour le moment'
                      : agendaCategoryFilter === 'reunion'
                      ? 'Aucune réunion prévue pour le moment'
                      : agendaCategoryFilter === 'evenement'
                      ? 'Aucun événement prévu pour le moment'
                      : agendaCategoryFilter === 'registered'
                      ? "Vous n'êtes inscrit(e) à aucune session pour le moment"
                      : 'Aucune session ne correspond à votre recherche'}
                  </p>
                  {(agendaCategoryFilter !== 'all' || agendaSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAgendaCategoryFilter('all');
                        setAgendaSearchQuery('');
                      }}
                      className="text-xs text-[#9E1B32] hover:underline cursor-pointer font-medium"
                    >
                      Afficher toutes les sessions
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAgendaItems.map((evt) => {
                    const isReg = registrations.some((r) => r.event_id === evt.id);
                    const userReg = registrations.find((r) => r.event_id === evt.id);
                    const eventType = evt.event_type || 'formation';
                    const maxSeats = evt.max_seats ?? 50;
                    const myFeedback = feedbacks.find(
                      (f) => f.event_id === evt.id && f.member_id === currentMember.id
                    );

                    return (
                      <div
                        key={evt.id}
                        className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-xs p-5 flex flex-col justify-between transition-shadow space-y-4"
                      >
                        <div className="space-y-3">
                          {/* Top row: category indicator (only when on 'all' or 'registered') and state indicator */}
                          <div className="flex items-center justify-between text-xs gap-2">
                            {agendaCategoryFilter === 'all' || agendaCategoryFilter === 'registered' ? (
                              <span className="text-[11px] font-medium text-gray-500 capitalize">
                                {eventType} {evt.edition ? `· ${evt.edition}` : ''}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">
                                {evt.edition || ''}
                              </span>
                            )}

                            {isReg ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                <span>Inscrit(e)</span>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {maxSeats} places
                              </span>
                            )}
                          </div>

                          {/* Session Title */}
                          <h3 className="text-base font-semibold text-gray-900 leading-snug">
                            {evt.title}
                          </h3>

                          {/* Date and Location as plain text with small icons */}
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{formatFrenchDate(evt.date)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{evt.location}</span>
                            </div>
                          </div>

                          {/* Program summary */}
                          {evt.program && (
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                              {evt.program}
                            </p>
                          )}

                          {/* Remote meeting link (if registered) */}
                          {isReg && evt.meeting_url && (
                            <div className="pt-1">
                              <a
                                href={evt.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E1B32] hover:text-[#851629] hover:underline"
                              >
                                <Video className="w-3.5 h-3.5 text-[#9E1B32]" />
                                <span>Rejoindre la visio</span>
                                <ExternalLink className="w-3 h-3 text-[#9E1B32]/70" />
                              </a>
                            </div>
                          )}

                          {/* Trainer / Intervenant contact row (flattened) */}
                          {evt.trainer && (evt.trainer.name || evt.trainer.phone || evt.trainer.email) && (
                            <div className="pt-2 text-xs text-gray-600 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">
                                  {evt.trainer.name || 'Formateur Intervenant'}
                                  {evt.trainer.formation_type && (
                                    <span className="font-normal text-gray-500 ml-1">· {evt.trainer.formation_type}</span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 pt-0.5 flex-wrap">
                                {evt.trainer.phone && (
                                  <a href={`tel:${evt.trainer.phone}`} className="hover:text-[#9E1B32] flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    <span>{evt.trainer.phone}</span>
                                  </a>
                                )}
                                {evt.trainer.phone && (
                                  <a
                                    href={`https://wa.me/${evt.trainer.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:underline"
                                  >
                                    WhatsApp
                                  </a>
                                )}
                                {evt.trainer.email && (
                                  <a href={`mailto:${evt.trainer.email}`} className="hover:text-[#9E1B32] flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-gray-400" />
                                    <span className="truncate max-w-[140px]">{evt.trainer.email}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Volunteer role (inline soft desist, no extra divider) */}
                          {evt.helper_roles && evt.helper_roles.length > 0 && (() => {
                            const myHelperRole = evt.helper_roles.find((r) =>
                              r.helpers?.some((h) => h.member_id === currentMember.id)
                            );

                            if (myHelperRole) {
                              return (
                                <div className="pt-2 flex items-center justify-between text-xs">
                                  <span className="text-gray-700">
                                    <span className="font-medium text-gray-900">Bénévole :</span> {myHelperRole.role_name}
                                    {myHelperRole.points_reward ? (
                                      <span className="text-gray-500 ml-1">(+{myHelperRole.points_reward} pts)</span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => handleLeaveRole(evt.id, myHelperRole.id)}
                                      className="ml-2 text-xs text-stone-400 hover:text-stone-600 underline cursor-pointer"
                                    >
                                      Se désister
                                    </button>
                                  </span>
                                </div>
                              );
                            }

                            const openRoles = evt.helper_roles.filter(
                              (r) => r.max_spots - (r.helpers?.length || 0) > 0
                            );
                            if (openRoles.length === 0) return null;

                            return (
                              <div className="pt-2 text-xs text-gray-600 space-y-1.5">
                                <span className="text-[11px] text-gray-500 font-medium">Bénévolat :</span>
                                {openRoles.map((role) => {
                                  const spotsLeft = role.max_spots - (role.helpers?.length || 0);
                                  return (
                                    <div key={role.id} className="flex items-center justify-between gap-2">
                                      <span className="text-gray-700">
                                        {role.role_name} · <span className="text-gray-500">{spotsLeft} place{spotsLeft > 1 ? 's' : ''}</span>
                                        {role.points_reward ? (
                                          <span className="text-gray-500 ml-1">(+{role.points_reward} pts)</span>
                                        ) : null}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleVolunteerRole(evt.id, role.id)}
                                        className="text-[#9E1B32] hover:underline font-medium text-xs cursor-pointer shrink-0"
                                      >
                                        Participer
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Justification / Feedback status note */}
                          {userReg?.justification_reason && (
                            <div className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2.5 border border-amber-200">
                              <span className="font-medium">Absence signalée :</span> "{userReg.justification_reason}"
                            </div>
                          )}

                          {myFeedback && (
                            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span>Votre avis : {myFeedback.rating}/5</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenFeedbackModal(evt)}
                                className="text-[#9E1B32] hover:underline text-xs font-medium cursor-pointer"
                              >
                                Modifier
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Card bottom: one primary action button hierarchy */}
                        <div className="pt-3 border-t border-gray-100">
                          {isReg ? (
                            <div className="flex items-center justify-between w-full min-h-[44px]">
                              {/* ⋯ Menu for secondary/rare actions */}
                              <div className="relative" data-action-menu>
                                <button
                                  type="button"
                                  onClick={() => setOpenActionMenuId(openActionMenuId === evt.id ? null : evt.id)}
                                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                                  aria-label="Options"
                                  title="Options de l'inscription"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {openActionMenuId === evt.id && (
                                  <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-30 animate-in fade-in zoom-in-95">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        setSelectedRegForJustification(userReg || null);
                                        setJustificationText(userReg?.justification_reason || '');
                                      }}
                                      className="w-full px-3.5 py-2 text-left text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <span>{userReg?.justification_reason ? 'Modifier motif absence' : 'Signaler une absence'}</span>
                                    </button>

                                    {!myFeedback && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          handleOpenFeedbackModal(evt);
                                        }}
                                        className="w-full px-3.5 py-2 text-left text-xs text-stone-700 hover:bg-stone-50 flex flex-col cursor-pointer"
                                      >
                                        <span>Donner un avis</span>
                                        <span className="text-[10px] text-stone-400">Disponible après la session</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Single clear action on the right */}
                              <button
                                type="button"
                                onClick={() => handleToggleRegistration(evt)}
                                className="text-xs font-medium text-stone-500 hover:text-rose-600 transition-colors cursor-pointer min-h-[44px] px-3 py-2 flex items-center justify-center"
                              >
                                Annuler mon inscription
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleRegistration(evt)}
                              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#9E1B32] hover:bg-[#851629] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <span>S'inscrire</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3: POINTS & CLASSEMENT */}
        {activeTab === 'points' && (() => {
          const levels = ['Bronze', 'Argent', 'Or', 'Platine'];
          const currentLevelIndex = Math.max(0, levels.indexOf(currentMember.level));
          const nextLevelName = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1] : null;

          // Filter active members and sort by points descending, tie-break by name
          const activeMembers = allMembers.filter((m) => m.status === 'active');
          const sortedAllMembers = [...activeMembers].sort((a, b) => {
            const pDiff = (b.points || 0) - (a.points || 0);
            if (pDiff !== 0) return pDiff;
            return a.full_name.localeCompare(b.full_name);
          });

          // Dense ranking calculation for ties
          let curDenseRank = 1;
          const rankedAllMembers = sortedAllMembers.map((m, index) => {
            if (index > 0) {
              const prevPoints = sortedAllMembers[index - 1].points || 0;
              const thisPoints = m.points || 0;
              if (thisPoints < prevPoints) {
                curDenseRank = index + 1;
              }
            }
            return { ...m, calculatedRank: curDenseRank };
          });

          const top20Members = rankedAllMembers.slice(0, 20);
          const myMemberEntry = rankedAllMembers.find((m) => m.id === currentMember.id);
          const myActualRank = myMemberEntry?.calculatedRank ?? 1;
          const isUserInTop20 = top20Members.some((m) => m.id === currentMember.id);

          // Recent points activity history
          const pointsHistory = [
            ...registrations
              .filter((r) => r.attendance_status === 'present')
              .map((r) => ({
                id: `att-${r.id}`,
                title: r.event_title || 'Session de formation',
                type: 'Présence confirmée',
                points: 10,
                date: r.registered_at?.split('T')[0] || 'Récemment',
              })),
            ...agendaItems.flatMap((evt) => {
              const roles = evt.helper_roles || [];
              return roles
                .filter((role) => role.helpers?.some((h) => h.member_id === currentMember.id))
                .map((role) => ({
                  id: `role-${evt.id}-${role.id}`,
                  title: `${role.role_name} · ${evt.title}`,
                  type: 'Bénévolat officiel',
                  points: role.points_reward || 25,
                  date: evt.date,
                }));
            }),
          ];

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    Points &amp; Classement
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer shrink-0 w-fit min-h-[40px]"
                >
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Voir l'agenda &amp; bénévolat</span>
                </button>
              </div>

              {/* Merged Score & Progress Card (Balanced 2-column card) */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Left column: Score, level badge adjacent, and rank underneath */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight tabular-nums">
                        {pts}
                      </span>
                      <span className="text-sm font-medium text-gray-500">points</span>
                      {(() => {
                        const lvl = LEVEL_CONFIG[currentMember.level] || LEVEL_CONFIG.Bronze;
                        return (
                          <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${lvl.bg} ${lvl.color} ${lvl.border}`}>
                            Niveau {currentMember.level}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-gray-500">
                      Vous êtes {myActualRank === 1 ? '1er' : `${myActualRank}e`} sur {activeMembers.length} membres actifs
                    </p>
                  </div>

                  {/* Right column: Level Progress Track with single center message */}
                  <div>
                    {nextLevelName ? (
                      <div className="space-y-2">
                        <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#9E1B32] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-stone-600 font-medium text-center">
                          {Math.max(0, nextPts - pts)} pts pour atteindre {nextLevelName}
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-stone-500 text-center font-medium">
                        Niveau maximum atteint (Platine)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Grid: Leaderboard + How to earn points / History */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left 2 cols: Leaderboard (Constrained width for comfortable scanning) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs max-w-3xl">
                  <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-stone-900">Classement général</h2>
                    <span className="text-xs text-stone-500 font-medium">
                      {activeMembers.length} membres
                    </span>
                  </div>

                  {rankedAllMembers.length === 0 ? (
                    <div className="p-12 text-center text-xs text-stone-400">
                      Aucun membre actif enregistré pour le moment.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {top20Members.map((m, idx) => {
                        const isMe = m.id === currentMember.id;
                        const rank = m.calculatedRank;
                        const isTiedWithPrev = idx > 0 && rank === top20Members[idx - 1].calculatedRank;

                        return (
                          <div
                            key={m.id}
                            className={`flex items-center gap-3.5 px-4 sm:px-5 py-3 transition-colors ${
                              isMe ? 'bg-[#9E1B32]/5' : 'hover:bg-stone-50/70'
                            }`}
                          >
                            {/* Fixed width rank column with metallic rewards strictly for the top 3 */}
                            <div className="w-8 shrink-0 flex items-center justify-center">
                              {rank === 1 && !isTiedWithPrev ? (
                                <span className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-950 border border-amber-300/70 font-bold text-xs flex items-center justify-center tabular-nums shadow-2xs">
                                  1
                                </span>
                              ) : rank === 2 && !isTiedWithPrev ? (
                                <span className="w-7 h-7 rounded-lg bg-slate-200/90 text-slate-800 border border-slate-300/80 font-bold text-xs flex items-center justify-center tabular-nums shadow-2xs">
                                  2
                                </span>
                              ) : rank === 3 && !isTiedWithPrev ? (
                                <span className="w-7 h-7 rounded-lg bg-amber-900/10 text-amber-900 border border-amber-900/25 font-bold text-xs flex items-center justify-center tabular-nums shadow-2xs">
                                  3
                                </span>
                              ) : isTiedWithPrev ? (
                                <span className="text-xs text-stone-400 font-medium tabular-nums" title={`Égalité au rang ${rank}`}>
                                  ={rank}
                                </span>
                              ) : (
                                <span className="text-xs text-stone-500 font-medium tabular-nums">
                                  {rank}
                                </span>
                              )}
                            </div>

                            {/* Neutral avatar */}
                            {m.avatar_url ? (
                              <img
                                src={m.avatar_url}
                                alt={m.full_name}
                                className="w-8 h-8 rounded-full object-cover bg-stone-100 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 font-medium text-xs flex items-center justify-center shrink-0">
                                {m.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Name and self indicator */}
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm font-medium text-stone-900 truncate">
                                {m.full_name}
                              </span>
                              {isMe && (
                                <span className="text-xs text-[#9E1B32] font-semibold shrink-0">
                                  (vous)
                                </span>
                              )}
                              {m.level !== 'Bronze' && (() => {
                                const mLevelCfg = LEVEL_CONFIG[m.level] || LEVEL_CONFIG.Bronze;
                                return (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${mLevelCfg.bg} ${mLevelCfg.color} ${mLevelCfg.border}`}>
                                    {m.level}
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Points on single line */}
                            <div className="shrink-0 text-right">
                              <span className="text-sm font-semibold text-stone-900 tabular-nums">
                                {m.points ?? 0} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* If current member is outside top 20, pin their row at the bottom */}
                      {!isUserInTop20 && myMemberEntry && (
                        <>
                          <div className="px-5 py-2 text-center text-xs text-stone-400 font-mono tracking-widest bg-stone-50/40">
                            ···
                          </div>
                          <div className="flex items-center gap-3.5 px-4 sm:px-5 py-3 bg-[#9E1B32]/5">
                            <div className="w-8 shrink-0 flex items-center justify-center">
                              <span className="text-xs text-stone-500 font-medium tabular-nums">
                                {myActualRank}
                              </span>
                            </div>
                            {myMemberEntry.avatar_url ? (
                              <img
                                src={myMemberEntry.avatar_url}
                                alt={myMemberEntry.full_name}
                                className="w-8 h-8 rounded-full object-cover bg-stone-100 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 font-medium text-xs flex items-center justify-center shrink-0">
                                {myMemberEntry.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-sm font-medium text-stone-900 truncate">
                                {myMemberEntry.full_name}
                              </span>
                              <span className="text-xs text-[#9E1B32] font-semibold shrink-0">
                                (vous)
                              </span>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-sm font-semibold text-stone-900 tabular-nums">
                                {myMemberEntry.points ?? 0} pts
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Right 1 col: How to earn points + Points history */}
                <div className="space-y-6">
                  {/* How to earn points */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 p-5 space-y-4 shadow-2xs">
                    <div>
                      <h3 className="text-sm font-semibold text-stone-900">Comment gagner des points ?</h3>
                      <p className="text-xs text-stone-500 mt-0.5">Participez à la vie active du club Joker ESEN.</p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-100">
                        <div>
                          <p className="font-medium text-stone-800">Bénévolat sur un événement</p>
                          <p className="text-stone-500 text-[11px]">Aide logistique, accueil ou technique</p>
                        </div>
                        <span className="font-semibold text-[#9E1B32] whitespace-nowrap">+20 à +30 pts</span>
                      </div>

                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-stone-100">
                        <div>
                          <p className="font-medium text-stone-800">Présence aux sessions</p>
                          <p className="text-stone-500 text-[11px]">Participation confirmée aux formations</p>
                        </div>
                        <span className="font-semibold text-[#9E1B32] whitespace-nowrap">+10 pts</span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-stone-800">Idée d'atelier retenue</p>
                          <p className="text-stone-500 text-[11px]">Proposition approuvée par le bureau</p>
                        </div>
                        <span className="font-semibold text-[#9E1B32] whitespace-nowrap">+15 pts</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('events')}
                      className="w-full py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Trouver une mission bénévole</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>

                  {/* Points history / Activité récente */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-2xs">
                    <h3 className="text-sm font-semibold text-gray-900">Historique récent</h3>
                    {pointsHistory.length === 0 ? (
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Aucune activité récente enregistrée. Inscrivez-vous aux prochaines formations pour accumuler vos premiers points.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {pointsHistory.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{item.title}</p>
                              <p className="text-[11px] text-gray-400">{item.type} · {item.date}</p>
                            </div>
                            <span className="font-semibold text-emerald-600 shrink-0">
                              +{item.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 4: BOÎTE À IDÉES */}
        {activeTab === 'ideas' && (() => {
          const myIdeas = ideas.filter((i) => i.member_id === currentMember.id);
          const baseIdeas = ideaFilter === 'my' ? myIdeas : ideas;
          const filteredIdeas = ideaStatusFilter === 'all'
            ? baseIdeas
            : baseIdeas.filter((i) => i.status === ideaStatusFilter);

          const sortedIdeas = [...filteredIdeas].sort((a, b) => {
            if (ideaSortBy === 'votes') {
              const diff = (b.votes?.length || 0) - (a.votes?.length || 0);
              if (diff !== 0) return diff;
              return (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime());
            }
            return (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime());
          });

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    Boîte à idées
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Proposez un atelier et votez pour vos idées préférées.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenIdeaModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9E1B32] hover:bg-[#851629] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer shrink-0 w-fit min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Proposer une idée</span>
                </button>
              </div>

              {/* Filters & Sorting */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Tab filter (Toutes les idées vs Mes propositions) */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200/80 w-fit">
                  <button
                    type="button"
                    onClick={() => setIdeaFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      ideaFilter === 'all'
                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Toutes les idées ({ideas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdeaFilter('my')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      ideaFilter === 'my'
                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Mes propositions ({myIdeas.length})
                  </button>
                </div>

                {/* Right: Status filter & Sorting */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={ideaStatusFilter}
                    onChange={(e) => setIdeaStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer outline-none focus:border-[#9E1B32] transition-colors"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En étude</option>
                    <option value="approved">Retenue</option>
                    <option value="planned">Planifiée</option>
                    <option value="rejected">Non retenue</option>
                  </select>

                  <select
                    value={ideaSortBy}
                    onChange={(e) => setIdeaSortBy(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer outline-none focus:border-[#9E1B32] transition-colors"
                  >
                    <option value="votes">Plus votées</option>
                    <option value="recent">Plus récentes</option>
                  </select>
                </div>
              </div>

              {/* Ideas Cards Grid */}
              {sortedIdeas.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-stone-200/80 space-y-3 shadow-2xs">
                  <p className="text-sm font-semibold text-stone-900">
                    {ideaFilter === 'my'
                      ? "Vous n'avez pas encore proposé d'idée"
                      : "Aucune idée ne correspond aux critères sélectionnés"}
                  </p>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    {ideaFilter === 'my'
                      ? "Partagez votre première suggestion d'atelier ou de formation avec la communauté Joker ESEN !"
                      : "Modifiez vos filtres ou soyez le premier à proposer une nouvelle idée pour enrichir le programme du club."}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenIdeaModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9E1B32] hover:bg-[#851629] text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Proposer une idée</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedIdeas.map((idea) => {
                    const votesCount = idea.votes?.length || 0;
                    const hasVoted = idea.votes?.includes(currentMember.id);
                    const isMyIdea = idea.member_id === currentMember.id;

                    // Plain grey text for meta info
                    const metaParts = [
                      idea.category,
                      idea.estimated_duration,
                      idea.target_audience,
                    ].filter(Boolean);

                    // Single colored element: status dot + label (informative state color)
                    const statusConfig = {
                      pending: { label: 'En étude', dot: 'bg-amber-500', text: 'text-amber-700' },
                      approved: { label: 'Retenue', dot: 'bg-emerald-500', text: 'text-emerald-700' },
                      planned: { label: 'Planifiée', dot: 'bg-sky-600', text: 'text-sky-700' },
                      rejected: { label: 'Non retenue', dot: 'bg-stone-400', text: 'text-stone-500' },
                    }[idea.status] || { label: 'En étude', dot: 'bg-amber-500', text: 'text-amber-700' };

                    // Formatted date (sentence case, French)
                    const dateStr = idea.created_at
                      ? new Date(idea.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : '3 oct.';

                    return (
                      <div
                        key={idea.id}
                        className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs flex flex-col justify-between gap-4 hover:border-stone-300 transition-colors"
                      >
                        <div className="space-y-3">
                          {/* Top row: Plain grey meta on left, status dot on right */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs text-stone-500">
                              {metaParts.join(' · ')}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusConfig.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                              <span>{statusConfig.label}</span>
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div className="space-y-1">
                            <h2 className="text-base font-semibold text-stone-900 leading-snug">
                              {idea.title}
                            </h2>
                            <p className="text-xs text-stone-600 leading-relaxed font-normal">
                              {idea.description}
                            </p>
                          </div>

                          {/* Speaker suggestion if provided */}
                          {idea.speaker_suggestion && (
                            <p className="text-xs text-stone-500">
                              <span className="text-stone-400">Intervenant suggéré :</span> {idea.speaker_suggestion}
                            </p>
                          )}

                          {/* Reason / Admin note from bureau if any */}
                          {idea.admin_notes && (
                            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-700 space-y-1">
                              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-medium">
                                <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                                <span>Retour du bureau</span>
                              </div>
                              <p className="text-stone-800 leading-relaxed">{idea.admin_notes}</p>
                            </div>
                          )}

                          {/* Link to matching agenda event if planned */}
                          {idea.status === 'planned' && (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAgendaSearchQuery(idea.title);
                                  setActiveTab('events');
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E1B32] hover:text-[#851629] transition-colors cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Voir la session dans l'agenda</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Points awarded badge if any */}
                          {Boolean(idea.points_awarded && idea.points_awarded > 0) && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+{idea.points_awarded} pts attribués</span>
                            </div>
                          )}
                        </div>

                        {/* Footer: Vote action on left, Author on right */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                          {/* Vote Button */}
                          {isMyIdea ? (
                            <button
                              type="button"
                              disabled
                              title="Vous ne pouvez pas voter pour votre propre proposition"
                              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-stone-50 text-stone-400 border border-stone-200 cursor-not-allowed flex items-center gap-1.5"
                            >
                              <span>Votre idée · {votesCount} {votesCount > 1 ? 'votes' : 'vote'}</span>
                            </button>
                          ) : hasVoted ? (
                            <button
                              type="button"
                              onClick={() => handleVoteIdea(idea.id)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#9E1B32] hover:bg-[#851629] text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Cliquez pour retirer votre vote"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Voté ✓ · {votesCount} {votesCount > 1 ? 'votes' : 'vote'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVoteIdea(idea.id)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Voter pour cette idée"
                            >
                              <ThumbsUp className="w-3.5 h-3.5 text-stone-500" />
                              <span>Voter · {votesCount} {votesCount > 1 ? 'votes' : 'vote'}</span>
                            </button>
                          )}

                          {/* Author & Date */}
                          <div className="flex items-center gap-2 min-w-0">
                            {idea.member_avatar ? (
                              <img
                                src={idea.member_avatar}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover bg-gray-100 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 font-medium text-[11px] flex items-center justify-center shrink-0">
                                {idea.member_name ? idea.member_name.charAt(0).toUpperCase() : 'M'}
                              </div>
                            )}
                            <span className="text-xs text-gray-500 truncate">
                              Proposé par {isMyIdea ? 'vous' : idea.member_name} · {dateStr}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      </main>

      {/* Justification Modal */}
      {selectedRegForJustification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 space-y-4">
            <button onClick={() => setSelectedRegForJustification(null)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Justification d'indisponibilité</span>
              <h3 className="text-lg font-bold text-stone-900 mt-1">Pourquoi ne pouvez-vous pas assister ?</h3>
              <p className="text-xs text-stone-500">Session : <strong>{selectedRegForJustification.event_title}</strong></p>
            </div>
            <form onSubmit={handleJustificationSubmit} className="space-y-4">
              <textarea required rows={3} value={justificationText} onChange={(e) => setJustificationText(e.target.value)}
                placeholder="Ex: Examen universitaire, impératif familial, maladie..."
                className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 outline-none focus:border-[#9E1B32] focus:bg-white transition-all resize-none" />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button type="button" onClick={() => setSelectedRegForJustification(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 cursor-pointer">Annuler</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#9E1B32] hover:bg-[#851629] text-white cursor-pointer shadow-2xs">Envoyer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Feedback Modal ══ */}
      {selectedEventForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedEventForFeedback(null)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-stone-900">Donner votre avis</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Session : <strong className="text-stone-700">{selectedEventForFeedback.title}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              {/* Overall Star Rating on pure white background, starts empty */}
              <div className="py-2 text-center space-y-2">
                <span className="text-xs font-semibold text-stone-700 block">
                  Note globale de la session <span className="text-[#9E1B32]">*</span>
                </span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeRating = feedbackHoverRating || feedbackRating;
                    const isFilled = star <= activeRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setFeedbackHoverRating(star)}
                        onMouseLeave={() => setFeedbackHoverRating(0)}
                        onClick={() => setFeedbackRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-115 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                              : 'text-stone-200 hover:text-stone-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-medium text-stone-600 min-h-[18px]">
                  {feedbackRating === 0 && <span className="text-stone-400">Cliquez sur une étoile pour noter</span>}
                  {feedbackRating === 1 && 'Décevant'}
                  {feedbackRating === 2 && 'Passable'}
                  {feedbackRating === 3 && 'Bien'}
                  {feedbackRating === 4 && 'Très satisfaisant'}
                  {feedbackRating === 5 && 'Exceptionnel, au top !'}
                </div>
              </div>

              {/* Stacked compact criteria rows (optional) */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <span className="text-xs font-medium text-stone-600 block">
                  Détail par critère (optionnel)
                </span>
                <div className="space-y-2 bg-stone-50/80 rounded-xl p-3 border border-stone-200/60">
                  {[
                    { key: 'organization', label: 'Organisation' },
                    { key: 'content', label: 'Contenu & format' },
                    { key: 'ambiance', label: 'Ambiance & échanges' },
                  ].map((aspect) => (
                    <div
                      key={aspect.key}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-stone-700 font-medium">{aspect.label}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setFeedbackAspects((prev) => ({
                                ...prev,
                                [aspect.key]: (prev as any)[aspect.key] === s ? 0 : s,
                              }))
                            }
                            className="p-1 cursor-pointer hover:scale-110 focus:outline-none"
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${
                                s <= ((feedbackAspects as any)[aspect.key] || 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-stone-200 hover:text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment textarea */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Commentaires &amp; suggestions (optionnel)
                </label>
                <textarea
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Qu'avez-vous particulièrement apprécié ? Des remarques ou suggestions ?"
                  className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 outline-none focus:border-[#9E1B32] focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedEventForFeedback(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 cursor-pointer min-h-[44px]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || feedbackRating === 0}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#9E1B32] hover:bg-[#851629] text-white cursor-pointer shadow-2xs disabled:opacity-40 min-h-[44px]"
                >
                  {isSubmittingFeedback ? 'Envoi en cours...' : 'Transmettre mon avis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        {/* TAB 5: PARAMÈTRES / PROFIL */}
        {activeTab === 'settings' && (() => {
          const initialSavedNickname = (() => {
            try { return localStorage.getItem('joker_nickname_' + currentMember.id) || currentMember.nickname || ''; }
            catch { return currentMember.nickname || ''; }
          })();

          const isDirty = (nicknameInput.trim() !== initialSavedNickname.trim()) || (avatarPreview !== null);

          const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { setUploadError('Veuillez choisir un fichier image.'); return; }
            if (file.size > 5 * 1024 * 1024) { setUploadError("L'image doit faire moins de 5 Mo."); return; }
            setUploadError(null);
            setIsUploadingAvatar(true);
            try {
              const result = await uploadToCloudinary(file);
              const url: string = result.secure_url;
              setAvatarPreview(url);
              setCurrentMember((prev) => ({ ...prev, avatar_url: url }));
            } catch (err: any) {
              setUploadError(err?.message || 'Erreur lors du téléchargement.');
            } finally {
              setIsUploadingAvatar(false);
            }
          };

          const handleSaveProfile = async () => {
            setIsSavingProfile(true);
            const updates: { avatar_url?: string; nickname?: string } = {};
            if (avatarPreview !== null) {
              updates.avatar_url = avatarPreview;
            }
            updates.nickname = nicknameInput.trim();
            try {
              const saved = await updateMemberProfile(currentMember.id, updates);
              if (saved) setCurrentMember(saved);
              try { localStorage.setItem('joker_nickname_' + currentMember.id, nicknameInput.trim()); } catch {}
              setAvatarPreview(null);
              setProfileSaved(true);
              setTimeout(() => setProfileSaved(false), 3000);
              showToast('Modifications enregistrées', 'success');
            } catch {
              showToast('Erreur lors de la sauvegarde.', 'error');
            } finally {
              setIsSavingProfile(false);
            }
          };

          const displayAvatar = avatarPreview !== null
            ? (avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentMember.full_name)}&background=e5e7eb&color=374151&size=200`)
            : (currentMember.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentMember.full_name)}&background=e5e7eb&color=374151&size=200`);

          return (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto pb-16">
              {/* Header */}
              <div className="pb-2 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  Profil et paramètres
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Consultez les informations de votre compte et personnalisez votre affichage.
                </p>
              </div>

              {/* Single merged card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-2xs">
                {/* 1. Photo de profil */}
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold text-stone-900">Photo de profil</h2>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                      {isUploadingAvatar ? (
                        <div className="w-full h-full flex items-center justify-center bg-stone-50">
                          <Loader2 className="w-5 h-5 text-[#9E1B32] animate-spin" />
                        </div>
                      ) : (
                        <img
                          src={displayAvatar}
                          alt={currentMember.full_name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="px-3.5 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          {isUploadingAvatar ? 'Téléchargement...' : 'Changer la photo'}
                        </button>
                        {(avatarPreview || currentMember.avatar_url) && (
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarPreview('');
                              setUploadError(null);
                            }}
                            disabled={isUploadingAvatar}
                            className="text-xs text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-stone-400">JPG, PNG ou WebP, 5 Mo max</p>
                      {uploadError && (
                        <p className="text-xs text-rose-600">{uploadError}</p>
                      )}
                    </div>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </div>

                {/* 2. Surnom personnalisé */}
                <div className="space-y-2 pt-6 border-t border-stone-100">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="nickname-input" className="text-xs font-semibold text-stone-900">
                      Surnom personnalisé
                    </label>
                    <span className="text-[11px] text-stone-400 tabular-nums">
                      {nicknameInput.length}/30
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Utilisé pour personnaliser votre affichage dans votre tableau de bord et votre espace membre.
                  </p>
                  <input
                    id="nickname-input"
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value.slice(0, 30))}
                    placeholder={`Ex : ${currentMember.full_name.split(' ')[0]}`}
                    maxLength={30}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs text-stone-900 outline-none focus:border-[#9E1B32] transition-colors"
                  />
                </div>

                {/* 3. Informations du compte (Read-only) */}
                <div className="space-y-3 pt-6 border-t border-stone-100">
                  <h2 className="text-xs font-semibold text-stone-900">Informations du compte</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs font-medium text-stone-500 mb-1">Nom complet</span>
                      <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800">
                        {currentMember.full_name}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-stone-500 mb-1">Adresse e-mail</span>
                      <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 truncate">
                        {currentMember.email}
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-stone-500 mb-1">Statut d'adhésion</span>
                      <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 flex items-center justify-between">
                        <span>Membre actif</span>
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">Validé</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-stone-500 mb-1">Niveau actuel</span>
                      <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 flex items-center justify-between">
                        <span>{currentMember.level || 'Bronze'}</span>
                        <span className="text-[11px] text-stone-500 font-medium tabular-nums">{pts} pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Action de sauvegarde */}
                <div className="flex items-center justify-end pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || isUploadingAvatar || (!isDirty && !profileSaved)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#9E1B32] hover:bg-[#851629] text-white cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : profileSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Modifications enregistrées</span>
                      </>
                    ) : (
                      <span>Enregistrer les modifications</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Modal Proposer une Idée ── */}
      {isIdeaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-stone-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsIdeaModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-stone-900 leading-tight">
                Proposer une idée
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Votre proposition sera examinée par le bureau pour enrichir l'agenda du club.
              </p>
            </div>

            <form onSubmit={handleSubmitIdea} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Titre ou thème de l'événement <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ideaForm.title}
                  onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                  placeholder="Ex : Workshop Prompt Engineering, Initiation UI Design..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 outline-none focus:border-[#9E1B32] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={ideaForm.category}
                  onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:border-[#9E1B32] transition-colors"
                >
                  <option value="Formation & Workshop">Formation &amp; Workshop technique</option>
                  <option value="Hackathon & Challenge">Hackathon &amp; Challenge</option>
                  <option value="Teambuilding & Divertissement">Teambuilding &amp; Divertissement</option>
                  <option value="Conférence & Table Ronde">Conférence &amp; Table ronde</option>
                  <option value="Projet & Action Solidaire">Projet &amp; Action solidaire</option>
                  <option value="Autre">Autre suggestion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Description et objectif <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={ideaForm.description}
                  onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                  placeholder="De quoi s'agit-il ? Quels bénéfices pour les membres ? Que va-t-on créer ou apprendre ?"
                  className="w-full p-3.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:border-[#9E1B32] transition-colors resize-none font-normal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Public ciblé
                  </label>
                  <input
                    type="text"
                    value={ideaForm.targetAudience}
                    onChange={(e) => setIdeaForm({ ...ideaForm, targetAudience: e.target.value })}
                    placeholder="Ex : Tous les membres, Débutants..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:border-[#9E1B32] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Durée estimée
                  </label>
                  <input
                    type="text"
                    value={ideaForm.estimatedDuration}
                    onChange={(e) => setIdeaForm({ ...ideaForm, estimatedDuration: e.target.value })}
                    placeholder="Ex : 2 heures, Demi-journée..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:border-[#9E1B32] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Intervenant ou formateur suggéré (optionnel)
                </label>
                <input
                  type="text"
                  value={ideaForm.speakerSuggestion}
                  onChange={(e) => setIdeaForm({ ...ideaForm, speakerSuggestion: e.target.value })}
                  placeholder="Ex : Moi-même, un expert externe, un ancien membre..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-800 outline-none focus:border-[#9E1B32] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsIdeaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIdea}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#9E1B32] hover:bg-[#851629] text-white cursor-pointer shadow-2xs disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingIdea ? 'Envoi en cours...' : "Soumettre l'idée"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-40 px-2 py-1.5 flex items-center justify-around">
        {[
          { id: 'overview', label: 'Accueil', icon: LayoutDashboard },
          { id: 'events',   label: 'Agenda',  icon: Calendar },
          { id: 'points',   label: 'Points',  icon: Trophy },
          { id: 'ideas',    label: 'Idées',   icon: Lightbulb },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#9E1B32] font-semibold'
                  : 'text-stone-400 hover:text-stone-700 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#9E1B32]' : 'text-stone-400'}`} />
              <span className="text-[11px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
};
