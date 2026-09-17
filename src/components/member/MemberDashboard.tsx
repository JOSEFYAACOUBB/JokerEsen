import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import type { EventRecord } from '../../types/database';
import type {
  ClubMember,
  MemberEventRegistration,
  AgendaItem,
} from '../../types/member';
import { fetchAllAgendaItems } from '../../services/agendaService';
import {
  logoutMemberSession,
  fetchEventRegistrationsFromDb,
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

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member: initialMember,
  allEvents: _allEvents,
  onLogout,
  onGoToPublic: _onGoToPublic,
}) => {
  const [currentMember, setCurrentMember] = useState<ClubMember>(initialMember);
  const [activeTab, setActiveTab] = useState<'overview' | 'events'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Justification modal state
  const [selectedRegForJustification, setSelectedRegForJustification] = useState<MemberEventRegistration | null>(null);
  const [justificationText, setJustificationText] = useState('');

  // Persistent alert dismissal per member
  const [isAbsenceAlertDismissed, setIsAbsenceAlertDismissed] = useState(() => {
    try {
      return localStorage.getItem(`joker_dismissed_absence_${initialMember.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissAbsenceAlert = () => {
    setIsAbsenceAlertDismissed(true);
    try {
      localStorage.setItem(`joker_dismissed_absence_${currentMember.id}`, 'true');
    } catch (e) {
      console.error(e);
    }
  };

  // Data states
  const [registrations, setRegistrations] = useState<MemberEventRegistration[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);

  useEffect(() => {
    fetchEventRegistrationsFromDb().then((all) => {
      setRegistrations(all.filter((r) => r.member_id === currentMember.id));
    });
    fetchAllAgendaItems().then(setAgendaItems);
  }, [currentMember.id]);

  const handleJustificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegForJustification || !justificationText.trim()) return;

    const updated = submitMemberJustification(selectedRegForJustification.id, justificationText);
    setRegistrations(updated.filter((r) => r.member_id === currentMember.id));
    setSelectedRegForJustification(null);
    setJustificationText('');
    showToast('Justification d\'indisponibilité transmise à l\'administration avec succès.', 'success');
  };



  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleRegistration = (event: AgendaItem | EventRecord) => {
    const { registrations: updatedRegs, isRegistered, error } = toggleEventRegistration(
      currentMember,
      event
    );

    if (error) {
      showToast(error, 'error');
      return;
    }

    setRegistrations(updatedRegs);
    const latestSelf = getStoredMembers().find((m) => m.id === currentMember.id);
    if (latestSelf) setCurrentMember(latestSelf);

    if (isRegistered) {
      showToast(`Inscription réussie à "${event.title}"`, 'success');
    } else {
      showToast(`Inscription annulée pour "${event.title}". Log enregistré.`, 'info');
    }
  };

  return (
    <div data-member-panel className="min-h-screen bg-[#F8FAFC] text-[#1a1a1a] flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-[#1a1a1a] text-white shadow-2xl border border-[#007bff]/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-white">{toast.message}</span>
        </div>
      )}

      {/* ── TOP HEADER / NAVIGATION BAR (Classic Blue & White Palette) ── */}
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            
            {/* Brand Logo Only (No text, no blue background) */}
            <div className="flex items-center shrink-0">
              <img
                src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                alt="Joker ESEN"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            {/* Navigation Tabs (Center) */}
            <nav className="flex items-center gap-1 sm:gap-2">
              {[
                { id: 'overview', label: 'Tableau de Bord', icon: LayoutDashboard },
                { id: 'events', label: 'Agenda Formations', icon: Calendar, badge: agendaItems.length },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#f0f7ff] text-[#0056b3] border border-[#007bff]/30 shadow-xs'
                        : 'text-[#1a1a1a] hover:bg-[#f0f7ff] hover:text-[#007bff]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0056b3]' : 'text-[#007bff]'}`} />
                    <span className="hidden xs:inline">{tab.label}</span>
                    <span className="xs:hidden">{tab.id === 'overview' ? 'Bord' : 'Agenda'}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-[#0056b3] text-white' : 'bg-slate-100 text-[#007bff]'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Member Profile & Logout (Right) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#f0f7ff] border border-[#007bff]/15">
                <img
                  src={currentMember.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                  alt={currentMember.full_name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-[#007bff]/40"
                />
                <span className="hidden sm:block text-xs font-bold text-[#1a1a1a] leading-tight">{currentMember.full_name}</span>
              </div>
              <button
                onClick={() => {
                  logoutMemberSession();
                  onLogout();
                }}
                className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-colors cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

          {/* Absence Red Warning Alert Card (Dismissable) */}
          {!isAbsenceAlertDismissed &&
            registrations.some(
              (r) =>
                (r.member_id === currentMember.id || r.member_email?.toLowerCase() === currentMember.email.toLowerCase()) &&
                (r.attendance_status === 'absent' || Boolean(r.absence_remark))
            ) && (
              <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-rose-600 text-white shadow-xl border-2 border-rose-400 animate-in fade-in space-y-3 relative">
                <button
                  onClick={handleDismissAbsenceAlert}
                  className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
                  title="Fermer l'alerte"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 pr-10">
                  <div className="w-12 h-12 rounded-2xl bg-white text-rose-600 flex items-center justify-center shrink-0 font-black text-xl shadow-md">
                    ⚠️
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                      Signalement Officiel d'Absence
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white font-sans tracking-tight">
                      Remarque d'absence non justifiée envoyée par l'administration
                    </h3>
                    <p className="text-xs text-rose-100 mt-1 leading-relaxed">
                      Vous avez été marqué(e) absent(e) lors de la vérification manuelle d'une formation ou réunion après votre inscription.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-rose-500/50">
                  {registrations
                    .filter(
                      (r) =>
                        (r.member_id === currentMember.id || r.member_email?.toLowerCase() === currentMember.email.toLowerCase()) &&
                        (r.attendance_status === 'absent' || Boolean(r.absence_remark))
                    )
                    .map((r) => (
                      <div key={r.id} className="p-3.5 rounded-2xl bg-slate-900/90 text-white border border-rose-400/40 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-rose-300">
                          <span>{r.event_title}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[10px] font-mono font-bold uppercase">
                            ABSENCE DÉCLARÉE
                          </span>
                        </div>
                        <p className="text-rose-100 text-xs leading-relaxed font-medium">
                          💬 Remarque Admin : "{r.absence_remark || 'Absent(e) non justifié(e) à la formation / réunion.'}"
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
                <p className="text-slate-500 text-sm font-medium">Bienvenue dans votre espace membre. Consultez l'onglet <strong>Agenda Formations</strong> pour voir les prochaines sessions.</p>
              </div>
            </div>
          )}

          {/* TAB 2: AGENDA FORMATIONS & RÉUNIONS */}
          {activeTab === 'events' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                    Agenda des Formations, Réunions &amp; Ateliers ({agendaItems.length})
                  </h2>
                  <p className="text-xs text-slate-500">Inscrivez-vous aux sessions pour obtenir vos accès visio et confirmer votre présence.</p>
                </div>
              </div>

              {agendaItems.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-sm">Aucune formation ou réunion programmée</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Le bureau exécutif publiera bientôt les prochaines dates de formations et réunions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agendaItems.map((evt) => {
                    const isReg = registrations.some((r) => r.event_id === evt.id);
                    const userReg = registrations.find((r) => r.event_id === evt.id);
                    const maxSeats = evt.max_seats ?? 50;
                    const eventType = evt.event_type || 'formation';

                    return (
                      <div
                        key={evt.id || evt.title}
                        className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              eventType === 'formation'
                                ? 'bg-indigo-100 text-indigo-800'
                                : eventType === 'reunion'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {eventType.toUpperCase()} {evt.edition ? `· ${evt.edition}` : ''}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">{evt.date}</span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 font-sans">{evt.title}</h3>
                          {evt.program && <p className="text-xs text-slate-600 line-clamp-2">{evt.program}</p>}

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span>📍 {evt.location}</span>
                            <span className="font-mono text-[11px] font-bold text-slate-700">
                              Capacité: {maxSeats} places
                            </span>
                          </div>

                          {/* Meeting Link for registered users */}
                          {isReg && evt.meeting_url && (
                            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-blue-900">Lien Visio / Réunion disponible</span>
                              <a
                                href={evt.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                              >
                                Rejoindre &rarr;
                              </a>
                            </div>
                          )}

                          {/* Member submitted justification */}
                          {userReg?.justification_reason && (
                            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-0.5">
                              <span className="font-extrabold text-[11px] text-amber-800 uppercase block">💬 Votre justification d'indisponibilité</span>
                              <p className="italic font-medium text-amber-900 leading-relaxed">"{userReg.justification_reason}"</p>
                            </div>
                          )}

                          {/* User Attendance status & absence remark in Agenda Card */}
                          {userReg?.attendance_status === 'absent' && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
                              <div className="flex items-center justify-between font-black text-rose-800">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-sm">⚠️</span> ABSENCE DÉCLARÉE
                                </span>
                                <span className="text-[10px] bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-md uppercase font-mono font-bold">
                                  Non Justifiée
                                </span>
                              </div>
                              <p className="text-rose-700 font-medium leading-relaxed">
                                💬 Remarque Admin : "{userReg.absence_remark || 'Absent(e) non justifié(e) à la formation / réunion.'}"
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => {
                              let regToJustify = userReg;
                              if (!regToJustify) {
                                const { registrations: updatedRegs } = toggleEventRegistration(currentMember, evt);
                                setRegistrations(updatedRegs);
                                regToJustify = updatedRegs.find((r) => r.event_id === evt.id && r.member_id === currentMember.id);
                              }
                              if (regToJustify) {
                                setSelectedRegForJustification(regToJustify);
                                setJustificationText(regToJustify.justification_reason || '');
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{userReg?.justification_reason ? '✏️ Modifier motif' : '💬 Ne peux pas assister ?'}</span>
                          </button>

                          <button
                            onClick={() => handleToggleRegistration(evt)}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isReg
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                            }`}
                          >
                            <span>
                              {isReg ? 'Se désinscrire' : 'S\'inscrire'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>

        {/* Modal: Submit Justification for Absence */}
        {selectedRegForJustification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <button
                onClick={() => setSelectedRegForJustification(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Formulaire d'indisponibilité</span>
                <h3 className="text-lg font-bold text-slate-900 font-sans">Pourquoi ne pouvez-vous pas assister ?</h3>
                <p className="text-xs text-slate-500">Session : <strong>{selectedRegForJustification.event_title}</strong></p>
              </div>

              <form onSubmit={handleJustificationSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motif / Justification d'absence :</label>
                  <textarea
                    required
                    rows={3}
                    value={justificationText}
                    onChange={(e) => setJustificationText(e.target.value)}
                    placeholder="Ex: Examen universitaire, impératif familial, maladie..."
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-amber-400 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedRegForJustification(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer transition-colors"
                  >
                    Envoyer ma justification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

    </div>
  );
};