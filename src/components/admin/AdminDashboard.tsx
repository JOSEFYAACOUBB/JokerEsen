import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Calendar,
  UserCheck,
  UserPlus,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Users,
  Lock,
  Mail,
  Upload,
  RefreshCw,
  AlertCircle,
  Phone,
  FolderPlus,
  Building2,
  BookOpen,
  Edit3,
  Check,
  MapPin,
  Send,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  Info,
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
import { fetchClubSettings, getCachedClubSocials, saveClubSocials } from '../../services/settingsService';
import {
  fetchAllEvents,
  getCachedAllEvents,
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
import { uploadToCloudinary } from '../../lib/cloudinary';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import {
  getBrevoConfig,
  saveBrevoConfig,
  getCachedSubscribers,
  fetchSubscribers,
  sendNewsletterBroadcast,
  generateJokerEmailTemplate,
  type NewsletterSubscriber,
} from '../../services/brevoService';
import { AdminMembersTab } from './tabs/AdminMembersTab';
import { createMemberByAdmin } from '../../services/memberService';

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
    banner_url?: string;
    access_info?: string;
    entry_info?: string;
    ambiance_info?: string;
  };
  onUpdateEvent: (data: any) => void;
  allEventsProp?: EventRecord[];
  onUpdateAllEvents?: (events: EventRecord[]) => void;
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

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToPublic,
  recruitmentOpen,
  onToggleRecruitment,
  eventData: _eventData,
  onUpdateEvent,
  allEventsProp,
  onUpdateAllEvents,
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
    'dashboard' | 'members' | 'applications' | 'partners' | 'about' | 'event' | 'team' | 'gallery' | 'settings' | 'newsletter'
  >(() => {
    const saved = localStorage.getItem('joker_admin_active_tab');
    if (
      saved &&
      ['dashboard', 'members', 'applications', 'partners', 'about', 'event', 'team', 'gallery', 'settings', 'newsletter'].includes(saved)
    ) {
      return saved as any;
    }
    return 'dashboard';
  });

  const handleTabSelect = (
    tab: 'dashboard' | 'applications' | 'partners' | 'about' | 'event' | 'team' | 'gallery' | 'settings' | 'newsletter'
  ) => {
    setActiveTab(tab);
    localStorage.setItem('joker_admin_active_tab', tab);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Rich Toast Notifications System
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Custom In-App Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirm = (config: Omit<ConfirmModalConfig, 'isOpen'>) => {
    setConfirmModal({ ...config, isOpen: true });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // ── 1. Applications Data State ──
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'contacted'>('all');
  const [appSearch, setAppSearch] = useState('');

  // ── 2. Partners Data State ──
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerSort, setPartnerSort] = useState<'order' | 'name-asc' | 'name-desc'>('order');
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerErrors, setPartnerErrors] = useState<{ name?: string; short_name?: string; svg_color?: string }>({});
  const [partnerForm, setPartnerForm] = useState<Partner>({
    name: '',
    short_name: '',
    svg_color: '#2563EB',
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
  const [statErrors, setStatErrors] = useState<{ number?: string; label?: string }>({});
  const [statForm, setStatForm] = useState<AboutStat>({
    number: '',
    label: '',
    color: '#2563EB',
    icon: 'Trophy',
  });
  const [isPillarModalOpen, setIsPillarModalOpen] = useState(false);
  const [editingPillarIndex, setEditingPillarIndex] = useState<number | null>(null);
  const [pillarErrors, setPillarErrors] = useState<{ name?: string; title?: string; desc?: string }>({});
  const [pillarForm, setPillarForm] = useState<AboutPillar>({
    id: 'spade',
    suit: '♠',
    name: '',
    title: '',
    desc: '',
    color: '#E05A52',
  });

  // ── 4. Events Data State ──
  const [allEvents, setAllEvents] = useState<EventRecord[]>(() => allEventsProp || getCachedAllEvents());
  const [eventsFilter, setEventsFilter] = useState<'all' | 'upcoming' | 'previous'>('all');
  const [eventSearch, setEventSearch] = useState('');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [eventErrors, setEventErrors] = useState<{ title?: string; edition?: string; date?: string; location?: string }>({});
  const [eventModalForm, setEventModalForm] = useState<{
    title: string;
    edition: string;
    date: string;
    location: string;
    program: string;
    banner_url: string;
    category: 'upcoming' | 'previous';
    is_active: boolean;
    ticket_available: boolean;
    include_program: boolean;
    include_access_entry: boolean;
    include_ambiance: boolean;
    access_info: string;
    entry_info: string;
    ambiance_info: string;
  }>({
    title: '',
    edition: '',
    date: '',
    location: '',
    program: '',
    banner_url: 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
    category: 'upcoming',
    is_active: true,
    ticket_available: true,
    include_program: true,
    include_access_entry: true,
    include_ambiance: true,
    access_info: 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
    entry_info: '100% Gratuite avec réservation préalable en ligne.',
    ambiance_info: 'Musique live, animations, buffet & tombola du club Joker ESEN.',
  });
  const [eventBannerUploadLoading, setEventBannerUploadLoading] = useState(false);
  const eventBannerInputRef = useRef<HTMLInputElement>(null);

  // ── 5. Form Config State ──
  const [formConfig, setFormConfig] = useState<FormConfig>(defaultFormConfig);
  const [newMajorInput, setNewMajorInput] = useState('');
  const [newDepartmentInput, setNewDepartmentInput] = useState('');

  // ── Brevo & Newsletter Config State ──
  const [brevoApiKey] = useState(() => getBrevoConfig().apiKey);
  const [brevoListId] = useState<string>(() => String(getBrevoConfig().listId || ''));
  const [brevoSenderName, setBrevoSenderName] = useState(() => getBrevoConfig().senderName || 'Club Joker ESEN');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState(() => getBrevoConfig().senderEmail || 'youssef.dj003@gmail.com');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(() => getCachedSubscribers());

  // ── Email Composer Modal State ──
  const [emailSubject, setEmailSubject] = useState('🃏 Nouvelle Soirée & Billetterie Joker ESEN !');
  const [emailTitle, setEmailTitle] = useState('Joker Carnival Night 2026');
  const [emailBadge, setEmailBadge] = useState('Événement Exclusif');
  const [emailSubtitle, setEmailSubtitle] = useState('Samedi 26 Octobre 2026 · Grand Cour ESEN');
  const [emailMessage, setEmailMessage] = useState(
    'Chers membres et étudiants de l\'ESEN,\n\nNous avons le plaisir de vous annoncer l\'ouverture officielle de la billetterie pour notre prochaine grande soirée !\n\nAu programme : concerts live, sets DJ exclusifs, animations surprises et buffet festif.\n\nRéservez votre place dès maintenant avant épuisement des quotas gratuits.'
  );
  const [emailCtaText, setEmailCtaText] = useState('Réserver mon Pass Gratuit');
  const [emailCtaUrl, setEmailCtaUrl] = useState('https://jokeresen.tn/#event');
  const [emailRecipientMode, setEmailRecipientMode] = useState<'all' | 'test'>('test');
  const [emailTestRecipient, setEmailTestRecipient] = useState(() => getBrevoConfig().senderEmail || 'youssef.dj003@gmail.com');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [emailPreviewMode, setEmailPreviewMode] = useState<'form' | 'preview'>('form');

  // ── Club Social Links State ──
  const [clubInstagram, setClubInstagram] = useState(() => getCachedClubSocials().instagram);
  const [clubFacebook, setClubFacebook] = useState(() => getCachedClubSocials().facebook);
  const [clubTiktok, setClubTiktok] = useState(() => getCachedClubSocials().tiktok);
  const [clubLinkedin, setClubLinkedin] = useState(() => getCachedClubSocials().linkedin);
  const [clubSocialsSaved, setClubSocialsSaved] = useState(false);

  // ── 6. Photos & Albums State ──
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<AlbumMeta[]>(() => getSavedAlbums());
  const [selectedAlbum, setSelectedAlbum] = useState<string>('Tous');
  const [photoSearch, setPhotoSearch] = useState('');
  
  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoAlbum, setNewPhotoAlbum] = useState('Général');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Album Modal State
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumCategory, setNewAlbumCategory] = useState<'Soirées' | 'Workshops' | 'Teambuilding'>('Soirées');
  const [newAlbumCoverFile, setNewAlbumCoverFile] = useState<File | null>(null);
  const [albumModalLoading, setAlbumModalLoading] = useState(false);
  const [albumModalError, setAlbumModalError] = useState('');
  const albumCoverInputRef = useRef<HTMLInputElement>(null);

  // ── 7. Team Member Modal State ──
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberErrors, setMemberErrors] = useState<{ name?: string; role?: string }>({});
  const [memberForm, setMemberForm] = useState<TeamMember>({
    name: '',
    role: '',
    suit: '♠',
    suitColor: '#2563EB',
    avatar: '',
    socials: { instagram: '', linkedin: '' },
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
    loadClubSettingsData();
    loadSubscribersData();
  };

  const loadSubscribersData = async () => {
    try {
      const data = await fetchSubscribers();
      setSubscribers(data);
    } catch (err) {
      console.warn('Error loading subscribers:', err);
    }
  };

  const loadClubSettingsData = async () => {
    try {
      const settings = await fetchClubSettings();
      if (settings?.social_links) {
        if (settings.social_links.instagram !== undefined) setClubInstagram(settings.social_links.instagram);
        if (settings.social_links.facebook !== undefined) setClubFacebook(settings.social_links.facebook);
        if (settings.social_links.tiktok !== undefined) setClubTiktok(settings.social_links.tiktok);
        if (settings.social_links.linkedin !== undefined) setClubLinkedin(settings.social_links.linkedin);
      }
    } catch (err) {
      console.warn('Error loading club social settings from Supabase:', err);
    }
  };

  const loadApplications = async () => {
    setLoadingApps(true);
    try {
      const data = await fetchRecruitmentApplications();
      setApplications(data);
    } catch (err) {
      console.warn('Error loading applications:', err);
      showToast('Impossible de charger les candidatures', 'error');
    } finally {
      setLoadingApps(false);
    }
  };

  const loadPartnersData = async () => {
    try {
      const data = await fetchPartners();
      setPartners(data);
    } catch (err) {
      console.warn('Error loading partners from Supabase:', err);
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
    try {
      const events = await fetchAllEvents();
      setAllEvents(events);
      if (onUpdateAllEvents) {
        onUpdateAllEvents(events);
      }
    } catch (err) {
      console.warn('Error loading events from Supabase:', err);
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
        showToast('Bienvenue dans l\'administration Joker ESEN !', 'success');
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

  // ── PARTNERS HANDLERS ──
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof partnerErrors = {};
    if (!partnerForm.name.trim()) errors.name = 'Le nom de l\'organisation est obligatoire';
    if (partnerForm.svg_color && !partnerForm.svg_color.startsWith('#')) {
      errors.svg_color = 'Le code couleur doit commencer par #';
    }

    if (Object.keys(errors).length > 0) {
      setPartnerErrors(errors);
      return;
    }
    setPartnerErrors({});

    const partnerToSave: Partner = {
      ...partnerForm,
      short_name: partnerForm.short_name.trim() || partnerForm.name.trim().toUpperCase(),
      id: editingPartner?.id || partnerForm.id || String(Date.now()),
    };

    const updated = await savePartner(partnerToSave);
    setPartners(updated);
    setIsPartnerModalOpen(false);
    setEditingPartner(null);
    showToast(`Partenaire "${partnerToSave.name}" enregistré sur Supabase !`, 'success');
  };

  const handleDeletePartner = (partner: Partner) => {
    openConfirm({
      title: 'Supprimer le partenaire ?',
      message: `Êtes-vous sûr de vouloir supprimer définitivement "${partner.name}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        const updated = await deletePartner(partner.id || '', partner.name);
        setPartners(updated);
        showToast(`Partenaire "${partner.name}" supprimé.`, 'info');
      },
    });
  };

  const handlePartnerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Le fichier dépasse la taille maximale autorisée de 5 Mo.', 'error');
      return;
    }

    setPartnerLogoUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        setPartnerForm((prev) => ({ ...prev, logo_url: res.secure_url }));
        showToast('Logo partenaire téléversé sur Cloudinary !', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur de téléversement Cloudinary.', 'error');
    } finally {
      setPartnerLogoUploadLoading(false);
    }
  };

  // ── ABOUT SECTION HANDLERS ──
  const handleSaveAboutStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAbout(true);
    try {
      const saved = await saveAboutData(aboutData);
      setAboutData(saved);
      showToast('Section "Qui Sommes-Nous" mise à jour sur Supabase !', 'success');
    } catch (err) {
      console.warn('Error saving about text:', err);
      showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSavingAbout(false);
    }
  };

  const handleSaveStat = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof statErrors = {};
    if (!statForm.number.trim()) errors.number = 'Le chiffre / valeur est obligatoire';
    if (!statForm.label.trim()) errors.label = 'Le libellé est obligatoire';

    if (Object.keys(errors).length > 0) {
      setStatErrors(errors);
      return;
    }
    setStatErrors({});

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
    showToast('Statistique enregistrée sur Supabase !', 'success');
  };

  const handleDeleteStat = (index: number) => {
    openConfirm({
      title: 'Supprimer la statistique ?',
      message: 'Voulez-vous vraiment retirer cette statistique de la page d\'accueil ?',
      confirmLabel: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        const currentStats = aboutData.stats.filter((_, i) => i !== index);
        const updatedData = { ...aboutData, stats: currentStats };
        setAboutData(updatedData);
        await saveAboutData(updatedData);
        showToast('Statistique supprimée.', 'info');
      },
    });
  };

  const handleSavePillar = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof pillarErrors = {};
    if (!pillarForm.name.trim()) errors.name = 'Le nom du pilier est obligatoire';
    if (!pillarForm.title.trim()) errors.title = 'Le titre est obligatoire';

    if (Object.keys(errors).length > 0) {
      setPillarErrors(errors);
      return;
    }
    setPillarErrors({});

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
    showToast(`Pilier "${pillarForm.name}" enregistré sur Supabase !`, 'success');
  };

  const handleDeletePillar = (index: number) => {
    openConfirm({
      title: 'Supprimer le pilier ?',
      message: 'Confirmez-vous la suppression de cette carte pilier ?',
      confirmLabel: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        const currentPillars = aboutData.pillars.filter((_, i) => i !== index);
        const updatedData = { ...aboutData, pillars: currentPillars };
        setAboutData(updatedData);
        await saveAboutData(updatedData);
        showToast('Pilier supprimé.', 'info');
      },
    });
  };

  // ── EVENTS HANDLERS ──
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof eventErrors = {};
    if (!eventModalForm.title.trim()) errors.title = 'Le titre de l\'événement est obligatoire';
    if (!eventModalForm.edition.trim()) errors.edition = 'L\'édition ou le sous-titre est obligatoire';
    if (!eventModalForm.date.trim()) errors.date = 'La date est obligatoire';
    if (!eventModalForm.location.trim()) errors.location = 'Le lieu est obligatoire';

    if (Object.keys(errors).length > 0) {
      setEventErrors(errors);
      return;
    }
    setEventErrors({});

    const eventToSave: EventRecord = {
      id: editingEvent?.id || `evt-${Date.now()}`,
      title: eventModalForm.title,
      edition: eventModalForm.edition,
      date: eventModalForm.date,
      location: eventModalForm.location,
      program: eventModalForm.program || 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.',
      banner_url: eventModalForm.banner_url || 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
      category: eventModalForm.category,
      is_active: eventModalForm.is_active,
      ticket_available: eventModalForm.ticket_available,
      show_program: eventModalForm.include_program,
      show_access_info: eventModalForm.include_access_entry,
      show_entry_info: eventModalForm.include_access_entry,
      show_ambiance_info: eventModalForm.include_ambiance,
      access_info: eventModalForm.access_info,
      entry_info: eventModalForm.entry_info,
      ambiance_info: eventModalForm.ambiance_info,
    };

    if (editingEvent) {
      await updateEventDetails(editingEvent.id, eventToSave);
      const updated = await fetchAllEvents();
      setAllEvents(updated);
      if (onUpdateAllEvents) onUpdateAllEvents(updated);
      if (eventToSave.is_active) {
        onUpdateEvent(eventToSave);
      }
      showToast(`Événement "${eventToSave.title}" mis à jour sur Supabase !`, 'success');
    } else {
      await createEvent(eventToSave);
      const updated = await fetchAllEvents();
      setAllEvents(updated);
      if (onUpdateAllEvents) onUpdateAllEvents(updated);
      if (eventToSave.is_active) {
        onUpdateEvent(eventToSave);
      }
      showToast(`Nouvel événement "${eventToSave.title}" créé et synchronisé !`, 'success');
    }

    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleMakeFeatured = async (event: EventRecord) => {
    await setActiveEvent(event.id);
    const updated = await fetchAllEvents();
    setAllEvents(updated);
    if (onUpdateAllEvents) onUpdateAllEvents(updated);
    onUpdateEvent({ ...event, is_active: true });
    showToast(`"${event.title}" est maintenant l'événement VEDETTE principal !`, 'success');
  };

  const handleDeleteEvent = (event: EventRecord) => {
    openConfirm({
      title: 'Supprimer l\'événement ?',
      message: `Supprimer définitivement "${event.title}" de Supabase ?`,
      confirmLabel: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        await deleteEvent(event.id);
        const updated = await fetchAllEvents();
        setAllEvents(updated);
        if (onUpdateAllEvents) onUpdateAllEvents(updated);
        showToast(`Événement "${event.title}" supprimé.`, 'info');
      },
    });
  };

  const handleEventBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Le fichier dépasse 10 Mo.', 'error');
      return;
    }

    setEventBannerUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        setEventModalForm((prev) => ({ ...prev, banner_url: res.secure_url }));
        showToast('Affiche téléversée avec succès sur Cloudinary CDN !', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du téléversement.', 'error');
    } finally {
      setEventBannerUploadLoading(false);
    }
  };

  // ── CANDIDATES & RECRUITMENT HANDLERS ──
  const handleStatusChange = async (
    id: string,
    status: 'pending' | 'accepted' | 'rejected' | 'contacted'
  ) => {
    await updateRecruitmentStatus(id, status);
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const labels = {
      accepted: 'Acceptée',
      rejected: 'Refusée',
      contacted: 'Contactée',
      pending: 'En attente',
    };
    showToast(`Candidature mise à jour : ${labels[status]}`, 'info');
  };

  const handleDeleteApplication = (id: string, name: string) => {
    openConfirm({
      title: 'Supprimer la candidature ?',
      message: `Confirmer la suppression définitive de la candidature de ${name} ?`,
      confirmLabel: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        await deleteRecruitmentApplication(id);
        setApplications((prev) => prev.filter((a) => a.id !== id));
        showToast('Candidature supprimée.', 'info');
      },
    });
  };

  // CSV Export
  const exportCandidatesToCSV = () => {
    if (applications.length === 0) {
      showToast('Aucune candidature à exporter.', 'warning');
      return;
    }
    const headers = ['Nom & Prénom', 'Email', 'Téléphone', 'Filière / Classe', 'Pôle / Département', 'Statut', 'Date'];
    const rows = applications.map((app) => [
      `"${app.full_name || ''}"`,
      `"${app.email || ''}"`,
      `"${app.phone || ''}"`,
      `"${app.major || ''}"`,
      `"${app.department || ''}"`,
      `"${app.status || 'pending'}"`,
      `"${app.created_at ? new Date(app.created_at).toLocaleDateString('fr-FR') : ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `candidatures_joker_esen_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${applications.length} candidatures exportées en format CSV !`, 'success');
  };

  // ── TEAM HANDLERS ──
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof memberErrors = {};
    if (!memberForm.name.trim()) errors.name = 'Le nom et prénom sont obligatoires';
    if (!memberForm.role.trim()) errors.role = 'Le rôle / poste est obligatoire';

    if (Object.keys(errors).length > 0) {
      setMemberErrors(errors);
      return;
    }
    setMemberErrors({});

    const previousName = editingMember?.name;
    const memberToSave: TeamMember = {
      ...memberForm,
      id: editingMember?.id || memberForm.id || String(Date.now()),
      avatar: memberForm.avatar || '',
      socials: {
        instagram: memberForm.socials?.instagram && memberForm.socials.instagram !== '#' ? memberForm.socials.instagram.trim() : '',
        linkedin: memberForm.socials?.linkedin && memberForm.socials.linkedin !== '#' ? memberForm.socials.linkedin.trim() : '',
      },
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
    showToast(`Membre "${memberForm.name}" enregistré sur Supabase !`, 'success');
  };

  const handleDeleteMember = (member: TeamMember) => {
    openConfirm({
      title: 'Supprimer le membre du bureau ?',
      message: `Supprimer ${member.name} du Bureau Exécutif ?`,
      confirmLabel: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        const updated = teamMembers.filter(
          (m) => (member.id ? m.id !== member.id : true) && (member.name ? m.name !== member.name : true)
        );
        onUpdateTeamMembers(updated);
        await deleteTeamMember(member.id || '', member.name, updated);
        showToast(`Membre "${member.name}" supprimé.`, 'info');
      },
    });
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        setMemberForm((prev) => ({ ...prev, avatar: res.secure_url }));
        showToast('Photo avatar téléversée sur Cloudinary !', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du téléversement de la photo.', 'error');
    } finally {
      setAvatarUploadLoading(false);
    }
  };

  // ── FORM CONFIG HANDLERS ──
  const handleAddMajor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMajorInput.trim()) return;
    if (formConfig.majors.includes(newMajorInput.trim())) {
      showToast('Cette filière existe déjà.', 'warning');
      return;
    }
    const updated = {
      ...formConfig,
      majors: [...formConfig.majors, newMajorInput.trim()],
    };
    setFormConfig(updated);
    setNewMajorInput('');
    await saveFormConfig(updated);
    showToast('Filière ajoutée !', 'success');
  };

  const handleDeleteMajor = async (major: string) => {
    const updated = {
      ...formConfig,
      majors: formConfig.majors.filter((m) => m !== major),
    };
    setFormConfig(updated);
    await saveFormConfig(updated);
    showToast('Filière supprimée.', 'info');
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentInput.trim()) return;
    if (formConfig.departments.includes(newDepartmentInput.trim())) {
      showToast('Ce pôle existe déjà.', 'warning');
      return;
    }
    const updated = {
      ...formConfig,
      departments: [...formConfig.departments, newDepartmentInput.trim()],
    };
    setFormConfig(updated);
    setNewDepartmentInput('');
    await saveFormConfig(updated);
    showToast('Pôle ajouté !', 'success');
  };

  const handleDeleteDepartment = async (dept: string) => {
    const updated = {
      ...formConfig,
      departments: formConfig.departments.filter((d) => d !== dept),
    };
    setFormConfig(updated);
    await saveFormConfig(updated);
    showToast('Pôle supprimé.', 'info');
  };

  // ── GALLERY HANDLERS ──
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumTitle.trim()) {
      setAlbumModalError('Le titre de l\'album est obligatoire');
      return;
    }

    setAlbumModalLoading(true);
    setAlbumModalError('');

    try {
      let finalCoverUrl = '';
      if (newAlbumCoverFile) {
        const uploadRes = await uploadToCloudinary(newAlbumCoverFile);
        if (uploadRes?.secure_url) {
          finalCoverUrl = uploadRes.secure_url;
        }
      }

      const newAlbum: AlbumMeta = {
        name: newAlbumTitle.trim(),
        category: newAlbumCategory,
        coverUrl: finalCoverUrl || undefined,
      };

      saveAlbumMeta(newAlbum);
      setSavedAlbums(getSavedAlbums());
      setIsAlbumModalOpen(false);
      setNewAlbumTitle('');
      setNewAlbumCoverFile(null);
      showToast(`Album "${newAlbum.name}" créé avec succès !`, 'success');
    } catch (err: any) {
      setAlbumModalError(err.message || 'Erreur lors de la création de l\'album.');
    } finally {
      setAlbumModalLoading(false);
    }
  };

  const handleDeleteAlbum = (albumName: string) => {
    openConfirm({
      title: `Supprimer l'album "${albumName}" ?`,
      message: `Êtes-vous sûr de vouloir supprimer l'album "${albumName}" et toutes ses photos associées ?`,
      confirmLabel: 'Supprimer tout',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        removeAlbumMeta(albumName);
        setSavedAlbums(getSavedAlbums());

        const toDelete = photos.filter((p) => p.album === albumName);
        for (const p of toDelete) {
          await galleryService.deleteImage(p.id.toString());
        }

        setPhotos((prev) => prev.filter((p) => p.album !== albumName));
        if (selectedAlbum === albumName) {
          setSelectedAlbum('Tous');
        }
        showToast(`Album "${albumName}" supprimé.`, 'info');
      },
    });
  };

  const handleDeletePhoto = (photo: AdminPhoto) => {
    openConfirm({
      title: 'Supprimer la photo ?',
      message: 'Voulez-vous supprimer définitivement cette photo de la galerie ?',
      confirmLabel: 'Supprimer',
      isDanger: true,
      onConfirm: async () => {
        closeConfirm();
        await galleryService.deleteImage(photo.id.toString());
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        showToast('Photo supprimée de la galerie.', 'info');
      },
    });
  };

  // Multiple files upload
  const handleUploadPhotosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      setUploadError('Veuillez sélectionner au moins une image.');
      return;
    }

    setUploadProgress(true);
    setUploadError('');

    try {
      await galleryService.uploadMultipleImages(uploadFiles, newPhotoAlbum);
      await loadPhotos();
      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setNewPhotoTitle('');
      showToast(`${uploadFiles.length} photo(s) ajoutée(s) à la galerie !`, 'success');
    } catch (err: any) {
      setUploadError(err.message || 'Erreur lors du téléversement.');
    } finally {
      setUploadProgress(false);
    }
  };

  // ── BREVO HANDLERS ──
  const handleSaveBrevoSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveBrevoConfig(
      brevoApiKey.trim(),
      brevoListId ? Number(brevoListId) : undefined,
      brevoSenderName.trim(),
      brevoSenderEmail.trim()
    );
    showToast('Configuration Brevo enregistrée localement !', 'success');
  };

  const handleSendBroadcastEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSending(true);

    try {
      const htmlContent = generateJokerEmailTemplate({
        title: emailTitle,
        badge: emailBadge,
        subtitle: emailSubtitle,
        bodyHtml: `<p>${emailMessage.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
        ctaText: emailCtaText,
        ctaUrl: emailCtaUrl,
      });

      const recipientList =
        emailRecipientMode === 'test'
          ? [emailTestRecipient]
          : subscribers.map((s) => s.email).filter(Boolean);

      const res = await sendNewsletterBroadcast({
        subject: emailSubject,
        htmlContent,
        senderName: brevoSenderName,
        senderEmail: brevoSenderEmail,
        recipients: recipientList,
      });

      setEmailSendResult(res);
      if (res.success) {
        showToast(res.message || 'Campagne e-mail envoyée avec succès !', 'success');
      } else {
        showToast(res.message || 'Erreur lors de l\'envoi de la campagne.', 'error');
      }
    } catch (err: any) {
      setEmailSendResult({ success: false, message: err.message });
      showToast(err.message, 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // ── FILTERED DATA LISTS ──
  const filteredPartners = useMemo(() => {
    return partners
      .filter((p) => {
        const q = partnerSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.short_name && p.short_name.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (partnerSort === 'name-asc') return a.name.localeCompare(b.name);
        if (partnerSort === 'name-desc') return b.name.localeCompare(a.name);
        return (a.order_index || 0) - (b.order_index || 0);
      });
  }, [partners, partnerSearch, partnerSort]);

  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        if (appFilter === 'all') return true;
        return app.status === appFilter;
      })
      .filter((app) => {
        const q = appSearch.toLowerCase();
        return (
          app.full_name.toLowerCase().includes(q) ||
          app.email.toLowerCase().includes(q) ||
          app.phone.includes(q) ||
          app.major.toLowerCase().includes(q) ||
          app.department.toLowerCase().includes(q)
        );
      });
  }, [applications, appFilter, appSearch]);

  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((evt) => {
        if (eventsFilter === 'all') return true;
        return evt.category === eventsFilter;
      })
      .filter((evt) => {
        const q = eventSearch.toLowerCase();
        return (
          evt.title.toLowerCase().includes(q) ||
          evt.edition.toLowerCase().includes(q) ||
          evt.location.toLowerCase().includes(q)
        );
      });
  }, [allEvents, eventsFilter, eventSearch]);

  const allAlbumNames = useMemo(() => {
    const fromMeta = savedAlbums.map((a) => a.name);
    const fromPhotos = photos.map((p) => p.album).filter((a) => a && a !== 'Général');
    return Array.from(new Set(['Général', ...fromMeta, ...fromPhotos]));
  }, [savedAlbums, photos]);

  const filteredPhotos = useMemo(() => {
    return photos
      .filter((p) => {
        if (selectedAlbum === 'Tous') return true;
        return p.album === selectedAlbum;
      })
      .filter((p) => {
        const q = photoSearch.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.album.toLowerCase().includes(q);
      });
  }, [photos, selectedAlbum, photoSearch]);

  // IF NOT AUTHENTICATED -> SHOW LOGIN
  if (!isAuthenticated) {
    return (
      <div data-admin-panel className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-[#0B2545] to-blue-950">
        <div className="w-full max-w-md bg-white rounded-3xl border border-blue-100 shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center p-1">
              <img
                src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                alt="Joker ESEN"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-blue-900 font-sans">
              Administration Joker ESEN
            </h1>
            <p className="text-xs text-slate-500">
              Espace de gestion connecté à Supabase BaaS et Cloudinary CDN.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl flex items-start gap-2.5 text-xs bg-red-500/15 border border-rose-500/30 text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-blue-900">
                Adresse E-mail Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@jokeresen.tn"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-blue-100 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-900">
                  Mot de Passe
                </label>
                <span className="text-[10px] text-slate-400">Défaut: joker2026</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-blue-100 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-6 rounded-xl text-white font-bold text-sm uppercase bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-between cursor-pointer shadow-lg shadow-blue-600/30 active:scale-98"
            >
              <span>{loginLoading ? 'Connexion en cours...' : 'Accéder au Dashboard'}</span>
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">
                &rarr;
              </span>
            </button>
          </form>

          <button
            onClick={onBackToPublic}
            className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
          >
            &larr; Retour au site public
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // MAIN ADMIN DASHBOARD UI
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div data-admin-panel className="min-h-screen flex bg-[#EFF6FF] text-slate-900 antialiased">
      {/* Toast Notification Stack */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3.5 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-in slide-in-from-top-3 ${
              toast.type === 'success'
                ? 'bg-blue-700 border-blue-500 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 border-red-400 text-white'
                : toast.type === 'warning'
                ? 'bg-blue-500 border-blue-400 text-white'
                : 'bg-white border-blue-200 text-blue-900 shadow-blue-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-white shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-white shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-blue-100 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-blue-900/20 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  confirmModal.isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-blue-900 font-sans uppercase tracking-tight">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-100">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                {confirmModal.cancelLabel || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer transition-all ${
                  confirmModal.isDanger
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                }`}
              >
                {confirmModal.confirmLabel || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay on Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between bg-white border-r border-slate-200/80 p-5 shrink-0 shadow-xs lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Sidebar Logo Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 p-1 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-xs">
                <img
                  src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                  alt="Joker ESEN"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: "Home", icon: LayoutDashboard },
              { id: 'applications', label: 'Candidatures', icon: UserCheck, badge: applications.filter((a) => a.status === 'pending').length },
              { id: 'partners', label: 'Partenaires', icon: Building2, badge: partners.length },
              { id: 'about', label: 'Qui Sommes-Nous', icon: BookOpen },
              { id: 'event', label: 'Événements', icon: Calendar, badge: allEvents.length },
              { id: 'team', label: 'Équipe Exécutive', icon: Users, badge: teamMembers.length },
              { id: 'gallery', label: 'Galerie Photos', icon: ImageIcon, badge: photos.length },
              { id: 'newsletter', label: 'Newsletter Brevo', icon: Mail, badge: subscribers.length },
              { id: 'settings', label: 'Paramètres', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleTabSelect(tab.id as any);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600'
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

        {/* Sidebar Footer Actions */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <button
            onClick={onBackToPublic}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Site Public</span>
            </span>
            <span className="text-[10px] text-slate-400">&rarr;</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-rose-50 border border-rose-200/60 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-700 shrink-0" />
            <span className="text-rose-700 font-bold">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8F9FA]">
        {/* Top Header Navbar */}
        <header className="h-16 px-6 sm:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content View */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-[#F8F9FA]">
          {/* TAB: MEMBERS MANAGEMENT */}
          {activeTab === 'members' && <AdminMembersTab onShowToast={showToast} />}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div
                  onClick={() => handleTabSelect('partners')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/70 space-y-3 cursor-pointer hover:border-slate-300 transition-all hover:-translate-y-0.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Partenaires</span>
                    <Building2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 font-sans">
                    {partners.length}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">Organisations officielles</p>
                </div>

                <div
                  onClick={() => handleTabSelect('event')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/70 space-y-3 cursor-pointer hover:border-slate-300 transition-all hover:-translate-y-0.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Événements</span>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 font-sans">
                    {allEvents.length}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">Actifs et archivés</p>
                </div>

                <div
                  onClick={() => handleTabSelect('applications')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/70 space-y-3 cursor-pointer hover:border-slate-300 transition-all hover:-translate-y-0.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Candidatures</span>
                    <UserCheck className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 font-sans">
                    {applications.length}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {applications.filter((a) => a.status === 'pending').length} en attente
                  </p>
                </div>

                <div
                  onClick={() => handleTabSelect('team')}
                  className="p-6 rounded-3xl bg-white border border-slate-200/70 space-y-3 cursor-pointer hover:border-slate-300 transition-all hover:-translate-y-0.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Bureau Exécutif</span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 font-sans">
                    {teamMembers.length}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">Membres officiels</p>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-5 shadow-xs">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">
                    Action Rapide
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      setEditingPartner(null);
                      setPartnerForm({ name: '', short_name: '', svg_color: '#2563EB', logo_url: '', order_index: partners.length + 1 });
                      setIsPartnerModalOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-left transition-all cursor-pointer space-y-1"
                  >
                    <p className="text-xs font-bold text-slate-800">+ Ajouter un Partenaire</p>
                    <p className="text-[11px] text-slate-400">Logo Cloudinary &amp; nom d'organisation</p>
                  </button>

                  <button
                    onClick={() => handleTabSelect('about')}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-left transition-all cursor-pointer space-y-1"
                  >
                    <p className="text-xs font-bold text-slate-800">Modifier Qui Sommes-Nous</p>
                    <p className="text-[11px] text-slate-400">Histoire, statistiques et 4 As</p>
                  </button>

                  <button
                    onClick={() => handleTabSelect('settings')}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-left transition-all cursor-pointer space-y-1"
                  >
                    <p className="text-xs font-bold text-slate-800">Champs du Formulaire</p>
                    <p className="text-[11px] text-slate-400">Filières, pôles &amp; réseaux sociaux</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTNERS & LOGOS */}
          {activeTab === 'partners' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                    Partenaires ({partners.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Logos affichés dans la bannière partenaires du site public.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingPartner(null);
                    setPartnerForm({ name: '', short_name: '', svg_color: '#2563EB', logo_url: '', order_index: partners.length + 1 });
                    setPartnerErrors({});
                    setIsPartnerModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un Partenaire</span>
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    placeholder="Rechercher un partenaire..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-xs text-slate-500 font-medium">Trier par :</span>
                  <select
                    value={partnerSort}
                    onChange={(e) => setPartnerSort(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="order">Ordre d'affichage</option>
                    <option value="name-asc">Nom (A &rarr; Z)</option>
                    <option value="name-desc">Nom (Z &rarr; A)</option>
                  </select>
                </div>
              </div>

              {/* Partners Table */}
              <div className="rounded-3xl bg-white border border-slate-200/70 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="p-4">Logo / Icône</th>
                        <th className="p-4">Nom Complet</th>
                        <th className="p-4">Nom Court / Badge</th>
                        <th className="p-4">Couleur de Marque</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredPartners.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            Aucun partenaire trouvé. Cliquez sur "Ajouter un Partenaire" pour commencer.
                          </td>
                        </tr>
                      ) : (
                        filteredPartners.map((partner) => (
                          <tr key={partner.id || partner.name} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4">
                              {partner.logo_url ? (
                                <img
                                  src={partner.logo_url}
                                  alt={partner.name}
                                  className="w-10 h-10 object-contain rounded-xl bg-slate-50 p-1 border border-slate-200/60"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base"
                                  style={{ backgroundColor: `${partner.svg_color}20`, color: partner.svg_color }}
                                >
                                  {partner.short_name?.charAt(0) || '♠'}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-bold text-slate-900">{partner.name}</td>
                            <td className="p-4">
                              <span
                                className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider"
                                style={{ backgroundColor: `${partner.svg_color}20`, color: partner.svg_color }}
                              >
                                {partner.short_name || partner.name}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-600">
                              <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: partner.svg_color }} />
                                <span>{partner.svg_color}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPartner(partner);
                                    setPartnerForm(partner);
                                    setPartnerErrors({});
                                    setIsPartnerModalOpen(true);
                                  }}
                                  className="min-w-[34px] min-h-[34px] p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  title="Modifier le partenaire"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePartner(partner)}
                                  className="min-w-[34px] min-h-[34px] p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                  title="Supprimer le partenaire"
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

          {/* TAB 3: ABOUT SECTION */}
          {activeTab === 'about' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                  Section 01 · Qui Sommes-Nous — Édition Supabase
                </h2>
                <p className="text-xs text-slate-500">
                  Modifiez les textes narratifs, les 4 statistiques de l'ESEN et les cartes des 4 As (Pique, Cœur, Carreau, Trèfle).
                </p>
              </div>

              {/* Story & Narrative Card */}
              <form onSubmit={handleSaveAboutStory} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                    Histoire &amp; Textes de Présentation
                  </h3>
                  <button
                    type="submit"
                    disabled={savingAbout}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    {savingAbout ? 'Enregistrement...' : 'Enregistrer les Textes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Badge Section
                    </label>
                    <input
                      type="text"
                      value={aboutData.badge}
                      onChange={(e) => setAboutData({ ...aboutData, badge: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Année de Fondation
                    </label>
                    <input
                      type="text"
                      value={aboutData.founded_year}
                      onChange={(e) => setAboutData({ ...aboutData, founded_year: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Titre Préfixe *
                    </label>
                    <input
                      type="text"
                      value={aboutData.title_prefix}
                      onChange={(e) => setAboutData({ ...aboutData, title_prefix: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Titre Highlight (Dégradé)
                    </label>
                    <input
                      type="text"
                      value={aboutData.title_highlight}
                      onChange={(e) => setAboutData({ ...aboutData, title_highlight: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Titre d'Accroche (Story Heading)
                    </label>
                    <input
                      type="text"
                      value={aboutData.story_heading}
                      onChange={(e) => setAboutData({ ...aboutData, story_heading: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Lieu Campus
                    </label>
                    <input
                      type="text"
                      value={aboutData.story_location}
                      onChange={(e) => setAboutData({ ...aboutData, story_location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Texte de l'Histoire du Club
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {aboutData.story_text?.length || 0} caractères
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={aboutData.story_text}
                    onChange={(e) => setAboutData({ ...aboutData, story_text: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400 leading-relaxed"
                  />
                </div>
              </form>

              {/* Stats & Numbers Grid */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                      Statistiques Clés ({aboutData.stats?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-500">Affichées dans les cartes de la section 01.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingStatIndex(null);
                      setStatForm({ number: '', label: '', color: '#2563EB', icon: 'Trophy' });
                      setStatErrors({});
                      setIsStatModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Statistique</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {aboutData.stats?.map((stat, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-slate-200/70 flex flex-col justify-between space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black font-sans" style={{ color: stat.color }}>
                          {stat.number}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingStatIndex(idx);
                              setStatForm(stat);
                              setStatErrors({});
                              setIsStatModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStat(idx)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-bold uppercase">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pillars / 4 As Grid */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                      Les 4 Piliers &amp; Symboles de Cartes ({aboutData.pillars?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-500">Valeurs fondamentales représentées par les 4 enseignes.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPillarIndex(null);
                      setPillarForm({ id: `pillar-${Date.now()}`, suit: '♠', name: '', title: '', desc: '', color: '#E05A52' });
                      setPillarErrors({});
                      setIsPillarModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Pilier</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {aboutData.pillars?.map((pillar, idx) => (
                    <div
                      key={pillar.id || idx}
                      className="p-5 rounded-2xl bg-white border border-slate-200/70 flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-black" style={{ color: pillar.color }}>
                          {pillar.suit}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPillarIndex(idx);
                              setPillarForm(pillar);
                              setPillarErrors({});
                              setIsPillarModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePillar(idx)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-slate-900"
                          style={{ backgroundColor: `${pillar.color}20`, border: `1px solid ${pillar.color}60` }}
                        >
                          {pillar.name}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-1.5">{pillar.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pillar.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EVENTS MANAGEMENT */}
          {activeTab === 'event' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                    Gestion des Événements &amp; Affiches ({allEvents.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gérez l'affiche vedette active, planifiez vos événements à venir, ou ajoutez et modifiez les archives des anciennes éditions du club Joker.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingEvent(null);
                      setEventModalForm({
                        title: '',
                        edition: '',
                        date: '',
                        location: '',
                        program: '',
                        banner_url: 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
                        category: 'previous',
                        is_active: false,
                        ticket_available: false,
                        include_program: true,
                        include_access_entry: false,
                        include_ambiance: false,
                        access_info: '',
                        entry_info: '',
                        ambiance_info: '',
                      });
                      setEventErrors({});
                      setIsEventModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                    <span>Ajouter une Archive / Passée</span>
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
                        banner_url: 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
                        category: 'upcoming',
                        is_active: false,
                        ticket_available: true,
                        include_program: true,
                        include_access_entry: true,
                        include_ambiance: true,
                        access_info: 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
                        entry_info: '100% Gratuite avec réservation préalable en ligne.',
                        ambiance_info: 'Musique live, animations, buffet & tombola du club Joker ESEN.',
                      });
                      setEventErrors({});
                      setIsEventModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-white shrink-0" />
                    <span className="text-white font-bold">Créer un Événement à Venir</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setEventsFilter('all')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                      eventsFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={eventsFilter === 'all' ? 'text-white' : 'text-slate-600'}>Tous ({allEvents.length})</span>
                  </button>
                  <button
                    onClick={() => setEventsFilter('upcoming')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                      eventsFilter === 'upcoming'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={eventsFilter === 'upcoming' ? 'text-white' : 'text-slate-600'}>À Venir &amp; Vedette ({allEvents.filter((e) => e.category === 'upcoming' || e.is_active).length})</span>
                  </button>
                  <button
                    onClick={() => setEventsFilter('previous')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                      eventsFilter === 'previous'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={eventsFilter === 'previous' ? 'text-white' : 'text-slate-600'}>Archives &amp; Passées ({allEvents.filter((e) => e.category === 'previous' && !e.is_active).length})</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder="Rechercher un événement..."
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Events Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-5 rounded-3xl bg-white border flex flex-col justify-between space-y-4 shadow-xs relative overflow-hidden transition-all ${
                      event.is_active
                        ? 'border-slate-900 ring-2 ring-slate-900/10'
                        : 'border-slate-200/70'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80">
                        <img
                          src={event.banner_url || 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg'}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                        
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {event.is_active ? (
                            <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              VEDETTE ACTIVE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-white/90 text-slate-800 text-[10px] font-bold uppercase border border-slate-200 shadow-xs">
                              {event.category === 'upcoming' ? 'À Venir (Calendrier)' : 'Archive / Passée'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                          {event.edition}
                        </p>
                        <h3 className="text-base font-bold text-slate-900 font-sans uppercase line-clamp-1 mt-0.5">
                          {event.title}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.date}</span>
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{event.location}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {!event.is_active ? (
                        <button
                          onClick={() => handleMakeFeatured(event)}
                          className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                        >
                          Placer en Vedette
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Affiché en tête</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingEvent(event);
                            setEventModalForm({
                              title: event.title,
                              edition: event.edition,
                              date: event.date,
                              location: event.location,
                              program: event.program,
                              banner_url: event.banner_url,
                              category: event.category || (event.is_active ? 'upcoming' : 'previous'),
                              is_active: event.is_active,
                              ticket_available: event.ticket_available !== false,
                              include_program: event.show_program !== false,
                              include_access_entry: event.show_access_info !== false,
                              include_ambiance: event.show_ambiance_info !== false,
                              access_info: event.access_info || 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
                              entry_info: event.entry_info || '100% Gratuite avec réservation préalable en ligne.',
                              ambiance_info: event.ambiance_info || 'Musique live, animations, buffet & tombola du club Joker ESEN.',
                            });
                            setEventErrors({});
                            setIsEventModalOpen(true);
                          }}
                          className="min-w-[34px] min-h-[34px] p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Modifier l'événement"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="min-w-[34px] min-h-[34px] p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Supprimer l'événement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CANDIDATES & APPLICATIONS */}
          {activeTab === 'applications' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                    Candidatures &amp; Inscriptions ({applications.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Demandes d'adhésion enregistrées via le formulaire d'inscription.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={exportCandidatesToCSV}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Exporter CSV</span>
                  </button>
                  <button
                    onClick={() => loadApplications()}
                    disabled={loadingApps}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingApps ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  {(['all', 'pending', 'accepted', 'rejected', 'contacted'] as const).map((filter) => {
                    const count = filter === 'all' ? applications.length : applications.filter((a) => a.status === filter).length;
                    const labels = {
                      all: 'Toutes',
                      pending: 'En Attente',
                      accepted: 'Acceptées',
                      rejected: 'Refusées',
                      contacted: 'Contactées',
                    };
                    return (
                      <button
                        key={filter}
                        onClick={() => setAppFilter(filter)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          appFilter === filter
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {labels[filter]} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="Rechercher par nom, filière..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Candidates Table */}
              <div className="rounded-3xl bg-white border border-slate-200/70 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="p-4">Candidat</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Filière / Classe</th>
                        <th className="p-4">Pôle / Département</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredApplications.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            Aucune candidature ne correspond aux critères sélectionnés.
                          </td>
                        </tr>
                      ) : (
                        filteredApplications.map((app) => (
                          <tr key={app.id || app.email} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-slate-900 text-sm">{app.full_name}</p>
                              {app.motivation && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
                                  "{app.motivation}"
                                </p>
                              )}
                            </td>
                            <td className="p-4 space-y-1">
                              <p className="flex items-center gap-1.5 text-xs text-slate-700">
                                <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <a href={`mailto:${app.email}`} className="hover:underline font-medium">
                                  {app.email}
                                </a>
                              </p>
                              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <a href={`tel:${app.phone}`} className="hover:underline">
                                  {app.phone}
                                </a>
                              </p>
                            </td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                                {app.major}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/60 text-xs font-semibold">
                                {app.department}
                              </span>
                            </td>
                            <td className="p-4">
                              <select
                                value={app.status || 'pending'}
                                onChange={(e) => handleStatusChange(app.id!, e.target.value as any)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold outline-none cursor-pointer border ${
                                  app.status === 'accepted'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : app.status === 'rejected'
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : app.status === 'contacted'
                                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}
                              >
                                <option value="pending">⏳ En attente</option>
                                <option value="accepted">✅ Accepté</option>
                                <option value="contacted">📞 Contacté</option>
                                <option value="rejected">❌ Refusé</option>
                              </select>
                            </td>
                            <td className="p-4 text-right flex items-center justify-end gap-1">
                              {app.status === 'accepted' && (
                                <button
                                  onClick={() => {
                                    const appRecord = app as Record<string, any>;
                                    createMemberByAdmin({
                                      full_name: app.full_name,
                                      email: app.email,
                                      cin: appRecord.cin || '09001122',
                                      phone: app.phone || '22 000 000',
                                      major: app.major || 'Licence Business Computing (LBC)',
                                      department: app.department || 'Développement Web & IA',
                                      role: 'member',
                                      bio: app.motivation || 'Membre accepté via recrutement.',
                                    });
                                    showToast(`Compte membre généré pour ${app.full_name} !`, 'success');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Générer compte membre"
                                >
                                  <UserPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Créer Membre</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteApplication(app.id!, app.full_name)}
                                className="min-w-[34px] min-h-[34px] p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
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

          {/* TAB 6: BUREAU EXECUTIF */}
          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                    Bureau Exécutif ({teamMembers.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Membres officiels affichés dans la section Équipe.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingMember(null);
                    setMemberForm({
                      name: '',
                      role: '',
                      suit: '♠',
                      suitColor: '#2563EB',
                      avatar: '',
                      socials: { instagram: '', linkedin: '' },
                    });
                    setMemberErrors({});
                    setIsMemberModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un Membre</span>
                </button>
              </div>

              {/* Team Members Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {teamMembers.map((member) => (
                  <div
                    key={member.id || member.name}
                    className="p-5 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-13 h-13 rounded-2xl object-cover border border-slate-200/80 shadow-xs"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center text-slate-700 font-bold text-lg">
                          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: member.suitColor }} className="text-base font-black shrink-0">
                            {member.suit}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {member.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setMemberForm({
                            ...member,
                            socials: {
                              instagram: member.socials?.instagram && member.socials.instagram !== '#' ? member.socials.instagram : '',
                              linkedin: member.socials?.linkedin && member.socials.linkedin !== '#' ? member.socials.linkedin : '',
                            },
                          });
                          setMemberErrors({});
                          setIsMemberModalOpen(true);
                        }}
                        className="text-blue-900 font-bold hover:underline cursor-pointer"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="min-w-[32px] min-h-[32px] p-1.5 rounded-lg bg-blue-800/40 hover:bg-blue-700/60 text-blue-200 cursor-pointer"
                        title={`Supprimer ${member.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: PHOTO GALLERY & CLOUDINARY */}
          {activeTab === 'gallery' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                    Galerie Photos &amp; Cloudinary CDN ({photos.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Albums thématiques et photos hébergées avec métadonnées enregistrées dans Supabase.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setNewAlbumTitle('');
                      setAlbumModalError('');
                      setIsAlbumModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FolderPlus className="w-4 h-4 text-slate-600" />
                    <span>Créer un Album</span>
                  </button>

                  <button
                    onClick={() => {
                      setUploadFiles([]);
                      setNewPhotoTitle('');
                      setUploadError('');
                      setIsUploadModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Ajouter des Photos</span>
                  </button>
                </div>
              </div>

              {/* Album filter tabs and search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedAlbum('Tous')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                      selectedAlbum === 'Tous'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tous ({photos.length})
                  </button>
                  {allAlbumNames.map((albumName) => (
                    <div key={albumName} className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedAlbum(albumName)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
                          selectedAlbum === albumName
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {albumName} ({photos.filter((p) => p.album === albumName).length})
                      </button>
                      {selectedAlbum === albumName && albumName !== 'Général' && (
                        <button
                          onClick={() => handleDeleteAlbum(albumName)}
                          className="p-1 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors cursor-pointer"
                          title={`Supprimer l'album ${albumName}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={photoSearch}
                    onChange={(e) => setPhotoSearch(e.target.value)}
                    placeholder="Rechercher une photo..."
                    className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70 shadow-xs"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white cursor-pointer transition-colors shadow-xs"
                          title="Supprimer la photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-white font-bold truncate">{photo.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: NEWSLETTER BROADCAST (BREVO) */}
          {activeTab === 'newsletter' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                  Diffusion Newsletter &amp; Emailing (Brevo API)
                </h2>
                <p className="text-xs text-slate-500">
                  Composez et diffusez des annonces exclusives directement à tous les abonnés de la newsletter Joker ESEN via Brevo.
                </p>
              </div>

              {/* Brevo Settings Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                      Configuration Expéditeur &amp; Envoi Brevo
                    </h3>
                    <p className="text-xs text-slate-500">
                      Clé API &amp; SMTP sécurisés via le serveur. Configurez l'expéditeur affiché aux abonnés.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>API &amp; SMTP Actifs</span>
                  </div>
                </div>

                <form onSubmit={handleSaveBrevoSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Nom de l'Expéditeur
                    </label>
                    <input
                      type="text"
                      value={brevoSenderName}
                      onChange={(e) => setBrevoSenderName(e.target.value)}
                      placeholder="Club Joker ESEN"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Email de l'Expéditeur (Vérifié Brevo)
                    </label>
                    <input
                      type="email"
                      value={brevoSenderEmail}
                      onChange={(e) => setBrevoSenderEmail(e.target.value)}
                      placeholder="youssef.dj003@gmail.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between pt-2">
                    <p className="text-[11px] text-slate-400">
                      * Les identifiants API sont chargés de façon sécurisée via <code>.env.local</code>.
                    </p>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <span className="text-white font-bold">Enregistrer l'Expéditeur</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Compose Newsletter Broadcast Card */}
              <form onSubmit={handleSendBroadcastEmail} className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                      Composer une Annonce E-mail
                    </h3>
                    <p className="text-xs text-slate-500">
                      Génération d'email aux couleurs du club Joker avec bouton d'action.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEmailPreviewMode(emailPreviewMode === 'form' ? 'preview' : 'form')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>{emailPreviewMode === 'form' ? 'Aperçu Rendu' : 'Mode Édition'}</span>
                    </button>
                  </div>
                </div>

                {emailSendResult && (
                  <div
                    className={`p-3.5 rounded-2xl flex items-start gap-2.5 text-xs ${
                      emailSendResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {emailSendResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{emailSendResult.message}</span>
                  </div>
                )}

                {emailPreviewMode === 'form' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Objet du Message (Sujet) *
                        </label>
                        <input
                          type="text"
                          required
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Titre d'En-tête dans l'E-mail
                        </label>
                        <input
                          type="text"
                          value={emailTitle}
                          onChange={(e) => setEmailTitle(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Badge / Catégorie
                        </label>
                        <input
                          type="text"
                          value={emailBadge}
                          onChange={(e) => setEmailBadge(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Sous-titre / Date
                        </label>
                        <input
                          type="text"
                          value={emailSubtitle}
                          onChange={(e) => setEmailSubtitle(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Corps du Message (Texte de l'Email)
                      </label>
                      <textarea
                        rows={5}
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400 leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Libellé du Bouton (CTA)
                        </label>
                        <input
                          type="text"
                          value={emailCtaText}
                          onChange={(e) => setEmailCtaText(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                          Lien de Redirection (URL)
                        </label>
                        <input
                          type="url"
                          value={emailCtaUrl}
                          onChange={(e) => setEmailCtaUrl(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                        />
                      </div>
                    </div>

                    {/* Recipient Mode */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <label className="block text-xs font-bold uppercase text-slate-700">
                        Mode d'Envoi
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientMode"
                            checked={emailRecipientMode === 'test'}
                            onChange={() => setEmailRecipientMode('test')}
                            className="text-slate-900 focus:ring-slate-900"
                          />
                          <span>E-mail de Test Unique</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="recipientMode"
                            checked={emailRecipientMode === 'all'}
                            onChange={() => setEmailRecipientMode('all')}
                            className="text-slate-900 focus:ring-slate-900"
                          />
                          <span>Tous les Abonnés ({subscribers.length})</span>
                        </label>
                      </div>

                      {emailRecipientMode === 'test' && (
                        <div>
                          <input
                            type="email"
                            value={emailTestRecipient}
                            onChange={(e) => setEmailTestRecipient(e.target.value)}
                            placeholder="votre-email@gmail.com"
                            className="w-full sm:w-80 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-slate-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Preview HTML Frame */
                  <div className="p-4 rounded-2xl bg-white text-black overflow-hidden shadow-inner border border-slate-200">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateJokerEmailTemplate({
                          title: emailTitle,
                          badge: emailBadge,
                          subtitle: emailSubtitle,
                          bodyHtml: `<p>${emailMessage.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
                          ctaText: emailCtaText,
                          ctaUrl: emailCtaUrl,
                        }),
                      }}
                    />
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={emailSending}
                    className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Send className={`w-4 h-4 ${emailSending ? 'animate-ping' : ''}`} />
                    <span>{emailSending ? 'Envoi en cours...' : 'Diffuser la Campagne E-mail'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 9: SETTINGS & RECRUITMENT FORM */}
          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                  Paramètres &amp; Formulaire de Recrutement
                </h2>
                <p className="text-xs text-slate-500">
                  Gérez les filières ESEN, les pôles/départements disponibles lors des inscriptions, les réseaux sociaux officiels et le statut global des adhésions.
                </p>
              </div>

              {/* Recruitment Status Toggle */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                      Statut des Recrutements en Ligne
                    </h3>
                    <p className="text-xs text-slate-500">
                      Activer ou suspendre le formulaire de candidature sur la page d'accueil.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !recruitmentOpen;
                      onToggleRecruitment(next);
                      showToast(next ? 'Recrutements OUVERTS (Formulaire actif sur le site)' : 'Recrutements SUSPENDUS', 'info');
                    }}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs ${
                      recruitmentOpen
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    <span className="text-white font-bold">{recruitmentOpen ? '✅ RECRUTEMENT OUVERT (ACTIF)' : '🔒 RECRUTEMENT SUSPENDU'}</span>
                  </button>
                </div>
              </div>

              {/* Majors & Programs Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                    Filières &amp; Classes Disponibles ({formConfig.majors.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Options proposées aux étudiants lors de leur inscription au club Joker ESEN.
                  </p>
                </div>

                <form onSubmit={handleAddMajor} className="flex gap-2">
                  <input
                    type="text"
                    value={newMajorInput}
                    onChange={(e) => setNewMajorInput(e.target.value)}
                    placeholder="Ex: Master Big Data & IA, L1 BIS..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shadow-xs"
                  >
                    + Ajouter Filière
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {formConfig.majors.map((major) => (
                    <span
                      key={major}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium flex items-center gap-2"
                    >
                      <span>{major}</span>
                      <button
                        onClick={() => handleDeleteMajor(major)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Departments / Poles Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                    Pôles &amp; Départements de Recrutement ({formConfig.departments.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Équipes du club que les candidats peuvent choisir de rejoindre.
                  </p>
                </div>

                <form onSubmit={handleAddDepartment} className="flex gap-2">
                  <input
                    type="text"
                    value={newDepartmentInput}
                    onChange={(e) => setNewDepartmentInput(e.target.value)}
                    placeholder="Ex: Pôle Multimédia & Vidéo..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shadow-xs"
                  >
                    + Ajouter Pôle
                  </button>
                </form>

                <div className="flex flex-wrap gap-2 pt-2">
                  {formConfig.departments.map((dept) => (
                    <span
                      key={dept}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200/60 text-xs text-sky-800 font-semibold flex items-center gap-2"
                    >
                      <span>{dept}</span>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Infrastructure & Data Sync Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                    Infrastructure &amp; Synchronisation Manuelle
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gestion du rafraîchissement des données et statut de la base Supabase.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      loadAllData();
                      showToast('Données synchronisées avec succès !', 'success');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-200/80"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                    <span>Synchroniser les données</span>
                  </button>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Supabase BaaS Actif</span>
                  </div>
                </div>
              </div>

              {/* Club Social Media Links */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/70 space-y-4 shadow-xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900 uppercase font-sans">
                    Réseaux Sociaux Officiels du Club
                  </h3>
                  <p className="text-xs text-slate-500">
                    Liens utilisés dans le Footer et en redirection automatique pour les membres du bureau.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Instagram (URL)
                    </label>
                    <input
                      type="url"
                      value={clubInstagram}
                      onChange={(e) => setClubInstagram(e.target.value)}
                      placeholder="https://www.instagram.com/joker_esen/"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Facebook (URL)
                    </label>
                    <input
                      type="url"
                      value={clubFacebook}
                      onChange={(e) => setClubFacebook(e.target.value)}
                      placeholder="https://www.facebook.com/joker.esen"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      TikTok (URL)
                    </label>
                    <input
                      type="url"
                      value={clubTiktok}
                      onChange={(e) => setClubTiktok(e.target.value)}
                      placeholder="https://www.tiktok.com/@joker.esen"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      LinkedIn (URL)
                    </label>
                    <input
                      type="url"
                      value={clubLinkedin}
                      onChange={(e) => setClubLinkedin(e.target.value)}
                      placeholder="https://www.linkedin.com/company/jokeresen/"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await saveClubSocials({
                        instagram: clubInstagram,
                        facebook: clubFacebook,
                        tiktok: clubTiktok,
                        linkedin: clubLinkedin,
                      });
                      setClubSocialsSaved(true);
                      showToast('Liens réseaux sociaux enregistrés sur Supabase !', 'success');
                      setTimeout(() => setClubSocialsSaved(false), 3000);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center gap-2"
                  >
                    {clubSocialsSaved ? <Check className="w-4 h-4" /> : null}
                    <span>{clubSocialsSaved ? 'Enregistré sur Supabase !' : 'Enregistrer sur Supabase'}</span>
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Synchronisé automatiquement avec la base de données Supabase.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODALS SECTION ── */}

      {/* MODAL 1: ADD / EDIT PARTNER */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-sans text-slate-900">
                  {editingPartner ? 'Modifier le Partenaire' : 'Ajouter un Partenaire'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">* Champs obligatoires indiqués par un astérisque</p>
              </div>
              <button
                onClick={() => setIsPartnerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nom Complet de l'Organisation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={partnerForm.name}
                  onChange={(e) => {
                    setPartnerForm({ ...partnerForm, name: e.target.value });
                    if (partnerErrors.name) setPartnerErrors({ ...partnerErrors, name: undefined });
                  }}
                  placeholder="Ex: Red Bull, Orange Tunisie, ESEN..."
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                    partnerErrors.name ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                  }`}
                />
                {partnerErrors.name && (
                  <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{partnerErrors.name}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Nom Court (Badge)
                  </label>
                  <input
                    type="text"
                    value={partnerForm.short_name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, short_name: e.target.value })}
                    placeholder="Ex: RED BULL"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Couleur de Marque
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
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Upload via Cloudinary or URL */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Logo du Partenaire (JPG, PNG, SVG · Max 5 Mo)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={partnerForm.logo_url || ''}
                    onChange={(e) => setPartnerForm({ ...partnerForm, logo_url: e.target.value })}
                    placeholder="URL de l'image..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
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
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{partnerLogoUploadLoading ? 'Upload...' : 'Uploader'}</span>
                  </button>
                </div>

                {partnerForm.logo_url && (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
                    <img
                      src={partnerForm.logo_url}
                      alt="Aperçu"
                      className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-slate-200"
                    />
                    <span className="text-[11px] text-slate-500 truncate flex-1">
                      Aperçu du logo chargé
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enregistrer le Partenaire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT TEAM MEMBER */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-sans text-slate-900">
                  {editingMember ? 'Modifier le Membre' : 'Ajouter un Membre du Bureau'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">* Champs obligatoires indiqués par un astérisque</p>
              </div>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nom &amp; Prénom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={memberForm.name}
                  onChange={(e) => {
                    setMemberForm({ ...memberForm, name: e.target.value });
                    if (memberErrors.name) setMemberErrors({ ...memberErrors, name: undefined });
                  }}
                  placeholder="Ex: Youssef Ben Yaacoub"
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                    memberErrors.name ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                  }`}
                />
                {memberErrors.name && (
                  <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{memberErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Rôle / Titre au Bureau <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={memberForm.role}
                  onChange={(e) => {
                    setMemberForm({ ...memberForm, role: e.target.value });
                    if (memberErrors.role) setMemberErrors({ ...memberErrors, role: undefined });
                  }}
                  placeholder="Ex: Président, Vice-Présidente, Resp. Média..."
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                    memberErrors.role ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                  }`}
                />
                {memberErrors.role && (
                  <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{memberErrors.role}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Symbole Carte
                  </label>
                  <select
                    value={memberForm.suit}
                    onChange={(e) => setMemberForm({ ...memberForm, suit: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-slate-400"
                  >
                    <option value="♠">♠ Pique (Présidence)</option>
                    <option value="♥">♥ Cœur (Vice-Présidence / RH)</option>
                    <option value="♦">♦ Carreau (Trésorerie / Finance)</option>
                    <option value="♣">♣ Trèfle (Communication / Média)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Couleur Symbole
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={memberForm.suitColor}
                      onChange={(e) => setMemberForm({ ...memberForm, suitColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={memberForm.suitColor}
                      onChange={(e) => setMemberForm({ ...memberForm, suitColor: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Photo Avatar Upload */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Photo Avatar (Cloudinary ou URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={memberForm.avatar || ''}
                    onChange={(e) => setMemberForm({ ...memberForm, avatar: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
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
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{avatarUploadLoading ? 'Upload...' : 'Uploader'}</span>
                  </button>
                </div>

                {memberForm.avatar && (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <img
                      src={memberForm.avatar}
                      alt="Aperçu"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-200"
                    />
                    <span className="text-[10px] text-slate-500">Photo avatar prête à être enregistrée</span>
                  </div>
                )}
              </div>

              {/* Socials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Profil Instagram (URL)
                  </label>
                  <input
                    type="url"
                    value={memberForm.socials?.instagram || ''}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        socials: { ...memberForm.socials, instagram: e.target.value },
                      })
                    }
                    placeholder="https://instagram.com/..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Laissez vide pour rediriger vers le compte Instagram officiel du club.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Profil LinkedIn (URL)
                  </label>
                  <input
                    type="url"
                    value={memberForm.socials?.linkedin || ''}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        socials: { ...memberForm.socials, linkedin: e.target.value },
                      })
                    }
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Laissez vide pour rediriger vers la page LinkedIn officielle du club.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enregistrer le Membre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE / EDIT EVENT */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-sans text-slate-900">
                  {editingEvent ? 'Modifier l\'Événement' : 'Créer un Nouvel Événement'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">* Champs obligatoires indiqués par un astérisque</p>
              </div>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-5">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                  Type d'Événement &amp; Emplacement
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEventModalForm({ ...eventModalForm, is_active: true, category: 'upcoming' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      eventModalForm.is_active
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase">Vedette Actif</p>
                    <p className="text-[10px] opacity-70">Affiche principale en haut</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEventModalForm({ ...eventModalForm, is_active: false, category: 'upcoming' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      !eventModalForm.is_active && eventModalForm.category === 'upcoming'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase">À Venir (Agenda)</p>
                    <p className="text-[10px] opacity-70">Futur événement au calendrier</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEventModalForm({ ...eventModalForm, is_active: false, category: 'previous' })}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      !eventModalForm.is_active && eventModalForm.category === 'previous'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase">Archive Passée</p>
                    <p className="text-[10px] opacity-70">Édition clôturée / souvenirs</p>
                  </button>
                </div>
              </div>

              {/* Main Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Titre de l'Événement <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventModalForm.title}
                    onChange={(e) => {
                      setEventModalForm({ ...eventModalForm, title: e.target.value });
                      if (eventErrors.title) setEventErrors({ ...eventErrors, title: undefined });
                    }}
                    placeholder="Ex: Joker Carnival Night 2026"
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                      eventErrors.title ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                    }`}
                  />
                  {eventErrors.title && (
                    <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{eventErrors.title}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Édition / Sous-titre <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventModalForm.edition}
                    onChange={(e) => {
                      setEventModalForm({ ...eventModalForm, edition: e.target.value });
                      if (eventErrors.edition) setEventErrors({ ...eventErrors, edition: undefined });
                    }}
                    placeholder="Ex: Édition Promo 2026-2027"
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                      eventErrors.edition ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                    }`}
                  />
                  {eventErrors.edition && (
                    <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{eventErrors.edition}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Date &amp; Heure <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventModalForm.date}
                    onChange={(e) => {
                      setEventModalForm({ ...eventModalForm, date: e.target.value });
                      if (eventErrors.date) setEventErrors({ ...eventErrors, date: undefined });
                    }}
                    placeholder="Ex: Samedi 26 Octobre 2026 · 20h00"
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                      eventErrors.date ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                    }`}
                  />
                  {eventErrors.date && (
                    <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{eventErrors.date}</span>
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Lieu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={eventModalForm.location}
                    onChange={(e) => {
                      setEventModalForm({ ...eventModalForm, location: e.target.value });
                      if (eventErrors.location) setEventErrors({ ...eventErrors, location: undefined });
                    }}
                    placeholder="Ex: Grand Cour &amp; Amphi ESEN, Campus Manouba"
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                      eventErrors.location ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                    }`}
                  />
                  {eventErrors.location && (
                    <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{eventErrors.location}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Banner Upload */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Affiche / Flyer de l'Événement (Cloudinary)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={eventModalForm.banner_url}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, banner_url: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
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
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{eventBannerUploadLoading ? 'Upload...' : 'Uploader'}</span>
                  </button>
                </div>

                {eventModalForm.banner_url && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <img
                      src={eventModalForm.banner_url}
                      alt="Aperçu"
                      className="w-16 h-12 object-cover rounded-lg"
                    />
                    <span className="text-[11px] text-slate-500">Aperçu de l'affiche chargée</span>
                  </div>
                )}
              </div>

              {/* Program & Info */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Programme &amp; Déroulement
                </label>
                <textarea
                  rows={3}
                  value={eventModalForm.program}
                  onChange={(e) => setEventModalForm({ ...eventModalForm, program: e.target.value })}
                  placeholder="Concerts live · DJ sets exclusifs · Buffet festif &amp; Tombola..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enregistrer l'Événement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: STAT MODAL */}
      {isStatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                {editingStatIndex !== null ? 'Modifier la Statistique' : 'Ajouter une Statistique'}
              </h3>
              <button onClick={() => setIsStatModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStat} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Chiffre / Nombre *
                </label>
                <input
                  type="text"
                  value={statForm.number}
                  onChange={(e) => setStatForm({ ...statForm, number: e.target.value })}
                  placeholder="Ex: 500+, 9, 2016..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Libellé *
                </label>
                <input
                  type="text"
                  value={statForm.label}
                  onChange={(e) => setStatForm({ ...statForm, label: e.target.value })}
                  placeholder="Ex: Membres Actifs"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Couleur d'Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={statForm.color}
                    onChange={(e) => setStatForm({ ...statForm, color: e.target.value })}
                    className="w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={statForm.color}
                    onChange={(e) => setStatForm({ ...statForm, color: e.target.value })}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PILLAR MODAL */}
      {isPillarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                {editingPillarIndex !== null ? 'Modifier le Pilier' : 'Ajouter un Pilier'}
              </h3>
              <button onClick={() => setIsPillarModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePillar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Symbole Carte
                  </label>
                  <select
                    value={pillarForm.suit}
                    onChange={(e) => setPillarForm({ ...pillarForm, suit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-slate-400"
                  >
                    <option value="♠">♠ Pique</option>
                    <option value="♥">♥ Cœur</option>
                    <option value="♦">♦ Carreau</option>
                    <option value="♣">♣ Trèfle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Couleur
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pillarForm.color}
                      onChange={(e) => setPillarForm({ ...pillarForm, color: e.target.value })}
                      className="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pillarForm.color}
                      onChange={(e) => setPillarForm({ ...pillarForm, color: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nom du Pilier (Badge) *
                </label>
                <input
                  type="text"
                  value={pillarForm.name}
                  onChange={(e) => setPillarForm({ ...pillarForm, name: e.target.value })}
                  placeholder="Ex: AS DE PIQUE · PASSION"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Titre Principal *
                </label>
                <input
                  type="text"
                  value={pillarForm.title}
                  onChange={(e) => setPillarForm({ ...pillarForm, title: e.target.value })}
                  placeholder="Ex: Événements Grandioses"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={pillarForm.desc}
                  onChange={(e) => setPillarForm({ ...pillarForm, desc: e.target.value })}
                  placeholder="Courte description de ce pilier..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPillarModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: CREATE ALBUM */}
      {isAlbumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                Créer un Nouvel Album
              </h3>
              <button onClick={() => setIsAlbumModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {albumModalError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {albumModalError}
              </p>
            )}

            <form onSubmit={handleCreateAlbum} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nom de l'Album *
                </label>
                <input
                  type="text"
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  placeholder="Ex: Joker Carnival Night 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={newAlbumCategory}
                  onChange={(e) => setNewAlbumCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-slate-400"
                >
                  <option value="Soirées">Soirées &amp; Galas</option>
                  <option value="Workshops">Workshops &amp; Formations</option>
                  <option value="Teambuilding">Teambuilding &amp; Sorties</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Photo de Couverture (Optionnelle)
                </label>
                <input
                  type="file"
                  ref={albumCoverInputRef}
                  onChange={(e) => setNewAlbumCoverFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAlbumModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={albumModalLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {albumModalLoading ? 'Création...' : 'Créer l\'Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: UPLOAD PHOTOS */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                Ajouter des Photos à la Galerie
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {uploadError}
              </p>
            )}

            <form onSubmit={handleUploadPhotosSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Album de Destination
                </label>
                <select
                  value={newPhotoAlbum}
                  onChange={(e) => setNewPhotoAlbum(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-slate-400"
                >
                  {allAlbumNames.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Titre / Légende (Optionnel)
                </label>
                <input
                  type="text"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  placeholder="Ex: Soirée intégration"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Sélectionner les Photos (Multiples fichiers autorisés)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white cursor-pointer"
                />
                {uploadFiles.length > 0 && (
                  <p className="text-[11px] text-slate-600 font-medium mt-1">
                    {uploadFiles.length} fichier(s) sélectionné(s)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress || uploadFiles.length === 0}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadProgress ? 'Téléversement en cours...' : `Uploader (${uploadFiles.length})`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
