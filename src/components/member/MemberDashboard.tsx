import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  Sparkles,
  X,
  Trophy,
  Star,
  TrendingUp,
  Medal,
} from 'lucide-react';
import type { EventRecord } from '../../types/database';
import type {
  ClubMember,
  MemberEventRegistration,
  AgendaItem,
  EventFeedback,
} from '../../types/member';
import { fetchAllAgendaItems, volunteerForRole, withdrawFromRole } from '../../services/agendaService';
import { fetchAllFeedbacks, submitFeedback } from '../../services/feedbackService';
import {
  logoutMemberSession,
  fetchEventRegistrationsFromDb,
  fetchMembersFromDb,
  toggleEventRegistration,
  submitMemberJustification,
  getStoredMembers,
} from '../../services/memberService';

interface MemberDashboardProps {
  member: ClubMember;
  allEvents?: EventRecord[];
  onLogout: () => void;
  onGoToPublic: () => void;
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; border: string; next: number; icon: string }> = {
  Bronze:  { color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-300',  next: 501,  icon: 'U+1F949' },
  Argent:  { color: 'text-slate-600',  bg: 'bg-slate-50',   border: 'border-slate-400',  next: 1501, icon: 'U+1F948' },
  Or:      { color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-400', next: 3001, icon: 'U+1F947' },
  Platine: { color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-400',   next: 9999, icon: 'U+1F48E' },
};



export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member: initialMember,
  allEvents: _allEvents,
  onLogout,
  onGoToPublic: _onGoToPublic,
}) => {
  const [currentMember, setCurrentMember] = useState<ClubMember>(initialMember);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'points'>('overview');
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
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackAspects, setFeedbackAspects] = useState<{ organization: number; content: number; ambiance: number }>({
    organization: 5,
    content: 5,
    ambiance: 5,
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    fetchEventRegistrationsFromDb().then((all) => {
      setRegistrations(all.filter((r) => r.member_id === currentMember.id));
    });
    fetchAllAgendaItems().then(setAgendaItems);
    fetchMembersFromDb().then(setAllMembers).catch(() => {});
    fetchAllFeedbacks().then(setFeedbacks).catch(() => {});
  }, [currentMember.id]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDismissAbsenceAlert = () => {
    setIsAbsenceAlertDismissed(true);
    try { localStorage.setItem('joker_dismissed_absence_' + currentMember.id, 'true'); } catch (_) {}
  };

  const handleJustificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegForJustification || !justificationText.trim()) return;
    const updated = submitMemberJustification(selectedRegForJustification.id, justificationText);
    setRegistrations(updated.filter((r) => r.member_id === currentMember.id));
    setSelectedRegForJustification(null);
    setJustificationText('');
    showToast("Justification transmise avec succes.", 'success');
  };

  const handleToggleRegistration = (event: AgendaItem | EventRecord) => {
    const { registrations: updatedRegs, isRegistered, error } = toggleEventRegistration(currentMember, event);
    if (error) { showToast(error, 'error'); return; }
    setRegistrations(updatedRegs);
    const latestSelf = getStoredMembers().find((m) => m.id === currentMember.id);
    if (latestSelf) setCurrentMember(latestSelf);
    showToast(isRegistered ? 'Inscription reussie !' : 'Inscription annulee.', isRegistered ? 'success' : 'info');
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
      setFeedbackRating(existing.rating);
      setFeedbackComment(existing.comment || '');
      setFeedbackAspects({
        organization: existing.aspects?.organization ?? 5,
        content: existing.aspects?.content ?? 5,
        ambiance: existing.aspects?.ambiance ?? 5,
      });
    } else {
      setFeedbackRating(5);
      setFeedbackComment('');
      setFeedbackAspects({ organization: 5, content: 5, ambiance: 5 });
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForFeedback) return;
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

  // Points helpers
  const pts = currentMember.points ?? 0;
  const lvlCfg = LEVEL_CONFIG[currentMember.level] || LEVEL_CONFIG.Bronze;
  const prevPts = currentMember.level === 'Bronze' ? 0 : currentMember.level === 'Argent' ? 501 : currentMember.level === 'Or' ? 1501 : 3001;
  const nextPts = lvlCfg.next;
  const progress = currentMember.level === 'Platine' ? 100 : Math.min(100, Math.round(((pts - prevPts) / (nextPts - prevPts)) * 100));

  const leaderboard = [...allMembers]
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 20);
  const myRank = leaderboard.findIndex((m) => m.id === currentMember.id) + 1;

  return (
    <div data-member-panel className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">

      {toast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-3 animate-in fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            <div className="shrink-0">
              <img src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                alt="Joker ESEN" className="h-10 sm:h-12 w-auto object-contain" />
            </div>
            <nav className="flex items-center gap-1">
              {[
                { id: 'overview', label: 'Tableau de Bord', short: 'Bord',   icon: LayoutDashboard },
                { id: 'events',   label: 'Agenda Formations', short: 'Agenda', icon: Calendar, badge: agendaItems.length },
                { id: 'points',   label: 'Points & Classement', short: 'Points', icon: Trophy },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ' + (isActive ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-700 hover:bg-slate-100')}>
                    <Icon className={'w-3.5 h-3.5 ' + (isActive ? 'text-blue-600' : 'text-blue-500')} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.short}</span>
                    {(tab as any).badge > 0 && (
                      <span className={'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ' + (isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-blue-600')}>
                        {(tab as any).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-50 border border-blue-100">
                <img src={currentMember.avatar_url || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(currentMember.full_name) + '&background=007bff&color=fff')}
                  alt={currentMember.full_name} className="w-7 h-7 rounded-full object-cover border border-blue-200" />
                <span className="hidden sm:block text-xs font-bold text-slate-900">{currentMember.full_name}</span>
              </div>
              <button onClick={() => { logoutMemberSession(); onLogout(); }}
                className="px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1.5 border border-rose-200 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

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
                <p className="text-xs text-rose-200 mt-1">Verifiez l'onglet Agenda Formations pour les details.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-2">
            <p className="text-slate-500 text-sm font-medium">Bienvenue dans votre espace membre.</p>
            <p className="text-xs text-slate-400">Consultez l'onglet <strong className="text-slate-600">Agenda Formations</strong> pour les sessions ou <strong className="text-slate-600">Points &amp; Classement</strong> pour votre score.</p>
          </div>
        )}

        {/* TAB 2: AGENDA */}
        {activeTab === 'events' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <h2 className="text-lg font-black text-slate-900">Agenda des Formations &amp; Reunions ({agendaItems.length})</h2>
              <p className="text-xs text-slate-500 mt-1">Inscrivez-vous aux sessions pour obtenir vos acces visio.</p>
            </div>
            {agendaItems.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-500">Aucune session programmee pour l'instant.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agendaItems.map((evt) => {
                  const isReg = registrations.some((r) => r.event_id === evt.id);
                  const userReg = registrations.find((r) => r.event_id === evt.id);
                  const eventType = evt.event_type || 'formation';
                  return (
                    <div key={evt.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-blue-300 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ' + (eventType === 'formation' ? 'bg-indigo-100 text-indigo-800' : eventType === 'reunion' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800')}>
                            {eventType.toUpperCase()} {evt.edition ? '· ' + evt.edition : ''}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">{evt.date}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{evt.title}</h3>
                        {evt.program && <p className="text-xs text-slate-600 line-clamp-2">{evt.program}</p>}
                        <p className="text-xs text-slate-500">📍 {evt.location} · Capacite: {evt.max_seats ?? 50} places</p>
                        {isReg && evt.meeting_url && (
                          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-blue-900">Lien Visio disponible</span>
                            <a href={evt.meeting_url} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">Rejoindre</a>
                          </div>
                        )}
                        {userReg?.justification_reason && (
                          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                            <span className="font-black uppercase block text-[10px] mb-0.5">Votre justification</span>
                            <p className="italic">"{userReg.justification_reason}"</p>
                          </div>
                        )}
                        {userReg?.attendance_status === 'absent' && (
                          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                            <span className="font-black uppercase block text-[10px] mb-0.5">Absence declaree</span>
                            <p>"{userReg.absence_remark || 'Absent non justifie.'}"</p>
                          </div>
                        )}

                        {/* ── Section Bénévolat / Postes d'aide ── */}
                        {evt.helper_roles && evt.helper_roles.length > 0 && (() => {
                          const myHelperRole = evt.helper_roles.find((r) =>
                            r.helpers?.some((h) => h.member_id === currentMember.id)
                          );

                          return (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200/80 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">🤝</span>
                                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-950">
                                    Appel aux Bénévoles ({evt.helper_roles.length} postes)
                                  </span>
                                </div>
                                {myHelperRole && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold">
                                    Inscrit(e) ✅
                                  </span>
                                )}
                              </div>

                              {myHelperRole ? (
                                <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs flex items-center justify-between gap-2">
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                      <span>🌟 Poste : {myHelperRole.role_name}</span>
                                      {myHelperRole.points_reward ? (
                                        <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                          +{myHelperRole.points_reward} pts
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      Merci pour votre implication dans l'organisation de l'événement !
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleLeaveRole(evt.id, myHelperRole.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer transition-colors shrink-0"
                                  >
                                    Se désister
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {evt.helper_roles.map((role) => {
                                    const spotsLeft = role.max_spots - (role.helpers?.length || 0);
                                    const isFull = spotsLeft <= 0;

                                    return (
                                      <div
                                        key={role.id}
                                        className="p-2.5 rounded-xl bg-white/95 border border-blue-100 flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-slate-800 truncate">
                                            {role.role_name}
                                          </div>
                                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                            <span
                                              className={
                                                isFull
                                                  ? 'text-rose-600 font-bold'
                                                  : spotsLeft === 1
                                                  ? 'text-amber-600 font-bold'
                                                  : 'text-blue-600 font-bold'
                                              }
                                            >
                                              {isFull ? 'Complet' : `${spotsLeft} place(s) restante(s)`}
                                            </span>
                                            {role.points_reward ? (
                                              <span>· 🏆 +{role.points_reward} pts bonus</span>
                                            ) : null}
                                          </div>
                                        </div>

                                        {!isFull && (
                                          <button
                                            onClick={() => handleVolunteerRole(evt.id, role.id)}
                                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                          >
                                            <span>Participer</span>
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {/* ── Avis / Feedback Membre ── */}
                        {(() => {
                          const myFeedback = feedbacks.find(
                            (f) => f.event_id === evt.id && f.member_id === currentMember.id
                          );
                          if (!myFeedback) return null;
                          return (
                            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs flex items-start justify-between gap-2 animate-in fade-in">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                                  <span>Votre avis :</span>
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        className={`w-3.5 h-3.5 ${
                                          s <= myFeedback.rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[11px] text-amber-800 font-extrabold">({myFeedback.rating}/5)</span>
                                </div>
                                {myFeedback.comment && (
                                  <p className="text-[11px] text-amber-900/80 italic font-medium line-clamp-2">
                                    "{myFeedback.comment}"
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenFeedbackModal(evt)}
                                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] cursor-pointer shrink-0 transition-colors"
                              >
                                Modifier
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={() => {
                            let reg = userReg;
                            if (!reg) {
                              const { registrations: regs } = toggleEventRegistration(currentMember, evt);
                              setRegistrations(regs);
                              reg = regs.find((r) => r.event_id === evt.id && r.member_id === currentMember.id);
                            }
                            if (reg) { setSelectedRegForJustification(reg); setJustificationText(reg.justification_reason || ''); }
                          }} className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold cursor-pointer">
                            {userReg?.justification_reason ? '✏️ Motif' : '💬 Absence ?'}
                          </button>
                          {(() => {
                            const myFb = feedbacks.find((f) => f.event_id === evt.id && f.member_id === currentMember.id);
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenFeedbackModal(evt)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  myFb
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                }`}
                              >
                                <Star className={`w-3.5 h-3.5 ${myFb ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
                                <span>{myFb ? `Avis ${myFb.rating}★` : 'Donner mon avis'}</span>
                              </button>
                            );
                          })()}
                        </div>
                        <button onClick={() => handleToggleRegistration(evt)}
                          className={'px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ' + (isReg ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' : 'bg-slate-900 text-white hover:bg-slate-800')}>
                          {isReg ? 'Se desinscrire' : "S'inscrire"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POINTS & LEADERBOARD */}
        {activeTab === 'points' && (
          <div className="space-y-5 animate-in fade-in">

            {/* Score + Progress cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Score card */}
              <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-[#0056b3] to-[#003d80] text-white shadow-xl flex flex-col justify-between min-h-[180px]">
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/5"></div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-300" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-200">Vos Points</span>
                  </div>
                  <div className="text-5xl font-black tracking-tight">{pts}</div>
                  <div className="text-sm text-blue-200 font-medium mt-1">points accumulés</div>
                </div>
                <div className="relative z-10 mt-4">
                  <span className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ' + lvlCfg.bg + ' ' + lvlCfg.color + ' ' + lvlCfg.border}>
                    {lvlCfg.icon} Niveau {currentMember.level}
                  </span>
                </div>
              </div>

              {/* Progress card */}
              <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Progression</h3>
                    <p className="text-xs text-slate-500">
                      {currentMember.level === 'Platine'
                        ? 'Niveau maximum atteint !'
                        : (nextPts - pts) + ' pts pour le niveau suivant'}
                    </p>
                  </div>
                </div>

                {/* Level journey */}
                <div className="flex items-center gap-2">
                  {['Bronze', 'Argent', 'Or', 'Platine'].map((lvl, i) => {
                    const levels = ['Bronze', 'Argent', 'Or', 'Platine'];
                    const myIdx = levels.indexOf(currentMember.level);
                    const cfg = LEVEL_CONFIG[lvl];
                    return (
                      <React.Fragment key={lvl}>
                        <div className={'flex flex-col items-center gap-1 ' + (i > myIdx ? 'opacity-35' : '')}>
                          <span className={'w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 ' + (i === myIdx ? cfg.bg + ' ' + cfg.border + ' shadow-md scale-110' : i < myIdx ? cfg.bg + ' ' + cfg.border : 'bg-slate-100 border-slate-200')}>
                            {cfg.icon}
                          </span>
                          <span className={'text-[10px] font-bold ' + (i === myIdx ? cfg.color : 'text-slate-400')}>{lvl}</span>
                        </div>
                        {i < 3 && <div className={'flex-1 h-0.5 mb-4 rounded-full ' + (i < myIdx ? 'bg-blue-500' : 'bg-slate-200')}></div>}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* XP bar */}
                {currentMember.level !== 'Platine' && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>{pts} pts</span><span>{nextPts} pts</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-700" style={{ width: progress + '%' }}></div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">{progress}% vers le prochain niveau</p>
                  </div>
                )}

                {/* Rank chip */}
                {myRank > 0 && (
                  <div className="flex items-center gap-2">
                    <Medal className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black text-slate-700">
                      Vous etes classe(e) <span className="text-blue-600">#{myRank}</span> sur {leaderboard.length} membres actifs
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Classement General</h3>
                  <p className="text-xs text-slate-500">Top {leaderboard.length} membres par points</p>
                </div>
              </div>
              {leaderboard.length === 0 ? (
                <div className="p-12 text-center">
                  <Trophy className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Aucun classement disponible.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {leaderboard.map((m, idx) => {
                    const rank = idx + 1;
                    const isMe = m.id === currentMember.id;
                    const mLvl = LEVEL_CONFIG[m.level] || LEVEL_CONFIG.Bronze;
                    const medalEmoji = rank === 1 ? 'U+1F947' : rank === 2 ? 'U+1F948' : rank === 3 ? 'U+1F949' : String(rank);
                    return (
                      <div key={m.id}
                        className={'flex items-center gap-4 px-5 py-3.5 ' + (isMe ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-slate-50')}>
                        <div className={'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ' + (rank <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>
                          {medalEmoji}
                        </div>
                        <img src={m.avatar_url || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(m.full_name) + '&background=007bff&color=fff&size=64')}
                          alt={m.full_name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={'text-sm font-bold truncate ' + (isMe ? 'text-blue-700' : 'text-slate-900')}>{m.full_name}</span>
                            {isMe && <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">Vous</span>}
                          </div>
                          <span className={'text-[10px] font-bold ' + mLvl.color}>{mLvl.icon} {m.level}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={'text-base font-black ' + (isMe ? 'text-blue-700' : 'text-slate-800')}>{m.points ?? 0}</div>
                          <div className="text-[10px] text-slate-400">pts</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Justification Modal */}
      {selectedRegForJustification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <button onClick={() => setSelectedRegForJustification(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Justification d'indisponibilite</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Pourquoi ne pouvez-vous pas assister ?</h3>
              <p className="text-xs text-slate-500">Session : <strong>{selectedRegForJustification.event_title}</strong></p>
            </div>
            <form onSubmit={handleJustificationSubmit} className="space-y-4">
              <textarea required rows={3} value={justificationText} onChange={(e) => setJustificationText(e.target.value)}
                placeholder="Ex: Examen universitaire, impératif familial, maladie..."
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all" />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedRegForJustification(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Annuler</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">Envoyer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Feedback Modal ══ */}
      {selectedEventForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedEventForFeedback(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-600 tracking-wider">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Évaluation &amp; Avis Événement</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Votre avis nous aide à grandir !</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Session : <strong className="text-slate-700">{selectedEventForFeedback.title}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              {/* Overall Star Rating */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-2">
                <span className="text-xs font-bold text-amber-950 block">Note globale de la session</span>
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
                        className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-black text-amber-800">
                  {feedbackRating === 1 && '😞 Décevant'}
                  {feedbackRating === 2 && '😐 Passable'}
                  {feedbackRating === 3 && '👍 Bien / Correct'}
                  {feedbackRating === 4 && '🌟 Très satisfaisant !'}
                  {feedbackRating === 5 && '🚀 Exceptionnel, au top !'}
                </div>
              </div>

              {/* Aspect criteria ratings */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase text-slate-600 block">
                  Détail par critère (sur 5) :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'organization', label: 'Organisation', icon: '📦' },
                    { key: 'content', label: 'Contenu / Format', icon: '🎓' },
                    { key: 'ambiance', label: 'Ambiance & Échange', icon: '🎉' },
                  ].map((aspect) => (
                    <div
                      key={aspect.key}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-center"
                    >
                      <div className="text-xs font-bold text-slate-700">
                        {aspect.icon} {aspect.label}
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setFeedbackAspects((prev) => ({ ...prev, [aspect.key]: s }))
                            }
                            className="p-0.5 cursor-pointer hover:scale-110"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                s <= ((feedbackAspects as any)[aspect.key] || 5)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
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
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Commentaires &amp; Suggestions
                </label>
                <textarea
                  rows={4}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Qu'avez-vous particulièrement apprécié ? Des remarques ou idées pour améliorer les prochaines sessions ?"
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEventForFeedback(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmittingFeedback ? 'Envoi en cours...' : 'Transmettre mon avis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
