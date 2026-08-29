import React, { useState, useEffect, useRef } from 'react';
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
  Trash2,
  ExternalLink,
  Sliders,
  Users,
  Lock,
  Mail,
  Upload,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Phone,
  FolderPlus,
  Building2,
  BookOpen,
  Edit3,
  Check,
  Clock,
  MapPin,
} from 'lucide-react';

import type { TeamMember } from '../Team';
import type {
  RecruitmentApplication,
  Partner,
  AboutData,
  AboutStat,
  AboutPillar,
  FormConfig,
  EventRecord
} from '../../types/database';
import {
  fetchRecruitmentApplications,
  updateRecruitmentStatus,
  deleteRecruitmentApplication
} from '../../services/recruitmentService';
import { updateClubSettings } from '../../services/settingsService';
import {
  fetchAllEvents,
  fetchActiveEvent,
  createEvent,
  updateEventDetails,
  setActiveEvent,
  deleteEvent
} from '../../services/eventService';
import { fetchTeamMembers, saveTeamMember, deleteTeamMember } from '../../services/teamService';
import { fetchPartners, savePartner, deletePartner } from '../../services/partnersService';
import { fetchAboutData, saveAboutData, defaultAboutData } from '../../services/aboutService';
import { fetchFormConfig, saveFormConfig, defaultFormConfig } from '../../services/formConfigService';
import {
  galleryService,
  getSavedAlbums,
  saveAlbumMeta,
  removeAlbumMeta,
  type AlbumMeta
} from '../../services/galleryService';
import { uploadToCloudinary, CLOUDINARY_CONFIG } from '../../lib/cloudinary';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

