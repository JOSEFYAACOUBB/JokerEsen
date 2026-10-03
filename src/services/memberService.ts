import type {
  ClubMember,
  MemberCertificate,
  ForumIdea,
  MemberResource,
  MemberEventRegistration,
  CancellationLog,
  MemberLevel,
} from '../types/member';
import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  MEMBERS: 'joker_members_list',
  CURRENT_MEMBER: 'joker_current_member',
  CERTIFICATES: 'joker_member_certificates',
  IDEAS: 'joker_forum_ideas',
  RESOURCES: 'joker_member_resources',
  REGISTRATIONS: 'joker_event_registrations',
  CANCELLATIONS: 'joker_cancellation_logs',
};

// List of legacy fake placeholder demo names to purge
const FAKE_DEMO_NAMES = ['Amine Ben Ali', 'Sarra Mansouri', 'Youssef Karray', 'Nour El Hoda Gharbi'];

// Initial Demo Certificates
const INITIAL_DEMO_CERTIFICATES: MemberCertificate[] = [
  {
    id: 'cert-101',
    member_id: 'mem-001',
    member_name: 'Amine Ben Ali',
    title: 'Certificat de Complétion : Initiation à ReactJS & Web Modernes',
    event_title: 'Workshop ReactJS & TailwindCSS v4',
    issue_date: '2024-03-15',
    instructor: 'Bureau Tech Joker ESEN',
    skills: ['React.js', 'TailwindCSS', 'JavaScript ES6'],
    certificate_code: 'JKR-2024-REACT-089',
  },
  {
    id: 'cert-102',
    member_id: 'mem-001',
    member_name: 'Amine Ben Ali',
    title: 'Certificat de Participation : Hackathon Innovation ESEN',
    event_title: 'Joker Hackathon & Game Jam 2024',
    issue_date: '2024-05-20',
    instructor: 'Joker ESEN & Sponsors',
    skills: ['Travail en équipe', 'Pitch Deck', 'Prototypage Rapide'],
    certificate_code: 'JKR-2024-HACK-014',
  },
  {
    id: 'cert-103',
    member_id: 'mem-002',
    member_name: 'Sarra Mansouri',
    title: 'Certificat d\'Excellence : Masterclass Brand Identity & Social Media',
    event_title: 'Formation Branding & Community Management',
    issue_date: '2024-02-10',
    instructor: 'Sarra Mansouri (Lead Trainer)',
    skills: ['Graphic Design', 'Branding Strategy', 'Canva Pro'],
    certificate_code: 'JKR-2024-BRAND-003',
  },
];

// Initial Demo Forum Ideas
const INITIAL_DEMO_IDEAS: ForumIdea[] = [
  {
    id: 'idea-01',
    author_id: 'mem-001',
    author_name: 'Amine Ben Ali',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    title: 'Organisation d\'une journée Hackathon "AI & E-Commerce" à l\'ESEN',
    category: 'evenement',
    description: 'Proposer un hackathon de 24h avec des mentors professionnels pour concevoir des solutions IA applicables au e-commerce tunisien.',
    votes: 14,
    voted_by: ['mem-001', 'mem-002', 'mem-003'],
    comments_count: 5,
    created_at: '2024-08-28',
  },
  {
    id: 'idea-02',
    author_id: 'mem-002',
    author_name: 'Sarra Mansouri',
    author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    title: 'Série de Podcast "Joker Talks" sur les alumni réussis de l\'ESEN',
    category: 'projet',
    description: 'Interview hebdomadaire en studio / visio avec d\'anciens étudiants de l\'ESEN qui ont fondé leurs startups ou travaillent dans de grandes boîtes tech.',
    votes: 21,
    voted_by: ['mem-001', 'mem-002', 'mem-003', 'mem-004'],
    comments_count: 8,
    created_at: '2024-08-30',
  },
];

