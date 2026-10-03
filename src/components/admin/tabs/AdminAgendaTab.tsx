import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ClipboardList,
  AlertTriangle,
  X,
  Plus,
  Search,
  Trash2,
  Edit3,
  RefreshCw,
  UserCheck,
  UserX,
  Star,
  Lightbulb,
  ThumbsUp,
  RotateCcw,
  Check,
} from 'lucide-react';
import type {
  AgendaItem,
  AgendaHelperRole,
  AgendaTrainerContact,
  EventFeedback,
  EventIdea,
  EventIdeaStatus,
  MemberEventRegistration,
  CancellationLog,
  ClubMember,
} from '../../../types/member';
import {
  fetchAllAgendaItems,
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  addHelperRoleToAgenda,
  removeHelperRoleFromAgenda,
  assignMemberToHelperRole,
  removeMemberFromHelperRole,
} from '../../../services/agendaService';
import {
  getAllEventRegistrations,
  fetchEventRegistrationsFromDb,
  updateAttendanceStatus,
  getCancellationLogs,
  getStoredMembers,
  fetchMembersFromDb,
  addPointsToMember,
} from '../../../services/memberService';
import {
  fetchAllFeedbacks,
  deleteFeedback,
  computeEventRatingSummary,
} from '../../../services/feedbackService';
import {
  fetchAllEventIdeas,
  updateIdeaStatus,
  deleteEventIdea,
} from '../../../services/ideaService';

interface AdminAgendaTabProps {
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminAgendaTab: React.FC<AdminAgendaTabProps> = ({ onShowToast }) => {
  // ── Sub-tabs ──
  const [subTab, setSubTab] = useState<'sessions' | 'registrations' | 'feedbacks' | 'ideas'>('sessions');

  // ── Main Data States ──
  const [agendaList, setAgendaList] = useState<AgendaItem[]>([]);
  const [registrations, setRegistrations] = useState<MemberEventRegistration[]>(() => getAllEventRegistrations());
  const [cancellationLogs, setCancellationLogs] = useState<CancellationLog[]>(() => getCancellationLogs());
  const [feedbacks, setFeedbacks] = useState<EventFeedback[]>([]);
  const [ideas, setIdeas] = useState<EventIdea[]>([]);
  const [members, setMembers] = useState<ClubMember[]>(() => getStoredMembers());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Selected Session for Master-Detail ──
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sessionDetailTab, setSessionDetailTab] = useState<'attendance' | 'helpers' | 'feedbacks'>('attendance');

  // ── Filter States ──
  const [sessionFilter, setSessionFilter] = useState<'all' | 'formation' | 'reunion' | 'evenement'>('all');
  const [regFilter, setRegFilter] = useState<'all' | 'pending' | 'present' | 'absent' | 'cancellations'>('all');
  const [regSearch, setRegSearch] = useState('');
  const [regSessionFilter, setRegSessionFilter] = useState<string>('all');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [ideaStatusFilter, setIdeaStatusFilter] = useState<'all' | 'pending' | 'approved' | 'planned' | 'rejected'>('all');

  // ── Modals & Action States ──
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [editingAgendaItem, setEditingAgendaItem] = useState<AgendaItem | null>(null);
  const [agendaModalStep, setAgendaModalStep] = useState<1 | 2 | 3>(1);

  // Confirmation Modals
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<AgendaItem | null>(null);
  const [confirmAbsenceReg, setConfirmAbsenceReg] = useState<MemberEventRegistration | null>(null);
  const [absenceRemarkInput, setAbsenceRemarkInput] = useState('');
  const [confirmDeleteIdea, setConfirmDeleteIdea] = useState<EventIdea | null>(null);
  const [rejectIdeaModal, setRejectIdeaModal] = useState<EventIdea | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('Non retenue pour cette édition.');
  const [confirmDeleteFeedback, setConfirmDeleteFeedback] = useState<EventFeedback | null>(null);

  // Inline Helper Role creation
  const [isAddRoleInlineOpen, setIsAddRoleInlineOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('Logistique & Matériel');
  const [newRoleSpots, setNewRoleSpots] = useState(3);
  const [newRolePoints, setNewRolePoints] = useState(25);
  const [assigningRoleId, setAssigningRoleId] = useState<string | null>(null);
  const [selectedMemberIdToAssign, setSelectedMemberIdToAssign] = useState<string>('');

  // ── Agenda Form State ──
  const defaultAgendaForm = {
    title: '',
    edition: '',
    date: `Samedi ${new Date().getDate()} Octobre 2026 · 14h00`,
    location: 'Salle Lab ESEN Manouba',
    program: '',
    meeting_url: '',
    event_type: 'formation' as 'formation' | 'reunion' | 'evenement',
    max_seats: 50,
    helper_roles: [] as AgendaHelperRole[],
    trainer: {
      name: '',
      phone: '',
      email: '',
      formation_type: 'Développement Web & Mobile',
      bio: '',
      links: { linkedin: '', github: '', portfolio: '' },
    } as AgendaTrainerContact,
  };
  const [agendaForm, setAgendaForm] = useState(defaultAgendaForm);

  // ── Toast Helper ──
  const toast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    if (onShowToast) onShowToast(msg, type);
  };

