import React, { useState } from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Calendar,
  UserCheck,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  ExternalLink,
  ChevronRight,
  Sliders,
  Users,
  Lock,
  Mail
} from 'lucide-react';

import type { TeamMember } from '../Team';

interface AdminDashboardProps {
  onBackToPublic: () => void;
  recruitmentOpen: boolean;
  onToggleRecruitment: (isOpen: boolean) => void;
  eventData: {
    title: string;
    edition: string;
    date: string;
    location: string;
    program: string;
    bannerUrl: string;
  };
  onUpdateEvent: (data: any) => void;
  teamMembers: TeamMember[];
  onUpdateTeamMembers: (members: TeamMember[]) => void;
}

// Initial mock data for Membership Requests
interface ApplicationRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  major: string;
  department: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

const initialApplications: ApplicationRequest[] = [
  {
    id: 'REQ-01',
    name: 'Sarra Jlassi',
    email: 'sarra.jlassi@esen.tn',
    phone: '+216 22 123 456',
    major: 'L1 Business Computing',
    department: 'Événementiel & Animation',
    date: '22 Août 2026',
    status: 'pending',
  },
  {
    id: 'REQ-02',
    name: 'Ahmed Ben Ali',
    email: 'ahmed.benali@esen.tn',
    phone: '+216 55 987 654',
    major: 'L2 Business Analytics',
    department: 'Design Graphique & Vidéo',
    date: '21 Août 2026',
    status: 'pending',
  },
  {
    id: 'REQ-03',
    name: 'Yasmine Mansouri',
    email: 'yasmine.mansouri@esen.tn',
    phone: '+216 98 456 123',
    major: 'L1 E-Commerce & Digital',
    department: 'Sponsoring & Partenariats',
    date: '20 Août 2026',
    status: 'approved',
  },
  {
    id: 'REQ-04',
    name: 'Kahlil Ferjani',
    email: 'kahlil.ferjani@esen.tn',
    phone: '+216 20 111 222',
    major: 'L3 Business Computing',
    department: 'Logistique & Accueil',
    date: '19 Août 2026',
    status: 'approved',
  },
  {
    id: 'REQ-05',
    name: 'Nadir Gharbi',
    email: 'nadir.gharbi@esen.tn',
    phone: '+216 50 333 444',
    major: 'Master ESEN',
    department: 'Communication & Social Media',
    date: '18 Août 2026',
    status: 'rejected',
  },
];

// Initial mock data for Photos
interface AlbumPhoto {
  id: number;
  title: string;
  album: string;
  url: string;
  date: string;
}