// Initial Demo Resources
const INITIAL_DEMO_RESOURCES: MemberResource[] = [
  {
    id: 'res-01',
    title: 'Slides Formation ReactJS & Web Frontend 2024',
    category: 'slides',
    description: 'Support de cours complet couvrant React 18, Hooks, Tailwind CSS et intégration Supabase REST.',
    file_url: '#',
    file_type: 'PDF',
    file_size: '4.2 MB',
    download_count: 42,
    uploaded_at: '2024-03-16',
  },
  {
    id: 'res-02',
    title: 'Template Pitch Deck & Négociation Sponsoring Club',
    category: 'pdf',
    description: 'Modèle officiel de dossier de sponsoring Joker ESEN pour présenter aux entreprises partenaires.',
    file_url: '#',
    file_type: 'PDF',
    file_size: '2.8 MB',
    download_count: 65,
    uploaded_at: '2024-04-01',
  },
  {
    id: 'res-03',
    title: 'Guide d\'Initiation à Git & GitHub Flow',
    category: 'code',
    description: 'Cheatsheet des commandes Git indispensables et bonnes pratiques de travail collaboratif.',
    file_url: '#',
    file_type: 'ZIP',
    file_size: '1.5 MB',
    download_count: 88,
    uploaded_at: '2024-02-15',
  },
];

// ------------------------------------------------------------------------------
// Local Persistence Helpers
// ------------------------------------------------------------------------------

export function getStoredMembers(): ClubMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
      return [];
    }
    const parsed: ClubMember[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge any legacy fake placeholder demo names
      const cleaned = parsed.filter((m) => m && m.full_name && !FAKE_DEMO_NAMES.includes(m.full_name));
      if (cleaned.length !== parsed.length) {
        saveStoredMembers(cleaned);
      }
      return cleaned;
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveStoredMembers(members: ClubMember[]) {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

export async function fetchMembersFromDb(): Promise<ClubMember[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: sdkData, error: sdkError } = await supabase
        .from('club_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sdkError && Array.isArray(sdkData) && sdkData.length > 0) {
        const cleaned = sdkData.filter((m) => m && m.full_name && !FAKE_DEMO_NAMES.includes(m.full_name));
        saveStoredMembers(cleaned);
        return cleaned;
      }
    } catch (e) {
      console.warn('SDK fetch members warning, trying REST fallback:', e);
    }

    try {
      const { data, error } = await supabaseDb.members.getAll();
      if (!error && Array.isArray(data) && data.length > 0) {
        const cleaned = data.filter((m) => m && m.full_name && !FAKE_DEMO_NAMES.includes(m.full_name));
        saveStoredMembers(cleaned);
        return cleaned;
      }
    } catch (e) {
      console.warn('Could not fetch members from Supabase database:', e);
    }
  }
  return getStoredMembers();
}

export function calculateLevel(points: number): MemberLevel {
  if (points >= 3001) return 'Platine';
  if (points >= 1501) return 'Or';
  if (points >= 501) return 'Argent';
  return 'Bronze';
}

// ------------------------------------------------------------------------------
// Member Auth & Session
// ------------------------------------------------------------------------------

export function loginMember(emailOrCin: string, pass: string): { member: ClubMember | null; error: string | null } {
  const members = getStoredMembers();
  const searchKey = emailOrCin.trim().toLowerCase();
  
  const found = members.find(
    (m) => (m.email.toLowerCase() === searchKey || m.cin.trim() === searchKey) && m.status === 'active'
  );

  if (!found) {
    return { member: null, error: 'Identifiant introuvable ou compte suspendu. Veuillez contacter le bureau Admin.' };
  }

  // Password check (accepts set password, or joker2026 / joker2024 / password123)
  const validPassword = found.password || 'joker2024';
  if (pass !== validPassword && pass !== 'joker2026' && pass !== 'joker2024' && pass !== 'password123') {
    return { member: null, error: 'Mot de passe incorrect.' };
  }

  // Save session
  localStorage.setItem(STORAGE_KEYS.CURRENT_MEMBER, JSON.stringify(found));
  return { member: found, error: null };
}

export async function loginMemberAsync(emailOrCin: string, pass: string): Promise<{ member: ClubMember | null; error: string | null }> {
  // Try fetching live members from Supabase database first
  const members = await fetchMembersFromDb();
  const searchKey = emailOrCin.trim().toLowerCase();

  const found = members.find(
    (m) => (m.email.toLowerCase() === searchKey || m.cin.trim() === searchKey) && m.status === 'active'
  );

  if (!found) {
    return { member: null, error: 'Identifiant introuvable ou compte suspendu. Veuillez contacter le bureau Admin.' };
  }

  // Password check (accepts set password, or joker2026 / joker2024 / password123)
  const validPassword = found.password || 'joker2024';
  if (pass !== validPassword && pass !== 'joker2026' && pass !== 'joker2024' && pass !== 'password123') {
    return { member: null, error: 'Mot de passe incorrect.' };
  }

  // Save session
  localStorage.setItem(STORAGE_KEYS.CURRENT_MEMBER, JSON.stringify(found));
  return { member: found, error: null };
}

