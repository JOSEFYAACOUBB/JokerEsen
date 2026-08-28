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
  CheckCircle2,
  XCircle,
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
  Folder,
  Layers,
  ArrowLeft,
  Eye
} from 'lucide-react';

import type { TeamMember } from '../Team';
import type { RecruitmentApplication } from '../../types/database';
import {
  fetchRecruitmentApplications,
  updateRecruitmentStatus,
  deleteRecruitmentApplication
} from '../../services/recruitmentService';
import { updateClubSettings } from '../../services/settingsService';
import { updateEventDetails } from '../../services/eventService';
import { fetchTeamMembers, saveTeamMember, deleteTeamMember } from '../../services/teamService';
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
  eventData,
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
    'dashboard' | 'team' | 'gallery' | 'event' | 'applications' | 'settings'
  >(() => {
    const saved = localStorage.getItem('joker_admin_active_tab');
    if (saved && ['dashboard', 'team', 'gallery', 'event', 'applications', 'settings'].includes(saved)) {
      return saved as any;
    }
    return 'dashboard';
  });

  const handleTabSelect = (tab: 'dashboard' | 'team' | 'gallery' | 'event' | 'applications' | 'settings') => {
    setActiveTab(tab);
    localStorage.setItem('joker_admin_active_tab', tab);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Applications Data State
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'contacted'>('all');
  const [appSearch, setAppSearch] = useState('');

  // Photos & Albums State
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<AlbumMeta[]>(() => getSavedAlbums());
  const [loadingPhotos, setLoadingPhotos] = useState(false);
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
  const directDropzoneInputRef = useRef<HTMLInputElement>(null);

  // Album Modal State
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumCategory, setNewAlbumCategory] = useState<'Soirées' | 'Workshops' | 'Teambuilding'>('Soirées');
  const [newAlbumCoverFile, setNewAlbumCoverFile] = useState<File | null>(null);
  const [newAlbumCoverUrl, setNewAlbumCoverUrl] = useState('');
  const [albumModalLoading, setAlbumModalLoading] = useState(false);
  const [albumModalError, setAlbumModalError] = useState('');
  const albumCoverInputRef = useRef<HTMLInputElement>(null);

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
  const [avatarUploadLoading, setAvatarUploadLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Local Form Event State
  const [eventForm, setEventForm] = useState(eventData);
  const [eventSuccessMsg, setEventSuccessMsg] = useState(false);
  const [bannerUploadLoading, setBannerUploadLoading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Global Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // 1. Fetch Applications from Supabase
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

  // 2. Fetch Photos from Supabase / Cloudinary
  const loadPhotos = async () => {
    setLoadingPhotos(true);
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
    } finally {
      setLoadingPhotos(false);
    }
  };

  // 3. Fetch Team Members from Supabase
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
      loadApplications();
      loadPhotos();
      loadTeam();
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

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('joker_admin_auth');
    localStorage.removeItem('joker_view');
    localStorage.removeItem('joker_admin_active_tab');
    setIsAuthenticated(false);
    onBackToPublic();
  };

  // Handle Recruitment Status Update
  const handleUpdateStatus = async (
    id: string,
    newStatus: 'pending' | 'accepted' | 'rejected' | 'contacted'
  ) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    await updateRecruitmentStatus(id, newStatus);
    showNotification(`Statut de la candidature mis à jour vers "${newStatus}" !`);
  };

  // Handle Recruitment Application Delete
  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm('Confirmer la suppression de cette candidature ?')) return;
    setApplications((prev) => prev.filter((app) => app.id !== id));
    await deleteRecruitmentApplication(id);
    showNotification('Candidature supprimée avec succès.');
  };

  // Handle Toggle Recruitment in Settings
  const handleToggleRecruitmentStatus = async (newVal: boolean) => {
    onToggleRecruitment(newVal);
    await updateClubSettings({ recruitment_open: newVal });
    showNotification(`Recrutement ${newVal ? 'ouvert' : 'suspendu'} avec succès.`);
  };

  // Handle Team Member Save (Add or Edit)
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
      const refreshedList = updatedList.map(m => m.name === saved.name ? saved : m);
      onUpdateTeamMembers(refreshedList);
    }
    showNotification(`Membre "${memberForm.name}" enregistré avec succès !`);
  };

  // Handle Team Member Delete
  const handleDeleteMember = async (member: TeamMember) => {
    if (!window.confirm(`Supprimer ${member.name} du Bureau Exécutif ?`)) return;
    const updated = teamMembers.filter(
      (m) => (member.id ? m.id !== member.id : true) && (member.name ? m.name !== member.name : true)
    );
    onUpdateTeamMembers(updated);
    await deleteTeamMember(member.id || '', member.name, updated);
    showNotification(`Membre "${member.name}" supprimé.`);
  };

  // Handle Cloudinary Avatar Upload for Team Member
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        const newAvatarUrl = res.secure_url;
        // Update form state immediately
        setMemberForm((prev) => ({ ...prev, avatar: newAvatarUrl }));

        if (editingMember) {
          // Editing an existing member — persist immediately to Supabase + localStorage
          const updatedMember: TeamMember = {
            ...memberForm,
            avatar: newAvatarUrl,
            id: editingMember.id || String(Date.now()),
          };
          const updatedList = teamMembers.map((m) =>
            (m.id && m.id === editingMember.id) || m.name === editingMember.name
              ? updatedMember
              : m
          );
          onUpdateTeamMembers(updatedList);
          await saveTeamMember(updatedMember, updatedList.indexOf(updatedMember), updatedList, editingMember.name);
        }
        showNotification('Photo avatar téléversée et enregistrée !');
      }
    } catch (err: any) {
      alert(err.message || 'Échec du téléversement sur Cloudinary.');
    } finally {
      setAvatarUploadLoading(false);
    }
  };

  // Handle Cloudinary Banner Upload for Event
  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerUploadLoading(true);
    try {
      const res = await uploadToCloudinary(file);
      if (res?.secure_url) {
        const newBannerUrl = res.secure_url;
        const updatedEvent = { ...eventForm, bannerUrl: newBannerUrl };
        setEventForm(updatedEvent);
        onUpdateEvent(updatedEvent);
        await updateEventDetails(updatedEvent.id || '', updatedEvent);
        showNotification('Affiche de l\'événement téléversée et enregistrée !');
      }
    } catch (err: any) {
      alert(err.message || 'Échec du téléversement sur Cloudinary.');
    } finally {
      setBannerUploadLoading(false);
    }
  };

  // Handle Multi-Photo Upload (Files -> Cloudinary -> Supabase OR URL -> Supabase)
  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    const targetAlbum = isCreatingNewAlbumInUploadModal
      ? newCustomAlbumName.trim()
      : (newPhotoAlbum.trim() || 'Événements Joker');

    if (!targetAlbum) {
      setUploadError('Veuillez sélectionner ou créer un nom d\'album pour vos photos.');
      return;
    }

    if (uploadFiles.length === 0 && !newPhotoUrl.trim()) {
      setUploadError('Veuillez sélectionner au moins une photo ou renseigner une URL.');
      return;
    }

    setUploadProgress(true);
    setUploadProgressText(`Téléversement de 1 / ${uploadFiles.length || 1}...`);

    try {
      if (uploadFiles.length > 0) {
        // Upload batch of files
        const newImages = await galleryService.uploadMultipleImages(
          uploadFiles,
          targetAlbum,
          (done, total) => {
            setUploadProgressText(`Téléversement de ${done} / ${total} photos...`);
          }
        );

        const newPhotoItems: AdminPhoto[] = newImages.map((img) => ({
          id: img.id,
          title: img.title || targetAlbum,
          album: targetAlbum,
          url: img.display_url || img.cloudinary_url,
          date: 'Aujourd\'hui',
        }));

        setPhotos((prev) => [...newPhotoItems, ...prev]);
        saveAlbumMeta({ name: targetAlbum, category: 'Soirées' });
        setSavedAlbums(getSavedAlbums());
        showNotification(`${newImages.length} photo(s) ajoutée(s) avec succès à l'album "${targetAlbum}" !`);
      } else if (newPhotoUrl) {
        // Single URL upload
        const newImg = await galleryService.addPhotoByUrl(newPhotoUrl, {
          title: newPhotoTitle || 'Photo',
          description: targetAlbum,
        });

        const newPhotoItem: AdminPhoto = {
          id: newImg.id,
          title: newImg.title || 'Photo',
          album: targetAlbum,
          url: newPhotoUrl,
          date: 'Aujourd\'hui',
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
      setUploadError(err.message || 'Erreur lors du téléversement vers Cloudinary.');
    } finally {
      setUploadProgress(false);
      setUploadProgressText('');
    }
  };

  // Handle Direct Dropzone Upload inside an Album
  const handleDirectAlbumUpload = async (e: React.ChangeEvent<HTMLInputElement>, albumName: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    setUploadProgress(true);
    setUploadProgressText(`Téléversement de 1 / ${filesArray.length}...`);

    try {
      const newImages = await galleryService.uploadMultipleImages(
        filesArray,
        albumName,
        (done, total) => {
          setUploadProgressText(`Téléversement de ${done} / ${total} photos...`);
        }
      );

      const newPhotoItems: AdminPhoto[] = newImages.map((img) => ({
        id: img.id,
        title: img.title || albumName,
        album: albumName,
        url: img.display_url || img.cloudinary_url,
        date: 'Aujourd\'hui',
      }));

      setPhotos((prev) => [...newPhotoItems, ...prev]);
      saveAlbumMeta({ name: albumName, category: 'Soirées' });
      setSavedAlbums(getSavedAlbums());
      showNotification(`${newImages.length} photo(s) ajoutée(s) à "${albumName}" !`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors du téléversement.');
    } finally {
      setUploadProgress(false);
      setUploadProgressText('');
      if (directDropzoneInputRef.current) directDropzoneInputRef.current.value = '';
    }
  };

  // Handle Album Create
  const handleCreateAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlbumModalError('');
    if (!newAlbumTitle.trim()) {
      setAlbumModalError('Veuillez spécifier un nom pour l\'album.');
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
          date: 'Aujourd\'hui',
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
          date: 'Aujourd\'hui',
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
      setAlbumModalError(err.message || 'Erreur lors de la création de l\'album.');
    } finally {
      setAlbumModalLoading(false);
    }
  };

  // Handle Delete Entire Album
  const handleDeleteAlbum = async (albumName: string) => {
    if (!window.confirm(`Supprimer l'album "${albumName}" et TOUTES les photos qu'il contient ?`)) return;

    await galleryService.deleteAlbum(albumName);
    removeAlbumMeta(albumName);
    setSavedAlbums(getSavedAlbums());
    setPhotos((prev) => prev.filter((p) => (p.album || '').toLowerCase() !== albumName.toLowerCase()));
    setSelectedAlbum('Tous');
    showNotification(`Album "${albumName}" et ses photos supprimés.`);
  };

  // Handle Photo Delete
  const handleDeletePhoto = async (id: string | number) => {
    if (!window.confirm('Supprimer cette photo de la galerie ?')) return;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await galleryService.deleteImage(String(id));
    showNotification('Photo supprimée de la galerie.');
  };

  // Handle Event Details Save
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEvent(eventForm);
    await updateEventDetails(eventForm.id || '', {
      title: eventForm.title,
      edition: eventForm.edition,
      date: eventForm.date,
      location: eventForm.location,
      program: eventForm.program,
      bannerUrl: eventForm.bannerUrl,
    });
    setEventSuccessMsg(true);
    showNotification('Détails de l\'événement enregistrés et synchronisés !');
    setTimeout(() => setEventSuccessMsg(false), 3000);
  };

  // Filtered Applications
  const filteredApps = applications.filter((app) => {
    const matchesFilter =
      appFilter === 'all'
        ? true
        : app.status === appFilter;
    const matchesSearch =
      (app.full_name || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.email || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.major || '').toLowerCase().includes(appSearch.toLowerCase()) ||
      (app.department || '').toLowerCase().includes(appSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const allAlbumNames = Array.from(
    new Set([
      ...savedAlbums.map((a) => a.name),
      ...photos.map((p) => p.album).filter(Boolean),
    ])
  );

  // Rich Album Cards
  const richAlbums = allAlbumNames.map((name) => {
    const albumPhotos = photos.filter((p) => (p.album || '').toLowerCase() === name.toLowerCase());
    const meta = savedAlbums.find((a) => a.name.toLowerCase() === name.toLowerCase());
    const coverUrl = meta?.coverUrl || albumPhotos[0]?.url || '';
    const category = meta?.category || (name.toLowerCase().includes('workshop') ? 'Workshops' : name.toLowerCase().includes('teambuilding') ? 'Teambuilding' : 'Soirées');
    return {
      name,
      category,
      coverUrl,
      photosCount: albumPhotos.length,
      photos: albumPhotos,
      date: meta?.date || (albumPhotos[0]?.date ? albumPhotos[0].date : 'Session en cours'),
    };
  });

  // Filtered Photos
  const filteredPhotos =
    selectedAlbum === 'Tous'
      ? photos
      : photos.filter((p) => (p.album || '').toLowerCase() === selectedAlbum.toLowerCase());

  // If Not Authenticated -> Show Admin Login Form
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
              Veuillez vous connecter pour accéder à l'espace de gestion.
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
              className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl shadow-[#B93A34]/30 hover:opacity-95 transition-all flex items-center justify-between"
            >
              <span>{loginLoading ? 'Connexion en cours...' : 'Accéder au Dashboard'}</span>
              <span className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-black">
                →
              </span>
            </button>
          </form>

          <button
            onClick={onBackToPublic}
            className="w-full py-2 text-center text-xs font-bold text-[#F3C4A0]/60 hover:text-white transition-colors"
          >
            ← Retour au site public
          </button>
        </div>
      </div>
    );
  }

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
                  Executive Admin Hub
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
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard },
              { id: 'applications', label: 'Candidatures & Inscriptions', icon: UserCheck, badge: applications.filter(a => a.status === 'pending').length },
              { id: 'gallery', label: 'Galerie & Cloudinary', icon: ImageIcon, badge: photos.length },
              { id: 'event', label: 'Gestion Événement', icon: Calendar },
              { id: 'team', label: 'Bureau Exécutif', icon: Users, badge: teamMembers.length },
              { id: 'settings', label: 'Paramètres du Club', icon: Settings },
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
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
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
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#F3C4A0] text-xs font-bold transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Voir le site public</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#B93A34]/15 hover:bg-[#B93A34]/30 text-[#F5EDE4] text-xs font-bold transition-colors"
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
              {activeTab === 'applications' && 'Gestion des Candidatures & Recrutement'}
              {activeTab === 'gallery' && 'Gestionnaire de Photos & Cloudinary'}
              {activeTab === 'event' && 'Configuration de l’Événement'}
              {activeTab === 'team' && 'Membres du Bureau Exécutif'}
              {activeTab === 'settings' && 'Paramètres Généraux'}
            </h1>
          </div>

          {/* Quick Status Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isSupabaseConfigured ? 'Supabase Connecté' : 'Mode Offline / Démo'}</span>
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
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Candidatures</span>
                    <UserCheck className="w-5 h-5 text-[#3B66FF]" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-display">
                    {applications.length}
                  </div>
                  <p className="text-[11px] text-[#F3C4A0]/60">
                    {applications.filter((a) => a.status === 'pending').length} en attente de revue
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Photos Galerie</span>
                    <ImageIcon className="w-5 h-5 text-[#B93A34]" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-display">
                    {photos.length}
                  </div>
                  <p className="text-[11px] text-[#F3C4A0]/60">Photos hébergées & synchronisées</p>
                </div>

                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Bureau Exécutif</span>
                    <Users className="w-5 h-5 text-[#4E4F9E]" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-display">
                    {teamMembers.length}
                  </div>
                  <p className="text-[11px] text-[#F3C4A0]/60">Membres actifs affichés</p>
                </div>

                <div className="p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-2">
                  <div className="flex items-center justify-between text-[#A66B95]">
                    <span className="text-xs font-bold uppercase tracking-wider">Recrutement</span>
                    <Sliders className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <div className="text-2xl font-black text-white font-display">
                    {recruitmentOpen ? 'OUVERT 🟢' : 'FERMÉ 🔴'}
                  </div>
                  <button
                    onClick={() => handleToggleRecruitmentStatus(!recruitmentOpen)}
                    className="text-[11px] font-bold text-[#3B66FF] hover:underline"
                  >
                    Basculer le statut →
                  </button>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black font-display uppercase text-white">
                      Actions Rapides Exécutif
                    </h3>
                    <p className="text-xs text-[#F3C4A0]/70">
                      Gérez les piliers du club en direct sur Supabase & Cloudinary.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => { handleTabSelect('gallery'); setIsUploadModalOpen(true); }}
                    className="p-5 rounded-2xl bg-[#B93A34]/20 border border-[#B93A34]/40 hover:bg-[#B93A34]/30 text-left transition-all space-y-2 group"
                  >
                    <Upload className="w-6 h-6 text-[#F3C4A0] group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Téléverser une Photo</h4>
                    <p className="text-xs text-[#F3C4A0]/70">Uploadez sur Cloudinary avec URL instantanée</p>
                  </button>

                  <button
                    onClick={() => handleTabSelect('applications')}
                    className="p-5 rounded-2xl bg-[#3B66FF]/20 border border-[#3B66FF]/40 hover:bg-[#3B66FF]/30 text-left transition-all space-y-2 group"
                  >
                    <UserCheck className="w-6 h-6 text-[#93C5FD] group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Gérer les Candidatures</h4>
                    <p className="text-xs text-[#F3C4A0]/70">Consulter et valider les nouveaux adhérents</p>
                  </button>

                  <button
                    onClick={() => handleTabSelect('event')}
                    className="p-5 rounded-2xl bg-[#4E4F9E]/20 border border-[#4E4F9E]/40 hover:bg-[#4E4F9E]/30 text-left transition-all space-y-2 group"
                  >
                    <Calendar className="w-6 h-6 text-[#F3C4A0] group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-sm text-white">Mettre à jour l'Événement</h4>
                    <p className="text-xs text-[#F3C4A0]/70">Changer l'affiche, la date et le programme</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 2: APPLICATIONS ══════════════════════ */}
          {activeTab === 'applications' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase text-white">
                    Candidatures & Recrutements
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Toutes les demandes d'adhésion soumises depuis le site officiel.
                  </p>
                </div>

                <button
                  onClick={loadApplications}
                  disabled={loadingApps}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-2 self-start"
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
                      className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                        appFilter === filter
                          ? 'bg-[#3B66FF] text-white'
                          : 'bg-white/5 text-[#F3C4A0]/70 hover:text-white'
                      }`}
                    >
                      {filter === 'all' ? 'Toutes' : filter === 'pending' ? 'En Attente' : filter === 'accepted' ? 'Acceptées' : filter === 'rejected' ? 'Refusées' : 'Contactées'}
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
                          <tr key={app.id || app.email} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white text-sm">{app.full_name}</div>
                              {app.motivation && (
                                <div className="text-[11px] text-[#F3C4A0]/60 truncate max-w-xs mt-0.5 italic">
                                  "{app.motivation}"
                                </div>
                              )}
                            </td>
                            <td className="p-4 space-y-1">
                              <div className="flex items-center gap-1.5 text-[#F3C4A0]/80">
                                <Mail className="w-3 h-3 text-[#3B66FF]" />
                                <span>{app.email}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#F3C4A0]/80">
                                <Phone className="w-3 h-3 text-[#22C55E]" />
                                <span>{app.phone}</span>
                              </div>
                            </td>
                            <td className="p-4 font-medium text-white">{app.major}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-full bg-[#4E4F9E]/20 border border-[#4E4F9E]/40 text-[#F3C4A0] text-[10px] font-bold">
                                {app.department}
                              </span>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  app.status === 'accepted'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : app.status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : app.status === 'contacted'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {app.status || 'pending'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => app.id && handleUpdateStatus(app.id, 'accepted')}
                                  title="Accepter"
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => app.id && handleUpdateStatus(app.id, 'rejected')}
                                  title="Refuser"
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => app.id && handleDeleteApplication(app.id)}
                                  title="Supprimer"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[#F3C4A0]/60 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
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

          {/* ══════════════════════ TAB 3: GALLERY & CLOUDINARY STUDIO ══════════════════════ */}
          {activeTab === 'gallery' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 shadow-xl">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B66FF]/15 border border-[#3B66FF]/35 text-[#93C5FD] text-[10px] font-black uppercase tracking-widest mb-2">
                    <Sparkles className="w-3 h-3" />
                    <span>Studio Multimédia Cloudinary & Supabase</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-display uppercase text-white">
                    {selectedAlbum === 'Tous' ? 'Gestionnaire d\'Albums & Photos' : `Album : ${selectedAlbum}`}
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    {selectedAlbum === 'Tous'
                      ? `${allAlbumNames.length} albums disponibles &middot; ${photos.length} photos au total dans la base de données.`
                      : `Gérez les photos, l'affiche et les souvenirs associés à cet album.`}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start flex-wrap">
                  {selectedAlbum !== 'Tous' && (
                    <button
                      onClick={() => setSelectedAlbum('Tous')}
                      className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Tous les albums</span>
                    </button>
                  )}

                  <button
                    onClick={loadPhotos}
                    disabled={loadingPhotos}
                    className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center gap-2 text-[#F3C4A0] hover:text-white transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingPhotos ? 'animate-spin' : ''}`} />
                    <span>Actualiser</span>
                  </button>

                  <button
                    onClick={() => setIsAlbumModalOpen(true)}
                    className="px-4 py-2.5 rounded-full bg-[#4E4F9E] hover:bg-[#4E4F9E]/90 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-transform hover:scale-102"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>+ Créer un Album</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewPhotoAlbum(selectedAlbum !== 'Tous' ? selectedAlbum : (allAlbumNames[0] || ''));
                      setIsUploadModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#B93A34]/30 hover:opacity-95 transition-transform hover:scale-102"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Ajouter des Photos</span>
                  </button>
                </div>
              </div>

              {/* ─── VUE 1 : TOUS LES ALBUMS ─── */}
              {selectedAlbum === 'Tous' && (
                <div className="space-y-8">
                  {/* Albums Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                        <Folder className="w-5 h-5 text-[#3B66FF]" />
                        <span>Vos Albums Thématiques ({richAlbums.length})</span>
                      </h3>
                      <span className="text-xs text-[#F3C4A0]/60">
                        Cliquez sur un album pour voir ses photos ou y ajouter du contenu
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {/* Interactive Card: Add New Album */}
                      <div
                        onClick={() => setIsAlbumModalOpen(true)}
                        className="group rounded-3xl border-2 border-dashed border-[#F3C4A0]/25 hover:border-[#3B66FF] p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] transition-all bg-[#14080F]/40 hover:bg-[#3B66FF]/5"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-[#4E4F9E]/20 group-hover:bg-[#3B66FF]/20 border border-[#4E4F9E]/40 group-hover:border-[#3B66FF]/50 flex items-center justify-center text-[#93C5FD] mb-3 transition-colors">
                          <FolderPlus className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-white text-sm uppercase group-hover:text-[#93C5FD] transition-colors">
                          Créer un Nouvel Album
                        </h4>
                        <p className="text-xs text-[#F3C4A0]/60 mt-1 max-w-[220px]">
                          Soirées, workshops, formations ou teambuilding.
                        </p>
                      </div>

                      {/* Album Cards */}
                      {richAlbums.map((album) => (
                        <div
                          key={album.name}
                          className="group relative rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 overflow-hidden shadow-xl hover:shadow-2xl hover:border-[#3B66FF]/50 transition-all flex flex-col justify-between min-h-[220px]"
                        >
                          {/* Background Cover */}
                          {album.coverUrl ? (
                            <img
                              src={album.coverUrl}
                              alt={album.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-35"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#1F0E18] via-[#14080F] to-[#2A0E1F]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#1F0E18] via-[#1F0E18]/85 to-transparent" />

                          {/* Top Badges */}
                          <div className="relative z-10 p-5 flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase text-white bg-[#3B66FF] shadow-md">
                              {album.category}
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 backdrop-blur-md text-[#F3C4A0]">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{album.photosCount} photos</span>
                            </div>
                          </div>

                          {/* Bottom Info & Quick Actions */}
                          <div className="relative z-10 p-5 space-y-3">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[#F3C4A0]/60">
                                {album.date}
                              </span>
                              <h4 className="text-lg font-black font-display uppercase text-white leading-tight truncate group-hover:text-[#93C5FD] transition-colors">
                                {album.name}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#F3C4A0]/15">
                              <button
                                onClick={() => setSelectedAlbum(album.name)}
                                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-[#3B66FF] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ouvrir l'Album</span>
                              </button>

                              <button
                                onClick={() => {
                                  setNewPhotoAlbum(album.name);
                                  setIsUploadModalOpen(true);
                                }}
                                className="p-2 rounded-xl bg-white/10 hover:bg-[#B93A34] text-[#F3C4A0] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                title="Ajouter des photos à cet album"
                              >
                                <Plus className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteAlbum(album.name)}
                                className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                                title="Supprimer cet album"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All Recent Photos Grid */}
                  <div className="space-y-4 pt-6 border-t border-[#F3C4A0]/15">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-[#B93A34]" />
                        <span>Toutes les Photos Importées ({photos.length})</span>
                      </h3>
                      <p className="text-xs text-[#F3C4A0]/60">
                        Aperçu global de toutes les images enregistrées
                      </p>
                    </div>

                    {loadingPhotos ? (
                      <div className="py-16 text-center text-[#F3C4A0]/60 space-y-2">
                        <RefreshCw className="w-8 h-8 animate-spin text-[#3B66FF] mx-auto" />
                        <p className="text-xs font-bold">Chargement des photos...</p>
                      </div>
                    ) : photos.length === 0 ? (
                      <div className="py-16 text-center rounded-3xl bg-[#1F0E18]/50 border border-dashed border-[#F3C4A0]/20 space-y-3 p-6">
                        <ImageIcon className="w-10 h-10 text-[#F3C4A0]/30 mx-auto" />
                        <h4 className="font-bold text-white text-sm">
                          Aucune photo dans la galerie
                        </h4>
                        <p className="text-xs text-[#F3C4A0]/50 max-w-sm mx-auto">
                          Votre galerie est vide. Cliquez sur "+ Créer un Album" ou "+ Ajouter des Photos" ci-dessus pour importer vos premiers clichés !
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative rounded-2xl bg-[#1F0E18] border border-[#F3C4A0]/20 overflow-hidden shadow-lg flex flex-col justify-between"
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-black/40">
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                title="Supprimer la photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="p-3 space-y-0.5">
                              <span className="text-[9px] font-bold text-[#3B66FF] uppercase tracking-wider block truncate">
                                {photo.album}
                              </span>
                              <h4 className="font-bold text-xs text-white truncate">{photo.title}</h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── VUE 2 : DANS UN ALBUM SPÉCIFIQUE (DRILL-DOWN) ─── */}
              {selectedAlbum !== 'Tous' && (
                <div className="space-y-6">
                  {/* Inside Album Banner */}
                  <div className="p-6 rounded-3xl bg-[#14080F] border border-[#F3C4A0]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase text-white bg-[#3B66FF]">
                          {richAlbums.find((a) => a.name === selectedAlbum)?.category || 'Soirées'}
                        </span>
                        <span className="text-xs font-bold text-[#F3C4A0]/70">
                          {filteredPhotos.length} photo(s) dans cet album
                        </span>
                      </div>
                      <h3 className="text-2xl font-black font-display uppercase text-white">
                        {selectedAlbum}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setNewPhotoAlbum(selectedAlbum);
                          setIsUploadModalOpen(true);
                        }}
                        className="px-5 py-2.5 rounded-full bg-[#B93A34] hover:bg-[#B93A34]/90 text-white text-xs font-bold flex items-center gap-2 shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Ajouter des Photos à cet Album</span>
                      </button>

                      <button
                        onClick={() => handleDeleteAlbum(selectedAlbum)}
                        className="px-4 py-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Supprimer cet Album</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Dropzone Banner */}
                  <input
                    type="file"
                    multiple
                    ref={directDropzoneInputRef}
                    onChange={(e) => handleDirectAlbumUpload(e, selectedAlbum)}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => directDropzoneInputRef.current?.click()}
                    className="p-8 rounded-3xl border-2 border-dashed border-[#F3C4A0]/30 hover:border-[#3B66FF] bg-[#1F0E18]/50 hover:bg-[#3B66FF]/5 transition-all text-center cursor-pointer space-y-2"
                  >
                    <Upload className="w-9 h-9 text-[#3B66FF] mx-auto" />
                    <h4 className="font-bold text-sm text-white">
                      Cliquez ou glissez-déposez des photos ici pour les ajouter directement à « {selectedAlbum} »
                    </h4>
                    <p className="text-xs text-[#F3C4A0]/60">
                      Sélection multiple supportée (JPG, PNG, WebP) &middot; Téléversement automatique sur Cloudinary
                    </p>
                    {uploadProgress && (
                      <div className="pt-2 text-xs font-bold text-[#93C5FD] flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{uploadProgressText || 'Téléversement en cours...'}</span>
                      </div>
                    )}
                  </div>

                  {/* Album Photos Grid */}
                  <div>
                    {filteredPhotos.length === 0 ? (
                      <div className="py-16 text-center rounded-3xl bg-[#1F0E18]/40 border border-dashed border-[#F3C4A0]/20 space-y-3 p-6">
                        <ImageIcon className="w-10 h-10 text-[#F3C4A0]/30 mx-auto" />
                        <h4 className="font-bold text-white text-sm">
                          Cet album ne contient aucune photo pour le moment
                        </h4>
                        <p className="text-xs text-[#F3C4A0]/50 max-w-sm mx-auto">
                          Utilisez la zone de dépôt ci-dessus ou le bouton "+ Ajouter des Photos" pour enrichir cet album.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative rounded-2xl bg-[#1F0E18] border border-[#F3C4A0]/20 overflow-hidden shadow-lg flex flex-col justify-between"
                          >
                            <div className="relative aspect-square w-full overflow-hidden bg-black/40">
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                title="Supprimer la photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="p-3 space-y-0.5">
                              <h4 className="font-bold text-xs text-white truncate">{photo.title}</h4>
                              <p className="text-[10px] text-[#F3C4A0]/50">{photo.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ══════════════════════ TAB 4: EVENT MANAGER ══════════════════════ */}
          {activeTab === 'event' && (
            <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-2xl font-black font-display uppercase text-white">
                  Événement Actif
                </h2>
                <p className="text-xs text-[#F3C4A0]/70">
                  Modifiez l'affiche, la date, le lieu et les informations de l'événement vedette.
                </p>
              </div>

              {eventSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Informations de l'événement enregistrées avec succès !</span>
                </div>
              )}

              <form onSubmit={handleSaveEvent} className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Titre de l'Événement
                    </label>
                    <input
                      type="text"
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white focus:border-[#3B66FF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Édition / Sous-titre
                    </label>
                    <input
                      type="text"
                      value={eventForm.edition}
                      onChange={(e) => setEventForm({ ...eventForm, edition: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white focus:border-[#3B66FF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Date & Heure
                    </label>
                    <input
                      type="text"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white focus:border-[#3B66FF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                      Lieu / Campus
                    </label>
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white focus:border-[#3B66FF] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-1">
                    Programme / Highlights
                  </label>
                  <textarea
                    rows={3}
                    value={eventForm.program}
                    onChange={(e) => setEventForm({ ...eventForm, program: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white focus:border-[#3B66FF] outline-none"
                  />
                </div>

                {/* Banner Upload / URL */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#F3C4A0] mb-2">
                    Affiche de l'Événement (Banner URL ou Fichier Cloudinary)
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-full sm:w-1/2 space-y-3">
                      <input
                        type="text"
                        value={eventForm.bannerUrl}
                        onChange={(e) => setEventForm({ ...eventForm, bannerUrl: e.target.value })}
                        placeholder="https://res.cloudinary.com/... ou /images/event_banner.jpg"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white focus:border-[#3B66FF] outline-none"
                      />

                      <input
                        type="file"
                        ref={bannerInputRef}
                        onChange={handleBannerFileSelect}
                        accept="image/*"
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={bannerUploadLoading}
                        className="px-4 py-2 rounded-xl bg-[#3B66FF]/20 hover:bg-[#3B66FF]/30 border border-[#3B66FF]/40 text-xs font-bold text-[#93C5FD] flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{bannerUploadLoading ? 'Upload vers Cloudinary...' : 'Choisir une image locale (Cloudinary)'}</span>
                      </button>
                    </div>

                    <div className="w-full sm:w-1/2 aspect-video rounded-2xl overflow-hidden bg-black/40 border border-[#F3C4A0]/20">
                      <img
                        src={eventForm.bannerUrl || '/images/event_banner.jpg'}
                        alt="Aperçu Affiche"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl shadow-[#B93A34]/30 hover:opacity-90"
                >
                  Enregistrer les Modifications
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════════ TAB 5: TEAM MEMBERS ══════════════════════ */}
          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black font-display uppercase text-white">
                    Bureau Exécutif (Le Bureau)
                  </h2>
                  <p className="text-xs text-[#F3C4A0]/70">
                    Ajoutez et mettez à jour les membres officiels du bureau du club.
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
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#B93A34]/30 hover:opacity-90 self-start"
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
                        className="text-[#3B66FF] font-bold hover:underline"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════ TAB 6: SETTINGS ══════════════════════ */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-2xl font-black font-display uppercase text-white">
                  Paramètres Généraux du Club
                </h2>
                <p className="text-xs text-[#F3C4A0]/70">
                  Configurez le statut des recrutements et les clés d'intégration.
                </p>
              </div>

              <div className="p-6 sm:p-8 rounded-3xl bg-[#1F0E18] border border-[#F3C4A0]/20 space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-[#F3C4A0]/15">
                  <div>
                    <h4 className="font-bold text-sm text-white">Statut des Recrutements</h4>
                    <p className="text-xs text-[#F3C4A0]/70">
                      Ouvrir ou suspendre le formulaire de candidature sur la page d'accueil.
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleRecruitmentStatus(!recruitmentOpen)}
                    className={`px-5 py-2.5 rounded-full text-xs font-black uppercase transition-all shadow-md ${
                      recruitmentOpen
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                        : 'bg-rose-500 text-white shadow-rose-500/30'
                    }`}
                  >
                    {recruitmentOpen ? 'Recrutement Ouvert' : 'Recrutement Suspendu'}
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white">Intégrations Cloud & BaaS</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#11070D] border border-[#F3C4A0]/15">
                      <span>Supabase BaaS</span>
                      <span className="font-bold text-emerald-400">
                        {isSupabaseConfigured ? '✓ Actif & Connecté' : 'Non configuré (Vérifier .env.local)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#11070D] border border-[#F3C4A0]/15">
                      <span>Cloudinary Image CDN</span>
                      <span className="font-bold text-blue-400">
                        {CLOUDINARY_CONFIG.cloudName ? `✓ Connecté (${CLOUDINARY_CONFIG.cloudName})` : 'Non configuré'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

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
              <button
                onClick={() => setIsAlbumModalOpen(false)}
                className="p-1 text-[#F3C4A0] hover:text-white"
              >
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
                  <option value="Soirées">Soirées & Concerts</option>
                  <option value="Workshops">Workshops & Formations</option>
                  <option value="Teambuilding">Teambuilding & Intégration</option>
                </select>
              </div>

              {/* Cover Photo Upload */}
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
                    {newAlbumCoverFile ? newAlbumCoverFile.name : 'Sélectionner l\'affiche / photo de couverture'}
                  </p>
                  <p className="text-[10px] text-[#F3C4A0]/50">
                    PNG, JPG ou WebP téléversé directement sur Cloudinary
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#F3C4A0]/70 mb-1">
                  Ou URL d'image externe
                </label>
                <input
                  type="url"
                  value={newAlbumCoverUrl}
                  onChange={(e) => setNewAlbumCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3C4A0]/15">
                <button
                  type="button"
                  onClick={() => setIsAlbumModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#F3C4A0]/70 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={albumModalLoading}
                  className="px-6 py-2.5 rounded-full bg-[#4E4F9E] text-white text-xs font-bold shadow-lg hover:bg-[#4E4F9E]/90 disabled:opacity-50 flex items-center gap-2"
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
                  Importez une ou plusieurs photos dans l'album de votre choix.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-[#F3C4A0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-[#B93A34]/20 border border-[#B93A34]/40 text-xs text-rose-200">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleAddPhotoSubmit} className="space-y-4">
              
              {/* Album Selection */}
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={newCustomAlbumName}
                        onChange={(e) => setNewCustomAlbumName(e.target.value)}
                        placeholder="Nom du nouvel album (ex: Gala 2026, Workshop UX...)"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#3B66FF] text-sm text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewAlbumInUploadModal(false)}
                        className="px-3 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-[#F3C4A0] hover:text-white"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Titre optionnel (si 1 photo) */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                  Titre / Légende (Optionnel)
                </label>
                <input
                  type="text"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  placeholder="Ex: Soirée Concert & DJ Set (si vide, le nom du fichier sera utilisé)"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-sm text-white outline-none focus:border-[#3B66FF]"
                />
              </div>

              {/* Multiple Local Files Picker */}
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

                {uploadFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-[#11070D] rounded-xl border border-[#F3C4A0]/10">
                    {uploadFiles.map((f, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white truncate max-w-[150px]">
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative flex items-center justify-center my-2">
                <span className="bg-[#1F0E18] px-3 text-[10px] uppercase font-bold text-[#F3C4A0]/50 z-10">
                  Ou URL d'image externe
                </span>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#F3C4A0]/15" />
                </div>
              </div>

              <div>
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none focus:border-[#3B66FF]"
                />
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
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1 text-[#F3C4A0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    Nom & Prénom
                  </label>
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
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    Rôle / Titre
                  </label>
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
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    Symbole Carte
                  </label>
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
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    Couleur Symbole
                  </label>
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
                    className="px-4 py-2 rounded-xl bg-[#3B66FF]/20 hover:bg-[#3B66FF]/30 border border-[#3B66FF]/40 text-xs font-bold text-[#93C5FD] flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{avatarUploadLoading ? 'Upload...' : 'Uploader'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="text"
                    value={memberForm.socials?.instagram || '#'}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        socials: { ...memberForm.socials, instagram: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#F3C4A0] mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="text"
                    value={memberForm.socials?.linkedin || '#'}
                    onChange={(e) =>
                      setMemberForm({
                        ...memberForm,
                        socials: { ...memberForm.socials, linkedin: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#11070D] border border-[#F3C4A0]/20 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl hover:opacity-90 mt-2"
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