interface AdminDashboardProps {
  onBackToPublic: () => void;
  recruitmentOpen: boolean;
  onToggleRecruitment: (isOpen: boolean) => void;
  eventData: {
    id?: string;
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

interface AdminPhoto {
  id: string | number;
  title: string;
  album: string;
  url: string;
  date: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToPublic,
  recruitmentOpen,
  onToggleRecruitment,
  eventData: _eventData,
  onUpdateEvent,
  teamMembers,
  onUpdateTeamMembers,
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('joker_admin_auth') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('admin@jokeresen.tn');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Navigation state with persistent active tab caching
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'applications' | 'partners' | 'about' | 'event' | 'team' | 'gallery' | 'settings'
  >(() => {
    const saved = localStorage.getItem('joker_admin_active_tab');
    if (
      saved &&
      ['dashboard', 'applications', 'partners', 'about', 'event', 'team', 'gallery', 'settings'].includes(saved)
    ) {
      return saved as any;
    }
    return 'dashboard';
  });

  const handleTabSelect = (
    tab: 'dashboard' | 'applications' | 'partners' | 'about' | 'event' | 'team' | 'gallery' | 'settings'
  ) => {
    setActiveTab(tab);
    localStorage.setItem('joker_admin_active_tab', tab);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Notification Banner
  const [notification, setNotification] = useState<string | null>(null);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // ── 1. Applications Data State ──
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'contacted'>('all');
  const [appSearch, setAppSearch] = useState('');

  // ── 2. Partners Data State ──
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState<Partner>({
    name: '',
    short_name: '',
    svg_color: '#F3C4A0',
    logo_url: '',
    order_index: 1,
  });
  const [partnerLogoUploadLoading, setPartnerLogoUploadLoading] = useState(false);
  const partnerLogoInputRef = useRef<HTMLInputElement>(null);

  // ── 3. About Section Data State ──
  const [aboutData, setAboutData] = useState<AboutData>(defaultAboutData);
  const [savingAbout, setSavingAbout] = useState(false);
  const [isStatModalOpen, setIsStatModalOpen] = useState(false);
  const [editingStatIndex, setEditingStatIndex] = useState<number | null>(null);
  const [statForm, setStatForm] = useState<AboutStat>({
    number: '',
    label: '',
    color: '#F3C4A0',
    icon: 'Trophy',
  });
  const [isPillarModalOpen, setIsPillarModalOpen] = useState(false);
  const [editingPillarIndex, setEditingPillarIndex] = useState<number | null>(null);
  const [pillarForm, setPillarForm] = useState<AboutPillar>({
    id: 'spade',
    suit: '♠',
    name: '',
    title: '',
    desc: '',
    color: '#E05A52',
  });

  // ── 4. Events Data State ──
  const [allEvents, setAllEvents] = useState<EventRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [eventModalForm, setEventModalForm] = useState({
    title: '',
    edition: '',
    date: '',
    location: '',
    program: '',
    banner_url: '/images/event_banner.jpg',
    is_active: true,
  });
  const [eventBannerUploadLoading, setEventBannerUploadLoading] = useState(false);
  const eventBannerInputRef = useRef<HTMLInputElement>(null);

  // ── 5. Form Config State ──
  const [formConfig, setFormConfig] = useState<FormConfig>(defaultFormConfig);
  const [newMajorInput, setNewMajorInput] = useState('');
  const [newDepartmentInput, setNewDepartmentInput] = useState('');

  // ── 6. Photos & Albums State ──
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<AlbumMeta[]>(() => getSavedAlbums());
  const [selectedAlbum, setSelectedAlbum] = useState<string>('Tous');
  
  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoAlbum, setNewPhotoAlbum] = useState('');
  const [isCreatingNewAlbumInUploadModal, setIsCreatingNewAlbumInUploadModal] = useState(false);
  const [newCustomAlbumName, setNewCustomAlbumName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Album Modal State
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumCategory, setNewAlbumCategory] = useState<'Soirées' | 'Workshops' | 'Teambuilding'>('Soirées');
  const [newAlbumCoverFile, setNewAlbumCoverFile] = useState<File | null>(null);
  const [newAlbumCoverUrl, setNewAlbumCoverUrl] = useState('');
  const [albumModalLoading, setAlbumModalLoading] = useState(false);
  const [albumModalError, setAlbumModalError] = useState('');
  const albumCoverInputRef = useRef<HTMLInputElement>(null);

  // ── 7. Team Member Modal State ──
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
  const [avatarUploadLoading, setAvatarUploadLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Load All Data from Supabase upon Authentication
  const loadAllData = async () => {
    loadApplications();
    loadPartnersData();
    loadAboutSectionData();
    loadEventsData();
    loadFormConfiguration();
    loadPhotos();
    loadTeam();
  };

  const loadApplications = async () => {
    setLoadingApps(true);
    try {
      const data = await fetchRecruitmentApplications();
      setApplications(data);
    } catch (err) {
      console.warn('Error loading applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const loadPartnersData = async () => {
    setLoadingPartners(true);
    try {
      const data = await fetchPartners();
      setPartners(data);
    } catch (err) {
      console.warn('Error loading partners from Supabase:', err);
    } finally {
      setLoadingPartners(false);
    }
  };

  const loadAboutSectionData = async () => {
    try {
      const data = await fetchAboutData();
      setAboutData(data);
    } catch (err) {
      console.warn('Error loading About data from Supabase:', err);
    }
  };

  const loadEventsData = async () => {
    setLoadingEvents(true);
    try {
      const events = await fetchAllEvents();
      setAllEvents(events);
    } catch (err) {
      console.warn('Error loading events from Supabase:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadFormConfiguration = async () => {
    try {
      const config = await fetchFormConfig();
      setFormConfig(config);
    } catch (err) {
      console.warn('Error loading form config:', err);
    }
  };

  const loadPhotos = async () => {
    try {
      const { images } = await galleryService.fetchImages(0, 100);
      if (images && images.length > 0) {
        const mapped: AdminPhoto[] = images.map((img) => ({
          id: img.id,
          title: img.title || 'Photo Joker ESEN',
          album: img.description || 'Général',
          url: img.display_url || img.cloudinary_url,
          date: img.created_at ? new Date(img.created_at).toLocaleDateString('fr-FR') : 'Récemment',
        }));
        setPhotos(mapped);
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.warn('Error loading gallery photos:', err);
      setPhotos([]);
    }
  };

  const loadTeam = async () => {
    try {
      const dbTeam = await fetchTeamMembers();
      if (dbTeam && dbTeam.length > 0) {
        onUpdateTeamMembers(dbTeam);
      }
    } catch (err) {
      console.warn('Error loading team members:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      let success = false;
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginPassword,
        });
        if (!error && data?.user) {
          success = true;
        }
      }

      if (
        !success &&
        (loginPassword === 'joker2026' ||
          loginPassword === 'joker_esen_admin' ||
          (loginEmail.trim().toLowerCase() === 'admin@jokeresen.tn' && loginPassword === 'joker2026'))
      ) {
        success = true;
      }

      if (success) {
        setIsAuthenticated(true);
        localStorage.setItem('joker_admin_auth', 'true');
        showNotification('Bienvenue dans le panneau de gestion Joker ESEN !');
      } else {
        setLoginError('Identifiants incorrects. Mot de passe maître: joker2026');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Erreur lors de la connexion.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('joker_admin_auth');
    localStorage.removeItem('joker_view');
    localStorage.removeItem('joker_admin_active_tab');
    setIsAuthenticated(false);
    onBackToPublic();
  };

  // ══════════════════════════════════════════════════════════════════════
  // PARTNERS HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) return;

    const partnerToSave: Partner = {
      ...partnerForm,
      short_name: partnerForm.short_name.trim() || partnerForm.name.trim().toUpperCase(),
      id: editingPartner?.id || partnerForm.id || String(Date.now()),
    };

    const updated = await savePartner(partnerToSave);
    setPartners(updated);
    setIsPartnerModalOpen(false);
    setEditingPartner(null);
    showNotification(`Partenaire "${partnerToSave.name}" enregistré sur Supabase !`);
  };

  const handleDeletePartner = async (partner: Partner) => {
    if (!window.confirm(`Supprimer le partenaire "${partner.name}" ?`)) return;
    const updated = await deletePartner(partner.id || '', partner.name);
    setPartners(updated);
    showNotification(`Partenaire "${partner.name}" supprimé.`);
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPartnerLogoUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        setPartnerForm((prev) => ({ ...prev, logo_url: res.secure_url }));
        showNotification('Logo partenaire téléversé sur Cloudinary !');
      }
    } catch (err: any) {
      alert(err.message || 'Erreur de téléversement Cloudinary.');
    } finally {
      setPartnerLogoUploadLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // ABOUT SECTION HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleSaveAboutStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAbout(true);
    try {
      const saved = await saveAboutData(aboutData);
      setAboutData(saved);
      showNotification('Section "Qui Sommes-Nous" mise à jour sur Supabase !');
    } catch (err) {
      console.warn('Error saving about text:', err);
    } finally {
      setSavingAbout(false);
    }
  };

  const handleSaveStat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statForm.number.trim() || !statForm.label.trim()) return;

    const currentStats = [...(aboutData.stats || [])];
    if (editingStatIndex !== null) {
      currentStats[editingStatIndex] = statForm;
    } else {
      currentStats.push(statForm);
    }

    const updatedData = { ...aboutData, stats: currentStats };
    setAboutData(updatedData);
    await saveAboutData(updatedData);
    setIsStatModalOpen(false);
    setEditingStatIndex(null);
    showNotification('Statistique enregistrée sur Supabase !');
  };

  const handleDeleteStat = async (index: number) => {
    if (!window.confirm('Supprimer cette statistique ?')) return;
    const currentStats = aboutData.stats.filter((_, i) => i !== index);
    const updatedData = { ...aboutData, stats: currentStats };
    setAboutData(updatedData);
    await saveAboutData(updatedData);
    showNotification('Statistique supprimée.');
  };

  const handleSavePillar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pillarForm.title.trim()) return;

    const currentPillars = [...(aboutData.pillars || [])];
    if (editingPillarIndex !== null) {
      currentPillars[editingPillarIndex] = pillarForm;
    } else {
      currentPillars.push(pillarForm);
    }

    const updatedData = { ...aboutData, pillars: currentPillars };
    setAboutData(updatedData);
    await saveAboutData(updatedData);
    setIsPillarModalOpen(false);
    setEditingPillarIndex(null);
    showNotification('Pilier / As enregistré sur Supabase !');
  };

  const handleDeletePillar = async (index: number) => {
    if (!window.confirm('Supprimer ce pilier ?')) return;
    const currentPillars = aboutData.pillars.filter((_, i) => i !== index);
    const updatedData = { ...aboutData, pillars: currentPillars };
    setAboutData(updatedData);
    await saveAboutData(updatedData);
    showNotification('Pilier supprimé.');
  };

  // ══════════════════════════════════════════════════════════════════════
  // EVENTS HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleSaveEventModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventModalForm.title.trim()) return;

    if (editingEvent?.id) {
      // Update existing
      await updateEventDetails(editingEvent.id, eventModalForm);
      showNotification(`Événement "${eventModalForm.title}" mis à jour sur Supabase !`);
    } else {
      // Create new
      await createEvent(eventModalForm);
      showNotification(`Nouvel événement "${eventModalForm.title}" créé sur Supabase !`);
    }

    setIsEventModalOpen(false);
    setEditingEvent(null);
    await loadEventsData();

    // If active, sync to App state
    const active = await fetchActiveEvent();
    if (active) {
      onUpdateEvent({
        id: active.id,
        title: active.title,
        edition: active.edition,
        date: active.date,
        location: active.location,
        program: active.program,
        bannerUrl: active.banner_url,
      });
    }
  };

  const handleSetActiveEvent = async (event: EventRecord) => {
    await setActiveEvent(event.id);
    showNotification(`"${event.title}" défini comme l'événement actif !`);
    await loadEventsData();
    onUpdateEvent({
      id: event.id,
      title: event.title,
      edition: event.edition,
      date: event.date,
      location: event.location,
      program: event.program,
      bannerUrl: event.banner_url,
    });
  };

  const handleDeleteEvent = async (event: EventRecord) => {
    if (!window.confirm(`Supprimer définitivement l'événement "${event.title}" de Supabase ?`)) return;
    await deleteEvent(event.id);
    showNotification(`Événement "${event.title}" supprimé.`);
    await loadEventsData();
  };

  const handleEventBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEventBannerUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        setEventModalForm((prev) => ({ ...prev, banner_url: res.secure_url }));
        showNotification('Affiche téléversée sur Cloudinary !');
      }
    } catch (err: any) {
      alert(err.message || 'Erreur de téléversement Cloudinary.');
    } finally {
      setEventBannerUploadLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // FORM CONFIG & MAJORS HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleAddMajor = async () => {
    if (!newMajorInput.trim()) return;
    const updatedMajors = [...formConfig.majors, newMajorInput.trim()];
    const updated = await saveFormConfig({ majors: updatedMajors });
    setFormConfig(updated);
    setNewMajorInput('');
    showNotification('Nouvelle filière ajoutée à Supabase !');
  };

  const handleDeleteMajor = async (major: string) => {
    const updatedMajors = formConfig.majors.filter((m) => m !== major);
    const updated = await saveFormConfig({ majors: updatedMajors });
    setFormConfig(updated);
    showNotification(`Filière "${major}" retirée.`);
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentInput.trim()) return;
    const updatedDepartments = [...formConfig.departments, newDepartmentInput.trim()];
    const updated = await saveFormConfig({ departments: updatedDepartments });
    setFormConfig(updated);
    setNewDepartmentInput('');
    showNotification('Nouveau pôle ajouté à Supabase !');
  };

  const handleDeleteDepartment = async (dept: string) => {
    const updatedDepartments = formConfig.departments.filter((d) => d !== dept);
    const updated = await saveFormConfig({ departments: updatedDepartments });
    setFormConfig(updated);
    showNotification(`Pôle "${dept}" retiré.`);
  };

  const handleToggleRecruitmentStatus = async (newVal: boolean) => {
    onToggleRecruitment(newVal);
    await updateClubSettings({ recruitment_open: newVal });
    showNotification(`Recrutement ${newVal ? 'ouvert' : 'suspendu'} sur Supabase.`);
  };

  // ══════════════════════════════════════════════════════════════════════
  // APPLICATIONS HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleUpdateStatus = async (
    id: string,
    newStatus: 'pending' | 'accepted' | 'rejected' | 'contacted'
  ) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    await updateRecruitmentStatus(id, newStatus);
    showNotification(`Statut mis à jour vers "${newStatus}" !`);
  };

  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm('Confirmer la suppression de cette candidature ?')) return;
    setApplications((prev) => prev.filter((app) => app.id !== id));
    await deleteRecruitmentApplication(id);
    showNotification('Candidature supprimée.');
  };

  // ══════════════════════════════════════════════════════════════════════
  // TEAM HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.role) return;

    const previousName = editingMember?.name;
    const memberToSave: TeamMember = {
      ...memberForm,
      id: editingMember?.id || memberForm.id || String(Date.now()),
      avatar: memberForm.avatar || '',
    };

    let updatedList: TeamMember[];
    if (editingMember) {
      updatedList = teamMembers.map((m) =>
        (editingMember.id && m.id === editingMember.id) || m.name === editingMember.name
          ? memberToSave
          : m
      );
    } else {
      updatedList = [...teamMembers, memberToSave];
    }

    onUpdateTeamMembers(updatedList);
    setIsMemberModalOpen(false);
    setEditingMember(null);

    const saved = await saveTeamMember(memberToSave, updatedList.indexOf(memberToSave), updatedList, previousName);
    if (saved && saved.id) {
      const refreshedList = updatedList.map((m) => (m.name === saved.name ? saved : m));
      onUpdateTeamMembers(refreshedList);
    }
    showNotification(`Membre "${memberForm.name}" enregistré sur Supabase !`);
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!window.confirm(`Supprimer ${member.name} du Bureau Exécutif ?`)) return;
    const updated = teamMembers.filter(
      (m) => (member.id ? m.id !== member.id : true) && (member.name ? m.name !== member.name : true)
    );
    onUpdateTeamMembers(updated);
    await deleteTeamMember(member.id || '', member.name, updated);
    showNotification(`Membre "${member.name}" supprimé.`);
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        const newAvatarUrl = res.secure_url;
        setMemberForm((prev) => ({ ...prev, avatar: newAvatarUrl }));

        if (editingMember) {
          const updatedMember: TeamMember = {
            ...memberForm,
            avatar: newAvatarUrl,
            id: editingMember.id || String(Date.now()),
          };
          const updatedList = teamMembers.map((m) =>
            (m.id && m.id === editingMember.id) || m.name === editingMember.name ? updatedMember : m
          );
          onUpdateTeamMembers(updatedList);
          await saveTeamMember(updatedMember, updatedList.indexOf(updatedMember), updatedList, editingMember.name);
        }
        showNotification('Avatar téléversé sur Cloudinary !');
      }
    } catch (err: any) {
      alert(err.message || 'Échec du téléversement.');
    } finally {
      setAvatarUploadLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  // GALLERY HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    const targetAlbum = isCreatingNewAlbumInUploadModal
      ? newCustomAlbumName.trim()
      : newPhotoAlbum.trim() || 'Événements Joker';

    if (!targetAlbum) {
      setUploadError("Veuillez sélectionner ou créer un nom d'album.");
      return;
    }

    if (uploadFiles.length === 0 && !newPhotoUrl.trim()) {
      setUploadError('Veuillez sélectionner au moins une photo ou une URL.');
      return;
    }

    setUploadProgress(true);
    setUploadProgressText(`Téléversement de 1 / ${uploadFiles.length || 1}...`);

    try {
      if (uploadFiles.length > 0) {
        const newImages = await galleryService.uploadMultipleImages(uploadFiles, targetAlbum, (done, total) => {
          setUploadProgressText(`Téléversement de ${done} / ${total} photos...`);
        });

        const newPhotoItems: AdminPhoto[] = newImages.map((img) => ({
          id: img.id,
          title: img.title || targetAlbum,
          album: targetAlbum,
          url: img.display_url || img.cloudinary_url,
          date: 'Aujourd’hui',
        }));

        setPhotos((prev) => [...newPhotoItems, ...prev]);
        saveAlbumMeta({ name: targetAlbum, category: 'Soirées' });
        setSavedAlbums(getSavedAlbums());
        showNotification(`${newImages.length} photo(s) ajoutée(s) à l'album "${targetAlbum}" !`);
      } else if (newPhotoUrl) {
        const newImg = await galleryService.addPhotoByUrl(newPhotoUrl, {
          title: newPhotoTitle || 'Photo',
          description: targetAlbum,
        });

        const newPhotoItem: AdminPhoto = {
          id: newImg.id,
          title: newImg.title || 'Photo',
          album: targetAlbum,
          url: newPhotoUrl,
          date: 'Aujourd’hui',
        };

        setPhotos((prev) => [newPhotoItem, ...prev]);
        saveAlbumMeta({ name: targetAlbum, category: 'Soirées' });
        setSavedAlbums(getSavedAlbums());
        showNotification(`Photo ajoutée à l'album "${targetAlbum}" !`);
      }

      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setNewPhotoTitle('');
      setNewPhotoUrl('');
      setIsCreatingNewAlbumInUploadModal(false);
      setNewCustomAlbumName('');
      setSelectedAlbum(targetAlbum);
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors du téléversement.');
    } finally {
      setUploadProgress(false);
      setUploadProgressText('');
    }
  };

  const handleCreateAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlbumModalError('');
    if (!newAlbumTitle.trim()) {
      setAlbumModalError("Veuillez spécifier un nom d'album.");
      return;
    }

    setAlbumModalLoading(true);
    const albumName = newAlbumTitle.trim();

    try {
      let coverUrl = '';

      if (newAlbumCoverFile) {
        const newImg = await galleryService.uploadImage(newAlbumCoverFile, {
          title: `Couverture - ${albumName}`,
          description: albumName,
        });
        coverUrl = newImg.display_url || newImg.cloudinary_url;

        const newPhotoItem: AdminPhoto = {
          id: newImg.id,
          title: `Couverture - ${albumName}`,
          album: albumName,
          url: coverUrl,
          date: 'Aujourd’hui',
        };

        setPhotos((prev) => [newPhotoItem, ...prev]);
      } else if (newAlbumCoverUrl) {
        const newImg = await galleryService.addPhotoByUrl(newAlbumCoverUrl, {
          title: `Couverture - ${albumName}`,
          description: albumName,
        });
        coverUrl = newAlbumCoverUrl;

        const newPhotoItem: AdminPhoto = {
          id: newImg.id,
          title: `Couverture - ${albumName}`,
          album: albumName,
          url: newAlbumCoverUrl,
          date: 'Aujourd’hui',
        };

        setPhotos((prev) => [newPhotoItem, ...prev]);
      }

      saveAlbumMeta({
        name: albumName,
        category: newAlbumCategory,
        coverUrl: coverUrl || undefined,
        date: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      });

      setSavedAlbums(getSavedAlbums());
      setSelectedAlbum(albumName);
      setIsAlbumModalOpen(false);
      setNewAlbumTitle('');
      setNewAlbumCoverFile(null);
      setNewAlbumCoverUrl('');
      showNotification(`Album "${albumName}" créé avec succès !`);
    } catch (err: any) {
      setAlbumModalError(err.message || "Erreur lors de la création de l'album.");
    } finally {
      setAlbumModalLoading(false);
    }
  };

  const handleDeleteAlbum = async (albumName: string) => {
    if (!window.confirm(`Supprimer l'album "${albumName}" et TOUTES ses photos ?`)) return;
    await galleryService.deleteAlbum(albumName);
    removeAlbumMeta(albumName);
    setSavedAlbums(getSavedAlbums());
    setPhotos((prev) => prev.filter((p) => (p.album || '').toLowerCase() !== albumName.toLowerCase()));
    setSelectedAlbum('Tous');
    showNotification(`Album "${albumName}" supprimé.`);
  };

  const handleDeletePhoto = async (id: string | number) => {
    if (!window.confirm('Supprimer cette photo de la galerie ?')) return;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await galleryService.deleteImage(String(id));
    showNotification('Photo supprimée de la galerie.');
  };

  // Filtered Applications
  const filteredApps = applications.filter((app) => {
    const matchesFilter = appFilter === 'all' ? true : app.status === appFilter;
    const matchesSearch =
      (app.full_name || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.email || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.major || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.department || '').toLowerCase().includes(appSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const allAlbumNames = Array.from(
    new Set([...savedAlbums.map((a) => a.name), ...photos.map((p) => p.album).filter(Boolean)])
  );

  const filteredPhotos =
    selectedAlbum === 'Tous'
      ? photos
      : photos.filter((p) => (p.album || '').toLowerCase() === selectedAlbum.toLowerCase());

  // ══════════════════════════════════════════════════════════════════════
  // IF NOT AUTHENTICATED -> SHOW LOGIN
  // ══════════════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#14080F] flex items-center justify-center p-4 font-sans text-[#F5EDE4]">
        <div className="w-full max-w-md bg-[#1F0E18] rounded-3xl border-2 border-[#F3C4A0]/30 shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#B93A34]/20 border border-[#B93A34]/40 text-[#F3C4A0] text-3xl font-black shadow-inner">
              ♠
            </div>
            <h1 className="text-2xl font-black text-[#F5EDE4] font-display uppercase tracking-wider">
              Administration JokerEsen
            </h1>
            <p className="text-xs text-[#F3C4A0]/70">
              Connexion sécurisée avec synchronisation Supabase BaaS.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-[#B93A34]/20 border border-[#B93A34]/50 flex items-start gap-2.5 text-xs text-[#F5EDE4]">
              <AlertCircle className="w-4 h-4 text-[#B93A34] shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#F3C4A0]/80 uppercase tracking-wider mb-1">
                Adresse E-mail Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#F3C4A0]/60 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@jokeresen.tn"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#14080F] border border-[#F3C4A0]/30 focus:border-[#B93A34] text-[#F5EDE4] text-sm font-medium outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-[#F3C4A0]/80 uppercase tracking-wider">
                  Mot de Passe
                </label>
                <span className="text-[10px] text-[#F3C4A0]/50">Défaut: joker2026</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#F3C4A0]/60 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#14080F] border border-[#F3C4A0]/30 focus:border-[#B93A34] text-[#F5EDE4] text-sm font-medium outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl shadow-[#B93A34]/30 hover:opacity-95 transition-all flex items-center justify-between cursor-pointer"
            >
              <span>{loginLoading ? 'Connexion...' : 'Accéder au Dashboard'}</span>
              <span className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-black">
                →
              </span>
            </button>
          </form>

          <button
            onClick={onBackToPublic}
            className="w-full py-2 text-center text-xs font-bold text-[#F3C4A0]/60 hover:text-white transition-colors cursor-pointer"
          >
            ← Retour au site public
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // MAIN ADMIN DASHBOARD UI
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#11070D] flex text-[#F5EDE4] font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#25121B] border-2 border-[#3B66FF] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-[#3B66FF] shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{notification}</span>
        </div>
      )}

      {/* Sidebar Overlay on Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#1A0E14] border-r border-[#F3C4A0]/15 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-[#F3C4A0]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#B93A34] text-white flex items-center justify-center font-black text-xl shadow-md">
                ♠
              </div>
              <div>
                <h2 className="text-base font-black text-[#F5EDE4] font-display uppercase tracking-wider">
                  Joker ESEN
                </h2>
                <p className="text-[10px] text-[#A66B95] font-semibold uppercase tracking-wider">
                  Supabase Admin Hub
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-[#F3C4A0] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
              {
                id: 'partners',
                label: 'Partenaires & Logos',
                icon: Building2,
                badge: partners.length,
              },
              { id: 'about', label: '01 · Qui Sommes-Nous', icon: BookOpen },
              { id: 'event', label: 'Gestion Événements', icon: Calendar, badge: allEvents.length },
              {
                id: 'applications',
                label: 'Candidatures & Inscriptions',
                icon: UserCheck,
                badge: applications.filter((a) => a.status === 'pending').length,
              },
              { id: 'team', label: 'Bureau Exécutif', icon: Users, badge: teamMembers.length },
              { id: 'gallery', label: 'Galerie Photos', icon: ImageIcon, badge: photos.length },
              { id: 'settings', label: 'Paramètres & Formulaire', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabSelect(tab.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white shadow-lg shadow-[#B93A34]/30'
                      : 'text-[#F3C4A0]/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#F3C4A0]'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-white text-[#B93A34]' : 'bg-[#B93A34]/20 text-[#F3C4A0]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-[#F3C4A0]/15 space-y-2">
          <button
            onClick={onBackToPublic}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#F3C4A0] text-xs font-bold transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Voir le site public</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#B93A34]/15 hover:bg-[#B93A34]/30 text-[#F5EDE4] text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#B93A34]" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-[#1A0E14]/90 backdrop-blur-md border-b border-[#F3C4A0]/15 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-[#F3C4A0]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-black text-[#F5EDE4] font-display uppercase tracking-wide">
              {activeTab === 'dashboard' && 'Tableau de Bord Exécutif'}
              {activeTab === 'partners' && 'Partenaires & Organisations Officielles'}
              {activeTab === 'about' && 'Gestion de la Section 01 · QUI SOMMES-NOUS'}
              {activeTab === 'event' && 'Gestion des Événements & Affiches'}
              {activeTab === 'applications' && 'Candidatures & Inscriptions'}
              {activeTab === 'team' && 'Membres du Bureau Exécutif'}
              {activeTab === 'gallery' && 'Galerie Photos & Cloudinary'}
              {activeTab === 'settings' && 'Paramètres & Formulaire de Recrutement'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isSupabaseConfigured ? 'Supabase Connecté 🟢' : 'Mode Démo'}</span>
            </div>
            {CLOUDINARY_CONFIG.cloudName && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-bold">
                <span>Cloudinary: {CLOUDINARY_CONFIG.cloudName}</span>
              </div>
            )}
          </div>
        </header>

        {/* Content Tabs Area */}
        <div className="p-6 sm:p-8 space-y-8">

          {/* ══════════════════════ TAB 1: DASHBOARD OVERVIEW ══════════════════════ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Partenaires</span>
                    <Building2 className="w-5 h-5 text-[#F3C4A0]" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-display">
                    {partners.length}
                  </div>
                  <p className="text-[11px] text-[#F3C4A0]/60">Organisations affichées en direct</p>
                </div>

                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Événements</span>
                    <Calendar className="w-5 h-5 text-[#3B66FF]" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-display">
                    {allEvents.length}
                  </div>
                  <p className="text-[11px] text-[#F3C4A0]/60">
                    {allEvents.filter((e) => e.is_active).length} événement vedette actif
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Candidatures</span>
                    <UserCheck className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-display">
                    {applications.length}
                  </div>
                  <p className="text-[11px] text-[#F3C4A0]/60">
                    {applications.filter((a) => a.status === 'pending').length} en attente
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Bureau Exécutif</span>
                    <Users className="w-5 h-5 text-[#B93A34]" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-display">
                    {teamMembers.length}
                  </div>
                  <p className="text-[11px] text-[#F3C4A0]/60">Membres synchronisés</p>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-6">
                <div>
                  <h3 className="text-xl font-black font-display uppercase text-white">
                    Modules de Gestion Supabase
                  </h3>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Toutes les modifications sont enregistrées et synchronisées en temps réel sur Supabase.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => {
                      handleTabSelect('partners');
                      setEditingPartner(null);
                      setPartnerForm({ name: '', short_name: '', svg_color: '#F3C4A0', logo_url: '' });
                      setIsPartnerModalOpen(true);
                    }}
                    className="p-5 rounded-2xl bg-[#F3C4A0]/10 border border-[#F3C4A0]/30 hover:bg-[#F3C4A0]/20 text-left transition-all space-y-2 group cursor-pointer"
                  >
                    <Building2 className="w-6 h-6 text-[#F3C4A0] group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Ajouter un Partenaire</h4>
                    <p className="text-xs text-[#F3C4A0]/70">Logo Cloudinary &amp; nom d'organisation</p>
                  </button>

                  <button
                    onClick={() => handleTabSelect('about')}
                    className="p-5 rounded-2xl bg-[#B93A34]/15 border border-[#B93A34]/35 hover:bg-[#B93A34]/25 text-left transition-all space-y-2 group cursor-pointer"
                  >
                    <BookOpen className="w-6 h-6 text-[#E05A52] group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Modifier Qui Sommes-Nous</h4>
                    <p className="text-xs text-[#F3C4A0]/70">Histoire, statistiques et 4 As</p>
                  </button>

                  <button
                    onClick={() => {
                      handleTabSelect('event');
                      setEditingEvent(null);
                      setEventModalForm({
                        title: '',
                        edition: '',
                        date: '',
                        location: '',
                        program: '',
                        banner_url: '/images/event_banner.jpg',
                        is_active: true,
                      });
                      setIsEventModalOpen(true);
                    }}
                    className="p-5 rounded-2xl bg-[#3B66FF]/15 border border-[#3B66FF]/35 hover:bg-[#3B66FF]/25 text-left transition-all space-y-2 group cursor-pointer"
                  >
                    <Calendar className="w-6 h-6 text-[#93C5FD] group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Créer un Événement</h4>
                    <p className="text-xs text-[#F3C4A0]/70">Affiche, date, lieu &amp; statut actif</p>
                  </button>

                  <button
                    onClick={() => handleTabSelect('settings')}
                    className="p-5 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/35 hover:bg-[#22C55E]/25 text-left transition-all space-y-2 group cursor-pointer"
                  >
                    <Sliders className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Champs du Formulaire</h4>
                    <p className="text-xs text-[#F3C4A0]/70">Filières, pôles &amp; ouverture adhésions</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 2: PARTENAIRES & ORGANISATIONS ══════════════════════ */}
          {activeTab === 'partners' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase text-white">
                    Partenaires &amp; Organisations Officielles
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Table de gestion complète des logos et noms d'organisations partenaires, synchronisée avec Supabase.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={loadPartnersData}
                    disabled={loadingPartners}
                    className="px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingPartners ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingPartner(null);
                      setPartnerForm({
                        name: '',
                        short_name: '',
                        svg_color: '#F3C4A0',
                        logo_url: '',
                        order_index: partners.length + 1,
                      });
                      setIsPartnerModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#B93A34]/30 hover:opacity-90 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter un Partenaire</span>
                  </button>
                </div>
              </div>

              {/* Partners Table */}
              <div className="rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#F3C4A0]/15 bg-[#14080F] text-[#A66B95] uppercase tracking-wider font-bold">
                        <th className="p-4">Logo / Icône</th>
                        <th className="p-4">Nom Complet</th>
                        <th className="p-4">Nom Court / Badge</th>
                        <th className="p-4">Couleur de Marque</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3C4A0]/10">
                      {partners.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#F3C4A0]/60">
                            Aucun partenaire enregistré. Cliquez sur "Ajouter un Partenaire".
                          </td>
                        </tr>
                      ) : (
                        partners.map((p, idx) => (
                          <tr key={p.id || `${p.name}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4">
                              {p.logo_url ? (
                                <img
                                  src={p.logo_url}
                                  alt={p.name}
                                  className="w-10 h-10 object-contain rounded-lg bg-black/40 p-1 border border-[#F3C4A0]/20"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm border border-white/20"
                                  style={{ backgroundColor: `${p.svg_color}25`, color: p.svg_color }}
                                >
                                  {p.short_name?.charAt(0) || p.name.charAt(0)}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-bold text-white text-sm">{p.name}</td>
                            <td className="p-4">
                              <span
                                className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider"
                                style={{ backgroundColor: `${p.svg_color}20`, color: p.svg_color }}
                              >
                                {p.short_name || p.name}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-white/20"
                                  style={{ backgroundColor: p.svg_color }}
                                />
                                <span className="font-mono text-[11px] text-[#F3C4A0]/80">{p.svg_color}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPartner(p);
                                    setPartnerForm({ ...p });
                                    setIsPartnerModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[#3B66FF]/20 text-[#93C5FD] hover:bg-[#3B66FF] hover:text-white transition-colors cursor-pointer"
                                  title="Modifier le partenaire"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePartner(p)}
                                  className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
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
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 3: 01 · QUI SOMMES-NOUS ══════════════════════ */}
          {activeTab === 'about' && (
            <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl">
              <div>
                <h2 className="text-2xl font-black font-display uppercase text-white">
                  01 · QUI SOMMES-NOUS — Édition Supabase
                </h2>
                <p className="text-xs text-[#F3C4A0]/70">
                  Modifiez les textes narratifs, les 4 statistiques de l'ESEN et les cartes des 4 As (Pique, Cœur, Carreau, Trèfle).
                </p>
              </div>

              {/* 1. Main Narrative Texts Form */}
              <form
                onSubmit={handleSaveAboutStory}
                className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-[#F3C4A0]/15">
                  <h3 className="text-base font-black uppercase text-white font-display">
                    Histoire &amp; Textes de Présentation
                  </h3>
                  <button
                    type="submit"
                    disabled={savingAbout}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white text-xs font-bold shadow-md hover:opacity-90 cursor-pointer flex items-center gap-2"
                  >
                    {savingAbout ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Enregistrer les Textes</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Badge Section
                    </label>
                    <input
                      type="text"
                      value={aboutData.badge}
                      onChange={(e) => setAboutData({ ...aboutData, badge: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Année de Fondation
                    </label>
                    <input
                      type="text"
                      value={aboutData.founded_year}
                      onChange={(e) => setAboutData({ ...aboutData, founded_year: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Titre Préfixe
                    </label>
                    <input
                      type="text"
                      value={aboutData.title_prefix}
                      onChange={(e) => setAboutData({ ...aboutData, title_prefix: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Titre Highlight (Dégradé)
                    </label>
                    <input
                      type="text"
                      value={aboutData.title_highlight}
                      onChange={(e) => setAboutData({ ...aboutData, title_highlight: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Titre d'Accroche (Story Heading)
                    </label>
                    <input
                      type="text"
                      value={aboutData.story_heading}
                      onChange={(e) => setAboutData({ ...aboutData, story_heading: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Lieu Campus
                    </label>
                    <input
                      type="text"
                      value={aboutData.story_location}
                      onChange={(e) => setAboutData({ ...aboutData, story_location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                    Texte de l'Histoire du Club
                  </label>
                  <textarea
                    rows={4}
                    value={aboutData.story_text}
                    onChange={(e) => setAboutData({ ...aboutData, story_text: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>
              </form>

              {/* 2. Stats Table & Editor */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black uppercase text-white font-display">
                      Statistiques Clés (Bento Box)
                    </h3>
                    <p className="text-xs text-[#F3C4A0]/70">Exemples: 2016 Fondation, 500+ Membres, 50+ Événements, 100% Passion</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingStatIndex(null);
                      setStatForm({ number: '', label: '', color: '#F3C4A0', icon: 'Trophy' });
                      setIsStatModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-[#3B66FF] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#2552E0] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une Stat</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {aboutData.stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#11070D] border border-[#F3C4A0]/15 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="text-2xl font-black font-display" style={{ color: stat.color }}>
                          {stat.number}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#F5EDE4]/70 mt-0.5">
                          {stat.label}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F3C4A0]/10 text-xs">
                        <button
                          onClick={() => {
                            setEditingStatIndex(idx);
                            setStatForm({ ...stat });
                            setIsStatModalOpen(true);
                          }}
                          className="text-[#3B66FF] font-bold hover:underline cursor-pointer"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteStat(idx)}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Pillars / Les 4 As Table & Editor */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black uppercase text-white font-display">
                      Les Piliers du Club (Les 4 As)
                    </h3>
                    <p className="text-xs text-[#F3C4A0]/70">Pique (♠), Cœur (♥), Carreau (♦), Trèfle (♣)</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingPillarIndex(null);
                      setPillarForm({ id: 'spade', suit: '♠', name: '', title: '', desc: '', color: '#E05A52' });
                      setIsPillarModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-[#3B66FF] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#2552E0] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un Pilier</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {aboutData.pillars.map((pillar, idx) => (
                    <div
                      key={pillar.id || idx}
                      className="p-5 rounded-2xl bg-[#11070D] border border-[#F3C4A0]/15 space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black" style={{ color: pillar.color }}>
                          {pillar.suit}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider"
                          style={{ backgroundColor: `${pillar.color}25`, color: pillar.color }}
                        >
                          {pillar.name}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white font-display uppercase">{pillar.title}</h4>
                        <p className="text-xs text-[#F5EDE4]/70 mt-1 leading-relaxed">{pillar.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F3C4A0]/10 text-xs">
                        <button
                          onClick={() => {
                            setEditingPillarIndex(idx);
                            setPillarForm({ ...pillar });
                            setIsPillarModalOpen(true);
                          }}
                          className="text-[#3B66FF] font-bold hover:underline cursor-pointer"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeletePillar(idx)}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 4: GESTION ÉVÉNEMENTS ══════════════════════ */}
          {activeTab === 'event' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase text-white">
                    Gestion des Événements (Supabase)
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Gérez l'affiche, le programme et basculez d'un clic l'événement vedette actif sur la page d'accueil.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={loadEventsData}
                    disabled={loadingEvents}
                    className="px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingEvent(null);
                      setEventModalForm({
                        title: '',
                        edition: '',
                        date: '',
                        location: '',
                        program: '',
                        banner_url: '/images/event_banner.jpg',
                        is_active: allEvents.length === 0,
                      });
                      setIsEventModalOpen(true);
                    }}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#B93A34]/30 hover:opacity-90 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Créer un Nouvel Événement</span>
                  </button>
                </div>
              </div>

              {/* Events Table */}
              <div className="rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#F3C4A0]/15 bg-[#14080F] text-[#A66B95] uppercase tracking-wider font-bold">
                        <th className="p-4">Affiche</th>
                        <th className="p-4">Titre &amp; Édition</th>
                        <th className="p-4">Date &amp; Lieu</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3C4A0]/10">
                      {allEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-[#F3C4A0]/60">
                            Aucun événement enregistré. Cliquez sur "Créer un Nouvel Événement".
                          </td>
                        </tr>
                      ) : (
                        allEvents.map((evt) => (
                          <tr
                            key={evt.id}
                            className={`hover:bg-white/[0.02] transition-colors ${
                              evt.is_active ? 'bg-emerald-500/[0.04]' : ''
                            }`}
                          >
                            <td className="p-4">
                              <img
                                src={evt.banner_url || '/images/event_banner.jpg'}
                                alt={evt.title}
                                className="w-16 h-10 object-cover rounded-lg border border-[#F3C4A0]/20"
                              />
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-white text-sm">{evt.title}</div>
                              <div className="text-[11px] text-[#A66B95]">{evt.edition}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 text-white">
                                <Clock className="w-3.5 h-3.5 text-[#F3C4A0]" />
                                <span>{evt.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#F3C4A0]/70 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-[#B93A34]" />
                                <span>{evt.location}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              {evt.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>ACTIF (Public)</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSetActiveEvent(evt)}
                                  className="px-3 py-1 rounded-full bg-white/5 hover:bg-[#3B66FF] text-[#F3C4A0]/70 hover:text-white border border-white/10 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Définir comme actif →
                                </button>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingEvent(evt);
                                    setEventModalForm({
                                      title: evt.title,
                                      edition: evt.edition,
                                      date: evt.date,
                                      location: evt.location,
                                      program: evt.program,
                                      banner_url: evt.banner_url,
                                      is_active: evt.is_active,
                                    });
                                    setIsEventModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-[#3B66FF]/20 text-[#93C5FD] hover:bg-[#3B66FF] hover:text-white transition-colors cursor-pointer"
                                  title="Modifier l'événement"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(evt)}
                                  className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                  title="Supprimer l'événement"
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
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 5: CANDIDATURES & RECRUTEMENT ══════════════════════ */}
          {activeTab === 'applications' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase text-white">
                    Candidatures &amp; Recrutements
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Toutes les demandes d'adhésion enregistrées dans la table <code className="text-[#3B66FF]">recruitment_applications</code> sur Supabase.
                  </p>
                </div>

                <button
                  onClick={loadApplications}
                  disabled={loadingApps}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-2 self-start cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingApps ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#1F0E18] p-4 rounded-2xl border border-[#F3C4A0]/15">
                <div className="flex flex-wrap items-center gap-2">
                  {(['all', 'pending', 'accepted', 'rejected', 'contacted'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAppFilter(filter)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                        appFilter === filter
                          ? 'bg-[#3B66FF] text-white'
                          : 'bg-white/5 text-[#F3C4A0]/70 hover:text-white'
                      }`}
                    >
                      {filter === 'all'
                        ? 'Toutes'
                        : filter === 'pending'
                        ? 'En Attente'
                        : filter === 'accepted'
                        ? 'Acceptées'
                        : filter === 'rejected'
                        ? 'Refusées'
                        : 'Contactées'}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-[#F3C4A0]/60 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="Rechercher par nom, filière..."
                    className="w-full sm:w-64 pl-9 pr-4 py-1.5 rounded-full bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-[#F5EDE4] outline-none focus:border-[#3B66FF]"
                  />
                </div>
              </div>

              {/* Applications Table */}
              <div className="rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#F3C4A0]/15 bg-[#14080F] text-[#A66B95] uppercase tracking-wider font-bold">
                        <th className="p-4">Candidat</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Filière / Classe</th>
                        <th className="p-4">Pôle / Département</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3C4A0]/10">
                      {filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-[#F3C4A0]/60">
                            Aucune candidature trouvée.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map((app) => (
                          <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 font-bold text-white text-sm">{app.full_name}</td>
                            <td className="p-4 space-y-1">
                              <div className="flex items-center gap-1.5 text-[#F5EDE4]">
                                <Mail className="w-3.5 h-3.5 text-[#3B66FF]" />
                                <span>{app.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#F3C4A0]/70">
                                <Phone className="w-3.5 h-3.5 text-[#22C55E]" />
                                <span>{app.phone}</span>
                              </div>
                            </td>
                            <td className="p-4 font-medium text-[#F3C4A0]">{app.major}</td>
                            <td className="p-4 font-medium text-[#A66B95]">{app.department}</td>
                            <td className="p-4">
                              <select
                                value={app.status || 'pending'}
                                onChange={(e) => handleUpdateStatus(app.id!, e.target.value as any)}
                                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase outline-none cursor-pointer border ${
                                  app.status === 'accepted'
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                    : app.status === 'rejected'
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                    : app.status === 'contacted'
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                }`}
                              >
                                <option value="pending" className="bg-[#1F0E18] text-white">En attente</option>
                                <option value="accepted" className="bg-[#1F0E18] text-white">Accepté</option>
                                <option value="rejected" className="bg-[#1F0E18] text-white">Refusé</option>
                                <option value="contacted" className="bg-[#1F0E18] text-white">Contacté</option>
                              </select>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteApplication(app.id!)}
                                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                title="Supprimer la candidature"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* ══════════════════════ TAB 6: BUREAU EXÉCUTIF ══════════════════════ */}
          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase text-white">
                    Bureau Exécutif (Le Bureau)
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Ajoutez et synchronisez les membres officiels dans la table <code className="text-[#3B66FF]">team_members</code> sur Supabase.
                  </p>
                </div>

                <button
                  onClick={() => {
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
                  }}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#B93A34]/30 hover:opacity-90 self-start cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un Membre</span>
                </button>
              </div>

              {/* Team Members Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {teamMembers.map((member) => (
                  <div
                    key={member.id || member.name}
                    className="p-5 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-4 shadow-lg flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-[#F3C4A0]/30 shadow-md"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-[#11070D] border-2 border-[#F3C4A0]/30 shadow-md flex items-center justify-center text-[#F3C4A0] font-black text-lg">
                          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: member.suitColor }} className="text-lg font-black">
                            {member.suit}
                          </span>
                          <h4 className="font-bold text-sm text-white truncate max-w-[130px]">
                            {member.name}
                          </h4>
                        </div>
                        <p className="text-xs text-[#A66B95] font-medium truncate max-w-[130px]">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F3C4A0]/10 text-xs">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setMemberForm({ ...member });
                          setIsMemberModalOpen(true);
                        }}
                        className="text-[#3B66FF] font-bold hover:underline cursor-pointer"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 7: GALERIE PHOTOS ══════════════════════ */}
          {activeTab === 'gallery' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase text-white">
                    Galerie &amp; Cloudinary CDN
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Albums thématiques et photos hébergées avec métadonnées enregistrées dans Supabase.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAlbumModalOpen(true)}
                    className="px-4 py-2 rounded-full bg-[#4E4F9E]/30 border border-[#4E4F9E]/50 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#4E4F9E]/50 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Créer un Album</span>
                  </button>

                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#B93A34]/30 hover:opacity-90 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Ajouter des Photos</span>
                  </button>
                </div>
              </div>

              {/* Album filter tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedAlbum('Tous')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                    selectedAlbum === 'Tous' ? 'bg-[#3B66FF] text-white' : 'bg-white/5 text-[#F3C4A0]/70 hover:text-white'
                  }`}
                >
                  Tous ({photos.length})
                </button>
                {allAlbumNames.map((albumName) => (
                  <div key={albumName} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedAlbum(albumName)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                        selectedAlbum === albumName ? 'bg-[#3B66FF] text-white' : 'bg-white/5 text-[#F3C4A0]/70 hover:text-white'
                      }`}
                    >
                      {albumName} ({photos.filter((p) => p.album === albumName).length})
                    </button>
                    {selectedAlbum === albumName && (
                      <button
                        onClick={() => handleDeleteAlbum(albumName)}
                        className="p-1 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                        title={`Supprimer l'album ${albumName}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-2xl overflow-hidden bg-[#1F0E18] border border-[#F3C4A0]/20 aspect-square flex flex-col justify-end"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer z-10"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative z-10 p-3">
                      <div className="text-[10px] text-[#93C5FD] font-bold uppercase tracking-wider">{photo.album}</div>
                      <div className="text-xs font-bold text-white truncate">{photo.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 8: PARAMÈTRES & FORMULAIRE ══════════════════════ */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-2xl font-black font-display uppercase text-white">
                  Configuration du Formulaire &amp; Paramètres
                </h2>
                <p className="text-xs text-[#F3C4A0]/70">
                  Gérez les filières ESEN, les pôles/départements disponibles lors des inscriptions et le statut global des adhésions.
                </p>
              </div>

              {/* Recruitment Open / Closed toggle */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-white">Statut des Recrutements en Ligne</h4>
                  <p className="text-xs text-[#F3C4A0]/70 mt-0.5">
                    Activer ou suspendre le formulaire de candidature sur la page d'accueil.
                  </p>
                </div>

                <button
                  onClick={() => handleToggleRecruitmentStatus(!recruitmentOpen)}
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase transition-all shadow-md cursor-pointer ${
                    recruitmentOpen
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : 'bg-rose-500 text-white shadow-rose-500/30'
                  }`}
                >
                  {recruitmentOpen ? 'Recrutement Ouvert 🟢' : 'Recrutement Suspendu 🔴'}
                </button>
              </div>

              {/* Majors (Filières ESEN) Editor */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-white">Filières &amp; Classes Disponibles (Select Major)</h4>
                  <p className="text-xs text-[#F3C4A0]/70 mt-0.5">
                    Options proposées aux étudiants lors de leur inscription au club Joker ESEN.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMajorInput}
                    onChange={(e) => setNewMajorInput(e.target.value)}
                    placeholder="Ex: Master Big Data &amp; IA, L1 BIS..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                  <button
                    onClick={handleAddMajor}
                    className="px-5 py-2.5 rounded-xl bg-[#3B66FF] hover:bg-[#2552E0] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Filière</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {formConfig.majors.map((major) => (
                    <div
                      key={major}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs font-medium text-white"
                    >
                      <span>{major}</span>
                      <button
                        onClick={() => handleDeleteMajor(major)}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        title="Supprimer la filière"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Departments (Pôles) Editor */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-white">Pôles &amp; Départements de Recrutement</h4>
                  <p className="text-xs text-[#F3C4A0]/70 mt-0.5">
                    Équipes du club que les candidats peuvent choisir de rejoindre.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDepartmentInput}
                    onChange={(e) => setNewDepartmentInput(e.target.value)}
                    placeholder="Ex: Pôle Multimédia &amp; Vidéo..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                  <button
                    onClick={handleAddDepartment}
                    className="px-5 py-2.5 rounded-xl bg-[#3B66FF] hover:bg-[#2552E0] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Pôle</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {formConfig.departments.map((dept) => (
                    <div
                      key={dept}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs font-medium text-white"
                    >
                      <span>{dept}</span>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        title="Supprimer le pôle"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ══════════════════════ MODAL: ADD / EDIT PARTNER ══════════════════════ */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#1F0E18] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black font-display uppercase text-white">
                {editingPartner ? 'Modifier le Partenaire' : 'Ajouter un Partenaire'}
              </h3>
              <button
                onClick={() => setIsPartnerModalOpen(false)}
                className="p-1 text-[#F3C4A0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Nom Complet de l'Organisation *
                </label>
                <input
                  type="text"
                  required
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  placeholder="Ex: Red Bull, Orange Tunisie, ESEN Manouba..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    Nom Court (Badge)
                  </label>
                  <input
                    type="text"
                    value={partnerForm.short_name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, short_name: e.target.value })}
                    placeholder="Ex: RED BULL"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    Couleur de Marque (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={partnerForm.svg_color}
                      onChange={(e) => setPartnerForm({ ...partnerForm, svg_color: e.target.value })}
                      className="w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={partnerForm.svg_color}
                      onChange={(e) => setPartnerForm({ ...partnerForm, svg_color: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Upload via Cloudinary or URL */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Logo du Partenaire (Image Cloudinary ou URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={partnerForm.logo_url || ''}
                    onChange={(e) => setPartnerForm({ ...partnerForm, logo_url: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                  <input
                    type="file"
                    ref={partnerLogoInputRef}
                    onChange={handlePartnerLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => partnerLogoInputRef.current?.click()}
                    disabled={partnerLogoUploadLoading}
                    className="px-4 py-2 rounded-xl bg-[#3B66FF]/20 hover:bg-[#3B66FF]/30 border border-[#3B66FF]/40 text-xs font-bold text-[#93C5FD] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{partnerLogoUploadLoading ? 'Upload...' : 'Uploader'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl hover:opacity-90 cursor-pointer mt-2"
              >
                Enregistrer le Partenaire
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: ADD / EDIT STAT ══════════════════════ */}
      {isStatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#1F0E18] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-display uppercase text-white">
                {editingStatIndex !== null ? 'Modifier la Statistique' : 'Ajouter une Statistique'}
              </h3>
              <button onClick={() => setIsStatModalOpen(false)} className="p-1 text-[#F3C4A0] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Nombre / Valeur (ex: 500+)</label>
                <input
                  type="text"
                  required
                  value={statForm.number}
                  onChange={(e) => setStatForm({ ...statForm, number: e.target.value })}
                  placeholder="500+"
                  className="w-full px-4 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Libellé (ex: Membres Actifs)</label>
                <input
                  type="text"
                  required
                  value={statForm.label}
                  onChange={(e) => setStatForm({ ...statForm, label: e.target.value })}
                  placeholder="Membres"
                  className="w-full px-4 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Couleur</label>
                  <input
                    type="text"
                    value={statForm.color}
                    onChange={(e) => setStatForm({ ...statForm, color: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Icône</label>
                  <select
                    value={statForm.icon || 'Trophy'}
                    onChange={(e) => setStatForm({ ...statForm, icon: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none"
                  >
                    <option value="Trophy">Trophy (Trophée)</option>
                    <option value="Users">Users (Communauté)</option>
                    <option value="Calendar">Calendar (Date/Année)</option>
                    <option value="Heart">Heart (Passion)</option>
                    <option value="Sparkles">Sparkles (Énergie)</option>
                    <option value="Star">Star (Excellence)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl hover:opacity-90 cursor-pointer mt-2"
              >
                Enregistrer la Statistique
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: ADD / EDIT PILLAR ══════════════════════ */}
      {isPillarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#1F0E18] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black font-display uppercase text-white">
                {editingPillarIndex !== null ? 'Modifier le Pilier' : 'Ajouter un Pilier'}
              </h3>
              <button onClick={() => setIsPillarModalOpen(false)} className="p-1 text-[#F3C4A0] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePillar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Symbole Carte</label>
                  <select
                    value={pillarForm.suit}
                    onChange={(e) => setPillarForm({ ...pillarForm, suit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none"
                  >
                    <option value="♠">♠ Pique</option>
                    <option value="♥">♥ Cœur</option>
                    <option value="♦">♦ Carreau</option>
                    <option value="♣">♣ Trèfle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Nom (ex: As de Pique)</label>
                  <input
                    type="text"
                    required
                    value={pillarForm.name}
                    onChange={(e) => setPillarForm({ ...pillarForm, name: e.target.value })}
                    placeholder="As de Pique"
                    className="w-full px-3 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Titre (ex: Audace &amp; Créativité)</label>
                <input
                  type="text"
                  required
                  value={pillarForm.title}
                  onChange={(e) => setPillarForm({ ...pillarForm, title: e.target.value })}
                  placeholder="Audace &amp; Créativité"
                  className="w-full px-4 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={pillarForm.desc}
                  onChange={(e) => setPillarForm({ ...pillarForm, desc: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Couleur</label>
                <input
                  type="text"
                  value={pillarForm.color}
                  onChange={(e) => setPillarForm({ ...pillarForm, color: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl hover:opacity-90 cursor-pointer mt-2"
              >
                Enregistrer le Pilier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: ADD / EDIT EVENT ══════════════════════ */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-[#1F0E18] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black font-display uppercase text-white">
                {editingEvent ? "Modifier l'Événement" : 'Créer un Nouvel Événement'}
              </h3>
              <button onClick={() => setIsEventModalOpen(false)} className="p-1 text-[#F3C4A0] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEventModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Titre de l'Événement *</label>
                  <input
                    type="text"
                    required
                    value={eventModalForm.title}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, title: e.target.value })}
                    placeholder="Joker Carnival Night 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Édition / Sous-titre</label>
                  <input
                    type="text"
                    value={eventModalForm.edition}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, edition: e.target.value })}
                    placeholder="Édition Spéciale · 10ème Anniversaire"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Date &amp; Heure</label>
                  <input
                    type="text"
                    value={eventModalForm.date}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, date: e.target.value })}
                    placeholder="Samedi 26 Octobre 2026 · 20h00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Lieu</label>
                  <input
                    type="text"
                    value={eventModalForm.location}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, location: e.target.value })}
                    placeholder="Grand Cour &amp; Amphi ESEN, Campus Manouba"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Programme / Highlights</label>
                <textarea
                  rows={2}
                  value={eventModalForm.program}
                  onChange={(e) => setEventModalForm({ ...eventModalForm, program: e.target.value })}
                  placeholder="Concerts live · DJ set · Buffet · Tombola"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              {/* Banner Upload */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Affiche (Banner URL ou Fichier)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={eventModalForm.banner_url}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, banner_url: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                  <input
                    type="file"
                    ref={eventBannerInputRef}
                    onChange={handleEventBannerUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => eventBannerInputRef.current?.click()}
                    disabled={eventBannerUploadLoading}
                    className="px-4 py-2 rounded-xl bg-[#3B66FF]/20 hover:bg-[#3B66FF]/30 border border-[#3B66FF]/40 text-xs font-bold text-[#93C5FD] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{eventBannerUploadLoading ? 'Upload...' : 'Uploader'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-event-active"
                  checked={eventModalForm.is_active}
                  onChange={(e) => setEventModalForm({ ...eventModalForm, is_active: e.target.checked })}
                  className="w-4 h-4 accent-[#3B66FF] cursor-pointer"
                />
                <label htmlFor="modal-event-active" className="text-xs text-[#F5EDE4] font-medium cursor-pointer">
                  Définir immédiatement cet événement comme l'événement vedette actif sur la page d'accueil
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl hover:opacity-90 cursor-pointer mt-2"
              >
                Enregistrer l'Événement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: CREATE ALBUM ══════════════════════ */}
      {isAlbumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#1F0E18] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black font-display uppercase text-white">
                  Créer un Nouvel Album Photo
                </h3>
                <p className="text-xs text-[#F3C4A0]/70">
                  Créez un album thématique pour regrouper les photos de vos événements.
                </p>
              </div>
              <button onClick={() => setIsAlbumModalOpen(false)} className="p-1 text-[#F3C4A0] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {albumModalError && (
              <div className="p-3 rounded-xl bg-[#B93A34]/20 border border-[#B93A34]/40 text-xs text-rose-200">
                {albumModalError}
              </div>
            )}

            <form onSubmit={handleCreateAlbumSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Nom / Titre de l'Album *
                </label>
                <input
                  type="text"
                  required
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder="Ex: Carnival Night 2026, Workshop IA & Design..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Catégorie
                </label>
                <select
                  value={newAlbumCategory}
                  onChange={(e) => setNewAlbumCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                >
                  <option value="Soirées">Soirées &amp; Concerts</option>
                  <option value="Workshops">Workshops &amp; Formations</option>
                  <option value="Teambuilding">Teambuilding &amp; Intégration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Photo de Couverture (Optionnelle)
                </label>
                <input
                  type="file"
                  ref={albumCoverInputRef}
                  onChange={(e) => setNewAlbumCoverFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => albumCoverInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#F3C4A0]/30 hover:border-[#3B66FF] rounded-2xl p-5 text-center cursor-pointer transition-colors space-y-2 bg-[#14080F]"
                >
                  <Upload className="w-7 h-7 text-[#3B66FF] mx-auto" />
                  <p className="text-xs font-bold text-white">
                    {newAlbumCoverFile ? newAlbumCoverFile.name : "Sélectionner la photo de couverture"}
                  </p>
                  <p className="text-[10px] text-[#F3C4A0]/50">
                    PNG, JPG ou WebP téléversé directement sur Cloudinary
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3C4A0]/15">
                <button
                  type="button"
                  onClick={() => setIsAlbumModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#F3C4A0]/70 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={albumModalLoading}
                  className="px-6 py-2.5 rounded-full bg-[#4E4F9E] text-white text-xs font-bold shadow-lg hover:bg-[#4E4F9E]/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {albumModalLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Création de l'album...</span>
                    </>
                  ) : (
                    <span>Créer l'Album</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: ADD / UPLOAD PHOTOS ══════════════════════ */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#1F0E18] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black font-display uppercase text-white">
                  Ajouter des Photos
                </h3>
                <p className="text-xs text-[#F3C4A0]/70">
                  Importez des photos sur Cloudinary et synchronisez-les avec Supabase.
                </p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-1 text-[#F3C4A0] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-[#B93A34]/20 border border-[#B93A34]/40 text-xs text-rose-200">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleAddPhotoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Choisir l'Album de Destination *
                </label>
                {!isCreatingNewAlbumInUploadModal ? (
                  <div className="space-y-2">
                    <select
                      value={newPhotoAlbum}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingNewAlbumInUploadModal(true);
                          setNewCustomAlbumName('');
                        } else {
                          setNewPhotoAlbum(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                    >
                      <option value="" disabled>-- Sélectionner un album existant --</option>
                      {allAlbumNames.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                      <option value="__NEW__">➕ + Créer un nouvel album...</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={newCustomAlbumName}
                      onChange={(e) => setNewCustomAlbumName(e.target.value)}
                      placeholder="Nom du nouvel album..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#3B66FF] text-sm text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewAlbumInUploadModal(false)}
                      className="px-3 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-[#F3C4A0] hover:text-white cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Fichiers Photos (Sélection multiple possible)
                </label>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#F3C4A0]/30 hover:border-[#3B66FF] rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 bg-[#14080F]"
                >
                  <Upload className="w-8 h-8 text-[#3B66FF] mx-auto" />
                  <p className="text-xs font-bold text-white">
                    {uploadFiles.length > 0
                      ? `${uploadFiles.length} photo(s) sélectionnée(s)`
                      : 'Cliquez pour sélectionner une ou plusieurs photos'}
                  </p>
                  <p className="text-[10px] text-[#F3C4A0]/50">
                    PNG, JPG, WebP &middot; Téléversement direct sur Cloudinary
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploadProgress}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {uploadProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{uploadProgressText || 'Téléversement en cours...'}</span>
                  </>
                ) : (
                  <span>Ajouter à la Galerie</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: ADD / EDIT TEAM MEMBER ══════════════════════ */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#1F0E18] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/30 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black font-display uppercase text-white">
                {editingMember ? 'Modifier le Membre' : 'Ajouter un Membre'}
              </h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="p-1 text-[#F3C4A0] hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Nom &amp; Prénom</label>
                  <input
                    type="text"
                    required
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    placeholder="Ex: Yasmine Ben Salem"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Rôle / Titre</label>
                  <input
                    type="text"
                    required
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    placeholder="Ex: Présidente du Club"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Symbole Carte</label>
                  <select
                    value={memberForm.suit}
                    onChange={(e) => setMemberForm({ ...memberForm, suit: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  >
                    <option value="♠">♠ Pique (Présidence)</option>
                    <option value="♥">♥ Cœur (Vice-Présidence)</option>
                    <option value="♦">♦ Carreau (Secrétariat / Design)</option>
                    <option value="♣">♣ Trèfle (Trésorerie / Logistique)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">Couleur Symbole</label>
                  <select
                    value={memberForm.suitColor}
                    onChange={(e) => setMemberForm({ ...memberForm, suitColor: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  >
                    <option value="#F3C4A0">Pêche (#F3C4A0)</option>
                    <option value="#B93A34">Rouge (#B93A34)</option>
                    <option value="#4E4F9E">Indigo (#4E4F9E)</option>
                    <option value="#A66B95">Mauve (#A66B95)</option>
                  </select>
                </div>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Photo Avatar (Cloudinary ou URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={memberForm.avatar}
                    onChange={(e) => setMemberForm({ ...memberForm, avatar: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                  />
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploadLoading}
                    className="px-4 py-2 rounded-xl bg-[#3B66FF]/20 hover:bg-[#3B66FF]/30 border border-[#3B66FF]/40 text-xs font-bold text-[#93C5FD] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{avatarUploadLoading ? 'Upload...' : 'Uploader'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl hover:opacity-90 cursor-pointer mt-2"
              >
                Enregistrer le Membre
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
