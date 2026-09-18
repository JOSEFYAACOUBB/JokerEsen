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
  ClipboardList,
  UserX,
  ExternalLink,
  Cake,
  ChevronLeft,
  ChevronRight,
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
import type { AgendaItem } from '../../types/member';
import {
  fetchAllAgendaItems,
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem
} from '../../services/agendaService';
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
  updateAlbumMeta,
  removeAlbumMeta,
  DEFAULT_GALLERY_CATEGORIES,
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
import {
  createMemberByAdmin,
  getStoredMembers,
  getAllEventRegistrations,
  getCancellationLogs,
  updateAttendanceStatus,
} from '../../services/memberService';
import type { MemberEventRegistration, CancellationLog } from '../../types/member';

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
  } | null;
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
    'dashboard' | 'members' | 'applications' | 'partners' | 'about' | 'event' | 'agenda' | 'team' | 'gallery' | 'settings' | 'newsletter'
  >(() => {
    const saved = localStorage.getItem('joker_admin_active_tab');
    if (
      saved &&
      ['dashboard', 'members', 'applications', 'partners', 'about', 'event', 'agenda', 'team', 'gallery', 'settings', 'newsletter'].includes(saved)
    ) {
      return saved as any;
    }
    return 'dashboard';
  });

  const handleTabSelect = (
    tab: 'dashboard' | 'members' | 'applications' | 'partners' | 'about' | 'event' | 'agenda' | 'team' | 'gallery' | 'settings' | 'newsletter'
  ) => {
    setActiveTab(tab);
    localStorage.setItem('joker_admin_active_tab', tab);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('joker_admin_sidebar_collapsed') === 'true';
  });

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('joker_admin_sidebar_collapsed', String(next));
      return next;
    });
  };

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
  const [selectedCandidateModal, setSelectedCandidateModal] = useState<RecruitmentApplication | null>(null);

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
    event_type: 'formation' | 'reunion' | 'evenement';
    max_seats: number;
    meeting_url: string;
    show_in_member_agenda: boolean;
    show_on_public_website: boolean;
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
    event_type: 'formation',
    max_seats: 20,
    meeting_url: '',
    show_in_member_agenda: true,
    show_on_public_website: false,
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
  const [eventDatePart, setEventDatePart] = useState('');
  const [eventTimePart, setEventTimePart] = useState('20:00');

  // Helper to parse date string into datePart ('YYYY-MM-DD') and timePart ('HH:mm')
  const parseDateAndTimeToComponents = (text: string): { datePart: string; timePart: string } => {
    if (!text) {
      const today = new Date().toISOString().slice(0, 10);
      return { datePart: today, timePart: '20:00' };
    }

    let timePart = '20:00';
    const timeMatch = text.match(/(?:·|\bat\b|\bà\b|\s|T)\s*([01]?\d|2[0-3])[:h]([0-5]\d)/i)
      || text.match(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/i);
    if (timeMatch) {
      timePart = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}`;
    } else {
      const simpleH = text.match(/(?:·|\bat\b|\bà\b|\s)\s*([01]?\d|2[0-3])h\b/i);
      if (simpleH) {
        timePart = `${simpleH[1].padStart(2, '0')}:00`;
      }
    }

    const isoMatch = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (isoMatch) {
      return {
        datePart: `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`,
        timePart,
      };
    }

    const slashMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (slashMatch) {
      return {
        datePart: `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`,
        timePart,
      };
    }

    const frMonths: Record<string, string> = {
      janvier: '01', janv: '01', jan: '01',
      février: '02', fevrier: '02', févr: '02', fevr: '02', fev: '02',
      mars: '03', mar: '03',
      avril: '04', avr: '04',
      mai: '05',
      juin: '06',
      juillet: '07', juil: '07',
      août: '08', aout: '08',
      septembre: '09', sept: '09', sep: '09',
      octobre: '10', oct: '10',
      novembre: '11', nov: '11',
      décembre: '12', decembre: '12', déc: '12', dec: '12',
    };

    const lower = text.toLowerCase();
    const frenchMatch = lower.match(/(\d{1,2})\s+([a-zàâäéèêëîïôöûüç]+)(?:\s+(\d{4}))?/);
    if (frenchMatch) {
      const day = frenchMatch[1].padStart(2, '0');
      const month = frMonths[frenchMatch[2]];
      const year = frenchMatch[3] || String(new Date().getFullYear());
      if (month) {
        return {
          datePart: `${year}-${month}-${day}`,
          timePart,
        };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    return { datePart: today, timePart };
  };

  const formatFrenchEventDate = (dateStr: string, timeStr: string): string => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d) return dateStr;
      const dateObj = new Date(y, m - 1, d);
      const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const dayName = daysOfWeek[dateObj.getDay()];
      const monthName = months[m - 1];
      const timeFormatted = timeStr ? ` · ${timeStr.replace(':', 'h')}` : '';
      return `${dayName} ${d} ${monthName} ${y}${timeFormatted}`;
    } catch {
      return dateStr;
    }
  };

  const handleDatePartChange = (newDate: string) => {
    setEventDatePart(newDate);
    const formatted = formatFrenchEventDate(newDate, eventTimePart);
    setEventModalForm((prev) => ({ ...prev, date: formatted }));
    if (eventErrors.date) setEventErrors((prev) => ({ ...prev, date: undefined }));
  };

  const handleTimePartChange = (newTime: string) => {
    setEventTimePart(newTime);
    const formatted = formatFrenchEventDate(eventDatePart, newTime);
    setEventModalForm((prev) => ({ ...prev, date: formatted }));
    if (eventErrors.date) setEventErrors((prev) => ({ ...prev, date: undefined }));
  };

  // ── Agenda (Formations & Réunions) State ──
  const [allRegistrations, setAllRegistrations] = useState<MemberEventRegistration[]>(() => getAllEventRegistrations());
  const [cancellationLogs, setCancellationLogs] = useState<CancellationLog[]>(() => getCancellationLogs());
  const [agendaFilter, setAgendaFilter] = useState<'all' | 'formation' | 'reunion' | 'evenement'>('all');
  const [agendaList, setAgendaList] = useState<AgendaItem[]>([]);
  const [selectedAgendaEvent, setSelectedAgendaEvent] = useState<AgendaItem | null>(null);
  const [attendanceRemark, setAttendanceRemark] = useState<Record<string, string>>({});
  const [agendaActiveSubTab, setAgendaActiveSubTab] = useState<'sessions' | 'history'>('sessions');
  const [selectedRegForPresent, setSelectedRegForPresent] = useState<MemberEventRegistration | null>(null);
  const [selectedRegForAbsence, setSelectedRegForAbsence] = useState<MemberEventRegistration | null>(null);
  const [absenceRemarkInput, setAbsenceRemarkInput] = useState('');

  // Agenda Modal state
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [editingAgendaItem, setEditingAgendaItem] = useState<AgendaItem | null>(null);
  const [agendaForm, setAgendaForm] = useState({
    title: '',
    edition: '',
    date: '',
    location: '',
    program: '',
    meeting_url: '',
    event_type: 'formation' as 'formation' | 'reunion' | 'evenement',
    max_seats: 50,
  });

  useEffect(() => {
    fetchAllAgendaItems().then(setAgendaList);
  }, []);

  const handleRefreshAgendaData = async () => {
    const items = await fetchAllAgendaItems();
    setAgendaList(items);
    setAllRegistrations(getAllEventRegistrations());
    setCancellationLogs(getCancellationLogs());
  };

  const handleOpenNewAgendaModal = () => {
    setEditingAgendaItem(null);
    setAgendaForm({
      title: '',
      edition: '',
      date: `Samedi ${new Date().getDate()} Octobre 2026 · 14h00`,
      location: 'Salle Lab ESEN Manouba',
      program: '',
      meeting_url: '',
      event_type: 'formation',
      max_seats: 50,
    });
    setIsAgendaModalOpen(true);
  };

  const handleOpenEditAgendaModal = (item: AgendaItem) => {
    setEditingAgendaItem(item);
    setAgendaForm({
      title: item.title,
      edition: item.edition || '',
      date: item.date,
      location: item.location,
      program: item.program || '',
      meeting_url: item.meeting_url || '',
      event_type: item.event_type || 'formation',
      max_seats: item.max_seats ?? 50,
    });
    setIsAgendaModalOpen(true);
  };

  const handleSaveAgendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaForm.title.trim() || !agendaForm.date.trim() || !agendaForm.location.trim()) return;

    if (editingAgendaItem) {
      await updateAgendaItem(editingAgendaItem.id, agendaForm);
    } else {
      await createAgendaItem(agendaForm);
    }

    const refreshed = await fetchAllAgendaItems();
    setAgendaList(refreshed);
    setIsAgendaModalOpen(false);
    setEditingAgendaItem(null);
  };

  const handleDeleteAgendaAction = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette session d\'agenda ?')) {
      await deleteAgendaItem(id);
      if (selectedAgendaEvent?.id === id) setSelectedAgendaEvent(null);
      const refreshed = await fetchAllAgendaItems();
      setAgendaList(refreshed);
    }
  };

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
  const [uploadAlbumType, setUploadAlbumType] = useState<'select' | 'custom'>('select');
  const [uploadCustomAlbum, setUploadCustomAlbum] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Album Modal State (Supports Create & Edit)
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumModalMode, setAlbumModalMode] = useState<'create' | 'edit'>('create');
  const [editingAlbumOriginalName, setEditingAlbumOriginalName] = useState('');
  const [albumFormTitle, setAlbumFormTitle] = useState('');
  const [albumFormCategory, setAlbumFormCategory] = useState('Soirées');
  const [albumFormDate, setAlbumFormDate] = useState('');
  const [albumFormDescription, setAlbumFormDescription] = useState('');
  const [albumFormCoverFile, setAlbumFormCoverFile] = useState<File | null>(null);
  const [albumFormCoverUrl, setAlbumFormCoverUrl] = useState('');
  const [albumModalLoading, setAlbumModalLoading] = useState(false);
  const [albumModalError, setAlbumModalError] = useState('');
  const albumCoverInputRef = useRef<HTMLInputElement>(null);

  // Photo Edit Modal State
  const [isPhotoEditModalOpen, setIsPhotoEditModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<AdminPhoto | null>(null);
  const [photoEditTitle, setPhotoEditTitle] = useState('');
  const [photoEditAlbum, setPhotoEditAlbum] = useState('');
  const [photoEditCustomAlbum, setPhotoEditCustomAlbum] = useState('');
  const [photoEditLoading, setPhotoEditLoading] = useState(false);

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
      program: eventModalForm.program || 'Session formation & atelier pratique.',
      banner_url: eventModalForm.banner_url || 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
      category: eventModalForm.category,
      is_active: eventModalForm.is_active,
      event_type: eventModalForm.event_type || 'evenement',
      max_seats: Number(eventModalForm.max_seats) || 20,
      meeting_url: eventModalForm.meeting_url || '',
      show_in_member_agenda: eventModalForm.show_in_member_agenda ?? true,
      show_on_public_website: eventModalForm.show_on_public_website ?? (eventModalForm.event_type === 'evenement'),
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

  // ── AGENDA ATTENDANCE HANDLERS ──

  const handleMarkAttendance = (registrationId: string, status: 'present' | 'absent', remarkOverride?: string) => {
    const remark = remarkOverride !== undefined ? remarkOverride : (attendanceRemark[registrationId] || '');
    updateAttendanceStatus(registrationId, status, remark || undefined);
    setAllRegistrations(getAllEventRegistrations());
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

  // Excel / CSV Export (Includes all 5 questionnaire fields)
  const exportCandidatesToExcel = () => {
    if (applications.length === 0) {
      showToast('Aucune candidature à exporter.', 'warning');
      return;
    }
    const headers = [
      'Nom & Prénom',
      'Email',
      'Téléphone',
      'Date de Naissance',
      'Établissement / Faculté',
      'Filière / Spécialité',
      'Statut',
      'Date de demande',
      'Pourquoi rejoindre (Q1)',
      'Idées Événement/Projet (Q2)',
      'Compétences (Q3)',
      'Axes inspirants (Q4)',
      'Formations souhaitées (Q5)',
    ];

    const rows = applications.map((app) => [
      `"${(app.full_name || '').replace(/"/g, '""')}"`,
      `"${(app.email || '').replace(/"/g, '""')}"`,
      `"${(app.phone || '').replace(/"/g, '""')}"`,
      `"${(app.birth_date || '').replace(/"/g, '""')}"`,
      `"${(app.faculty || app.department || '').replace(/"/g, '""')}"`,
      `"${(app.major || '').replace(/"/g, '""')}"`,
      `"${(app.status || 'pending').replace(/"/g, '""')}"`,
      `"${app.created_at ? new Date(app.created_at).toLocaleDateString('fr-FR') : ''}"`,
      `"${(app.why_join || app.motivation || '').replace(/"/g, '""')}"`,
      `"${(app.event_idea || '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(app.skills) ? app.skills.join(' ; ') : '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(app.activity_axes) ? app.activity_axes.join(' ; ') : '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(app.desired_trainings) ? app.desired_trainings.join(' ; ') : '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `candidatures_joker_esen_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${applications.length} candidatures exportées au format Excel !`, 'success');
  };

  // PDF Export Function
  const exportCandidatesToPDF = (singleApp?: RecruitmentApplication) => {
    const listToExport = singleApp ? [singleApp] : applications;
    if (listToExport.length === 0) {
      showToast('Aucune candidature à exporter.', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Veuillez autoriser les fenêtres surgissantes pour ouvrir le PDF.', 'warning');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Candidatures Club Joker ESEN</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1e293b; background: #fff; line-height: 1.5; }
          .header { text-align: center; border-bottom: 3px solid #a73541; padding-bottom: 12px; margin-bottom: 24px; }
          .header h1 { color: #a73541; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 4px 0 0 0; color: #64748b; font-size: 12px; font-weight: bold; }
          .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 18px; page-break-inside: avoid; background: #faf8f6; }
          .card-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
          .candidate-name { font-size: 16px; font-weight: bold; color: #a73541; margin: 0; }
          .candidate-meta { font-size: 11px; color: #475569; margin-top: 3px; }
          .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .status-accepted { background: #dcfce7; color: #15803d; }
          .status-pending { background: #fef3c7; color: #b45309; }
          .status-rejected { background: #ffe4e6; color: #be123c; }
          .status-contacted { background: #e0f2fe; color: #0369a1; }
          .q-box { margin-bottom: 10px; background: #ffffff; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; }
          .q-title { font-size: 11px; font-weight: bold; color: #0f172a; margin-bottom: 3px; text-transform: uppercase; }
          .q-text { font-size: 12px; color: #334155; font-style: italic; white-space: pre-wrap; }
          .tag-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
          .tag { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 12px; }
          .tag-axis { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
          .tag-training { background: #fce7f3; color: #9d174d; border-color: #fbcfe8; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #a73541; color: white; border: none; padding: 10px 22px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 13px;">🖨️ Imprimer / Sauvegarder en PDF</button>
        </div>
        <div class="header">
          <h1>CLUB JOKER ESEN · RAPPORT DES CANDIDATURES</h1>
          <p>Candidatures enregistrées : ${listToExport.length} · Document officiel du ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        ${listToExport.map((app, idx) => `
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="candidate-name">#${idx + 1} ${app.full_name}</h3>
                <div class="candidate-meta">
                  📧 <strong>${app.email}</strong> | 📞 <strong>${app.phone}</strong> | 🎓 <strong>${app.major}</strong> (${app.faculty || app.department || 'ESEN'}) ${app.birth_date ? `| 🎂 ${app.birth_date}` : ''}
                </div>
              </div>
              <span class="status-badge status-${app.status || 'pending'}">${app.status || 'pending'}</span>
            </div>

            ${(app.why_join || app.motivation) ? `
              <div class="q-box">
                <div class="q-title">Q1 : Pourquoi rejoindre le club ?</div>
                <div class="q-text">"${app.why_join || app.motivation}"</div>
              </div>
            ` : ''}

            ${app.event_idea ? `
              <div class="q-box">
                <div class="q-title">Q2 : Idée d'événement / projet / formation :</div>
                <div class="q-text">"${app.event_idea}"</div>
              </div>
            ` : ''}

            ${Array.isArray(app.skills) && app.skills.length > 0 ? `
              <div class="q-box">
                <div class="q-title">Q3 : Compétences & Domaines d'intérêt :</div>
                <div class="tag-list">
                  ${app.skills.map(s => `<span class="tag">${s}</span>`).join('')}
                </div>
              </div>
            ` : ''}

            ${Array.isArray(app.activity_axes) && app.activity_axes.length > 0 ? `
              <div class="q-box">
                <div class="q-title">Q4 : Axes d'activités inspirants :</div>
                <div class="tag-list">
                  ${app.activity_axes.map(a => `<span class="tag tag-axis">${a}</span>`).join('')}
                </div>
              </div>
            ` : ''}

            ${Array.isArray(app.desired_trainings) && app.desired_trainings.length > 0 ? `
              <div class="q-box">
                <div class="q-title">Q5 : Formations souhaitées :</div>
                <div class="tag-list">
                  ${app.desired_trainings.map(t => `<span class="tag tag-training">${t}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showToast('Aperçu PDF généré !', 'success');
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
  const openCreateAlbumModal = () => {
    setAlbumModalMode('create');
    setEditingAlbumOriginalName('');
    setAlbumFormTitle('');
    setAlbumFormCategory('Soirées');
    setAlbumFormDate('');
    setAlbumFormDescription('');
    setAlbumFormCoverFile(null);
    setAlbumFormCoverUrl('');
    setAlbumModalError('');
    setIsAlbumModalOpen(true);
  };

  const openEditAlbumModal = (albumName: string) => {
    const existing = savedAlbums.find((a) => a.name.toLowerCase() === albumName.toLowerCase());
    setAlbumModalMode('edit');
    setEditingAlbumOriginalName(albumName);
    setAlbumFormTitle(existing?.name || albumName);
    setAlbumFormCategory(existing?.category || 'Soirées');
    setAlbumFormDate(existing?.date || '');
    setAlbumFormDescription(existing?.description || '');
    setAlbumFormCoverFile(null);
    setAlbumFormCoverUrl(existing?.coverUrl || '');
    setAlbumModalError('');
    setIsAlbumModalOpen(true);
  };

  const handleSaveAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumFormTitle.trim()) {
      setAlbumModalError('Le nom de l\'album est obligatoire');
      return;
    }

    setAlbumModalLoading(true);
    setAlbumModalError('');

    try {
      let finalCoverUrl = albumFormCoverUrl;
      if (albumFormCoverFile) {
        const uploadRes = await uploadToCloudinary(albumFormCoverFile);
        if (uploadRes?.secure_url) {
          finalCoverUrl = uploadRes.secure_url;
        }
      }

      const albumData: AlbumMeta = {
        name: albumFormTitle.trim(),
        category: albumFormCategory.trim() || 'Général',
        date: albumFormDate.trim() || undefined,
        description: albumFormDescription.trim() || undefined,
        coverUrl: finalCoverUrl || undefined,
      };

      if (albumModalMode === 'edit') {
        updateAlbumMeta(editingAlbumOriginalName, albumData);
        if (editingAlbumOriginalName.toLowerCase() !== albumData.name.toLowerCase()) {
          await galleryService.renameAlbumImages(editingAlbumOriginalName, albumData.name);
          setPhotos((prev) =>
            prev.map((p) =>
              p.album.toLowerCase() === editingAlbumOriginalName.toLowerCase()
                ? { ...p, album: albumData.name }
                : p
            )
          );
          if (selectedAlbum.toLowerCase() === editingAlbumOriginalName.toLowerCase()) {
            setSelectedAlbum(albumData.name);
          }
        }
        showToast(`Album "${albumData.name}" mis à jour avec succès !`, 'success');
      } else {
        saveAlbumMeta(albumData);
        showToast(`Album "${albumData.name}" créé avec succès !`, 'success');
        setSelectedAlbum(albumData.name);
      }

      setSavedAlbums(getSavedAlbums());
      setIsAlbumModalOpen(false);
    } catch (err: any) {
      setAlbumModalError(err.message || 'Erreur lors de l\'enregistrement de l\'album.');
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

  const openEditPhotoModal = (photo: AdminPhoto) => {
    setEditingPhoto(photo);
    setPhotoEditTitle(photo.title);
    setPhotoEditAlbum(photo.album);
    setPhotoEditCustomAlbum('');
    setIsPhotoEditModalOpen(true);
  };

  const handleSavePhotoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;
    setPhotoEditLoading(true);
    try {
      const targetAlbum = (photoEditAlbum === '__custom__' ? photoEditCustomAlbum.trim() : photoEditAlbum.trim()) || 'Général';
      await galleryService.updateImage(editingPhoto.id.toString(), {
        title: photoEditTitle.trim(),
        description: targetAlbum,
      });
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === editingPhoto.id
            ? { ...p, title: photoEditTitle.trim(), album: targetAlbum }
            : p
        )
      );
      setIsPhotoEditModalOpen(false);
      showToast('Photo modifiée avec succès !', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la modification de la photo.', 'error');
    } finally {
      setPhotoEditLoading(false);
    }
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

    const destinationAlbum = (uploadAlbumType === 'custom' ? uploadCustomAlbum.trim() : newPhotoAlbum.trim()) || 'Général';

    setUploadProgress(true);
    setUploadError('');

    try {
      await galleryService.uploadMultipleImages(uploadFiles, destinationAlbum);
      await loadPhotos();
      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setNewPhotoTitle('');
      setUploadCustomAlbum('');
      setUploadAlbumType('select');
      setSelectedAlbum(destinationAlbum);
      showToast(`${uploadFiles.length} photo(s) ajoutée(s) à l'album "${destinationAlbum}" !`, 'success');
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

  const allCategories = useMemo(() => {
    const cats = new Set<string>(DEFAULT_GALLERY_CATEGORIES);
    savedAlbums.forEach((a) => {
      if (a.category && a.category.trim()) cats.add(a.category.trim());
    });
    return Array.from(cats);
  }, [savedAlbums]);

  const allAlbumNames = useMemo(() => {
    const fromMeta = savedAlbums.map((a) => a.name);
    const fromPhotos = photos.map((p) => p.album).filter((a) => a && a !== 'Général');
    return Array.from(new Set(['Général', ...fromMeta, ...fromPhotos]));
  }, [savedAlbums, photos]);

  const selectedAlbumMeta = useMemo(() => {
    if (selectedAlbum === 'Tous') return null;
    return savedAlbums.find((a) => a.name.toLowerCase() === selectedAlbum.toLowerCase()) || null;
  }, [savedAlbums, selectedAlbum]);

  const filteredPhotos = useMemo(() => {
    return photos
      .filter((p) => {
        if (selectedAlbum === 'Tous') return true;
        return p.album.toLowerCase() === selectedAlbum.toLowerCase();
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
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (Responsive & Push / Collapsible) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-white border-r border-slate-200/80 shrink-0 shadow-xl lg:shadow-none lg:sticky lg:top-0 h-screen max-h-screen overflow-y-auto overscroll-contain transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarCollapsed
            ? 'w-72 lg:w-20 p-3 sm:p-3'
            : 'w-72 lg:w-64 p-4 sm:p-5'
        }`}
      >
        <div className="space-y-5">
          {/* Sidebar Logo Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            {sidebarCollapsed ? (
              <div className="hidden lg:flex w-full items-center justify-center">
                <img
                  src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                  alt="Joker ESEN"
                  className="h-8 w-8 object-contain"
                  title="Joker ESEN Admin"
                />
              </div>
            ) : null}

            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <img
                src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
                alt="Joker ESEN"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </div>

            <div className="flex items-center gap-1">
              {/* Desktop Collapse / Expand Toggle in Sidebar Header */}
              <button
                onClick={toggleSidebarCollapsed}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
                aria-label={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-4">
            {[
              {
                category: '🌐 CONTENU DU SITE WEB',
                shortCat: 'Site',
                items: [
                  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
                  { id: 'event', label: 'Événements', icon: Calendar, badge: allEvents.length },
                  { id: 'partners', label: 'Partenaires', icon: Building2, badge: partners.length },
                  { id: 'about', label: 'Qui Sommes-Nous', icon: BookOpen },
                  { id: 'team', label: 'Équipe Exécutive', icon: Users, badge: teamMembers.length },
                  { id: 'gallery', label: 'Galerie Photos', icon: ImageIcon, badge: photos.length },
                  { id: 'newsletter', label: 'Newsletter Brevo', icon: Mail, badge: subscribers.length },
                  { id: 'settings', label: 'Paramètres', icon: Settings },
                ],
              },
              {
                category: '👥 ESPACE MEMBRES & ÉMARGEMENT',
                shortCat: 'Membres',
                items: [
                  { id: 'members', label: 'Membres & Comptes', icon: Users, badge: getStoredMembers().length },
                  { id: 'agenda', label: 'Agenda Formations', icon: ClipboardList, badge: agendaList.length },
                  { id: 'applications', label: 'Candidatures', icon: UserCheck, badge: applications.filter((a) => a.status === 'pending').length },
                ],
              },
            ].map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1 pt-2.5 border-t border-slate-100 first:pt-0 first:border-0">
                {sidebarCollapsed ? (
                  <>
                    <div className="hidden lg:block my-2 border-t border-slate-100" />
                    <div className="lg:hidden px-2.5 py-1 rounded-lg bg-slate-50/80 border border-slate-100/80 mb-1.5 w-fit">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                        {group.category}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="px-2.5 py-1 rounded-lg bg-slate-50/80 border border-slate-100/80 mb-1.5 w-fit">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                      {group.category}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  {group.items.map((tab) => {
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
                        title={tab.label}
                        className={`w-full flex items-center rounded-2xl text-xs transition-all cursor-pointer relative ${
                          sidebarCollapsed
                            ? 'lg:justify-center lg:px-2 lg:py-2.5 px-3.5 py-2.5 justify-between'
                            : 'px-3.5 py-2.5 justify-between'
                        } ${
                          isActive
                            ? 'bg-slate-900 text-white font-bold shadow-xs border border-slate-900'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold border border-transparent'
                        }`}
                      >
                        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:gap-0' : ''}`}>
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
                          <span className={`${sidebarCollapsed ? 'lg:hidden' : ''} truncate`}>
                            {tab.label}
                          </span>
                        </div>

                        {tab.badge !== undefined && tab.badge > 0 && (
                          sidebarCollapsed ? (
                            <>
                              {/* Expanded badge on mobile */}
                              <span
                                className={`lg:hidden px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-white/20 text-white font-extrabold'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                                }`}
                              >
                                {tab.badge}
                              </span>
                              {/* Mini dot/pill on collapsed desktop */}
                              <span
                                className={`hidden lg:flex absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold items-center justify-center ${
                                  isActive
                                    ? 'bg-blue-400 text-slate-900'
                                    : 'bg-slate-900 text-white'
                                }`}
                              >
                                {tab.badge > 99 ? '99+' : tab.badge}
                              </span>
                            </>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-white/20 text-white font-extrabold'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className={`w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/70 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs ${
              sidebarCollapsed ? 'lg:px-0 px-3.5' : 'px-3.5'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''} text-rose-700 font-bold truncate`}>
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (Responsive & Push Layout) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8F9FA] transition-all duration-300">
        {/* Top Header Navbar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-xs z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Push / Collapse Button */}
            <button
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              title={sidebarCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
              aria-label={sidebarCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {/* Current Active Section Badge & Title */}
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">Admin</span>
              <span className="text-xs text-slate-300 hidden sm:inline">/</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-sans truncate">
                {activeTab === 'dashboard' && 'Home'}
                {activeTab === 'event' && 'Événements'}
                {activeTab === 'partners' && 'Partenaires'}
                {activeTab === 'about' && 'Qui Sommes-Nous'}
                {activeTab === 'team' && 'Équipe Exécutive'}
                {activeTab === 'gallery' && 'Galerie Photos'}
                {activeTab === 'newsletter' && 'Newsletter Brevo'}
                {activeTab === 'settings' && 'Paramètres'}
                {activeTab === 'members' && 'Membres & Comptes'}
                {activeTab === 'agenda' && 'Agenda Formations'}
                {activeTab === 'applications' && 'Candidatures Recrutement'}
              </span>
            </div>
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
                      const today = new Date().toISOString().slice(0, 10);
                      setEventDatePart(today);
                      setEventTimePart('20:00');
                      const formatted = formatFrenchEventDate(today, '20:00');
                      setEditingEvent(null);
                      setEventModalForm({
                        title: '',
                        edition: '',
                        date: formatted,
                        location: '',
                        program: '',
                        banner_url: 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
                        category: 'previous',
                        event_type: 'evenement',
                        max_seats: 50,
                        meeting_url: '',
                        show_in_member_agenda: false,
                        show_on_public_website: true,
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
                      const today = new Date().toISOString().slice(0, 10);
                      setEventDatePart(today);
                      setEventTimePart('20:00');
                      const formatted = formatFrenchEventDate(today, '20:00');
                      setEditingEvent(null);
                      setEventModalForm({
                        title: '',
                        edition: '',
                        date: formatted,
                        location: '',
                        program: '',
                        banner_url: 'https://res.cloudinary.com/qvnoo1cy/image/upload/v1788317724/rselcd2hgyfq7pnu4lvh.jpg',
                        category: 'upcoming',
                        event_type: 'evenement',
                        max_seats: 50,
                        meeting_url: '',
                        show_in_member_agenda: false,
                        show_on_public_website: true,
                        is_active: false,
                        ticket_available: true,
                        include_program: true,
                        include_access_entry: true,
                        include_ambiance: true,
                        access_info: 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
                        entry_info: '100% Gratuite avec réservation préalable en ligne.',
                        ambiance_info: 'Musique live, animations, buffet & tombola du club Joker.',
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
                            const { datePart, timePart } = parseDateAndTimeToComponents(event.date);
                            setEventDatePart(datePart);
                            setEventTimePart(timePart);
                            setEditingEvent(event);
                            setEventModalForm({
                              title: event.title,
                              edition: event.edition,
                              date: event.date,
                              location: event.location,
                              program: event.program,
                              banner_url: event.banner_url,
                              category: event.category || (event.is_active ? 'upcoming' : 'previous'),
                              event_type: (event.event_type as any) || 'evenement',
                              max_seats: event.max_seats || 20,
                              meeting_url: event.meeting_url || '',
                              show_in_member_agenda: event.show_in_member_agenda !== false,
                              show_on_public_website: event.show_on_public_website ?? false,
                              is_active: event.is_active,
                              ticket_available: event.ticket_available !== false,
                              include_program: event.show_program !== false,
                              include_access_entry: event.show_access_info !== false,
                              include_ambiance: event.show_ambiance_info !== false,
                              access_info: event.access_info || 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
                              entry_info: event.entry_info || '100% Gratuite avec réservation préalable en ligne.',
                              ambiance_info: event.ambiance_info || 'Musique live, animations, buffet & tombola du club Joker.',
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


          {/* TAB: AGENDA FORMATIONS & RÉUNIONS */}
          {activeTab === 'agenda' && (() => {
            const filteredAgenda = agendaList.filter(e =>
              agendaFilter === 'all' || e.event_type === agendaFilter
            );
            const sessionRegs = selectedAgendaEvent
              ? allRegistrations.filter(r => r.event_id === selectedAgendaEvent.id)
              : [];

            return (
              <div className="space-y-6 animate-in fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                      Agenda des Formations &amp; Réunions ({filteredAgenda.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Gérez les sessions d'agenda visibles dans l'espace membre, vérifiez les présences et consultez l'historique.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefreshAgendaData}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Actualiser</span>
                    </button>
                    <button
                      onClick={handleOpenNewAgendaModal}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-white shrink-0" />
                      <span className="text-white font-bold">Nouvelle Formation / Réunion</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 w-fit">
                  {(['sessions', 'history'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setAgendaActiveSubTab(st)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        agendaActiveSubTab === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {st === 'sessions' ? '📋 Sessions & Présences' : '📜 Historique Inscriptions'}
                    </button>
                  ))}
                </div>

                {agendaActiveSubTab === 'sessions' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sessions list */}
                    <div className="lg:col-span-1 space-y-3">
                      <div className="p-3 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                        <p className="text-[11px] font-bold uppercase text-slate-500 mb-2">Filtrer par type</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(['all', 'formation', 'reunion', 'evenement'] as const).map(f => (
                            <button
                              key={f}
                              onClick={() => setAgendaFilter(f)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                                agendaFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {f === 'all' ? 'Tous' : f === 'formation' ? '🎓 Formation' : f === 'reunion' ? '🤝 Réunion' : '🎉 Événement'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredAgenda.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/70 space-y-2">
                          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-600">Aucune session dans l'agenda membre</p>
                          <p className="text-[11px] text-slate-400">Cliquez sur "Nouvelle Formation / Réunion" ci-dessus pour en ajouter une.</p>
                        </div>
                      ) : (
                        filteredAgenda.map(evt => {
                          const regs = allRegistrations.filter(r => r.event_id === evt.id);
                          const isSelected = selectedAgendaEvent?.id === evt.id;
                          return (
                            <div
                              key={evt.id}
                              className={`p-4 rounded-2xl border transition-all space-y-2 ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white'
                                  : 'bg-white border-slate-200/70 hover:border-slate-300 shadow-xs'
                              }`}
                            >
                              <div
                                onClick={() => setSelectedAgendaEvent(evt)}
                                className="cursor-pointer space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    isSelected ? 'bg-white/20 text-white' :
                                    evt.event_type === 'formation' ? 'bg-indigo-100 text-indigo-800' :
                                    evt.event_type === 'reunion' ? 'bg-amber-100 text-amber-900' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {evt.event_type === 'formation' ? '🎓' : evt.event_type === 'reunion' ? '🤝' : '🎉'} {evt.event_type || 'évt'}
                                  </span>
                                  <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                    {regs.length}/{evt.max_seats ?? 50}
                                  </span>
                                </div>
                                <p className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>{evt.title}</p>
                                <p className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{evt.date}</p>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100/20">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditAgendaModal(evt); }}
                                  className={`p-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer ${
                                    isSelected ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                                  }`}
                                  title="Modifier cette session"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Éditer</span>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAgendaAction(evt.id); }}
                                  className={`p-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer ${
                                    isSelected ? 'text-rose-300 hover:text-rose-100' : 'text-rose-500 hover:text-rose-700'
                                  }`}
                                  title="Supprimer cette session"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Attendance panel */}
                    <div className="lg:col-span-2">
                      {!selectedAgendaEvent ? (
                        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-3 h-full flex flex-col items-center justify-center">
                          <UserCheck className="w-12 h-12 text-slate-300" />
                          <h3 className="font-bold text-slate-700 text-sm">Sélectionnez une session</h3>
                          <p className="text-xs text-slate-400 max-w-xs">Cliquez sur une formation ou réunion à gauche pour voir et gérer les présences.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Session info header */}
                          <div className="p-5 rounded-3xl bg-white border border-slate-200/70 shadow-xs flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                selectedAgendaEvent.event_type === 'formation' ? 'bg-indigo-100 text-indigo-800' :
                                selectedAgendaEvent.event_type === 'reunion' ? 'bg-amber-100 text-amber-900' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {selectedAgendaEvent.event_type || 'session'}
                              </span>
                              <h3 className="text-base font-bold text-slate-900 font-sans">{selectedAgendaEvent.title}</h3>
                              <p className="text-xs text-slate-500">{selectedAgendaEvent.date} · {selectedAgendaEvent.location}</p>
                              <div className="flex items-center gap-3 pt-1 text-xs text-slate-600">
                                <span className="font-bold">{sessionRegs.length} inscrits</span>
                                <span>·</span>
                                <span className="text-emerald-600 font-bold">{sessionRegs.filter(r => r.attendance_status === 'present').length} présents</span>
                                <span>·</span>
                                <span className="text-rose-600 font-bold">{sessionRegs.filter(r => r.attendance_status === 'absent').length} absents</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedAgendaEvent(null)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Registered members table */}
                          {sessionRegs.length === 0 ? (
                            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/70 shadow-xs space-y-2">
                              <Users className="w-10 h-10 text-slate-300 mx-auto" />
                              <p className="text-xs font-bold text-slate-600">Aucun membre inscrit</p>
                              <p className="text-[11px] text-slate-400">Les membres peuvent s'inscrire depuis leur espace personnel.</p>
                            </div>
                          ) : (
                            <div className="rounded-3xl bg-white border border-slate-200/70 overflow-hidden shadow-xs">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                                    <tr>
                                      <th className="p-4">Membre</th>
                                      <th className="p-4">Inscrit le</th>
                                      <th className="p-4">Statut Présence</th>
                                      <th className="p-4">Remarque d'absence</th>
                                      <th className="p-4 text-right">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {sessionRegs.map(reg => (
                                      <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="p-4">
                                          <p className="font-bold text-slate-900">{reg.member_name || '—'}</p>
                                          <p className="text-[11px] text-slate-500">{reg.member_email || ''}</p>
                                          {reg.justification_reason && (
                                            <div className="text-[10px] text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded-md mt-1 border border-amber-200 inline-block">
                                              💬 Motif : "{reg.justification_reason}"
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-[11px]">{reg.registered_at}</td>
                                        <td className="p-4">
                                          {reg.attendance_status === 'present' && (
                                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">✅ Présent</span>
                                          )}
                                          {reg.attendance_status === 'absent' && (
                                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">⚠️ Absent</span>
                                          )}
                                          {(!reg.attendance_status || reg.attendance_status === 'pending') && (
                                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">⏳ En attente</span>
                                          )}
                                        </td>
                                        <td className="p-4">
                                          <input
                                            type="text"
                                            disabled={reg.attendance_status === 'present' || reg.attendance_status === 'absent'}
                                            value={attendanceRemark[reg.id] ?? (reg.absence_remark || '')}
                                            onChange={(e) => setAttendanceRemark(prev => ({ ...prev, [reg.id]: e.target.value }))}
                                            placeholder="Ex: Absent sans justification..."
                                            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-rose-400 focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                          />
                                        </td>
                                        <td className="p-4">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {reg.attendance_status === 'present' ? (
                                              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                                                ✅ Présence Confirmée (Verrouillé)
                                              </span>
                                            ) : reg.attendance_status === 'absent' ? (
                                              <span className="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-300">
                                                ⚠️ Absence Marquée (Verrouillé)
                                              </span>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={() => setSelectedRegForPresent(reg)}
                                                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 cursor-pointer transition-all"
                                                >
                                                  Présent ✅
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setSelectedRegForAbsence(reg);
                                                    setAbsenceRemarkInput(attendanceRemark[reg.id] || reg.absence_remark || 'Absent(e) non justifié(e) à la formation / réunion.');
                                                  }}
                                                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 cursor-pointer transition-all"
                                                >
                                                  Absent ⚠️
                                                </button>
                                              </>
                                            )}
                                          </div>
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
                    </div>
                  </div>
                )}

                {agendaActiveSubTab === 'history' && (
                  <div className="space-y-6">
                    <div className="p-5 rounded-3xl bg-white border border-slate-200/70 shadow-xs">
                      <h3 className="text-base font-bold text-slate-900 font-sans mb-1">Historique des Inscriptions &amp; Désinscriptions</h3>
                      <p className="text-xs text-slate-500">Log immuable de toutes les actions d'inscription et d'annulation des membres.</p>
                    </div>

                    {/* Inscriptions active table */}
                    <div className="rounded-3xl bg-white border border-slate-200/70 overflow-hidden shadow-xs">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-sm text-slate-900">Inscriptions actives ({allRegistrations.length})</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                            <tr>
                              <th className="p-4">Membre</th>
                              <th className="p-4">Session</th>
                              <th className="p-4">Type</th>
                              <th className="p-4">Inscrit le</th>
                              <th className="p-4">Présence</th>
                              <th className="p-4">Remarque Admin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {allRegistrations.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                  Aucune inscription enregistrée.
                                </td>
                              </tr>
                            ) : (
                              allRegistrations.map(reg => (
                                <tr key={reg.id} className={`hover:bg-slate-50/70 transition-colors ${reg.attendance_status === 'absent' ? 'bg-rose-50/40' : ''}`}>
                                  <td className="p-4">
                                    <p className="font-bold text-slate-900">{reg.member_name || '—'}</p>
                                    <p className="text-[11px] text-slate-500">{reg.member_email || ''}</p>
                                  </td>
                                  <td className="p-4 font-medium text-slate-800 max-w-[160px]">
                                    <p className="line-clamp-1">{reg.event_title}</p>
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                      reg.event_type === 'formation' ? 'bg-indigo-100 text-indigo-800' :
                                      reg.event_type === 'reunion' ? 'bg-amber-100 text-amber-900' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {reg.event_type || 'évt'}
                                    </span>
                                  </td>
                                  <td className="p-4 font-mono text-[11px] text-slate-600">{reg.registered_at}</td>
                                  <td className="p-4">
                                    {reg.attendance_status === 'present' && <span className="text-emerald-600 font-bold">✅ Présent</span>}
                                    {reg.attendance_status === 'absent' && <span className="text-rose-600 font-bold">⚠️ Absent</span>}
                                    {(!reg.attendance_status || reg.attendance_status === 'pending') && <span className="text-slate-400">⏳ Attente</span>}
                                  </td>
                                  <td className="p-4 text-[11px] text-rose-700 italic max-w-[180px]">
                                    {reg.absence_remark || '—'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Cancellation log table */}
                    <div className="rounded-3xl bg-white border border-slate-200/70 overflow-hidden shadow-xs">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <UserX className="w-4 h-4 text-rose-500" />
                        <h4 className="font-bold text-sm text-slate-900">Désinscriptions &amp; Annulations ({cancellationLogs.length})</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
                            <tr>
                              <th className="p-4">Membre</th>
                              <th className="p-4">Email</th>
                              <th className="p-4">Session annulée</th>
                              <th className="p-4">Date d'annulation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {cancellationLogs.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400">
                                  Aucune désinscription enregistrée.
                                </td>
                              </tr>
                            ) : (
                              cancellationLogs.map(log => (
                                <tr key={log.id} className="hover:bg-rose-50/30 transition-colors">
                                  <td className="p-4 font-bold text-slate-900">{log.member_name}</td>
                                  <td className="p-4 text-slate-500">{log.member_email}</td>
                                  <td className="p-4 font-medium text-slate-800 max-w-[180px]">
                                    <p className="line-clamp-1">{log.event_title}</p>
                                  </td>
                                  <td className="p-4 font-mono text-[11px] text-rose-700 font-bold">{log.cancelled_at}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
                    onClick={exportCandidatesToExcel}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Exporter au format Excel / CSV avec l'ensemble des questions"
                  >
                    <Download className="w-4 h-4 text-emerald-700" />
                    <span>Exporter Excel</span>
                  </button>
                  <button
                    onClick={() => exportCandidatesToPDF()}
                    className="px-3.5 py-2.5 rounded-xl bg-[#A73541]/10 hover:bg-[#A73541]/20 text-[#A73541] border border-[#A73541]/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Télécharger / Imprimer la liste au format PDF"
                  >
                    <Download className="w-4 h-4 text-[#A73541]" />
                    <span>Télécharger PDF</span>
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
                        <th className="p-4">Filière / Spécialité</th>
                        <th className="p-4">Établissement / Faculté</th>
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
                              {(app.why_join || app.motivation) && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
                                  "{app.why_join || app.motivation}"
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
                                {app.faculty || app.department || 'ESEN Manouba'}
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
                            <td className="p-4 text-right flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedCandidateModal(app)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Voir toutes les réponses au questionnaire"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                <span>Voir Réponses</span>
                              </button>
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
                                      bio: app.motivation || app.why_join || 'Membre accepté via recrutement.',
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

              {/* CANDIDATE DETAILS MODAL */}
              {selectedCandidateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                  <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                          Détails Candidature
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">{selectedCandidateModal.full_name}</h3>
                        <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                          <span>{selectedCandidateModal.email}</span> · <span>{selectedCandidateModal.phone}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedCandidateModal(null)}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
                      {/* Status & Date */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                            selectedCandidateModal.status === 'accepted'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : selectedCandidateModal.status === 'rejected'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : selectedCandidateModal.status === 'contacted'
                              ? 'bg-sky-50 border-sky-200 text-sky-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {selectedCandidateModal.status === 'accepted' ? '✅ Accepté'
                              : selectedCandidateModal.status === 'rejected' ? '❌ Refusé'
                              : selectedCandidateModal.status === 'contacted' ? '📞 Contacté'
                              : '⏳ En attente'}
                          </span>
                        </div>
                        {selectedCandidateModal.created_at && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            📅 {new Date(selectedCandidateModal.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* General Metadata */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Nom Complet</span>
                          <span className="font-semibold text-slate-900">{selectedCandidateModal.full_name}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Email</span>
                          <a href={`mailto:${selectedCandidateModal.email}`} className="font-semibold text-slate-900 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {selectedCandidateModal.email}
                          </a>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Téléphone</span>
                          <a href={`tel:${selectedCandidateModal.phone}`} className="font-semibold text-slate-900 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {selectedCandidateModal.phone}
                          </a>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Date de Naissance</span>
                          <span className="font-semibold text-slate-900 flex items-center gap-1">
                            <Cake className="w-3 h-3 text-slate-400 shrink-0" />
                            {selectedCandidateModal.birth_date || 'Non spécifiée'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Filière / Niveau</span>
                          <span className="font-semibold text-slate-900">{selectedCandidateModal.major}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Département</span>
                          <span className="font-semibold text-slate-900">{selectedCandidateModal.department || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Établissement / Faculté</span>
                          <span className="font-semibold text-slate-900">{selectedCandidateModal.faculty || selectedCandidateModal.department || 'ESEN Manouba'}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-2">
                          <span className="block text-[10px] font-bold uppercase text-slate-400">Profil Facebook</span>
                          {selectedCandidateModal.facebook_link ? (
                            <a
                              href={selectedCandidateModal.facebook_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                              <span className="truncate max-w-[280px]">{selectedCandidateModal.facebook_link}</span>
                              <ExternalLink className="w-3 h-3 text-blue-400 shrink-0" />
                            </a>
                          ) : (
                            <span className="font-semibold text-slate-400 italic">Non renseigné</span>
                          )}
                        </div>
                      </div>

                      {/* Question: Motivation */}
                      {selectedCandidateModal.motivation && selectedCandidateModal.motivation !== selectedCandidateModal.why_join && (
                        <div className="space-y-1.5 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                            Motivation Personnelle
                          </h4>
                          <p className="text-xs text-slate-700 italic bg-white p-3 rounded-xl border border-amber-200/60 leading-relaxed">
                            "{selectedCandidateModal.motivation}"
                          </p>
                        </div>
                      )}

                      {/* Question 1 */}
                      <div className="space-y-1.5 p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                          Q1 : Pourquoi veux-tu rejoindre le club JOKER ESEN ?
                        </h4>
                        <p className="text-xs text-slate-700 italic bg-white p-3 rounded-xl border border-rose-200/60 leading-relaxed">
                          "{selectedCandidateModal.why_join || selectedCandidateModal.motivation || 'Pas de réponse saisie'}"
                        </p>
                      </div>

                      {/* Question 2 */}
                      <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Q2 : As-tu une idée d'événement, de projet ou de formation à proposer ?
                        </h4>
                        <p className="text-xs text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                          "{selectedCandidateModal.event_idea || 'Pas d\'idée spécifiée'}"
                        </p>
                      </div>

                      {/* Question 3 */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Q3 : Compétences actuelles &amp; Domaines d'intérêt ⭐
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(selectedCandidateModal.skills) && selectedCandidateModal.skills.length > 0 ? (
                            selectedCandidateModal.skills.map((s, idx) => (
                              <span key={idx} className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Aucune compétence sélectionnée</span>
                          )}
                        </div>
                      </div>

                      {/* Question 4 */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                          Q4 : Axes d'activités inspirants ⭐
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(selectedCandidateModal.activity_axes) && selectedCandidateModal.activity_axes.length > 0 ? (
                            selectedCandidateModal.activity_axes.map((a, idx) => (
                              <span key={idx} className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-800 text-xs font-semibold">
                                {a}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Aucun axe sélectionné</span>
                          )}
                        </div>
                      </div>

                      {/* Question 5 */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                          Q5 : Formations souhaitées ⭐
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(selectedCandidateModal.desired_trainings) && selectedCandidateModal.desired_trainings.length > 0 ? (
                            selectedCandidateModal.desired_trainings.map((t, idx) => (
                              <span key={idx} className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-800 text-xs font-semibold">
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Aucune formation sélectionnée</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                      <button
                        onClick={() => exportCandidatesToPDF(selectedCandidateModal)}
                        className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        <span>Exporter PDF</span>
                      </button>
                      <button
                        onClick={() => setSelectedCandidateModal(null)}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
              {/* Header Title & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
                    Galerie Photos &amp; Albums ({photos.length} photos &middot; {allAlbumNames.length} albums)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gérez les albums, modifiez librement leurs détails et catégories personnalisées, et téléversez des photos.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={openCreateAlbumModal}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <FolderPlus className="w-4 h-4 text-slate-600" />
                    <span>Créer un Album</span>
                  </button>

                  <button
                    onClick={() => {
                      setUploadFiles([]);
                      setNewPhotoTitle('');
                      setUploadError('');
                      setUploadCustomAlbum('');
                      setUploadAlbumType('select');
                      if (selectedAlbum !== 'Tous') {
                        setNewPhotoAlbum(selectedAlbum);
                      }
                      setIsUploadModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
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
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tous ({photos.length})
                  </button>
                  {allAlbumNames.map((albumName) => {
                    const count = photos.filter((p) => p.album.toLowerCase() === albumName.toLowerCase()).length;
                    const isSelected = selectedAlbum.toLowerCase() === albumName.toLowerCase();
                    return (
                      <div key={albumName} className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSelectedAlbum(albumName)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{albumName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {count}
                          </span>
                        </button>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditAlbumModal(albumName)}
                              className="p-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                              title={`Modifier les détails de l'album "${albumName}"`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {albumName !== 'Général' && (
                              <button
                                onClick={() => handleDeleteAlbum(albumName)}
                                className="p-1.5 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors cursor-pointer"
                                title={`Supprimer l'album "${albumName}"`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

              {/* Selected Album Details Card */}
              {selectedAlbum !== 'Tous' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B2545] to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-in fade-in">
                  <div className="flex items-start gap-4">
                    {selectedAlbumMeta?.coverUrl ? (
                      <img
                        src={selectedAlbumMeta.coverUrl}
                        alt={selectedAlbum}
                        className="w-20 h-20 rounded-2xl object-cover border border-white/20 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-8 h-8 text-white/50" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black uppercase tracking-tight text-white font-sans">
                          {selectedAlbum}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          {selectedAlbumMeta?.category || 'Non catégorisé'}
                        </span>
                        {selectedAlbumMeta?.date && (
                          <span className="text-[11px] text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            {selectedAlbumMeta.date}
                          </span>
                        )}
                      </div>
                      {selectedAlbumMeta?.description && (
                        <p className="text-xs text-slate-300 max-w-xl line-clamp-2">
                          {selectedAlbumMeta.description}
                        </p>
                      )}
                      <p className="text-[11px] text-blue-200/80 font-medium">
                        {filteredPhotos.length} photo(s) dans cet album
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto flex-wrap shrink-0">
                    <button
                      onClick={() => openEditAlbumModal(selectedAlbum)}
                      className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-300" />
                      <span>Modifier les Détails</span>
                    </button>
                    <button
                      onClick={() => {
                        setUploadFiles([]);
                        setNewPhotoTitle('');
                        setUploadError('');
                        setUploadAlbumType('select');
                        setNewPhotoAlbum(selectedAlbum);
                        setIsUploadModalOpen(true);
                      }}
                      className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ajouter des Photos</span>
                    </button>
                    {selectedAlbum !== 'Général' && (
                      <button
                        onClick={() => handleDeleteAlbum(selectedAlbum)}
                        className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                        title="Supprimer cet album"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Photos Grid or Empty State */}
              {filteredPhotos.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/70 shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase font-sans">
                    Aucune photo trouvée
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {photoSearch
                      ? 'Aucune photo ne correspond à votre recherche.'
                      : selectedAlbum !== 'Tous'
                      ? `L'album "${selectedAlbum}" est actuellement vide. Téléversez des photos pour le compléter.`
                      : 'Aucune photo n\'a encore été ajoutée à la galerie.'}
                  </p>
                  <button
                    onClick={() => {
                      setUploadFiles([]);
                      setNewPhotoTitle('');
                      setUploadError('');
                      setUploadAlbumType('select');
                      if (selectedAlbum !== 'Tous') {
                        setNewPhotoAlbum(selectedAlbum);
                      }
                      setIsUploadModalOpen(true);
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ajouter des Photos</span>
                  </button>
                </div>
              ) : (
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
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/50 text-white truncate max-w-[90px]">
                            {photo.album}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPhotoModal(photo)}
                              className="p-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white cursor-pointer transition-colors shadow-xs"
                              title="Modifier la légende ou l'album"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeletePhoto(photo)}
                              className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white cursor-pointer transition-colors shadow-xs"
                              title="Supprimer la photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-white font-bold truncate">{photo.title}</p>
                          <p className="text-[9px] text-slate-300">{photo.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                    Filières &amp; Spécialités d'études ({formConfig.majors.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Options proposées aux étudiants lors de leur inscription au club Joker.
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

              {/* Event Type, Capacity & Meeting URL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Catégorie de Session
                  </label>
                  <select
                    value={eventModalForm.event_type}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, event_type: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="formation">🎓 Formation / Workshop</option>
                    <option value="reunion">🤝 Réunion Club / Bureau</option>
                    <option value="evenement">🎉 Événement / Festivité</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Capacité (Places max)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={eventModalForm.max_seats}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, max_seats: parseInt(e.target.value) || 20 })}
                    placeholder="20"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Lien Visio / Réunion (Optionnel)
                  </label>
                  <input
                    type="url"
                    value={eventModalForm.meeting_url}
                    onChange={(e) => setEventModalForm({ ...eventModalForm, meeting_url: e.target.value })}
                    placeholder="https://meet.google.com/xyz"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Visibility Options */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <p className="text-xs font-bold uppercase text-blue-900">Visibilité & Emplacement</p>
                <div className="flex flex-col sm:flex-row gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={eventModalForm.show_in_member_agenda ?? true}
                      onChange={(e) => setEventModalForm({ ...eventModalForm, show_in_member_agenda: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Afficher dans l'Agenda Membres (Espace Membre)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={eventModalForm.show_on_public_website ?? false}
                      onChange={(e) => setEventModalForm({ ...eventModalForm, show_on_public_website: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Afficher sur le site public principal</span>
                  </label>
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

                <div className="sm:col-span-2 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-slate-700">
                      Date &amp; Heure de l'Événement <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span>🇹🇳</span>
                      <span>Heure de Tunisie (GMT+1)</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        1. Choisir le Jour
                      </label>
                      <input
                        type="date"
                        value={eventDatePart}
                        onChange={(e) => handleDatePartChange(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 font-semibold outline-none transition-colors ${
                          eventErrors.date ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        2. Choisir l'Heure (Tunisie)
                      </label>
                      <input
                        type="time"
                        value={eventTimePart}
                        onChange={(e) => handleTimePartChange(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-800 font-semibold outline-none transition-colors ${
                          eventErrors.date ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Format d'affichage public (synchronisé)
                    </label>
                    <input
                      type="text"
                      value={eventModalForm.date}
                      onChange={(e) => {
                        setEventModalForm({ ...eventModalForm, date: e.target.value });
                        if (eventErrors.date) setEventErrors({ ...eventErrors, date: undefined });
                      }}
                      placeholder="Ex: Samedi 26 Octobre 2026 · 20h00"
                      className={`w-full px-4 py-2 rounded-xl bg-slate-50 border text-xs text-slate-800 outline-none transition-colors ${
                        eventErrors.date ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-200 focus:bg-white focus:border-slate-400'
                      }`}
                    />
                  </div>

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

      {/* MODAL 6: CREATE / EDIT ALBUM */}
      {isAlbumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                  {albumModalMode === 'edit' ? 'Modifier l\'Album' : 'Créer un Nouvel Album'}
                </h3>
                <p className="text-xs text-slate-500">
                  {albumModalMode === 'edit'
                    ? `Modifiez le titre, la catégorie et les informations de "${editingAlbumOriginalName}".`
                    : 'Configurez les détails et la catégorie personnalisée pour ce nouvel album.'}
                </p>
              </div>
              <button
                onClick={() => setIsAlbumModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {albumModalError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {albumModalError}
              </p>
            )}

            <form onSubmit={handleSaveAlbumSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Nom de l'Album <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={albumFormTitle}
                  onChange={(e) => setAlbumFormTitle(e.target.value)}
                  placeholder="Ex: Joker Carnival Night 2026, Gala Annuel, Hackathon..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Catégorie de l'Album <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={albumFormCategory}
                  onChange={(e) => setAlbumFormCategory(e.target.value)}
                  placeholder="Ex: Soirées, Workshops, Teambuilding, Hackathons, Formations..."
                  list="gallery-category-datalist"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400 font-medium"
                />
                <datalist id="gallery-category-datalist">
                  {allCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                {/* Quick suggestions pills */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Suggestions :</span>
                    {allCategories.map((cat) => {
                      const isSelected = albumFormCategory.toLowerCase().trim() === cat.toLowerCase().trim();
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setAlbumFormCategory(cat)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    💡 Tapez librement n'importe quel texte au clavier ou cliquez sur une suggestion existante.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Date / Période (Optionnelle)
                  </label>
                  <input
                    type="text"
                    value={albumFormDate}
                    onChange={(e) => setAlbumFormDate(e.target.value)}
                    placeholder="Ex: Mars 2026, Octobre 2025"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    URL Couverture Directe (Optionnelle)
                  </label>
                  <input
                    type="text"
                    value={albumFormCoverUrl}
                    onChange={(e) => setAlbumFormCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Description / Sous-titre (Optionnelle)
                </label>
                <textarea
                  rows={2}
                  value={albumFormDescription}
                  onChange={(e) => setAlbumFormDescription(e.target.value)}
                  placeholder="Brève description ou faits marquants de cet événement..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Téléverser une Photo de Couverture (Fichier)
                </label>
                <input
                  type="file"
                  ref={albumCoverInputRef}
                  onChange={(e) => setAlbumFormCoverFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white cursor-pointer"
                />
              </div>

              {albumFormCoverUrl && !albumFormCoverFile && (
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <img
                    src={albumFormCoverUrl}
                    alt="Aperçu couverture"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-xs text-slate-600 truncate">
                    <span className="font-bold block text-slate-800">Couverture actuelle</span>
                    <span className="text-[10px] text-slate-400 truncate block">{albumFormCoverUrl}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAlbumModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={albumModalLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {albumModalLoading
                      ? 'Enregistrement...'
                      : albumModalMode === 'edit'
                      ? 'Enregistrer les Modifications'
                      : 'Créer l\'Album'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: UPLOAD PHOTOS */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                  Ajouter des Photos à la Galerie
                </h3>
                <p className="text-xs text-slate-500">
                  Sélectionnez ou tapez le nom de l'album de destination pour vos photos.
                </p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {uploadError}
              </p>
            )}

            <form onSubmit={handleUploadPhotosSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Album de Destination
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={uploadAlbumType === 'custom' ? '__custom__' : newPhotoAlbum}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setUploadAlbumType('custom');
                      } else {
                        setUploadAlbumType('select');
                        setNewPhotoAlbum(e.target.value);
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-slate-400 font-medium"
                  >
                    {allAlbumNames.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                    <option value="__custom__">➕ Écrire un nouvel album...</option>
                  </select>
                </div>

                {uploadAlbumType === 'custom' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={uploadCustomAlbum}
                      onChange={(e) => setUploadCustomAlbum(e.target.value)}
                      placeholder="Tapez le nom du nouvel album..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-400 font-bold"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Titre / Légende par défaut (Optionnel)
                </label>
                <input
                  type="text"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  placeholder="Ex: Soirée intégration, Session live..."
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
                  <p className="text-[11px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{uploadFiles.length} fichier(s) prêt(s) pour le téléversement</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress || uploadFiles.length === 0}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadProgress ? 'Téléversement en cours...' : `Uploader (${uploadFiles.length})`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: EDIT PHOTO */}
      {isPhotoEditModalOpen && editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                  Modifier la Photo
                </h3>
                <p className="text-xs text-slate-500">
                  Changez la légende ou déplacez cette photo vers un autre album.
                </p>
              </div>
              <button onClick={() => setIsPhotoEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <img
                src={editingPhoto.url}
                alt={editingPhoto.title}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
              />
              <div className="space-y-0.5 truncate">
                <p className="text-xs font-bold text-slate-800 truncate">{editingPhoto.title}</p>
                <p className="text-[11px] text-slate-500">Album actuel : {editingPhoto.album}</p>
              </div>
            </div>

            <form onSubmit={handleSavePhotoEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Titre / Légende
                </label>
                <input
                  type="text"
                  value={photoEditTitle}
                  onChange={(e) => setPhotoEditTitle(e.target.value)}
                  placeholder="Titre de la photo..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Déplacer vers l'Album
                </label>
                <select
                  value={photoEditAlbum === '__custom__' ? '__custom__' : photoEditAlbum}
                  onChange={(e) => setPhotoEditAlbum(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-slate-400 font-medium"
                >
                  {allAlbumNames.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                  <option value="__custom__">➕ Écrire un nouvel album...</option>
                </select>

                {photoEditAlbum === '__custom__' && (
                  <input
                    type="text"
                    value={photoEditCustomAlbum}
                    onChange={(e) => setPhotoEditCustomAlbum(e.target.value)}
                    placeholder="Tapez le nom du nouvel album..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-blue-400 font-bold"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPhotoEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={photoEditLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{photoEditLoading ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL AGENDA: CREATE / EDIT AGENDA ITEM */}
      {isAgendaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 font-sans uppercase">
                {editingAgendaItem ? 'Modifier la Session Agenda' : 'Créer une Formation / Réunion'}
              </h3>
              <button onClick={() => setIsAgendaModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgendaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Type de Session <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['formation', 'reunion', 'evenement'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAgendaForm((prev) => ({ ...prev, event_type: t }))}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        agendaForm.event_type === t
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'formation' ? '🎓 Formation' : t === 'reunion' ? '🤝 Réunion' : '🎉 Atelier'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Titre de la Formation / Réunion <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Masterclass UI/UX Design & Figma"
                  value={agendaForm.title}
                  onChange={(e) => setAgendaForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Édition / Pôle</label>
                  <input
                    type="text"
                    placeholder="Ex: Pôle Design · Session 1"
                    value={agendaForm.edition}
                    onChange={(e) => setAgendaForm((prev) => ({ ...prev, edition: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Capacité (Places) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={500}
                    value={agendaForm.max_seats}
                    onChange={(e) => setAgendaForm((prev) => ({ ...prev, max_seats: parseInt(e.target.value) || 50 }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Date &amp; Horaire <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mardi 24 Octobre 2026 · 14h00"
                  value={agendaForm.date}
                  onChange={(e) => setAgendaForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Lieu / Salle <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salle Lab 3 ESEN ou Google Meet"
                  value={agendaForm.location}
                  onChange={(e) => setAgendaForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Lien Visio / Google Meet (Optionnel)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={agendaForm.meeting_url}
                  onChange={(e) => setAgendaForm((prev) => ({ ...prev, meeting_url: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Programme / Détails
                </label>
                <textarea
                  rows={3}
                  placeholder="Détails du programme de la session, prérequis, formateur..."
                  value={agendaForm.program}
                  onChange={(e) => setAgendaForm((prev) => ({ ...prev, program: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-600 font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAgendaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingAgendaItem ? 'Mettre à jour' : 'Créer la Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: Confirm Present Attendance ══ */}
      {selectedRegForPresent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <button
              onClick={() => setSelectedRegForPresent(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-lg">
                ✓
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">Validation Présence</span>
                <h3 className="font-bold text-slate-900 text-base">Confirmer la présence de {selectedRegForPresent.member_name || selectedRegForPresent.member_email}</h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p><strong>Session :</strong> {selectedRegForPresent.event_title}</p>
              <p><strong>Inscrit(e) le :</strong> {selectedRegForPresent.registered_at}</p>
              {selectedRegForPresent.justification_reason && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  💬 <strong>Motif d'indisponibilité transmis par le membre :</strong>
                  <p className="italic mt-0.5 font-medium">"{selectedRegForPresent.justification_reason}"</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span>
                <strong>Attention :</strong> Une fois la présence confirmée, ce statut sera définitivement <strong>verrouillé</strong>. L'option pour le marquer comme absent ne sera plus disponible.
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSelectedRegForPresent(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleMarkAttendance(selectedRegForPresent.id, 'present');
                  setSelectedRegForPresent(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Confirmer la Présence ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRegForAbsence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <button
              onClick={() => setSelectedRegForAbsence(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold text-lg">
                ⚠️
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider block">Signalement d'Absence</span>
                <h3 className="font-bold text-slate-900 text-base">Marquer {selectedRegForAbsence.member_name || selectedRegForAbsence.member_email} absent(e)</h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p><strong>Session :</strong> {selectedRegForAbsence.event_title}</p>
              <p><strong>Inscrit(e) le :</strong> {selectedRegForAbsence.registered_at}</p>
              {selectedRegForAbsence.justification_reason && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  💬 <strong>Motif transmis par le membre :</strong>
                  <p className="italic mt-0.5 font-medium">"{selectedRegForAbsence.justification_reason}"</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Remarque / Motif d'absence pour l'administration :
              </label>
              <textarea
                rows={2}
                value={absenceRemarkInput}
                onChange={(e) => setAbsenceRemarkInput(e.target.value)}
                placeholder="Ex: Absent non justifié..."
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-rose-400 focus:bg-white transition-all resize-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span>
                <strong>Attention :</strong> Une fois l'absence marquée, ce statut sera définitivement <strong>verrouillé</strong>. L'option pour le marquer présent ne sera plus disponible.
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSelectedRegForAbsence(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleMarkAttendance(selectedRegForAbsence.id, 'absent', absenceRemarkInput);
                  setSelectedRegForAbsence(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Confirmer l'Absence ⚠️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