  // ── Load live data ──
  const loadAllData = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [items, regs, mems, fbs, ids] = await Promise.all([
        fetchAllAgendaItems(),
        fetchEventRegistrationsFromDb(),
        fetchMembersFromDb(),
        fetchAllFeedbacks(),
        fetchAllEventIdeas(),
      ]);
      setAgendaList(items);
      setRegistrations(regs);
      setMembers(mems);
      setFeedbacks(fbs);
      setIdeas(ids);
      setCancellationLogs(getCancellationLogs());
      if (!silent) toast('Données actualisées', 'info');
    } catch {
      if (!silent) toast('Erreur lors du chargement des données', 'error');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData(true);
  }, []);

  // ── Filtered Sessions & Auto-Selection ──
  const filteredSessions = useMemo(() => {
    return agendaList.filter(
      (e) => sessionFilter === 'all' || e.event_type === sessionFilter
    );
  }, [agendaList, sessionFilter]);

  // Point 6: Auto-select the first session when list is non-empty so the right panel is immediately useful
  useEffect(() => {
    if (filteredSessions.length > 0) {
      if (!selectedEventId || !filteredSessions.some((e) => e.id === selectedEventId)) {
        setSelectedEventId(filteredSessions[0].id);
      }
    } else {
      setSelectedEventId(null);
    }
  }, [filteredSessions, selectedEventId]);

  const selectedEvent = useMemo(() => {
    return agendaList.find((e) => e.id === selectedEventId) || null;
  }, [agendaList, selectedEventId]);

  const selectedEventRegs = useMemo(() => {
    if (!selectedEvent) return [];
    return registrations.filter((r) => r.event_id === selectedEvent.id);
  }, [selectedEvent, registrations]);

  // ── Attendance Counts for Badges ──
  const pendingAttendanceCount = useMemo(() => {
    return registrations.filter((r) => !r.attendance_status || r.attendance_status === 'pending').length;
  }, [registrations]);

  const pendingIdeasCount = useMemo(() => {
    return ideas.filter((i) => i.status === 'pending').length;
  }, [ideas]);

  // ── Session Creation & Edition ──
  const handleOpenNewSession = () => {
    setEditingAgendaItem(null);
    setAgendaModalStep(1);
    setAgendaForm(defaultAgendaForm);
    setIsAgendaModalOpen(true);
  };

  const handleOpenEditSession = (item: AgendaItem) => {
    setEditingAgendaItem(item);
    setAgendaModalStep(1);
    setAgendaForm({
      title: item.title,
      edition: item.edition || '',
      date: item.date,
      location: item.location,
      program: item.program || '',
      meeting_url: item.meeting_url || '',
      event_type: item.event_type || 'formation',
      max_seats: item.max_seats ?? 50,
      helper_roles: item.helper_roles ? [...item.helper_roles] : [],
      trainer: item.trainer || {
        name: '',
        phone: '',
        email: '',
        formation_type: 'Développement Web & Mobile',
        bio: '',
        links: { linkedin: '', github: '', portfolio: '' },
      },
    });
    setIsAgendaModalOpen(true);
  };

  const doSaveSession = async () => {
    if (!agendaForm.title.trim() || !agendaForm.date.trim() || !agendaForm.location.trim()) {
      toast('Veuillez remplir le titre, la date et le lieu.', 'warning');
      return;
    }
    if (editingAgendaItem) {
      await updateAgendaItem(editingAgendaItem.id, agendaForm);
      toast('Session mise à jour', 'success');
    } else {
      const created = await createAgendaItem(agendaForm);
      if (created) setSelectedEventId(created.id);
      toast('Session créée avec succès', 'success');
    }
    setIsAgendaModalOpen(false);
    setEditingAgendaItem(null);
    setAgendaModalStep(1);
    loadAllData(true);
  };

  const handleDeleteSessionConfirmed = async () => {
    if (!confirmDeleteSession) return;
    const deletedId = confirmDeleteSession.id;
    await deleteAgendaItem(deletedId);
    setConfirmDeleteSession(null);
    if (selectedEventId === deletedId) setSelectedEventId(null);
    toast('Session supprimée', 'info');
    loadAllData(true);
  };

  // ── Attendance Operations ──
  const handleMarkPresent = async (regId: string) => {
    await updateAttendanceStatus(regId, 'present');
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, attendance_status: 'present' } : r))
    );
    toast('Présence confirmée', 'success');
  };

  const handleConfirmAbsence = async () => {
    if (!confirmAbsenceReg) return;
    await updateAttendanceStatus(confirmAbsenceReg.id, 'absent', absenceRemarkInput.trim() || 'Absent(e) non justifié(e)');
    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === confirmAbsenceReg.id
          ? { ...r, attendance_status: 'absent', absence_remark: absenceRemarkInput.trim() || 'Absent(e) non justifié(e)' }
          : r
      )
    );
    setConfirmAbsenceReg(null);
    setAbsenceRemarkInput('');
    toast('Absence enregistrée', 'info');
  };

  const handleResetAttendance = async (regId: string) => {
    await updateAttendanceStatus(regId, 'pending', '');
    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === regId ? { ...r, attendance_status: 'pending', absence_remark: undefined } : r
      )
    );
    toast('Statut réinitialisé en attente', 'info');
  };

  const handleBulkMarkSessionPresent = async (sessionEventId: string) => {
    const pendingInSession = registrations.filter(
      (r) => r.event_id === sessionEventId && (!r.attendance_status || r.attendance_status === 'pending')
    );
    if (pendingInSession.length === 0) {
      toast('Aucun membre en attente sur cette session.', 'info');
      return;
    }
    await Promise.all(pendingInSession.map((r) => updateAttendanceStatus(r.id, 'present')));
    setRegistrations((prev) =>
      prev.map((r) =>
        r.event_id === sessionEventId && (!r.attendance_status || r.attendance_status === 'pending')
          ? { ...r, attendance_status: 'present' }
          : r
      )
    );
    toast(`${pendingInSession.length} membre(s) marqués présents`, 'success');
  };

  // ── Helper Roles Operations ──
  const handleAddHelperRoleInline = async (presetName?: string, defaultSpots?: number) => {
    if (!selectedEvent) return;
    const nameToAdd = presetName || newRoleName;
    const spotsToAdd = defaultSpots || newRoleSpots;
    if (!nameToAdd.trim()) return;
    const updated = await addHelperRoleToAgenda(selectedEvent.id, nameToAdd, spotsToAdd, newRolePoints);
    if (updated) {
      setAgendaList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      toast('Poste d\'aide ajouté', 'success');
    }
    setIsAddRoleInlineOpen(false);
    setNewRoleName('Logistique & Matériel');
    setNewRoleSpots(3);
    setNewRolePoints(25);
  };

  const handleRemoveHelperRole = async (roleId: string) => {
    if (!selectedEvent) return;
    const updated = await removeHelperRoleFromAgenda(selectedEvent.id, roleId);
    if (updated) {
      setAgendaList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      toast('Poste d\'aide supprimé', 'info');
    }
  };

  const handleAssignMemberToRole = async (roleId: string) => {
    if (!selectedEvent || !selectedMemberIdToAssign) return;
    const foundMember = members.find((m) => m.id === selectedMemberIdToAssign);
    if (!foundMember) return;
    const updated = await assignMemberToHelperRole(selectedEvent.id, roleId, {
      id: foundMember.id,
      full_name: foundMember.full_name,
      email: foundMember.email,
      phone: foundMember.phone,
    });
    if (updated) {
      setAgendaList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      toast(`${foundMember.full_name} assigné(e) au poste`, 'success');
    }
    setAssigningRoleId(null);
    setSelectedMemberIdToAssign('');
  };

  const handleRemoveMemberFromRole = async (roleId: string, memberId: string) => {
    if (!selectedEvent) return;
    const updated = await removeMemberFromHelperRole(selectedEvent.id, roleId, memberId);
    if (updated) {
      setAgendaList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      toast('Membre retiré du poste', 'info');
    }
  };

  // ── Ideas Management ──
  const handleUpdateIdeaStatus = async (
    ideaId: string,
    newStatus: EventIdeaStatus,
    note?: string,
    points?: number
  ) => {
    await updateIdeaStatus(ideaId, newStatus, note, points);
    if (points && points > 0) {
      const targetIdea = ideas.find((i) => i.id === ideaId);
      if (targetIdea?.member_id) {
        await addPointsToMember(targetIdea.member_id, points, `Bonus idée retenue : ${targetIdea.title}`);
      }
    }
    const updatedList = await fetchAllEventIdeas();
    setIdeas(updatedList);
    toast(
      newStatus === 'approved'
        ? 'Idée retenue par le bureau'
        : newStatus === 'planned'
        ? 'Idée planifiée'
        : newStatus === 'rejected'
        ? 'Idée refusée'
        : 'Statut mis à jour',
      'success'
    );
  };

  const handlePlanIdeaToSession = (idea: EventIdea) => {
    setEditingAgendaItem(null);
    setAgendaModalStep(1);
    setAgendaForm({
      title: idea.title,
      edition: 'Édition Spéciale 2026',
      date: `Samedi ${new Date().getDate() + 7} Octobre 2026 · 14h00`,
      location: 'Salle Lab ESEN Manouba',
      program: idea.description + (idea.speaker_suggestion ? `\n\nIntervenant suggéré : ${idea.speaker_suggestion}` : ''),
      meeting_url: '',
      event_type: idea.category?.toLowerCase().includes('réunion') ? 'reunion' : 'formation',
      max_seats: 50,
      helper_roles: [
        { id: `role-1-${Date.now()}`, role_name: 'Logistique & Matériel', max_spots: 3, points_reward: 20, helpers: [] },
        { id: `role-2-${Date.now()}`, role_name: 'Accueil & Émargement', max_spots: 2, points_reward: 15, helpers: [] },
      ],
      trainer: {
        name: idea.speaker_suggestion || '',
        phone: '',
        email: '',
        formation_type: idea.category || 'Atelier pratique',
        bio: 'Formateur suggéré par un membre du club',
        links: { linkedin: '', github: '', portfolio: '' },
      },
    });
    setIsAgendaModalOpen(true);
    handleUpdateIdeaStatus(idea.id, 'planned', 'Convertie en session officielle dans l\'agenda.');
  };

  const handleDeleteIdeaConfirmed = async () => {
    if (!confirmDeleteIdea) return;
    await deleteEventIdea(confirmDeleteIdea.id);
    setConfirmDeleteIdea(null);
    setIdeas((prev) => prev.filter((i) => i.id !== confirmDeleteIdea.id));
    toast('Proposition supprimée', 'info');
  };

  const handleRejectIdeaConfirmed = async () => {
    if (!rejectIdeaModal) return;
    await handleUpdateIdeaStatus(rejectIdeaModal.id, 'rejected', rejectReasonInput.trim());
    setRejectIdeaModal(null);
    setRejectReasonInput('Non retenue pour cette édition.');
  };

  // ── Feedbacks Operations ──
  const handleDeleteFeedbackConfirmed = async () => {
    if (!confirmDeleteFeedback) return;
    await deleteFeedback(confirmDeleteFeedback.id);
    setFeedbacks((prev) => prev.filter((f) => f.id !== confirmDeleteFeedback.id));
    setConfirmDeleteFeedback(null);
    toast('Avis supprimé', 'info');
  };

  // ── Registrations Filtering & Search ──
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const q = regSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.member_name || '').toLowerCase().includes(q) ||
        (r.member_email || '').toLowerCase().includes(q) ||
        (r.event_title || '').toLowerCase().includes(q);

      const matchesSession = regSessionFilter === 'all' || r.event_id === regSessionFilter;

      if (!matchesSearch || !matchesSession) return false;

      if (regFilter === 'all') return true;
      if (regFilter === 'pending') return !r.attendance_status || r.attendance_status === 'pending';
      if (regFilter === 'present') return r.attendance_status === 'present';
      if (regFilter === 'absent') return r.attendance_status === 'absent';
      return true;
    });
  }, [registrations, regSearch, regSessionFilter, regFilter]);

  // ── Feedbacks Filtering & Metrics ──
  const globalFeedbackSummary = useMemo(() => {
    return computeEventRatingSummary(feedbacks);
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (feedbackRatingFilter === 'all') return true;
      return fb.rating === Number(feedbackRatingFilter);
    });
  }, [feedbacks, feedbackRatingFilter]);

  // ── Ideas Filtering ──
  const filteredIdeas = useMemo(() => {
    return ideas.filter((i) => {
      if (ideaStatusFilter === 'all') return true;
      return i.status === ideaStatusFilter;
    });
  }, [ideas, ideaStatusFilter]);

  return (
    <div className="space-y-5 animate-in fade-in pb-12">
      {/* ── 1. Page Header (Chrome Reduction: Single Title Row with Actions) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight font-sans">
                Agenda des Formations &amp; Réunions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sessions officielles, pointage des présences, avis et boîte à idées.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Visually quiet refresh button */}
            <button
              type="button"
              onClick={() => loadAllData()}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleOpenNewSession}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle session</span>
            </button>
          </div>
        </div>

        {/* ── Segmented Sub-Tab Bar (Sentence case, clean icons, attention badges) ── */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/60 overflow-x-auto">
          {[
            {
              id: 'sessions',
              label: 'Sessions',
              icon: Calendar,
              count: null,
            },
            {
              id: 'registrations',
              label: 'Inscriptions & Présences',
              icon: UserCheck,
              count: pendingAttendanceCount > 0 ? `${pendingAttendanceCount} à traiter` : null,
              countAlert: pendingAttendanceCount > 0,
            },
            {
              id: 'feedbacks',
              label: 'Avis membres',
              icon: Star,
              count: feedbacks.length > 0 ? feedbacks.length : null,
            },
            {
              id: 'ideas',
              label: 'Boîte à idées',
              icon: Lightbulb,
              count: pendingIdeasCount > 0 ? `${pendingIdeasCount} à examiner` : null,
              countAlert: pendingIdeasCount > 0,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as any)}
                className={`flex-1 min-w-[130px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      tab.countAlert
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isActive
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: SESSIONS (Master-Detail) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* ── Left Column: Master Sessions List ── */}
          <div className="lg:col-span-1 space-y-3">
            {/* Filter chips (Sentence case, subtle style) */}
            <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'formation', label: 'Formations' },
                { id: 'reunion', label: 'Réunions' },
                { id: 'evenement', label: 'Événements' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSessionFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionFilter === f.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sessions Cards */}
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aucune session enregistrée</p>
                <p className="text-[11px] text-slate-400">Cliquez sur « Nouvelle session » pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSessions.map((evt) => {
                  const regs = registrations.filter((r) => r.event_id === evt.id);
                  const maxSeats = evt.max_seats ?? 50;
                  const isFull = regs.length >= maxSeats;
                  const isSelected = selectedEventId === evt.id;

                  const typePill =
                    evt.event_type === 'formation'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : evt.event_type === 'reunion'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200';

                  const typeLabel =
                    evt.event_type === 'formation'
                      ? 'Formation'
                      : evt.event_type === 'reunion'
                      ? 'Réunion'
                      : 'Événement';

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEventId(evt.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                      }`}
                    >
                      {/* Top row: Type badge & Seat count */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typePill}`}>
                          {typeLabel}
                        </span>
                        <span
                          className={`text-[11px] font-bold ${
                            isFull ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {regs.length} / {maxSeats} places
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-black text-slate-900 line-clamp-2 leading-snug mb-1.5">
                        {evt.title}
                      </h3>

                      {/* Date & Location */}
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.date}</span>
                      </p>

                      {/* Trainer if any */}
                      {evt.trainer?.name && (
                        <p className="text-[11px] font-medium text-slate-600 truncate mb-2">
                          Formateur : <span className="font-bold text-slate-800">{evt.trainer.name}</span>
                        </p>
                      )}

                      {/* Card Bottom Actions (Safe Edit & Safe Delete) */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {regs.length === 0 ? '0 inscription' : `${regs.length} inscrit${regs.length > 1 ? 's' : ''}`}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSession(evt)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Modifier la session"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSession(evt)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Supprimer la session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right Column: Detail Panel ── */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedEvent ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">Sélectionnez une session</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Choisissez une session dans la colonne de gauche pour afficher les participants et gérer le pointage.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Session Header Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
                        {selectedEvent.event_type === 'formation'
                          ? 'Formation'
                          : selectedEvent.event_type === 'reunion'
                          ? 'Réunion'
                          : 'Événement'}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5 leading-snug">
                        {selectedEvent.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedEvent.date}</span>
                        {selectedEvent.location && <span>· {selectedEvent.location}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSession(selectedEvent)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Row (Quiet single row) */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-lg font-black text-slate-900">
                        {selectedEventRegs.length} <span className="text-xs font-normal text-slate-400">/ {selectedEvent.max_seats ?? 50}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">Inscrits</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <div className="text-lg font-black text-emerald-800">
                        {selectedEventRegs.filter((r) => r.attendance_status === 'present').length}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Présents confirmés</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                      <div className="text-lg font-black text-rose-700">
                        {selectedEventRegs.filter((r) => r.attendance_status === 'absent').length}
                      </div>
                      <div className="text-[11px] text-rose-600 font-medium mt-0.5">Absents signalés</div>
                    </div>
                  </div>
                </div>

                {/* Formateur Card if present */}
                {selectedEvent.trainer?.name && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                        {selectedEvent.trainer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{selectedEvent.trainer.name}</span>
                          {selectedEvent.trainer.formation_type && (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                              {selectedEvent.trainer.formation_type}
                            </span>
                          )}
                        </div>
                        {selectedEvent.trainer.bio && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{selectedEvent.trainer.bio}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {selectedEvent.trainer.phone && (
                        <a
                          href={`tel:${selectedEvent.trainer.phone}`}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                        >
                          📞 {selectedEvent.trainer.phone}
                        </a>
                      )}
                      {selectedEvent.trainer.email && (
                        <a
                          href={`mailto:${selectedEvent.trainer.email}`}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                        >
                          ✉️ Email
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Inner detail tabs */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSessionDetailTab('attendance')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        sessionDetailTab === 'attendance'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Présences ({selectedEventRegs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionDetailTab('helpers')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        sessionDetailTab === 'helpers'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Postes d'aide ({selectedEvent.helper_roles?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionDetailTab('feedbacks')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        sessionDetailTab === 'feedbacks'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Avis ({feedbacks.filter((f) => f.event_id === selectedEvent.id).length})
                    </button>
                  </div>

                  {sessionDetailTab === 'attendance' && selectedEventRegs.some((r) => !r.attendance_status || r.attendance_status === 'pending') && (
                    <button
                      type="button"
                      onClick={() => handleBulkMarkSessionPresent(selectedEvent.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tout marquer présent</span>
                    </button>
                  )}
                </div>

                {/* ── Sub-tab Content 1: Présences ── */}
                {sessionDetailTab === 'attendance' && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {selectedEventRegs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Aucun membre inscrit pour cette session.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Membre</th>
                              <th className="px-4 py-3">Date d'inscription</th>
                              <th className="px-4 py-3">Statut</th>
                              <th className="px-4 py-3">Remarque</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {selectedEventRegs.map((reg) => {
                              const isPending = !reg.attendance_status || reg.attendance_status === 'pending';
                              return (
                                <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-900">{reg.member_name || '—'}</div>
                                    <div className="text-[11px] text-slate-500">{reg.member_email}</div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                                    {reg.registered_at}
                                  </td>
                                  <td className="px-4 py-3">
                                    {reg.attendance_status === 'present' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                        <Check className="w-3 h-3" /> Présent(e)
                                      </span>
                                    ) : reg.attendance_status === 'absent' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200">
                                        Absent(e)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                        En attente
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 text-[11px] max-w-[160px] truncate">
                                    {reg.absence_remark || reg.justification_reason || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {isPending ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleMarkPresent(reg.id)}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                                        >
                                          Présent
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmAbsenceReg(reg);
                                            setAbsenceRemarkInput(reg.absence_remark || '');
                                          }}
                                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                                        >
                                          Marquer absent
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleResetAttendance(reg.id)}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                                        title="Remettre le statut en attente"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Modifier</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Sub-tab Content 2: Postes d'aide ── */}
                {sessionDetailTab === 'helpers' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Postes ouverts aux membres pour assister l'organisation.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddRoleInlineOpen((prev) => !prev)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ouvrir un poste</span>
                      </button>
                    </div>

                    {isAddRoleInlineOpen && (
                      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3 animate-in fade-in">
                        <div className="text-xs font-bold text-slate-900">Nouveau poste d'aide</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="Nom du poste..."
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                          />
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={newRoleSpots}
                            onChange={(e) => setNewRoleSpots(Number(e.target.value))}
                            placeholder="Places..."
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-center"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddHelperRoleInline()}
                            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700"
                          >
                            Valider
                          </button>
                        </div>
                      </div>
                    )}

                    {(!selectedEvent.helper_roles || selectedEvent.helper_roles.length === 0) ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        Aucun poste d'aide configuré pour cette session.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedEvent.helper_roles.map((role) => {
                          const helpers = role.helpers || [];
                          const isFull = helpers.length >= role.max_spots;
                          return (
                            <div key={role.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-black text-slate-900">{role.role_name}</h4>
                                  <p className="text-[10px] text-slate-500">
                                    {helpers.length} / {role.max_spots} places occupées · +{role.points_reward || 20} pts
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHelperRole(role.id)}
                                  className="p-1 text-slate-300 hover:text-rose-600 rounded-lg cursor-pointer"
                                  title="Supprimer ce poste"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Helpers list */}
                              <div className="space-y-1">
                                {helpers.map((h) => (
                                  <div key={h.member_id} className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded-md">
                                    <span className="font-semibold text-slate-800 truncate">{h.member_name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMemberFromRole(role.id, h.member_id)}
                                      className="text-slate-400 hover:text-rose-600 text-[10px]"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {!isFull && (
                                <div>
                                  {assigningRoleId === role.id ? (
                                    <div className="flex items-center gap-1 pt-1">
                                      <select
                                        value={selectedMemberIdToAssign}
                                        onChange={(e) => setSelectedMemberIdToAssign(e.target.value)}
                                        className="flex-1 text-[11px] p-1 rounded-md border border-slate-300 bg-white"
                                      >
                                        <option value="">Sélectionner un membre...</option>
                                        {members.map((m) => (
                                          <option key={m.id} value={m.id}>
                                            {m.full_name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleAssignMemberToRole(role.id)}
                                        className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-bold"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAssigningRoleId(null)}
                                        className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px]"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setAssigningRoleId(role.id)}
                                      className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                                    >
                                      + Assigner un membre
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Sub-tab Content 3: Avis de cette session ── */}
                {sessionDetailTab === 'feedbacks' && (
                  <div className="space-y-3">
                    {feedbacks.filter((f) => f.event_id === selectedEvent.id).length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        Aucun avis déposé pour cette session.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {feedbacks
                          .filter((f) => f.event_id === selectedEvent.id)
                          .map((fb) => (
                            <div key={fb.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-bold text-xs text-slate-900">{fb.member_name}</div>
                                <div className="flex items-center gap-0.5 text-amber-500 font-bold text-xs">
                                  <span>{fb.rating}</span>
                                  <Star className="w-3 h-3 fill-amber-500" />
                                </div>
                              </div>
                              {fb.comment && (
                                <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  "{fb.comment}"
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: INSCRIPTIONS & PRÉSENCES (Consolidated) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'registrations' && (
        <div className="space-y-4">
          {/* Controls: Filter Pills & Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: `Toutes (${registrations.length})` },
                  { id: 'pending', label: `En attente (${pendingAttendanceCount})` },
                  {
                    id: 'present',
                    label: `Présents (${registrations.filter((r) => r.attendance_status === 'present').length})`,
                  },
                  {
                    id: 'absent',
                    label: `Absents (${registrations.filter((r) => r.attendance_status === 'absent').length})`,
                  },
                  {
                    id: 'cancellations',
                    label: `Désinscriptions (${cancellationLogs.length})`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRegFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      regFilter === f.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Session Selector */}
              {regFilter !== 'cancellations' && (
                <div className="w-full sm:w-64">
                  <select
                    value={regSessionFilter}
                    onChange={(e) => setRegSessionFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="all">Toutes les sessions</option>
                    {agendaList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Search Input */}
            {regFilter !== 'cancellations' && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Rechercher par nom de membre, email ou titre de session..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Table: Registrations or Cancellations */}
          {regFilter === 'cancellations' ? (
            /* Cancellations Table */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Journal des désinscriptions ({cancellationLogs.length})
                </span>
                <span className="text-[11px] text-slate-400">Historique des annulations effectuées par les membres</span>
              </div>
              {cancellationLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucune désinscription enregistrée.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Membre</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Session annulée</th>
                        <th className="px-4 py-3">Date d'annulation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {cancellationLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">{log.member_name}</td>
                          <td className="px-4 py-3 text-slate-500">{log.member_email}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{log.event_title}</td>
                          <td className="px-4 py-3 text-rose-600 font-semibold text-[11px]">{log.cancelled_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Active Registrations Table with Direct Pointage Actions */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {filteredRegistrations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucune inscription trouvée pour ces critères.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Membre</th>
                        <th className="px-4 py-3">Session &amp; Date</th>
                        <th className="px-4 py-3">Inscrit le</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Remarque</th>
                        <th className="px-4 py-3 text-right">Pointage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredRegistrations.map((reg) => {
                        const isPending = !reg.attendance_status || reg.attendance_status === 'pending';
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">{reg.member_name || '—'}</div>
                              <div className="text-[11px] text-slate-500">{reg.member_email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900 line-clamp-1">{reg.event_title}</div>
                              <div className="text-[11px] text-slate-500 capitalize">
                                {reg.event_type || 'Session'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px]">{reg.registered_at}</td>
                            <td className="px-4 py-3">
                              {reg.attendance_status === 'present' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                  <Check className="w-3 h-3" /> Présent(e)
                                </span>
                              ) : reg.attendance_status === 'absent' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200">
                                  Absent(e)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                  En attente
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-[11px] max-w-[180px] truncate">
                              {reg.absence_remark || reg.justification_reason || '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleMarkPresent(reg.id)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                                  >
                                    Présent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmAbsenceReg(reg);
                                      setAbsenceRemarkInput(reg.absence_remark || '');
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    Absent
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleResetAttendance(reg.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                                  title="Modifier le statut"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Modifier</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: AVIS DES MEMBRES ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'feedbacks' && (
        <div className="space-y-4">
          {feedbacks.length === 0 ? (
            /* Clean Empty State directly under the tab bar */
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mx-auto">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Aucun avis membre pour le moment</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Les évaluations et commentaires soumis par les participants après chaque formation s'afficheront ici.
              </p>
            </div>
          ) : (
            <>
              {/* Point 19: Single muted line of figures */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700">
                  <div className="flex items-center gap-1 font-black text-slate-900">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{globalFeedbackSummary.average || '0.0'} / 5</span>
                    <span className="font-normal text-slate-500">({feedbacks.length} avis au total)</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="text-slate-600">
                    <strong>{globalFeedbackSummary.positivePercent}%</strong> d'avis positifs (notes ≥ 4★)
                  </div>
                </div>

                {/* Rating filter chips (Shown only when there is data) */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">Filtrer :</span>
                  <button
                    type="button"
                    onClick={() => setFeedbackRatingFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      feedbackRatingFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tous
                  </button>
                  {(['5', '4', '3', '2', '1'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFeedbackRatingFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        feedbackRatingFilter === r
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{r}</span>
                      <Star className={`w-3 h-3 ${feedbackRatingFilter === r ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedbacks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFeedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-2.5">
                      {/* Event tag & safe delete */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold truncate max-w-[200px]">
                          {fb.event_title || 'Session'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteFeedback(fb)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Supprimer cet avis"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Member & Stars */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{fb.member_name}</div>
                          <div className="text-[10px] text-slate-400">{fb.member_email}</div>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-xs text-slate-800">
                          <span>{fb.rating}/5</span>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </div>
                      </div>

                      {/* Criteria breakdown if available */}
                      {fb.aspects && (
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-600 font-medium">
                          {fb.aspects.organization && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              Org. {fb.aspects.organization}★
                            </span>
                          )}
                          {fb.aspects.content && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              Contenu {fb.aspects.content}★
                            </span>
                          )}
                          {fb.aspects.ambiance && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              Ambiance {fb.aspects.ambiance}★
                            </span>
                          )}
                        </div>
                      )}

                      {/* Comment text */}
                      {fb.comment ? (
                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                          "{fb.comment}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Sans commentaire textuel</p>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 text-right">
                      {fb.created_at ? new Date(fb.created_at).toLocaleDateString('fr-FR') : ''}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: BOÎTE À IDÉES (Unified Wording & Actionable Tools) ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'ideas' && (
        <div className="space-y-4">
          {/* Status Filters Only (Points 24 & 25: No duplicate stat cards, unified wording) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-semibold text-slate-500 mr-1">Statut :</span>
            {[
              { id: 'all', label: `Toutes (${ideas.length})` },
              { id: 'pending', label: `En attente (${ideas.filter((i) => i.status === 'pending').length})` },
              { id: 'approved', label: `Retenues (${ideas.filter((i) => i.status === 'approved').length})` },
              { id: 'planned', label: `Planifiées (${ideas.filter((i) => i.status === 'planned').length})` },
              { id: 'rejected', label: `Refusées (${ideas.filter((i) => i.status === 'rejected').length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setIdeaStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  ideaStatusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ideas Grid */}
          {filteredIdeas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mx-auto">
                <Lightbulb className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Aucune proposition trouvée</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Les membres peuvent soumettre des idées d'ateliers et de formations depuis leur espace personnel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredIdeas.map((idea) => {
                const votesCount = idea.votes?.length || 0;

                const statusBadge = {
                  pending: 'bg-amber-50 text-amber-900 border-amber-200',
                  approved: 'bg-emerald-50 text-emerald-900 border-emerald-200',
                  planned: 'bg-blue-50 text-blue-900 border-blue-200',
                  rejected: 'bg-slate-100 text-slate-600 border-slate-200',
                }[idea.status] || 'bg-slate-100 text-slate-600 border-slate-200';

                const statusText = {
                  pending: 'En attente',
                  approved: 'Retenue par le bureau',
                  planned: 'Planifiée à l\'agenda',
                  rejected: 'Non retenue',
                }[idea.status] || idea.status;

                return (
                  <div
                    key={idea.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Top row: Member info, Votes, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-slate-900">{idea.member_name}</div>
                          <div className="text-[10px] text-slate-400">{idea.member_email || 'Membre'}</div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{votesCount}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteIdea(idea)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Supprimer la proposition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Category & Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {idea.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge}`}>
                          {statusText}
                        </span>
                        {idea.points_awarded ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            +{idea.points_awarded} pts
                          </span>
                        ) : null}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-snug">{idea.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                          {idea.description}
                        </p>
                      </div>

                      {/* Suggested Trainer & Duration */}
                      {(idea.speaker_suggestion || idea.estimated_duration) && (
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                          {idea.speaker_suggestion && (
                            <span>🎤 Formateur suggéré : <strong>{idea.speaker_suggestion}</strong></span>
                          )}
                          {idea.estimated_duration && (
                            <span>⏱️ Durée : <strong>{idea.estimated_duration}</strong></span>
                          )}
                        </div>
                      )}

                      {/* Admin Note if any */}
                      {idea.admin_notes && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                          <span className="font-bold block text-slate-900">Motif / Note du bureau :</span>
                          <p className="italic mt-0.5">"{idea.admin_notes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Point 26: Actionable buttons (Retenir, Planifier, Refuser) */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {idea.status !== 'approved' && idea.status !== 'planned' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateIdeaStatus(
                                idea.id,
                                'approved',
                                'Idée retenue par le bureau pour la prochaine session.',
                                15
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                          >
                            ✓ Retenir (+15 pts)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handlePlanIdeaToSession(idea)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title="Créer une session officielle dans l'agenda"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Planifier la session</span>
                        </button>

                        {idea.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectIdeaModal(idea);
                              setRejectReasonInput('Non retenue pour cette édition.');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Refuser
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
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── MODALS & CONFIRMATIONS ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {/* ── 1. Create / Edit Session Modal ── */}
      {isAgendaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingAgendaItem ? 'Modifier la session' : 'Nouvelle session'}
                </h3>
                <p className="text-xs text-slate-400">
                  Étape {agendaModalStep} sur 3 · {agendaModalStep === 1 ? 'Détails généraux' : agendaModalStep === 2 ? 'Formateur & Intervenant' : 'Postes d\'aide'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAgendaModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {agendaModalStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Type d'événement</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'formation', label: 'Formation' },
                        { id: 'reunion', label: 'Réunion' },
                        { id: 'evenement', label: 'Événement' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAgendaForm((p) => ({ ...p, event_type: t.id as any }))}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            agendaForm.event_type === t.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Titre de la session *</label>
                    <input
                      type="text"
                      value={agendaForm.title}
                      onChange={(e) => setAgendaForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Ex: Workshop React & Next.js Moderne"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Date &amp; Heure conviviales *</label>
                      <input
                        type="text"
                        value={agendaForm.date}
                        onChange={(e) => setAgendaForm((p) => ({ ...p, date: e.target.value }))}
                        placeholder="Ex: Samedi 10 Octobre 2026 · 14h00"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Lieu *</label>
                      <input
                        type="text"
                        value={agendaForm.location}
                        onChange={(e) => setAgendaForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="Ex: Salle Lab ESEN Manouba"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Capacité maximale (places)</label>
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={agendaForm.max_seats}
                        onChange={(e) => setAgendaForm((p) => ({ ...p, max_seats: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Lien visio / réunion (optionnel)</label>
                      <input
                        type="text"
                        value={agendaForm.meeting_url}
                        onChange={(e) => setAgendaForm((p) => ({ ...p, meeting_url: e.target.value }))}
                        placeholder="https://meet.google.com/..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Programme / Description</label>
                    <textarea
                      rows={3}
                      value={agendaForm.program}
                      onChange={(e) => setAgendaForm((p) => ({ ...p, program: e.target.value }))}
                      placeholder="Objectifs, prérequis, plan d'apprentissage..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {agendaModalStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Nom du formateur / intervenant</label>
                    <input
                      type="text"
                      value={agendaForm.trainer.name}
                      onChange={(e) =>
                        setAgendaForm((p) => ({
                          ...p,
                          trainer: { ...p.trainer, name: e.target.value },
                        }))
                      }
                      placeholder="Ex: Walid Ben Salah"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Numéro de téléphone / WhatsApp</label>
                      <input
                        type="text"
                        value={agendaForm.trainer.phone}
                        onChange={(e) =>
                          setAgendaForm((p) => ({
                            ...p,
                            trainer: { ...p.trainer, phone: e.target.value },
                          }))
                        }
                        placeholder="+216 98 123 456"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                      <input
                        type="email"
                        value={agendaForm.trainer.email}
                        onChange={(e) =>
                          setAgendaForm((p) => ({
                            ...p,
                            trainer: { ...p.trainer, email: e.target.value },
                          }))
                        }
                        placeholder="formateur@example.com"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Spécialité / Titre</label>
                    <input
                      type="text"
                      value={agendaForm.trainer.formation_type}
                      onChange={(e) =>
                        setAgendaForm((p) => ({
                          ...p,
                          trainer: { ...p.trainer, formation_type: e.target.value },
                        }))
                      }
                      placeholder="Ex: Senior Fullstack Engineer"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Bio / Présentation rapide</label>
                    <textarea
                      rows={2}
                      value={agendaForm.trainer.bio}
                      onChange={(e) =>
                        setAgendaForm((p) => ({
                          ...p,
                          trainer: { ...p.trainer, bio: e.target.value },
                        }))
                      }
                      placeholder="Courte bio du formateur..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {agendaModalStep === 3 && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Définissez des rôles d'assistance bénévole pour cette session (ex: Logistique, Accueil). Cette étape est facultative.
                  </p>

                  <div className="space-y-2">
                    {agendaForm.helper_roles.map((role, idx) => (
                      <div key={role.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{role.role_name}</div>
                          <div className="text-[11px] text-slate-500">{role.max_spots} places · +{role.points_reward} pts</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAgendaForm((p) => ({
                              ...p,
                              helper_roles: p.helper_roles.filter((_, i) => i !== idx),
                            }))
                          }
                          className="text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAgendaForm((p) => ({
                          ...p,
                          helper_roles: [
                            ...p.helper_roles,
                            {
                              id: `role-${Date.now()}`,
                              role_name: 'Logistique & Matériel',
                              max_spots: 3,
                              points_reward: 20,
                              helpers: [],
                            },
                          ],
                        }))
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                    >
                      + Ajouter Logistique (3 pl.)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAgendaForm((p) => ({
                          ...p,
                          helper_roles: [
                            ...p.helper_roles,
                            {
                              id: `role-${Date.now()}`,
                              role_name: 'Accueil & Émargement',
                              max_spots: 2,
                              points_reward: 15,
                              helpers: [],
                            },
                          ],
                        }))
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
                    >
                      + Ajouter Accueil (2 pl.)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (agendaModalStep > 1) {
                    setAgendaModalStep((s) => (s - 1) as any);
                  } else {
                    setIsAgendaModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                {agendaModalStep === 1 ? 'Annuler' : '← Précédent'}
              </button>

              <div className="flex items-center gap-2">
                {agendaModalStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setAgendaModalStep((s) => (s + 1) as any)}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                  >
                    Suivant →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={doSaveSession}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                  >
                    {editingAgendaItem ? 'Enregistrer les modifications' : 'Créer la session'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Confirm Delete Session Modal (Point 8: Warn about registered members) ── */}
      {confirmDeleteSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Supprimer la session ?</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-900 space-y-1">
              <p><strong>Session :</strong> {confirmDeleteSession.title}</p>
              {(() => {
                const regsCount = registrations.filter((r) => r.event_id === confirmDeleteSession.id).length;
                return regsCount > 0 ? (
                  <p className="font-bold text-rose-700 pt-1">
                    ⚠️ Attention : {regsCount} membre(s) sont déjà inscrit(s) à cette session !
                  </p>
                ) : (
                  <p className="text-slate-600">Aucun membre n'est actuellement inscrit.</p>
                );
              })()}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteSession(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteSessionConfirmed}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Confirm Mark Absent Modal ── */}
      {confirmAbsenceReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Signaler l'absence</h3>
                <p className="text-xs text-slate-400">Pointage administratif</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p><strong>Membre :</strong> {confirmAbsenceReg.member_name} ({confirmAbsenceReg.member_email})</p>
              <p><strong>Session :</strong> {confirmAbsenceReg.event_title}</p>
              {confirmAbsenceReg.justification_reason && (
                <p className="text-amber-800 bg-amber-50 p-2 rounded mt-1 border border-amber-200">
                  Motif transmis par le membre : "{confirmAbsenceReg.justification_reason}"
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Motif ou remarque administrative (optionnel) :
              </label>
              <input
                type="text"
                value={absenceRemarkInput}
                onChange={(e) => setAbsenceRemarkInput(e.target.value)}
                placeholder="Ex: Absent sans justificatif..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmAbsenceReg(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmAbsence}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Confirmer l'absence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Reject Idea Modal with Reason ── */}
      {rejectIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Refuser la proposition</h3>
                <p className="text-xs text-slate-400">{rejectIdeaModal.title}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Motif du refus (visible par le membre) :
              </label>
              <input
                type="text"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="Ex: Sujet déjà abordé lors du précédent semestre."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectIdeaModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRejectIdeaConfirmed}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Confirm Delete Idea Modal ── */}
      {confirmDeleteIdea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Supprimer cette idée ?</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Voulez-vous vraiment supprimer définitivement l'idée « {confirmDeleteIdea.title} » proposée par {confirmDeleteIdea.member_name} ?
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteIdea(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteIdeaConfirmed}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Confirm Delete Feedback Modal ── */}
      {confirmDeleteFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Supprimer cet avis ?</h3>
                <p className="text-xs text-slate-400">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Supprimer l'évaluation de {confirmDeleteFeedback.member_name} ({confirmDeleteFeedback.rating}★) ?
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteFeedback(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteFeedbackConfirmed}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
