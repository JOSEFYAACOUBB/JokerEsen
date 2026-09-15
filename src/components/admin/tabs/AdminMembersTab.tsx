import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Award,
  ShieldCheck,
  ShieldAlert,
  X,
  Mail,
  BookOpen,
  LayoutGrid,
  Table as TableIcon,
  Trash2,
  CheckCircle2,
  Calendar,
  Phone,
  Filter,
  ChevronDown,
} from 'lucide-react';
import {
  getStoredMembers,
  createMemberByAdmin,
  updateMemberStatus,
  addPointsToMember,
  deleteMemberByAdmin,
  getAllEventRegistrations,
  updateAttendanceStatus,
  getCancellationLogs,
} from '../../../services/memberService';
import type { ClubMember, MemberRole, MemberEventRegistration, CancellationLog } from '../../../types/member';

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
  Bronze: 'bg-amber-50 text-amber-800 border-amber-200',
  Argent: 'bg-slate-100 text-slate-700 border-slate-300',
  Or: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  Platine: 'bg-blue-50 text-blue-800 border-blue-200',
};

export const AdminMembersTab: React.FC<AdminMembersTabProps> = ({ onShowToast }) => {
  const [subTab, setSubTab] = useState<'members' | 'attendance' | 'cancellations'>('members');
  const [members, setMembers] = useState<ClubMember[]>(() => getStoredMembers());
  const [registrations, setRegistrations] = useState<MemberEventRegistration[]>(() => getAllEventRegistrations());
  const [cancellationLogs, setCancellationLogs] = useState<CancellationLog[]>(() => getCancellationLogs());

  // Absence Modal state
  const [selectedRegForAbsence, setSelectedRegForAbsence] = useState<MemberEventRegistration | null>(null);
  const [absenceRemarkInput, setAbsenceRemarkInput] = useState('');

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberCreated, setMemberCreated] = useState<ClubMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [selectedMemberForPoints, setSelectedMemberForPoints] = useState<ClubMember | null>(null);
  const [pointsAmount, setPointsAmount] = useState<number>(50);
  const [pointsReason, setPointsReason] = useState<string>("Excellente contribution lors de l'événement");

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
    await new Promise((r) => setTimeout(r, 600)); // brief UX feedback

    const created = createMemberByAdmin({
      full_name: formData.full_name,
      email: formData.email,
      password: formData.password || 'joker2024',
      cin: formData.cin,
      phone: formData.phone || '22 000 000',
      birth_date: formData.birth_date || undefined,
      major: formData.major,
      department: formData.department,
      role: formData.role,
      bio: formData.bio || 'Nouveau membre du club Joker ESEN.',
      skills: ['Autonomie', 'Travail en Équipe'],
    });

    setMembers(getStoredMembers());
    setMemberCreated(created);
    setIsSubmitting(false);
    onShowToast(`Compte créé pour ${created.full_name} !`, 'success');
  };

  const handleToggleStatus = (member: ClubMember) => {
    const nextStatus = member.status === 'active' ? 'suspended' : 'active';
    const updated = updateMemberStatus(member.id, nextStatus);
    setMembers(updated);
    onShowToast(
      nextStatus === 'active'
        ? `Le compte de ${member.full_name} a été ACTIVÉ.`
        : `Le compte de ${member.full_name} a été SUSPENDU.`,
      'info'
    );
  };

  const handleDeleteMember = (member: ClubMember) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le membre "${member.full_name}" ?`)) {
      const updated = deleteMemberByAdmin(member.id);
      setMembers(updated);
      onShowToast(`Membre ${member.full_name} supprimé.`, 'info');
    }
  };

  const handleAddPointsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPoints) return;
    const updated = addPointsToMember(selectedMemberForPoints.id, pointsAmount, pointsReason);
    setMembers(updated);
    setIsPointsModalOpen(false);
    onShowToast(`+${pointsAmount} pts attribués à ${selectedMemberForPoints.full_name}.`, 'success');
    setSelectedMemberForPoints(null);
  };

  const handleMarkPresent = (reg: MemberEventRegistration) => {
    const updated = updateAttendanceStatus(reg.id, 'present');
    setRegistrations(updated);
    onShowToast(`Présence confirmée pour ${reg.member_name || reg.member_email || 'le membre'}`, 'success');
  };

  const handleOpenAbsenceModal = (reg: MemberEventRegistration) => {
    setSelectedRegForAbsence(reg);
    setAbsenceRemarkInput(reg.absence_remark || 'Absent(e) non justifié(e) à la formation / réunion.');
  };

  const handleConfirmAbsenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegForAbsence) return;
    const updated = updateAttendanceStatus(selectedRegForAbsence.id, 'absent', absenceRemarkInput);
    setRegistrations(updated);
    setSelectedRegForAbsence(null);
    onShowToast(`Absence & remarque enregistrées. Signalement rouge envoyé !`, 'error');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.cin.includes(search);
    const matchesDept = selectedDept === 'all' || m.department === selectedDept;
    const matchesRole = selectedRole === 'all' || m.role === selectedRole;
    return matchesSearch && matchesDept && matchesRole;
  });

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    suspended: members.filter((m) => m.status === 'suspended').length,
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* ── Sub-Tabs Navigation ── */}
      <div className="flex p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/60">
        <button
          onClick={() => setSubTab('members')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'members'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          👥 Comptes Membres ({members.length})
        </button>
        <button
          onClick={() => {
            setRegistrations(getAllEventRegistrations());
            setSubTab('attendance');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'attendance'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          📋 Inscriptions & Présences ({registrations.length})
        </button>
        <button
          onClick={() => {
            setCancellationLogs(getCancellationLogs());
            setSubTab('cancellations');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'cancellations'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          🚫 Historique Désinscriptions ({cancellationLogs.length})
        </button>
      </div>

      {subTab === 'members' && (
        <>
          {/* ── Stats Row ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Membres', value: stats.total, color: 'bg-blue-600' },
              { label: 'Comptes Actifs', value: stats.active, color: 'bg-emerald-500' },
              { label: 'Suspendus', value: stats.suspended, color: 'bg-rose-500' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex items-center gap-3">
                <div className={`w-2.5 h-8 rounded-full ${s.color} shrink-0`} />
                <div>
                  <div className="text-2xl font-black text-slate-900 leading-none">{s.value}</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 font-sans tracking-tight">
                Comptes &amp; Adhésions Joker ESEN
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Création, suspension et gestion des comptes membres officiels.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Créer un Nouveau Membre
            </button>
          </div>
        </>
      )}

      {/* ── Filters ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou CIN..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* Dept Select */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer transition-all"
            >
              <option value="all">Tous les Pôles</option>
              <option value="Développement Web & IA">Dev Web &amp; IA</option>
              <option value="Communication & Design">Comm &amp; Design</option>
              <option value="Événementiel & Logistique">Événementiel</option>
              <option value="Sponsoring & Relations Extérieures">Sponsoring</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Role Select */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer transition-all"
            >
              <option value="all">Tous les Rôles</option>
              <option value="member">Membre</option>
              <option value="staff">Staff</option>
              <option value="moderator">Modérateur</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Vue Tableau"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
              title="Vue Cartes"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200">
                  <th className="py-3 px-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Membre</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Contact</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Naissance</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Filière & Pôle</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Niveau</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Statut</th>
                  <th className="py-3 px-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 text-sm font-medium">
                      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      Aucun membre trouvé
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m, idx) => (
                    <tr
                      key={m.id}
                      className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/40 transition-colors group ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                    >
                      {/* Membre */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=1d4ed8&color=fff&bold=true&size=64`}
                              alt={m.full_name}
                              className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-sm"
                            />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${m.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{m.full_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">CIN: {m.cin}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-slate-700">{m.email}</div>
                        {m.phone && <div className="text-[10px] text-slate-400">{m.phone}</div>}
                      </td>

                      {/* Naissance */}
                      <td className="py-3 px-4">
                        {m.birth_date ? (
                          <div className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(m.birth_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* Filière */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-slate-800">{m.department}</div>
                        <div className="text-[11px] text-slate-400">{m.major}</div>
                      </td>

                      {/* Niveau */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${LEVEL_COLORS[m.level] || 'bg-slate-50 text-slate-700'}`}>
                          {m.level}
                          <span className="opacity-60">·</span>
                          <span>{m.points} pts</span>
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${m.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {m.status === 'active' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setSelectedMemberForPoints(m); setIsPointsModalOpen(true); }}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 cursor-pointer transition-colors"
                            title="Attribuer Points"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(m)}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${m.status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'}`}
                            title={m.status === 'active' ? 'Suspendre' : 'Activer'}
                          >
                            {m.status === 'active' ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredMembers.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/60 text-[11px] text-slate-400 font-medium">
              {filteredMembers.length} membre{filteredMembers.length > 1 ? 's' : ''} affiché{filteredMembers.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMembers.length === 0 ? (
            <div className="md:col-span-2 py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium">Aucun membre trouvé</p>
            </div>
          ) : (
            filteredMembers.map((m) => (
              <div
                key={m.id}
                className={`p-5 rounded-2xl bg-white border shadow-xs flex flex-col gap-3 transition-all hover:shadow-md ${m.status === 'suspended' ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200/80 hover:border-blue-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=1d4ed8&color=fff&bold=true&size=80`}
                        alt={m.full_name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                      />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${m.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{m.full_name}</h3>
                      <p className="text-[11px] text-slate-400">{m.department}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${m.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {m.status === 'active' ? 'Actif' : 'Suspendu'}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                  {m.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                  {m.birth_date && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {new Date(m.birth_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{m.major}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${LEVEL_COLORS[m.level] || ''}`}>
                      {m.level} · {m.points} pts
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">CIN: {m.cin}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => { setSelectedMemberForPoints(m); setIsPointsModalOpen(true); }}
                    className="flex-1 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    + Points
                  </button>
                  <button
                    onClick={() => handleToggleStatus(m)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${m.status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}
                  >
                    {m.status === 'active' ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {m.status === 'active' ? 'Suspendre' : 'Activer'}
                  </button>
                  <button
                    onClick={() => handleDeleteMember(m)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ══ MODAL: Create Member ══ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700">
              <div>
                <h3 className="text-sm font-bold text-white">Créer un Compte Membre</h3>
                <p className="text-[11px] text-blue-200 mt-0.5">Génère les identifiants d'accès au portail membre.</p>
              </div>
              <button onClick={handleCloseAddModal} className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-500 rounded-lg cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Success State ── */}
            {memberCreated ? (
              <div className="p-7 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Compte créé avec succès !</h4>
                  <p className="text-xs text-slate-500 mt-1">Le compte de <strong>{memberCreated.full_name}</strong> est maintenant actif.</p>
                </div>
                <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="font-mono font-bold text-slate-800">{memberCreated.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">CIN</span>
                    <span className="font-mono font-bold text-slate-800">{memberCreated.cin}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Mot de passe</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{memberCreated.password || 'joker2024'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Niveau Initial</span>
                    <span className="font-bold text-amber-700">{memberCreated.level} · {memberCreated.points} pts</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { setMemberCreated(null); setFormData(defaultForm); }}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    + Ajouter un autre membre
                  </button>
                  <button
                    onClick={handleCloseAddModal}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : (
              /* ── Form State ── */
              <form onSubmit={handleCreateMember} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Nom */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Nom Complet *</label>
                    <input
                      type="text" required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Prénom et Nom"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* CIN */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">CIN *</label>
                    <input
                      type="text" required
                      value={formData.cin}
                      onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                      placeholder="XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-mono font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Date de naissance */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Date de Naissance</label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Email *</label>
                    <input
                      type="email" required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nom.prenom@esen.tn"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Téléphone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="2X XXX XXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Mot de passe */}
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Mot de passe Initial *</label>
                    <input
                      type="text" required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Filière */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Filière</label>
                    <select
                      value={formData.major}
                      onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                      className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Licence Business Computing (LBC)">LBC</option>
                      <option value="Licence Business Analytics (LBA)">LBA</option>
                      <option value="Licence E-Commerce (LEC)">LEC</option>
                      <option value="Master E-Business (MEB)">Master E-Business</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 bottom-3 w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {/* Pôle */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Pôle</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Développement Web & IA">Dev Web & IA</option>
                      <option value="Communication & Design">Comm & Design</option>
                      <option value="Événementiel & Logistique">Événementiel</option>
                      <option value="Sponsoring & Relations Extérieures">Sponsoring</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 bottom-3 w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {/* Rôle */}
                  <div className="relative col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Rôle dans le Club</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as MemberRole })}
                      className="w-full appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="member">Membre</option>
                      <option value="staff">Staff</option>
                      <option value="moderator">Modérateur</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 bottom-3 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      'Créer le Compte'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: ATTENDANCE VERIFICATION ── */}
      {subTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-sans tracking-tight">
                Vérification Manuelle des Présences ({registrations.length})
              </h2>
              <p className="text-xs text-slate-500">
                Confirmez les membres présents ou marquez les absents (affiche une remarque rouge sur l'espace membre).
              </p>
            </div>
          </div>

          {registrations.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-xs">Aucune inscription active enregistrée</h3>
              <p className="text-[11px] text-slate-500">Les inscriptions des membres s'afficheront automatiquement ici.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Membre</th>
                      <th className="py-3 px-4">Formation / Réunion</th>
                      <th className="py-3 px-4">Date Inscription</th>
                      <th className="py-3 px-4">Statut Présence</th>
                      <th className="py-3 px-4 text-right">Actions Vérification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{reg.member_name || 'Membre Joker'}</div>
                          <div className="text-[10px] text-slate-500">{reg.member_email || reg.member_id}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{reg.event_title}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{reg.registered_at}</td>
                        <td className="py-3.5 px-4">
                          {reg.attendance_status === 'present' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Présent(e) ✓
                            </span>
                          ) : reg.attendance_status === 'absent' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Absent(e) ⚠️
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleMarkPresent(reg)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Présent ✓
                          </button>
                          <button
                            onClick={() => handleOpenAbsenceModal(reg)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Marquer Absent ⚠️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 3: CANCELLATIONS HISTORY (AUDIT LOG) ── */}
      {subTab === 'cancellations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-sans tracking-tight">
                Historique des Désinscriptions ({cancellationLogs.length})
              </h2>
              <p className="text-xs text-slate-500">
                Journal immuable enregistrant les membres ayant annulé leur inscription ("Se désinscrire").
              </p>
            </div>
          </div>

          {cancellationLogs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-xs">Aucune désinscription enregistrée</h3>
              <p className="text-[11px] text-slate-500">Le journal de désinscription est actuellement vide.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="py-3 px-4">Date & Heure</th>
                      <th className="py-3 px-4">Nom du Membre</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Formation / Réunion</th>
                      <th className="py-3 px-4 text-right">Statut Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cancellationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{log.cancelled_at}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{log.member_name}</td>
                        <td className="py-3.5 px-4 text-slate-600">{log.member_email}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{log.event_title}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                            Désinscription 🚫
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
      )}

      {/* ══ MODAL: ABSENCE WARNING REMARK ══ */}
      {selectedRegForAbsence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-rose-600 text-white">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Signaler une Absence Non Justifiée</h3>
              </div>
              <button onClick={() => setSelectedRegForAbsence(null)} className="p-1 text-rose-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmAbsenceSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                <p className="font-bold">Membre: {selectedRegForAbsence.member_name || selectedRegForAbsence.member_email}</p>
                <p className="text-[11px]">Session: {selectedRegForAbsence.event_title}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarque / Motif d'absence (sera affiché en rouge chez l'utilisateur)
                </label>
                <textarea
                  required
                  rows={3}
                  value={absenceRemarkInput}
                  onChange={(e) => setAbsenceRemarkInput(e.target.value)}
                  placeholder="Ex: Absente non justifiée à la réunion générale. Veuillez prévenir le bureau à l'avance."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRegForAbsence(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  Envoyer Signalement ⚠️
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Award Points ══ */}
      {isPointsModalOpen && selectedMemberForPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-200" />
                <h3 className="text-sm font-bold text-white">Attribuer des Points</h3>
              </div>
              <button onClick={() => setIsPointsModalOpen(false)} className="p-1 text-blue-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <img
                  src={selectedMemberForPoints.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedMemberForPoints.full_name)}&background=1d4ed8&color=fff&bold=true&size=64`}
                  alt={selectedMemberForPoints.full_name}
                  className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm shrink-0"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900">{selectedMemberForPoints.full_name}</div>
                  <div className="text-[11px] text-blue-600 font-medium">Score actuel : {selectedMemberForPoints.points} pts</div>
                </div>
              </div>

              <form onSubmit={handleAddPointsSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Nombre de Points</label>
                  <input
                    type="number" min="5" max="500"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Motif</label>
                  <input
                    type="text" required
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setIsPointsModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors">
                    Confirmer +{pointsAmount} pts
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