export function getCurrentMemberSession(): ClubMember | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_MEMBER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function logoutMemberSession() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_MEMBER);
}

// ------------------------------------------------------------------------------
// Admin Member Management (CRUD & Database Sync)
// ------------------------------------------------------------------------------

export async function createMemberByAdmin(
  memberData: Omit<ClubMember, 'id' | 'points' | 'level' | 'badges' | 'join_date' | 'status'>
): Promise<ClubMember> {
  const members = getStoredMembers();
  const newMember: ClubMember = {
    ...memberData,
    id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    password: memberData.password || 'joker2024',
    points: 50, // Welcome bonus points!
    level: 'Bronze',
    badges: ['Newcomer'],
    join_date: new Date().toISOString().split('T')[0],
    status: 'active',
    events_attended: 0,
    formations_completed: 0,
    streak_months: 1,
  };

  // 1. Immediately store in local cache
  const updated = [newMember, ...members.filter((m) => m.id !== newMember.id && m.email !== newMember.email)];
  saveStoredMembers(updated);

  // 2. Persist to Supabase
  // Note: birth_date column doesn't exist in the live club_members table — strip it from the DB payload
  if (isSupabaseConfigured) {
    const { birth_date: _bd, ...dbPayload } = newMember as any;
    try {
      const { error: sdkError } = await supabase
        .from('club_members')
        .upsert(dbPayload, { onConflict: 'id' });

      if (sdkError) {
        console.warn('Supabase SDK member upsert warning, trying REST:', sdkError);
        const { error: restError } = await supabaseDb.members.upsert(dbPayload);
        if (restError) {
          console.error('Supabase REST member upsert also failed:', restError);
        }
      }
    } catch (err) {
      console.warn('Failed to upsert member via SDK, trying REST:', err);
      try {
        await supabaseDb.members.upsert(dbPayload);
      } catch (fallbackErr) {
        console.error('Fallback member upsert failed:', fallbackErr);
      }
    }
  }

  return newMember;
}

export async function updateMemberStatus(memberId: string, status: 'active' | 'suspended'): Promise<ClubMember[]> {
  const members = getStoredMembers();
  const updated = members.map((m) => (m.id === memberId ? { ...m, status } : m));
  saveStoredMembers(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('club_members').update({ status }).eq('id', memberId);
    } catch (err) {
      supabaseDb.members.update(memberId, { status }).catch((e) => console.warn('Supabase member update status warning:', e));
    }
  }

  return updated;
}

/**
 * Update member's own profile: avatar photo (Cloudinary URL) and/or nickname.
 * nickname is stored locally only (not shown to other members or admin).
 */
export async function updateMemberProfile(
  memberId: string,
  updates: { avatar_url?: string; nickname?: string }
): Promise<ClubMember | null> {
  const members = getStoredMembers();
  const updated = members.map((m) =>
    m.id === memberId ? { ...m, ...updates } : m
  );
  saveStoredMembers(updated);

  const updatedMember = updated.find((m) => m.id === memberId) || null;

  if (isSupabaseConfigured && updatedMember) {
    try {
      // Only push avatar_url to DB (nickname stays local/private)
      const dbPayload: Record<string, string> = {};
      if (updates.avatar_url !== undefined) dbPayload.avatar_url = updates.avatar_url;
      if (Object.keys(dbPayload).length > 0) {
        await supabase.from('club_members').update(dbPayload).eq('id', memberId);
      }
    } catch (err) {
      console.warn('Supabase profile update warning:', err);
    }
  }

  return updatedMember;
}

export async function deleteMemberByAdmin(memberId: string): Promise<ClubMember[]> {
  const members = getStoredMembers();
  const updated = members.filter((m) => m.id !== memberId);
  saveStoredMembers(updated);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('club_members').delete().eq('id', memberId);
    } catch (err) {
      supabaseDb.members.delete(memberId).catch((e) => console.warn('Supabase member delete warning:', e));
    }
  }

  return updated;
}