const initialPhotos: AlbumPhoto[] = [
  {
    id: 1,
    title: 'Ambiance Soirée Carnaval 2025',
    album: 'Carnival Night 2025',
    url: '/images/event_banner.jpg',
    date: '15 Oct 2025',
  },
  {
    id: 2,
    title: 'Workshop Design & Branding',
    album: 'Workshops 2025',
    url: '/images/workshop.jpg',
    date: '10 Nov 2025',
  },
  {
    id: 3,
    title: 'Journée d’Intégration Campus',
    album: 'Teambuilding 2025',
    url: '/images/teambuilding.jpg',
    date: '05 Sep 2025',
  },
  {
    id: 4,
    title: 'Atelier Prise de Parole',
    album: 'Workshops 2025',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600',
    date: '12 Fév 2026',
  },
  {
    id: 5,
    title: 'Soirée Masquée Gala',
    album: 'Carnival Night 2025',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=600',
    date: '20 Déc 2025',
  },
  {
    id: 6,
    title: 'Olympiades d’Accueil',
    album: 'Teambuilding 2025',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=600',
    date: '02 Oct 2025',
  },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToPublic,
  recruitmentOpen,
  onToggleRecruitment,
  eventData,
  onUpdateEvent,
  teamMembers,
  onUpdateTeamMembers,
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loginEmail, setLoginEmail] = useState('admin@jokeresen.tn');
  const [loginPassword, setLoginPassword] = useState('••••••••');

  // Navigation state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'team' | 'gallery' | 'event' | 'applications' | 'settings'
  >('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Applications Data State
  const [applications, setApplications] = useState<ApplicationRequest[]>(
    initialApplications
  );
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [appSearch, setAppSearch] = useState('');

  // Photos State
  const [photos, setPhotos] = useState<AlbumPhoto[]>(initialPhotos);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('Tous');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoAlbum, setNewPhotoAlbum] = useState('Carnival Night 2025');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Team Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState<TeamMember>({
    name: '',
    role: '',
    suit: '♠',
    suitColor: '#F3C4A0',
    avatar: '',
    socials: { instagram: '#', linkedin: '#' },
  });

  // Local Form Event State synchronized with props
  const [eventForm, setEventForm] = useState(eventData);
  const [eventSuccessMsg, setEventSuccessMsg] = useState(false);

  // Handle Approve / Reject
  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
  };

  // Handle Team Member Add/Edit
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.role) return;

    if (editingMember) {
      const updated = teamMembers.map((m) =>
        (m.id && m.id === editingMember.id) || m.name === editingMember.name
          ? { ...memberForm, id: editingMember.id || String(Date.now()) }
          : m
      );
      onUpdateTeamMembers(updated);
    } else {
      const newM: TeamMember = {
        ...memberForm,
        id: String(Date.now()),
        avatar: memberForm.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      };
      onUpdateTeamMembers([...teamMembers, newM]);
    }

    setIsMemberModalOpen(false);
    setEditingMember(null);
  };

  const handleDeleteMember = (member: TeamMember) => {
    const updated = teamMembers.filter(
      (m) => (m.id && m.id !== member.id) || m.name !== member.name
    );
    onUpdateTeamMembers(updated);
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({
      name: '',
      role: '',
      suit: '♠',
      suitColor: '#F3C4A0',
      avatar: '',
      socials: { instagram: '#', linkedin: '#' },
    });
    setIsMemberModalOpen(true);
  };

  const openEditMember = (m: TeamMember) => {
    setEditingMember(m);
    setMemberForm({ ...m });
    setIsMemberModalOpen(true);
  };

  // Handle Photo Delete
  const handleDeletePhoto = (id: number) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Handle Upload Photo
  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoTitle) return;
    const newP: AlbumPhoto = {
      id: Date.now(),
      title: newPhotoTitle,
      album: newPhotoAlbum,
      url: newPhotoUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=600',
      date: 'Aujourd\'hui',
    };
    setPhotos([newP, ...photos]);
    setIsUploadModalOpen(false);
    setNewPhotoTitle('');
    setNewPhotoUrl('');
  };

  // Handle Event Save
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEvent(eventForm);
    setEventSuccessMsg(true);
    setTimeout(() => setEventSuccessMsg(false), 3000);
  };


  // Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#7A1F3D] border border-slate-200 text-2xl font-black shadow-xs">
              ♠
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A8A]">Administration JokerEsen</h1>
            <p className="text-xs text-slate-500">
              Veuillez saisir vos identifiants pour accéder au panneau de gestion.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsAuthenticated(true);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Adresse E-mail Admin
              </label>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@jokeresen.tn"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mot de Passe
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 text-sm font-medium outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Connexion au Panneau Admin</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-100">
            <button
              onClick={onBackToPublic}
              className="text-xs text-[#2563EB] hover:underline font-medium inline-flex items-center gap-1"
            >
              ← Retourner au site public
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered Applications
  const filteredApps = applications.filter((app) => {
    const matchesFilter = appFilter === 'all' || app.status === appFilter;
    const matchesSearch =
      app.name.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.email.toLowerCase().includes(appSearch.toLowerCase()) ||
      app.department.toLowerCase().includes(appSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col md:flex-row">
      
      {/* ── MOBILE HEADER BAR ── */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#7A1F3D] text-white flex items-center justify-center font-black text-sm">
            ♠
          </span>
          <span className="font-bold text-[#1E3A8A] text-sm">JokerEsen Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7A1F3D] to-[#B93A34] text-white flex items-center justify-center font-black text-lg shadow-sm">
                ♠
              </div>
              <div>
                <h1 className="font-bold text-[#1E3A8A] text-base leading-tight">JokerEsen</h1>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Panneau Admin
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, badge: pendingCount > 0 ? pendingCount : null },
              { id: 'team', label: 'Membres du Bureau', icon: Users },
              { id: 'gallery', label: 'Album photo', icon: ImageIcon },
              { id: 'event', label: 'Prochain événement', icon: Calendar },
              { id: 'applications', label: 'Demandes d\'adhésion', icon: UserCheck, badge: pendingCount > 0 ? `${pendingCount}` : null },
              { id: 'settings', label: 'Paramètres', icon: Settings },
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center justify-center">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Présidence ESEN</p>
              <p className="text-[10px] text-slate-500 truncate">admin@jokeresen.tn</p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold text-[#1E3A8A]">
              {activeTab === 'dashboard' && 'Tableau de Bord'}
              {activeTab === 'team' && 'Gestion de l\'Équipe & Bureau'}
              {activeTab === 'gallery' && 'Gestion de l\'Album Photo'}
              {activeTab === 'event' && 'Gestion du Prochain Événement'}
              {activeTab === 'applications' && 'Demandes d\'Adhésion'}
              {activeTab === 'settings' && 'Paramètres du Club'}
            </h2>
            <p className="text-xs text-slate-500">
              Panneau de gestion du club étudiant JokerEsen
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPublic}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Voir site public</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">Recrutement:</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  recruitmentOpen
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {recruitmentOpen ? 'Ouvert' : 'Fermé'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Body Pages */}
        <main className="p-6 space-y-6 flex-1">

          {/* ════════════ PAGE 1: TABLEAU DE BORD ════════════ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stat 1: Pending Applications */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Demandes en attente</p>
                    <h3 className="text-2xl font-bold text-[#1E3A8A] mt-1">{pendingCount}</h3>
                    <p className="text-[11px] text-amber-600 font-medium mt-1 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> À traiter en priorité
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 2: Photos Count */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Photos dans l'album</p>
                    <h3 className="text-2xl font-bold text-[#1E3A8A] mt-1">{photos.length}</h3>
                    <p className="text-[11px] text-blue-600 font-medium mt-1">3 albums actifs</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 3: Next Event */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prochain événement</p>
                    <h3 className="text-sm font-bold text-[#1E3A8A] mt-1 truncate max-w-[150px]">{eventData.title}</h3>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">26 Octobre 2026</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>

                {/* Stat 4: Total Members */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Membres Validés</p>
                    <h3 className="text-2xl font-bold text-[#1E3A8A] mt-1">
                      {applications.filter(a => a.status === 'approved').length + 500}
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">+12 cette semaine</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Quick Actions & Recent Applications Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Recent Applications Table */}
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#1E3A8A] text-base">Dernières Demandes d'Adhésion</h3>
                      <p className="text-xs text-slate-500">Demandes récentes reçues via le site public</p>
                    </div>

                    <button
                      onClick={() => setActiveTab('applications')}
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      Voir toutes ({applications.length}) →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2.5 px-3 font-semibold">Candidat</th>
                          <th className="py-2.5 px-3 font-semibold">Pôle</th>
                          <th className="py-2.5 px-3 font-semibold">Statut</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {applications.slice(0, 4).map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800">{app.name}</p>
                              <p className="text-[10px] text-slate-400">{app.email}</p>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-600">{app.department}</td>
                            <td className="py-3 px-3">
                              {app.status === 'pending' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  En attente
                                </span>
                              )}
                              {app.status === 'approved' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Approuvé
                                </span>
                              )}
                              {app.status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                  Refusé
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {app.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleUpdateStatus(app.id, 'approved')}
                                    className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                                    title="Approuver"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                    className="p-1 rounded-md bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition-colors"
                                    title="Refuser"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Traité</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quick Controls Card */}
                <div className="lg:col-span-4 space-y-4">
                  
                  {/* Recruitment Toggle Box */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#1E3A8A] text-sm">Statut du Recrutement</h3>
                      <Sliders className="w-4 h-4 text-[#2563EB]" />
                    </div>

                    <p className="text-xs text-slate-500">
                      Activez ou désactivez le formulaire d'adhésion sur la page publique.
                    </p>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        {recruitmentOpen ? 'Recrutement ouvert' : 'Recrutement fermé'}
                      </span>

                      <button
                        onClick={() => onToggleRecruitment(!recruitmentOpen)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                          recruitmentOpen ? 'bg-[#2563EB]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                            recruitmentOpen ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                    <h3 className="font-bold text-[#1E3A8A] text-sm">Raccourcis d'Édition</h3>

                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => {
                          setActiveTab('gallery');
                          setIsUploadModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-[#2563EB]" />
                          <span>Ajouter des photos</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('event')}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>Modifier l'événement</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ════════════ PAGE 1.5: GESTION DE L'ÉQUIPE & BUREAU ════════════ */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              
              {/* Header Action Bar */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[#1E3A8A] text-base">Membres du Bureau Exécutif</h3>
                  <p className="text-xs text-slate-500">
                    Gérez les cartes des membres affichées dans le slider "Le Bureau" sur le site public.
                  </p>
                </div>

                <button
                  onClick={openAddMember}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un membre</span>
                </button>
              </div>

              {/* Members Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id || member.name}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full object-cover object-top"
                      />
                      <span
                        className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-slate-900/80 text-white flex items-center justify-center font-black text-sm border border-white/20"
                        style={{ color: member.suitColor }}
                      >
                        {member.suit}
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        {member.role}
                      </p>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">
                        {member.name}
                      </h4>

                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                        <button
                          onClick={() => openEditMember(member)}
                          className="flex-1 py-1.5 rounded-lg bg-blue-50 text-[#2563EB] hover:bg-blue-600 hover:text-white font-bold text-xs transition-colors text-center"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit Member Modal */}
              {isMemberModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-[#1E3A8A] text-base">
                        {editingMember ? 'Modifier le Membre' : 'Ajouter un Membre'}
                      </h3>
                      <button
                        onClick={() => setIsMemberModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveMember} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Nom et Prénom
                        </label>
                        <input
                          type="text"
                          required
                          value={memberForm.name}
                          onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                          placeholder="Ex: Yasmine Mansouri"
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Rôle / Post
                        </label>
                        <input
                          type="text"
                          required
                          value={memberForm.role}
                          onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                          placeholder="Ex: Présidente du Club"
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Symbole Carte
                          </label>
                          <select
                            value={memberForm.suit}
                            onChange={(e) => setMemberForm({ ...memberForm, suit: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none cursor-pointer"
                          >
                            <option value="♠">♠ As de Pique</option>
                            <option value="♥">♥ As de Cœur</option>
                            <option value="♦">♦ As de Carreau</option>
                            <option value="♣">♣ As de Trèfle</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Couleur Symbole
                          </label>
                          <select
                            value={memberForm.suitColor}
                            onChange={(e) => setMemberForm({ ...memberForm, suitColor: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none cursor-pointer"
                          >
                            <option value="#F3C4A0">Or / Crème (#F3C4A0)</option>
                            <option value="#B93A34">Rouge Joker (#B93A34)</option>
                            <option value="#4E4F9E">Bleu Nuit (#4E4F9E)</option>
                            <option value="#A66B95">Violet (#A66B95)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          URL de la Photo
                        </label>
                        <input
                          type="text"
                          value={memberForm.avatar}
                          onChange={(e) => setMemberForm({ ...memberForm, avatar: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setIsMemberModalOpen(false)}
                          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ════════════ PAGE 2: GESTION ALBUM ════════════ */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              
              {/* Header Action Bar */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Album Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  {['Tous', 'Carnival Night 2025', 'Workshops 2025', 'Teambuilding 2025'].map((alb) => (
                    <button
                      key={alb}
                      onClick={() => setSelectedAlbum(alb)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedAlbum === alb
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {alb}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter des photos</span>
                </button>

              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos
                  .filter((p) => selectedAlbum === 'Tous' || p.album === selectedAlbum)
                  .map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all"
                    >
                      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Hover Overlay with Delete & View */}
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() => window.open(photo.url, '_blank')}
                            className="p-2 rounded-full bg-white/20 text-white hover:bg-white hover:text-slate-900 transition-colors"
                            title="Agrandir"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[10px] font-bold uppercase">
                          {photo.album}
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs mt-1 truncate">
                          {photo.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{photo.date}</p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Upload Modal */}
              {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="font-bold text-[#1E3A8A] text-base">Ajouter une nouvelle photo</h3>
                      <button
                        onClick={() => setIsUploadModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddPhoto} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Titre de la photo
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Groupe d'organisation Gala"
                          value={newPhotoTitle}
                          onChange={(e) => setNewPhotoTitle(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Album de destination
                        </label>
                        <select
                          value={newPhotoAlbum}
                          onChange={(e) => setNewPhotoAlbum(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none cursor-pointer"
                        >
                          <option>Carnival Night 2025</option>
                          <option>Workshops 2025</option>
                          <option>Teambuilding 2025</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          URL de l'image ou Fichier
                        </label>
                        <input
                          type="text"
                          placeholder="https://..."
                          value={newPhotoUrl}
                          onChange={(e) => setNewPhotoUrl(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium outline-none"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsUploadModalOpen(false)}
                          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                        >
                          Publier la photo
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ════════════ PAGE 3: GESTION ÉVÉNEMENT ════════════ */}
          {activeTab === 'event' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form */}
              <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h3 className="font-bold text-[#1E3A8A] text-base">Modifier l'Événement Phare</h3>
                  <p className="text-xs text-slate-500">
                    Ces informations sont affichées directement sur la carte billet du site public.
                  </p>
                </div>

                {eventSuccessMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Événement mis à jour avec succès !</span>
                  </div>
                )}

                <form onSubmit={handleSaveEvent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Titre de l'événement
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-[#2563EB] text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Sous-titre / Édition
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.edition}
                      onChange={(e) => setEventForm({ ...eventForm, edition: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Date &amp; Heure
                      </label>
                      <input
                        type="text"
                        required
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Lieu
                      </label>
                      <input
                        type="text"
                        required
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Programme / Highlights
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.program}
                      onChange={(e) => setEventForm({ ...eventForm, program: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      URL Image Bannière
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.bannerUrl}
                      onChange={(e) => setEventForm({ ...eventForm, bannerUrl: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-[#2563EB] text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                    >
                      Enregistrer les modifications
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Live Preview Box */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-[#1E3A8A] text-sm">Aperçu en Direct</h4>
                  <p className="text-xs text-slate-500">Rendu visuel sur la carte billet du site public.</p>

                  <div className="p-4 rounded-2xl bg-[#1C0F16] text-[#F5EDE4] space-y-3 border border-[#F3C4A0]/20 shadow-md">
                    <div className="h-32 rounded-xl overflow-hidden relative">
                      <img
                        src={eventForm.bannerUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#B93A34] text-white text-[9px] font-bold rounded">
                        {eventForm.edition}
                      </span>
                    </div>

                    <h5 className="font-black uppercase text-base text-[#F5EDE4] leading-tight">
                      {eventForm.title}
                    </h5>

                    <div className="space-y-1 text-[11px] text-[#F3C4A0]/80 font-medium">
                      <p>📅 {eventForm.date}</p>
                      <p>📍 {eventForm.location}</p>
                      <p>🎪 {eventForm.program}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ════════════ PAGE 4: DEMANDES D'ADHÉSION ════════════ */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              
              {/* Filter Tabs & Search Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Filter Status Pills */}
                <div className="flex items-center gap-2">
                  {[
                    { id: 'all', label: 'Toutes' },
                    { id: 'pending', label: 'En attente' },
                    { id: 'approved', label: 'Approuvées' },
                    { id: 'rejected', label: 'Refusées' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setAppFilter(tab.id as any)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        appFilter === tab.id
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher nom, email..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-[#2563EB]"
                  />
                </div>

              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Réf &amp; Candidat</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Filière ESEN</th>
                        <th className="py-3 px-4">Pôle Souhaité</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                            Aucune demande ne correspond aux critères.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map((app, idx) => (
                          <tr
                            key={app.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-800">
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {app.id}
                              </span>
                              {app.name}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              <p>{app.email}</p>
                              <p className="text-[10px] text-slate-400">{app.phone}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-medium">{app.major}</td>
                            <td className="py-3.5 px-4 font-semibold text-[#1E3A8A]">{app.department}</td>
                            <td className="py-3.5 px-4 text-slate-500">{app.date}</td>
                            <td className="py-3.5 px-4">
                              {app.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                  <Clock className="w-3 h-3" /> En attente
                                </span>
                              )}
                              {app.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Approuvé
                                </span>
                              )}
                              {app.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold border border-red-200">
                                  <XCircle className="w-3 h-3" /> Refusé
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {app.status === 'pending' ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleUpdateStatus(app.id, 'approved')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors shadow-xs"
                                  >
                                    Approuver
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-bold text-[11px] transition-colors"
                                  >
                                    Refuser
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Traité</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ════════════ PAGE 5: PARAMÈTRES ════════════ */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6">
              
              {/* Recruitment Toggle Box */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#1E3A8A] text-base">Ouverture du Recrutement</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contrôle l'affichage de la section "Devenir membre" sur le site public.
                    </p>
                  </div>

                  <button
                    onClick={() => onToggleRecruitment(!recruitmentOpen)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ease-in-out p-1 ${
                      recruitmentOpen ? 'bg-[#2563EB]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                        recruitmentOpen ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      recruitmentOpen ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <span>
                    Actuellement : {recruitmentOpen ? 'Recrutement OUVERT aux étudiants ESEN' : 'Recrutement FERMÉ'}
                  </span>
                </div>
              </div>

              {/* General Club Info Settings */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-[#1E3A8A] text-base">Coordonnées Officielles du Club</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      E-mail Officiel du Club
                    </label>
                    <input
                      type="email"
                      defaultValue="contact@jokeresen.tn"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Université / Établissement
                    </label>
                    <input
                      type="text"
                      defaultValue="École Supérieure d'Économie Numérique (ESEN Manouba)"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => alert('Paramètres enregistrés')}
                      className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      Enregistrer les paramètres
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

    </div>
  );
};
