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
} from 'lucide-react';
import {
  getStoredMembers,
  createMemberByAdmin,
  updateMemberStatus,
  addPointsToMember,
} from '../../../services/memberService';
import type { ClubMember, MemberRole } from '../../../types/member';

interface AdminMembersTabProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminMembersTab: React.FC<AdminMembersTabProps> = ({ onShowToast }) => {
  const [members, setMembers] = useState<ClubMember[]>(() => getStoredMembers());
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [selectedMemberForPoints, setSelectedMemberForPoints] = useState<ClubMember | null>(null);
  const [pointsAmount, setPointsAmount] = useState<number>(50);
  const [pointsReason, setPointsReason] = useState<string>('Excellente contribution lors de l\'événement');

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: 'joker2024',
    cin: '',
    phone: '',
    major: 'Licence Business Computing (LBC)',
    department: 'Développement Web & IA',
    role: 'member' as MemberRole,
    bio: '',
  });

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.cin) {
      onShowToast('Veuillez remplir tous les champs obligatoires (Nom, Email, CIN).', 'error');
      return;
    }

    const created = createMemberByAdmin({
      full_name: formData.full_name,
      email: formData.email,
      password: formData.password || 'joker2024',
      cin: formData.cin,
      phone: formData.phone || '22 000 000',
      major: formData.major,
      department: formData.department,
      role: formData.role,
      bio: formData.bio || 'Nouveau membre du club Joker ESEN.',
      skills: ['Autonomie', 'Travail en Équipe'],
    });

    setMembers(getStoredMembers());
    setIsAddModalOpen(false);
    onShowToast(`Compte membre créé avec succès pour ${created.full_name} ! Identifiants générés.`, 'success');

    // Reset Form
    setFormData({
      full_name: '',
      email: '',
      password: 'joker2024',
      cin: '',
      phone: '',
      major: 'Licence Business Computing (LBC)',
      department: 'Développement Web & IA',
      role: 'member',
      bio: '',
    });
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

  const handleAddPointsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForPoints) return;

    const updated = addPointsToMember(selectedMemberForPoints.id, pointsAmount, pointsReason);
    setMembers(updated);
    setIsPointsModalOpen(false);
    onShowToast(
      `+${pointsAmount} points attribués à ${selectedMemberForPoints.full_name} (${pointsReason}).`,
      'success'
    );
    setSelectedMemberForPoints(null);
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.cin.includes(search);
    const matchesDept = selectedDept === 'all' || m.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Gestion Officielle des Membres ({members.length})</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-sans tracking-tight">
            Comptes &amp; Adhésions Joker ESEN
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Seul l'admin peut créer ou suspendre les comptes d'accès à l'Espace Membre.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4 text-white shrink-0" />
          <span className="text-white font-bold">Créer un Nouveau Membre</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou CIN..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Département:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-600 focus:outline-none cursor-pointer"
          >
            <option value="all">Tous les Départements</option>
            <option value="Développement Web & IA">Développement Web &amp; IA</option>
            <option value="Communication & Design">Communication &amp; Design</option>
            <option value="Événementiel & Logistique">Événementiel &amp; Logistique</option>
            <option value="Sponsoring & Relations Extérieures">Sponsoring &amp; Relations Extérieures</option>
          </select>
        </div>
      </div>

      {/* Members Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            className={`p-5 rounded-3xl bg-white border transition-all shadow-xs flex flex-col justify-between ${
              m.status === 'suspended' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/80 hover:border-blue-300'
            }`}
          >
            <div>
              {/* Top info header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      m.avatar_url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
                    }
                    alt={m.full_name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
                      <span>{m.full_name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                        {m.level} ({m.points} pts)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{m.major}</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    m.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {m.status === 'active' ? 'Compte Actif' : 'Suspendu'}
                </span>
              </div>

              {/* Detail Pills */}
              <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.email}</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">CIN: {m.cin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.department}</span>
                  </span>
                  <span className="font-bold text-slate-700 text-[11px]">Rôle: {m.role.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedMemberForPoints(m);
                  setIsPointsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Attr. Points</span>
              </button>

              <button
                onClick={() => handleToggleStatus(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  m.status === 'active'
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {m.status === 'active' ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>Suspendre</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Activer Compte</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Member Account */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-sans">
                  Créer un Compte Membre Joker ESEN
                </h3>
                <p className="text-xs text-slate-500">
                  Génère les identifiants d'accès au portail membre.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Votre nom et prénom"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none placeholder-[#9C8F89]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Numéro CIN *</label>
                  <input
                    type="text"
                    required
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                    placeholder="XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none placeholder-[#9C8F89]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Email Universitaire *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nom.prenom@esen.tn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none placeholder-[#9C8F89]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Mot de passe Initial *</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mot de passe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none font-mono placeholder-[#9C8F89]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Filière / Classe</label>
                  <select
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Licence Business Computing (LBC)">Licence Business Computing (LBC)</option>
                    <option value="Licence Business Analytics (LBA)">Licence Business Analytics (LBA)</option>
                    <option value="Licence E-Commerce (LEC)">Licence E-Commerce (LEC)</option>
                    <option value="Master E-Business (MEB)">Master E-Business (MEB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Département / Pôle</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Développement Web & IA">Développement Web &amp; IA</option>
                    <option value="Communication & Design">Communication &amp; Design</option>
                    <option value="Événementiel & Logistique">Événementiel &amp; Logistique</option>
                    <option value="Sponsoring & Relations Extérieures">Sponsoring &amp; Relations Extérieures</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  <span className="text-white font-bold">Créer le Compte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Award Points */}
      {isPointsModalOpen && selectedMemberForPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span>Attribuer des Points</span>
              </h3>
              <button
                onClick={() => setIsPointsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Attribuer des points de bonus pour <strong className="text-slate-900">{selectedMemberForPoints.full_name}</strong> (Score actuel: {selectedMemberForPoints.points} pts).
            </p>

            <form onSubmit={handleAddPointsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nombre de Points</label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Motif / Raison du Bonus</label>
                <input
                  type="text"
                  required
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPointsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  <span className="text-white font-bold">Confirmer Attribution</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