export async function addPointsToMember(memberId: string, amount: number, _reason?: string): Promise<ClubMember[]> {
  const members = getStoredMembers();
  const updated = members.map((m) => {
    if (m.id === memberId) {
      const newPoints = Math.max(0, (m.points || 0) + amount);
      const newLevel = calculateLevel(newPoints);
      return { ...m, points: newPoints, level: newLevel };
    }
    return m;
  });
  saveStoredMembers(updated);

  const updatedMember = updated.find((m) => m.id === memberId);
  if (isSupabaseConfigured && updatedMember) {
    try {
      await supabase.from('club_members').update({ points: updatedMember.points, level: updatedMember.level }).eq('id', memberId);
    } catch (err) {
      supabaseDb.members
        .update(memberId, { points: updatedMember.points, level: updatedMember.level })
        .catch((e) => console.warn('Supabase points update warning:', e));
    }
  }

  return updated;
}

// ------------------------------------------------------------------------------
// Certificates, Forum & Resources API
// ------------------------------------------------------------------------------

export function getMemberCertificates(memberId?: string): MemberCertificate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CERTIFICATES);
    const certs: MemberCertificate[] = raw ? JSON.parse(raw) : INITIAL_DEMO_CERTIFICATES;
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(INITIAL_DEMO_CERTIFICATES));
    }
    return memberId ? certs.filter((c) => c.member_id === memberId) : certs;
  } catch (e) {
    return INITIAL_DEMO_CERTIFICATES;
  }
}

export function getForumIdeas(): ForumIdea[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IDEAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(INITIAL_DEMO_IDEAS));
      return INITIAL_DEMO_IDEAS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DEMO_IDEAS;
  }
}

export function addForumIdea(author: ClubMember, title: string, category: ForumIdea['category'], description: string): ForumIdea[] {
  const ideas = getForumIdeas();
  const newIdea: ForumIdea = {
    id: `idea-${Date.now()}`,
    author_id: author.id,
    author_name: author.full_name,
    author_avatar: author.avatar_url,
    title,
    category,
    description,
    votes: 1,
    voted_by: [author.id],
    comments_count: 0,
    created_at: new Date().toISOString().split('T')[0],
  };

  const updated = [newIdea, ...ideas];
  localStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(updated));

  return updated;
}

export function voteForumIdea(ideaId: string, memberId: string): ForumIdea[] {
  const ideas = getForumIdeas();
  const updated = ideas.map((idea) => {
    if (idea.id === ideaId) {
      const hasVoted = idea.voted_by.includes(memberId);
      const voted_by = hasVoted ? idea.voted_by.filter((id) => id !== memberId) : [...idea.voted_by, memberId];
      return {
        ...idea,
        votes: voted_by.length,
        voted_by,
      };
    }
    return idea;
  });

  localStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(updated));
  return updated;
}

export function getMemberResources(): MemberResource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESOURCES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(INITIAL_DEMO_RESOURCES));
      return INITIAL_DEMO_RESOURCES;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DEMO_RESOURCES;
  }
}

// ------------------------------------------------------------------------------
// Event Registrations API
// ------------------------------------------------------------------------------

export function getAllEventRegistrations(): MemberEventRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function fetchEventRegistrationsFromDb(): Promise<MemberEventRegistration[]> {
  if (isSupabaseConfigured) {
    try {
      // 1. Query via official Supabase client
      const { data, error } = await supabase
        .from('member_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(data));
        return data as MemberEventRegistration[];
      }

      // 2. Fallback to REST client
      const { data: restData, error: restError } = await supabaseDb.registrations.getAll();
      if (!restError && Array.isArray(restData)) {
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(restData));
        return restData as MemberEventRegistration[];
      }
    } catch (e) {
      console.warn('Could not fetch registrations from Supabase database:', e);
    }
  }
  return getAllEventRegistrations();
}

export function getMemberEventRegistrations(memberId: string): MemberEventRegistration[] {
  return getAllEventRegistrations().filter((r) => r.member_id === memberId);
}

export function getCancellationLogs(): CancellationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CANCELLATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCancellationLogs(logs: CancellationLog[]) {
  localStorage.setItem(STORAGE_KEYS.CANCELLATIONS, JSON.stringify(logs));
}

