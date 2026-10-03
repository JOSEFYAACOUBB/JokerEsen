import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Award,
  X,
  Mail,
  LayoutGrid,
  Table as TableIcon,
  Trash2,
  CheckCircle2,
  Calendar,
  Phone,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  RotateCcw,
  AlertTriangle,
  ClipboardCheck,
  Check,
  UserX,
} from 'lucide-react';
import {
  getStoredMembers,
  saveStoredMembers,
  fetchMembersFromDb,
  fetchEventRegistrationsFromDb,
  createMemberByAdmin,
  updateMemberStatus,
  addPointsToMember,
  deleteMemberByAdmin,
  getAllEventRegistrations,
  updateAttendanceStatus,
  getCancellationLogs,
} from '../../../services/memberService';
import { fetchAllAgendaItems } from '../../../services/agendaService';
import type { ClubMember, MemberRole, MemberEventRegistration, CancellationLog, AgendaItem } from '../../../types/member';

interface AdminMembersTabProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ROLE_LABELS: Record<string, string> = {
  member: 'Membre',
  staff: 'Staff',
  moderator: 'Modérateur',
  admin: 'Admin',
};

const LEVEL_COLORS: Record<string, string> = {
  Bronze: 'bg-stone-100 text-stone-700 border-stone-200',
  Argent: 'bg-slate-100 text-slate-700 border-slate-200',
  Or: 'bg-amber-50 text-amber-800 border-amber-200',
  Platine: 'bg-purple-50 text-purple-800 border-purple-200',
};

const formatFrenchDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return dateStr
    .replace(/\b(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche)\b/gi, (d) => d.toLowerCase())
    .replace(/\b(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)\b/gi, (m) => m.toLowerCase());
};

export const AdminMembersTab: React.FC<AdminMembersTabProps> = ({ onShowToast }) => {
  const [subTab, setSubTab] = useState<'members' | 'attendance' | 'leaderboard'>('members');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'pending' | 'present' | 'absent' | 'cancellations'>('all');

  const [members, setMembers] = useState<ClubMember[]>(() => getStoredMembers());
  const [registrations, setRegistrations] = useState<MemberEventRegistration[]>(() => getAllEventRegistrations());
  const [cancellationLogs] = useState<CancellationLog[]>(() => getCancellationLogs());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);

  // ── Load live data from Supabase / Services on mount ──
  useEffect(() => {
    fetchMembersFromDb().then(setMembers).catch(() => {});
    fetchEventRegistrationsFromDb().then(setRegistrations).catch(() => {});
    fetchAllAgendaItems().then(setAgendaItems).catch(() => {});
  }, []);

  // Filter & Search states for members
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'points' | 'name' | 'recent'>('points');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberCreated, setMemberCreated] = useState<ClubMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [selectedMemberForPoints, setSelectedMemberForPoints] = useState<ClubMember | null>(null);
  const [pointsAmount, setPointsAmount] = useState<number>(50);
  const [pointsReason, setPointsReason] = useState<string>("Excellente contribution lors de l'événement");

  // Confirmation Modals for Destructive / Sensitive Actions
  const [confirmAbsenceReg, setConfirmAbsenceReg] = useState<MemberEventRegistration | null>(null);
  const [absenceRemarkInput, setAbsenceRemarkInput] = useState('');
  const [confirmSuspendMember, setConfirmSuspendMember] = useState<ClubMember | null>(null);
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<ClubMember | null>(null);

  // ── Pagination ──
  const MEMBERS_PER_PAGE = 10;
  const LEADERBOARD_PER_PAGE = 10;
  const [membersPage, setMembersPage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setMembersPage(1);
  }, [search, selectedDept, selectedRole, selectedStatus, sortBy]);

  // Dismiss row action menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (openRowMenuId && !(e.target as Element).closest('[data-row-menu]')) {
        setOpenRowMenuId(null);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [openRowMenuId]);

  const defaultForm = {
    full_name: '',
    email: '',
    password: 'joker2024',
    cin: '',
    phone: '',
    birth_date: '',
    major: 'Licence Business Computing (LBC)',
    department: 'Développement Web & IA',
    role: 'member' as MemberRole,
    bio: '',
  };

  const [formData, setFormData] = useState(defaultForm);

  const handleOpenAddModal = () => {
    setMemberCreated(null);
    setFormData(defaultForm);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setMemberCreated(null);
    setFormData(defaultForm);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.cin) {
      onShowToast('Veuillez remplir tous les champs obligatoires (Nom, Email, CIN).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createMemberByAdmin({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password || 'joker2024',
        cin: formData.cin.trim(),
        phone: formData.phone || '22 000 000',
        birth_date: formData.birth_date || undefined,
        major: formData.major,
        department: formData.department,
        role: formData.role,
        bio: formData.bio || 'Nouveau membre du club Joker ESEN.',
        skills: ['Autonomie', 'Travail en équipe'],
      });

      const latest = await fetchMembersFromDb().catch(() => getStoredMembers());
      const merged = [created, ...latest.filter((m) => m.id !== created.id)];
      setMembers(merged);
      saveStoredMembers(merged);

      setMemberCreated(created);
      onShowToast(`Compte créé et enregistré pour ${created.full_name} !`, 'success');
    } catch (err: any) {
      console.error('Error creating member:', err);
      onShowToast('Erreur lors de la création du compte: ' + (err?.message || ''), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmSuspendMember) return;
    const nextStatus = confirmSuspendMember.status === 'active' ? 'suspended' : 'active';
    const updated = await updateMemberStatus(confirmSuspendMember.id, nextStatus);
    setMembers(updated);
    onShowToast(
      nextStatus === 'active'
        ? `Le compte de ${confirmSuspendMember.full_name} a été réactivé.`
        : `Le compte de ${confirmSuspendMember.full_name} a été suspendu.`,
      'info'
    );
    setConfirmSuspendMember(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteMember) return;
    const updated = await deleteMemberByAdmin(confirmDeleteMember.id);
    setMembers(updated);
    onShowToast(`Membre ${confirmDeleteMember.full_name} supprimé définitivement.`, 'info');
    setConfirmDeleteMember(null);
  };

  const handleAddPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPoints) return;
    const updated = await addPointsToMember(selectedMemberForPoints.id, pointsAmount, pointsReason);
    setMembers(updated);
    setIsPointsModalOpen(false);
    onShowToast(`+${pointsAmount} pts attribués à ${selectedMemberForPoints.full_name}.`, 'success');
    setSelectedMemberForPoints(null);
  };

  // Attendance actions
  const handleMarkPresent = async (reg: MemberEventRegistration) => {
    const updated = await updateAttendanceStatus(reg.id, 'present');
    setRegistrations(updated);
    onShowToast(`Présence confirmée pour ${reg.member_name || 'le membre'}.`, 'success');
  };

  const handleOpenAbsenceModal = (reg: MemberEventRegistration) => {
    setConfirmAbsenceReg(reg);
    setAbsenceRemarkInput(reg.justification_reason ? `Absence signalée : ${reg.justification_reason}` : 'Absent(e) non justifié(e) à la session.');
  };

  const handleConfirmAbsenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmAbsenceReg) return;
    const updated = await updateAttendanceStatus(confirmAbsenceReg.id, 'absent', absenceRemarkInput);
    setRegistrations(updated);
    setConfirmAbsenceReg(null);
    onShowToast(`Absence enregistrée pour ${confirmAbsenceReg.member_name || 'le membre'}.`, 'info');
  };

  const handleUndoAttendance = async (reg: MemberEventRegistration) => {
    const updated = await updateAttendanceStatus(reg.id, 'pending');
    setRegistrations(updated);
    onShowToast(`Statut réinitialisé en attente pour ${reg.member_name || 'le membre'}.`, 'info');
  };

  const handleMarkAllPresentForSession = async (sessionTitle: string, sessionRegs: MemberEventRegistration[]) => {
    const pendingRegs = sessionRegs.filter((r) => !r.attendance_status || r.attendance_status === 'pending');
    if (pendingRegs.length === 0) {
      onShowToast('Aucun membre en attente pour cette session.', 'info');
      return;
    }
    let updated = registrations;
    for (const reg of pendingRegs) {
      updated = await updateAttendanceStatus(reg.id, 'present');
    }
    setRegistrations(updated);
    onShowToast(`${pendingRegs.length} membre(s) marqué(s) présent(s) pour "${sessionTitle}".`, 'success');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Nom Complet', 'Email', 'CIN', 'Téléphone', 'Pôle', 'Filière', 'Rôle', 'Points', 'Niveau', 'Statut'];
    const rows = filteredMembers.map((m) => [
      `"${m.full_name.replace(/"/g, '""')}"`,
      `"${m.email}"`,
      `"${m.cin}"`,
      `"${m.phone || ''}"`,
      `"${m.department || ''}"`,
      `"${m.major || ''}"`,
      `"${ROLE_LABELS[m.role] || m.role}"`,
      m.points || 0,
      `"${m.level || 'Bronze'}"`,
      `"${m.status === 'active' ? 'Actif' : 'Suspendu'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `membres_joker_esen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Export CSV téléchargé avec succès.', 'success');
  };

  // Filtered and sorted members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.cin.includes(search);
    const matchesDept = selectedDept === 'all' || m.department === selectedDept;
    const matchesRole = selectedRole === 'all' || m.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus;
    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'points') return (b.points || 0) - (a.points || 0);
    if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
    return new Date(b.join_date || '').getTime() - new Date(a.join_date || '').getTime();
  });

  const totalMembersPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE));
  const safeMembersPage = Math.min(membersPage, totalMembersPages);
  const pagedMembers = filteredMembers.slice(
    (safeMembersPage - 1) * MEMBERS_PER_PAGE,
    safeMembersPage * MEMBERS_PER_PAGE
  );

  // Leaderboard with standard competition ranking (ties at 50 pts are =2)
  const sortedLeaderboard = [...members]
    .filter((m) => m.status === 'active')
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  let currentRank = 1;
  const rankedLeaderboard = sortedLeaderboard.map((m, idx, arr) => {
    if (idx > 0 && (m.points || 0) < (arr[idx - 1].points || 0)) {
      currentRank = idx + 1;
    }
    const isTied = idx > 0 && (m.points || 0) === (arr[idx - 1].points || 0);
    return {
      ...m,
      rank: currentRank,
      isTied,
    };
  });

  const totalLeaderboardPages = Math.max(1, Math.ceil(rankedLeaderboard.length / LEADERBOARD_PER_PAGE));
  const safeLeaderboardPage = Math.min(leaderboardPage, totalLeaderboardPages);
  const pagedLeaderboard = rankedLeaderboard.slice(
    (safeLeaderboardPage - 1) * LEADERBOARD_PER_PAGE,
    safeLeaderboardPage * LEADERBOARD_PER_PAGE
  );

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    suspended: members.filter((m) => m.status === 'suspended').length,
  };

  // Pending count for registrations needing attendance review
  const pendingAttendanceCount = registrations.filter((r) => !r.attendance_status || r.attendance_status === 'pending').length;

  // Group registrations by session
  const sessionGroups = (() => {
    const groups: Record<string, { eventTitle: string; sessionDate: string; registrations: MemberEventRegistration[] }> = {};

    registrations.forEach((reg) => {
      const title = reg.event_title || 'Session Joker';
      if (!groups[title]) {
        const matchingAgenda = agendaItems.find((a) => a.title === title || a.id === reg.event_id);
        groups[title] = {
          eventTitle: title,
          sessionDate: matchingAgenda?.date ? formatFrenchDate(matchingAgenda.date) : (reg.registered_at ? formatFrenchDate(reg.registered_at.split('T')[0]) : ''),
          registrations: [],
        };
      }
      groups[title].registrations.push(reg);
    });

    return Object.values(groups);
  })();

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ── Sub-Tabs Navigation (Clean Sentence Case, No Broken Emojis) ── */}
      <div className="flex flex-wrap p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/60 gap-1">
        <button
          onClick={() => setSubTab('members')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subTab === 'members'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Comptes membres</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${subTab === 'members' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
            {members.length}
          </span>
        </button>

        <button
          onClick={() => {
            fetchEventRegistrationsFromDb().then(setRegistrations).catch(() => {});
            setSubTab('attendance');
          }}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subTab === 'attendance'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" />
          <span>Présences &amp; Inscriptions</span>
          {pendingAttendanceCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingAttendanceCount} à traiter
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${subTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
              {registrations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('leaderboard')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subTab === 'leaderboard'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span>Classement points</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${subTab === 'leaderboard' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
            {stats.active}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SUB-TAB 1: COMPTES MEMBRES
      ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'members' && (
        <div className="space-y-4">
          {/* Header & Quick Action Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight">
                Gestion des comptes membres
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Création, attribution des points et gestion des accès au portail officiel.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                title="Exporter la liste en fichier CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exporter CSV</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Créer un membre</span>
              </button>
            </div>
          </div>

          {/* Functional Clickable Status Filter Bar (Replacing giant non-actionable cards) */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">Filtrer par statut :</span>
            <button
              type="button"
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer border ${
                selectedStatus === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tous les membres ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('active')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer border ${
                selectedStatus === 'active'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Actifs ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('suspended')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer border ${
                selectedStatus === 'suspended'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : stats.suspended > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Suspendus ({stats.suspended})
            </button>
          </div>

          {/* Filters & View Controls */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email ou CIN..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap justify-between lg:justify-end">
              {/* Dept Select */}
              <div className="relative">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="all">Tous les pôles</option>
                  <option value="Développement Web & IA">Dev Web &amp; IA</option>
                  <option value="Communication & Design">Comm &amp; Design</option>
                  <option value="Événementiel & Logistique">Événementiel</option>
                  <option value="Sponsoring & Relations Extérieures">Sponsoring</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Role Select */}
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="member">Membre</option>
                  <option value="staff">Staff</option>
                  <option value="moderator">Modérateur</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Sort By Select */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:border-blue-500 focus:outline-none cursor-pointer transition-all"
                >
                  <option value="points">Points décroissants</option>
                  <option value="name">Nom (A-Z)</option>
                  <option value="recent">Plus récents</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Vue tableau"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Vue cartes"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                      <th className="py-3 px-5">Membre</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Filière &amp; Pôle</th>
                      <th className="py-3 px-4">Rôle</th>
                      <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSortBy('points')}>
                        <span className="flex items-center gap-1">
                          <span>Points</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </span>
                      </th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400 font-medium">
                          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          Aucun membre correspondant aux filtres.
                        </td>
                      </tr>
                    ) : (
                      pagedMembers.map((m) => {
                        const isSuspended = m.status === 'suspended';

                        return (
                          <tr
                            key={m.id}
                            className={`hover:bg-blue-50/40 transition-colors group ${
                              isSuspended ? 'bg-rose-50/30' : ''
                            }`}
                          >
                            {/* Membre */}
                            <td className="py-3 px-5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=1d4ed8&color=fff&bold=true&size=64`}
                                  alt={m.full_name}
                                  className="w-9 h-9 rounded-xl object-cover bg-slate-100 shrink-0"
                                />
                                <div>
                                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                    <span>{m.full_name}</span>
                                    {isSuspended && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                        Suspendu
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-600 font-mono">CIN: {m.cin}</div>
                                </div>
                              </div>
                            </td>

                            {/* Contact */}
                            <td className="py-3 px-4">
                              <div className="text-slate-800 font-medium">{m.email}</div>
                              {m.phone && <div className="text-[11px] text-slate-600">{m.phone}</div>}
                            </td>

                            {/* Filière & Pôle */}
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">{m.department}</div>
                              <div className="text-[11px] text-slate-600 truncate max-w-[200px]">{m.major}</div>
                            </td>

                            {/* Rôle */}
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium">
                                {ROLE_LABELS[m.role] || m.role}
                              </span>
                            </td>

                            {/* Points */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 tabular-nums">
                                  {m.points ?? 0} pts
                                </span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[m.level] || LEVEL_COLORS.Bronze}`}>
                                  {m.level || 'Bronze'}
                                </span>
                              </div>
                            </td>

                            {/* Actions (Primary + Points & ⋯ Dropdown) */}
                            <td className="py-3 px-5 text-right">
                              <div className="flex items-center justify-end gap-2" data-row-menu>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMemberForPoints(m);
                                    setIsPointsModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Attribuer des points"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>+ Points</span>
                                </button>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setOpenRowMenuId(openRowMenuId === m.id ? null : m.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Options du compte"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>

                                  {openRowMenuId === m.id && (
                                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 text-left">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenRowMenuId(null);
                                          setSelectedMemberForPoints(m);
                                          setIsPointsModalOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                      >
                                        <Award className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Attribuer des points</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenRowMenuId(null);
                                          setConfirmSuspendMember(m);
                                        }}
                                        className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                                      >
                                        <UserX className="w-3.5 h-3.5 text-amber-600" />
                                        <span>{isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}</span>
                                      </button>
                                      <div className="my-1 border-t border-slate-100" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenRowMenuId(null);
                                          setConfirmDeleteMember(m);
                                        }}
                                        className="w-full px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Supprimer le membre</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table pagination */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">
                  {filteredMembers.length === 0
                    ? '0 membre'
                    : `${(safeMembersPage - 1) * MEMBERS_PER_PAGE + 1}–${Math.min(safeMembersPage * MEMBERS_PER_PAGE, filteredMembers.length)} sur ${filteredMembers.length} membre${filteredMembers.length > 1 ? 's' : ''}`}
                </span>
                {totalMembersPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
                      disabled={safeMembersPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalMembersPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setMembersPage(page)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          page === safeMembersPage
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setMembersPage((p) => Math.min(totalMembersPages, p + 1))}
                      disabled={safeMembersPage === totalMembersPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.length === 0 ? (
                <div className="md:col-span-2 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
                  <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-medium">Aucun membre trouvé.</p>
                </div>
              ) : (
                pagedMembers.map((m) => (
                  <div
                    key={m.id}
                    className={`p-5 rounded-2xl bg-white border shadow-xs flex flex-col justify-between gap-3 transition-shadow hover:shadow-sm ${
                      m.status === 'suspended' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=1d4ed8&color=fff&bold=true&size=80`}
                          alt={m.full_name}
                          className="w-11 h-11 rounded-xl object-cover bg-slate-100 shrink-0"
                        />
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                            <span>{m.full_name}</span>
                            {m.status === 'suspended' && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                Suspendu
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500">{m.department}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${LEVEL_COLORS[m.level] || LEVEL_COLORS.Bronze}`}>
                        {m.points ?? 0} pts
                      </span>
                    </div>

                    <div className="space-y-1 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </div>
                      {m.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{m.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] pt-0.5">
                        <span>CIN: {m.cin}</span>
                        <span>·</span>
                        <span>Rôle: {ROLE_LABELS[m.role] || m.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberForPoints(m);
                          setIsPointsModalOpen(true);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Award className="w-3.5 h-3.5" />
                        + Points
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSuspendMember(m)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
                      >
                        {m.status === 'active' ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUB-TAB 2: ATTENDANCE (Grouped by Session)
      ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'attendance' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight">
                Émargement &amp; Présences par Session
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vérifiez la présence des membres par événement. Les signalements d'absence nécessitent confirmation.
              </p>
            </div>
            {/* Filter pills: All, Pending, Present, Absent, Cancellations */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'Toutes les sessions' },
                { id: 'pending', label: `En attente (${pendingAttendanceCount})` },
                { id: 'present', label: 'Présents' },
                { id: 'absent', label: 'Absents' },
                { id: 'cancellations', label: `Désinscriptions (${cancellationLogs.length})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setAttendanceFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                    attendanceFilter === pill.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* VIEW: CANCELLATIONS FILTER */}
          {attendanceFilter === 'cancellations' ? (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
                <strong>Journal des désinscriptions :</strong> Historique officiel des membres ayant annulé leur inscription à une session.
              </div>

              {cancellationLogs.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-400">
                  Aucune désinscription enregistrée pour le moment.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <th className="py-3 px-4">Date de désinscription</th>
                          <th className="py-3 px-4">Membre</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Session</th>
                          <th className="py-3 px-4 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {cancellationLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono text-slate-500">{log.cancelled_at}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{log.member_name}</td>
                            <td className="py-3 px-4 text-slate-600">{log.member_email}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">{log.event_title}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[11px]">
                                Désinscrit(e)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : sessionGroups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-xs">Aucune inscription active enregistrée</h3>
              <p className="text-[11px] text-slate-500">Les inscriptions des membres s'afficheront automatiquement ici.</p>
            </div>
          ) : (
            /* SESSIONS ACCORDIONS / GROUPS */
            <div className="space-y-6">
              {sessionGroups.map((group) => {
                // Filter registrations inside this session according to active filter
                const filteredRegs = group.registrations.filter((r) => {
                  if (attendanceFilter === 'pending') return !r.attendance_status || r.attendance_status === 'pending';
                  if (attendanceFilter === 'present') return r.attendance_status === 'present';
                  if (attendanceFilter === 'absent') return r.attendance_status === 'absent';
                  return true;
                });

                if (filteredRegs.length === 0 && attendanceFilter !== 'all') {
                  return null;
                }

                const totalRegs = group.registrations.length;
                const presents = group.registrations.filter((r) => r.attendance_status === 'present').length;
                const absents = group.registrations.filter((r) => r.attendance_status === 'absent').length;
                const pendings = group.registrations.filter((r) => !r.attendance_status || r.attendance_status === 'pending').length;

                return (
                  <div key={group.eventTitle} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Session Header Card Banner */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                            {group.eventTitle}
                          </h3>
                          {group.sessionDate && (
                            <span className="text-xs text-slate-500 font-medium">
                              · {group.sessionDate}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                          <span>{totalRegs} inscrit{totalRegs > 1 ? 's' : ''}</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-semibold">{presents} présent{presents > 1 ? 's' : ''}</span>
                          <span>·</span>
                          <span className="text-rose-700 font-semibold">{absents} absent{absents > 1 ? 's' : ''}</span>
                          {pendings > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-amber-700 font-semibold">{pendings} en attente</span>
                            </>
                          )}
                        </div>
                      </div>

                      {pendings > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMarkAllPresentForSession(group.eventTitle, group.registrations)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs shrink-0"
                          title="Marquer tous les membres en attente comme présents"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tout marquer présent ({pendings})</span>
                        </button>
                      )}
                    </div>

                    {/* Registrations Table Inside Session */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-white">
                            <th className="py-2.5 px-5">Membre</th>
                            <th className="py-2.5 px-4">Date d'inscription</th>
                            <th className="py-2.5 px-4">Justification éventuelle</th>
                            <th className="py-2.5 px-4">Statut</th>
                            <th className="py-2.5 px-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredRegs.map((reg) => {
                            const isPresent = reg.attendance_status === 'present';
                            const isAbsent = reg.attendance_status === 'absent';
                            const isPending = !reg.attendance_status || reg.attendance_status === 'pending';

                            return (
                              <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                                {/* Membre */}
                                <td className="py-3 px-5">
                                  <div className="font-semibold text-slate-900">{reg.member_name || 'Membre Joker'}</div>
                                  <div className="text-[11px] text-slate-500">{reg.member_email || reg.member_id}</div>
                                </td>

                                {/* Date inscription */}
                                <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                                  {reg.registered_at ? formatFrenchDate(reg.registered_at.split('T')[0]) : '—'}
                                </td>

                                {/* Justification / Motif */}
                                <td className="py-3 px-4">
                                  {reg.justification_reason ? (
                                    <div className="text-xs text-amber-900 bg-amber-50 rounded-lg p-2 border border-amber-200/80 max-w-sm">
                                      <span className="font-semibold">Motif membre :</span> "{reg.justification_reason}"
                                    </div>
                                  ) : isAbsent && reg.absence_remark ? (
                                    <div className="text-xs text-rose-800 bg-rose-50 rounded-lg p-2 border border-rose-200/80 max-w-sm">
                                      <span className="font-semibold">Note bureau :</span> "{reg.absence_remark}"
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )}
                                </td>

                                {/* Statut (Clean single badge, no duplicate) */}
                                <td className="py-3 px-4">
                                  {isPresent ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                      <span>Présent(e)</span>
                                    </span>
                                  ) : isAbsent ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                      <span>Absent(e)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                      <span>En attente</span>
                                    </span>
                                  )}
                                </td>

                                {/* Actions: Pending has calm Present + Marquer absent modal; Completed has undo option */}
                                <td className="py-3 px-5 text-right">
                                  {isPending ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleMarkPresent(reg)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                                      >
                                        Présent
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAbsenceModal(reg)}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-medium transition-colors cursor-pointer"
                                      >
                                        Marquer absent
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleUndoAttendance(reg)}
                                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 hover:underline cursor-pointer"
                                      title="Réinitialiser en attente"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Modifier / Annuler</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SUB-TAB 3: CLASSEMENT POINTS (With Direct + Points Action)
      ══════════════════════════════════════════════════════════════════ */}
      {subTab === 'leaderboard' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight">
                Classement officiel des membres
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Membres actifs classés par points accumulés. Attribuez directement des points depuis ce tableau.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {stats.active} membres actifs
            </span>
          </div>

          {rankedLeaderboard.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-sm text-slate-400">Aucun membre actif enregistré.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden max-w-4xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                    <th className="px-5 py-3 w-16 text-center">Rang</th>
                    <th className="px-4 py-3">Membre</th>
                    <th className="px-4 py-3">Pôle</th>
                    <th className="px-4 py-3">Niveau</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pagedLeaderboard.map((m) => {
                    const isTied = m.isTied;
                    const rank = m.rank;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Rang (SVG badges strictly for top 3, =rank for ties) */}
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center">
                            {rank === 1 && !isTied ? (
                              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs flex items-center justify-center tabular-nums shadow-2xs">
                                1
                              </span>
                            ) : rank === 2 && !isTied ? (
                              <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center tabular-nums shadow-2xs">
                                2
                              </span>
                            ) : rank === 3 && !isTied ? (
                              <span className="w-7 h-7 rounded-lg bg-amber-900/10 text-amber-900 border border-amber-900/20 font-bold text-xs flex items-center justify-center tabular-nums shadow-2xs">
                                3
                              </span>
                            ) : isTied ? (
                              <span className="text-xs text-slate-400 font-semibold tabular-nums">
                                ={rank}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600 font-semibold tabular-nums">
                                {rank}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Membre */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=1d4ed8&color=fff&size=64`}
                              alt={m.full_name}
                              className="w-8 h-8 rounded-full object-cover bg-slate-100 shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-slate-900">{m.full_name}</div>
                              <div className="text-[11px] text-slate-500">{m.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Pôle */}
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {m.department || '—'}
                        </td>

                        {/* Niveau */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${LEVEL_COLORS[m.level] || LEVEL_COLORS.Bronze}`}>
                            {m.level || 'Bronze'}
                          </span>
                        </td>

                        {/* Points */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-slate-900 tabular-nums text-sm">
                            {m.points ?? 0}
                          </span>
                          <span className="text-slate-500 text-[11px] ml-1">pts</span>
                        </td>

                        {/* Direct + Points button (eliminates detour to Comptes tab) */}
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberForPoints(m);
                              setIsPointsModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Attribuer des points"
                          >
                            <Award className="w-3 h-3" />
                            <span>+ Points</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Leaderboard pagination */}
              {totalLeaderboardPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    {`${(safeLeaderboardPage - 1) * LEADERBOARD_PER_PAGE + 1}–${Math.min(safeLeaderboardPage * LEADERBOARD_PER_PAGE, sortedLeaderboard.length)} sur ${sortedLeaderboard.length} membres`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}
                      disabled={safeLeaderboardPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: totalLeaderboardPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setLeaderboardPage(page)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          page === safeLeaderboardPage
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setLeaderboardPage((p) => Math.min(totalLeaderboardPages, p + 1))}
                      disabled={safeLeaderboardPage === totalLeaderboardPages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRMATION MODAL: MARQUER ABSENT
      ══════════════════════════════════════════════════════════════════ */}
      {confirmAbsenceReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <button
              onClick={() => setConfirmAbsenceReg(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Signaler une absence officielle</h3>
                <p className="text-xs text-slate-500">Une confirmation est requise avant enregistrement.</p>
              </div>
            </div>

            <form onSubmit={handleConfirmAbsenceSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p><strong>Membre :</strong> {confirmAbsenceReg.member_name || confirmAbsenceReg.member_email}</p>
                <p><strong>Session :</strong> {confirmAbsenceReg.event_title}</p>
                {confirmAbsenceReg.justification_reason && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <span className="font-semibold">Motif transmis par le membre :</span> "{confirmAbsenceReg.justification_reason}"
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarque officielle (visible par le membre)
                </label>
                <textarea
                  required
                  rows={3}
                  value={absenceRemarkInput}
                  onChange={(e) => setAbsenceRemarkInput(e.target.value)}
                  placeholder="Ex: Absence non justifiée à la session de formation."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-rose-500 resize-none bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmAbsenceReg(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Confirmer l'absence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRMATION MODAL: SUSPEND MEMBER
      ══════════════════════════════════════════════════════════════════ */}
      {confirmSuspendMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmSuspendMember.status === 'active' ? 'Suspendre le compte membre' : 'Réactiver le compte membre'}
                </h3>
                <p className="text-xs text-slate-500">
                  Membre : <strong className="text-slate-800">{confirmSuspendMember.full_name}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmSuspendMember.status === 'active'
                ? 'Une fois suspendu, ce membre ne pourra plus se connecter au portail ni s\'inscrire aux futures sessions de formation.'
                : 'La réactivation autorisera de nouveau le membre à se connecter et à participer aux activités.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmSuspendMember(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer shadow-2xs ${
                  confirmSuspendMember.status === 'active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmSuspendMember.status === 'active' ? 'Confirmer la suspension' : 'Confirmer la réactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CONFIRMATION MODAL: DELETE MEMBER (DESTRUCTIVE ACTION)
      ══════════════════════════════════════════════════════════════════ */}
      {confirmDeleteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supprimer définitivement le membre</h3>
                <p className="text-xs text-slate-500">
                  Membre : <strong className="text-slate-800">{confirmDeleteMember.full_name}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed">
              <strong>Action irréversible :</strong> Cette action supprimera le compte, l'historique d'inscriptions et les points associés.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteMember(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                Supprimer le membre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: ATTRIBUER DES POINTS
      ══════════════════════════════════════════════════════════════════ */}
      {isPointsModalOpen && selectedMemberForPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Attribuer des points</h3>
              </div>
              <button onClick={() => setIsPointsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={selectedMemberForPoints.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMemberForPoints.full_name)}&background=1d4ed8&color=fff&bold=true&size=64`}
                alt={selectedMemberForPoints.full_name}
                className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0"
              />
              <div>
                <div className="text-sm font-bold text-slate-900">{selectedMemberForPoints.full_name}</div>
                <div className="text-xs text-blue-600 font-semibold">Total actuel : {selectedMemberForPoints.points} pts</div>
              </div>
            </div>

            <form onSubmit={handleAddPointsSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de points</label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motif</label>
                <input
                  type="text"
                  required
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPointsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Confirmer +{pointsAmount} pts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: CRÉER UN MEMBRE
      ══════════════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Créer un compte membre</h3>
                <p className="text-xs text-slate-500 mt-0.5">Identifiants d'accès au portail membre.</p>
              </div>
              <button onClick={handleCloseAddModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {memberCreated ? (
              <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Compte créé avec succès !</h4>
                  <p className="text-xs text-slate-500 mt-1">Le compte de <strong>{memberCreated.full_name}</strong> est maintenant actif.</p>
                </div>
                <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3.5 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email</span>
                    <span className="font-mono font-bold text-slate-800">{memberCreated.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">CIN</span>
                    <span className="font-mono font-bold text-slate-800">{memberCreated.cin}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mot de passe</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{memberCreated.password || 'joker2024'}</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full pt-1">
                  <button
                    onClick={() => {
                      setMemberCreated(null);
                      setFormData(defaultForm);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Ajouter un autre
                  </button>
                  <button
                    onClick={handleCloseAddModal}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateMember} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nom complet *</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Prénom et Nom"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CIN *</label>
                    <input
                      type="text"
                      required
                      value={formData.cin}
                      onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                      placeholder="XXXXXXXX"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="2X XXX XXX"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nom.prenom@esen.tn"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pôle</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Développement Web & IA">Développement Web &amp; IA</option>
                      <option value="Communication & Design">Communication &amp; Design</option>
                      <option value="Événementiel & Logistique">Événementiel &amp; Logistique</option>
                      <option value="Sponsoring & Relations Extérieures">Sponsoring &amp; Relations</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as MemberRole })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="member">Membre</option>
                      <option value="staff">Staff</option>
                      <option value="moderator">Modérateur</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Création...' : 'Créer le membre'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