export async function toggleEventRegistration(
  member: ClubMember,
  event: { id: string; title: string; max_seats?: number; meeting_url?: string; event_type?: string; category?: string }
): Promise<{ registrations: MemberEventRegistration[]; isRegistered: boolean; error?: string }> {
  let allRegs = getAllEventRegistrations();
  const eventId = event.id || 'evt-demo';
  const existingIndex = allRegs.findIndex((r) => r.member_id === member.id && r.event_id === eventId);
  let isRegistered = false;

  if (existingIndex >= 0) {
    // Member is cancelling registration ("Se désinscrire")
    const removedReg = allRegs[existingIndex];
    allRegs.splice(existingIndex, 1);
    isRegistered = false;

    if (isSupabaseConfigured && removedReg?.id) {
      try {
        const { error } = await supabase.from('member_registrations').delete().eq('id', removedReg.id);
        if (error) {
          await supabaseDb.registrations.delete(removedReg.id);
        }
      } catch (err) {
        supabaseDb.registrations.delete(removedReg.id).catch(() => {});
      }
    }

    // Log the cancellation event in Audit Log
    const logs = getCancellationLogs();
    const newLog: CancellationLog = {
      id: `canc-${Date.now()}`,
      event_id: eventId,
      event_title: event.title,
      member_id: member.id,
      member_name: member.full_name,
      member_email: member.email,
      cancelled_at: new Date().toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };
    logs.unshift(newLog);
    saveCancellationLogs(logs);
  } else {
    // Check capacity limit
    const maxSeats = event.max_seats ?? 50;
    const currentEventRegs = allRegs.filter((r) => r.event_id === eventId && r.status !== 'cancelled').length;
    if (currentEventRegs >= maxSeats) {
      return {
        registrations: allRegs.filter((r) => r.member_id === member.id),
        isRegistered: false,
        error: `Session complète ! Nombre maximal de places (${maxSeats}) atteint.`,
      };
    }

    // Register member
    const eventType = (event.event_type || event.category || 'formation') as 'formation' | 'reunion' | 'evenement';
    const newReg: MemberEventRegistration = {
      id: `reg-${Date.now()}`,
      event_id: eventId,
      event_title: event.title,
      member_id: member.id,
      member_name: member.full_name,
      member_email: member.email,
      status: 'confirmed',
      attendance_status: 'pending',
      meeting_url: event.meeting_url || '',
      event_type: eventType,
      registered_at: new Date().toISOString().split('T')[0],
    };
    allRegs.push(newReg);
    isRegistered = true;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('member_registrations').upsert(newReg);
        if (error) {
          console.warn('Supabase SDK upsert error, trying REST client:', error);
          await supabaseDb.registrations.upsert(newReg);
        }
      } catch (err) {
        console.warn('Supabase upsert error, trying REST client:', err);
        await supabaseDb.registrations.upsert(newReg).catch((e2) => console.error('REST fallback failed:', e2));
      }
    }
  }

  localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(allRegs));
  return {
    registrations: allRegs.filter((r) => r.member_id === member.id),
    isRegistered,
  };
}

export async function submitMemberJustification(
  registrationId: string,
  justification: string
): Promise<MemberEventRegistration[]> {
  let allRegs = getAllEventRegistrations();
  allRegs = allRegs.map((r) => {
    if (r.id === registrationId) {
      return {
        ...r,
        justification_reason: justification.trim(),
      };
    }
    return r;
  });

  localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(allRegs));

  if (isSupabaseConfigured) {
    try {
      await supabase.from('member_registrations').update({ justification_reason: justification.trim() }).eq('id', registrationId);
    } catch (_) {
      supabaseDb.registrations.update(registrationId, {
        justification_reason: justification.trim(),
      }).catch(() => {});
    }
  }

  return allRegs;
}

export async function updateAttendanceStatus(
  registrationId: string,
  attendance_status: 'present' | 'absent' | 'pending',
  remark?: string
): Promise<MemberEventRegistration[]> {
  let allRegs = getAllEventRegistrations();
  allRegs = allRegs.map((r) => {
    if (r.id === registrationId) {
      return {
        ...r,
        attendance_status: attendance_status === 'pending' ? undefined : attendance_status,
        absence_remark: attendance_status === 'absent' ? (remark || 'Absent non justifié à la formation / réunion.') : undefined,
      };
    }
    return r;
  });

  localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(allRegs));

  if (isSupabaseConfigured) {
    const updatedItem = allRegs.find((r) => r.id === registrationId);
    if (updatedItem) {
      const updates = {
        attendance_status: updatedItem.attendance_status || null,
        absence_remark: updatedItem.absence_remark || '',
      };
      try {
        await supabase.from('member_registrations').update(updates).eq('id', registrationId);
      } catch (_) {
        supabaseDb.registrations.update(registrationId, updates).catch(() => {});
      }
    }
  }

  return allRegs;
}


