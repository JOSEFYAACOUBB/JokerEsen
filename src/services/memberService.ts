import type {
  ClubMember,
  MemberCertificate,
  ForumIdea,
  MemberResource,
  MemberEventRegistration,
  MemberLevel,
} from '../types/member';

const STORAGE_KEYS = {
  MEMBERS: 'joker_members_list',
  CURRENT_MEMBER: 'joker_current_member',
  CERTIFICATES: 'joker_member_certificates',
  IDEAS: 'joker_forum_ideas',
  RESOURCES: 'joker_member_resources',
  REGISTRATIONS: 'joker_event_registrations',
};

// Initial Demo Members (Admin-created accounts)
const INITIAL_DEMO_MEMBERS: ClubMember[] = [
  {
    id: 'mem-001',
    full_name: 'Amine Ben Ali',
    email: 'amine.benali@esen.tn',
    password: 'password123',
    cin: '09876543',
    phone: '22 123 456',
    major: 'Licence Business Computing (LBC)',
    department: 'Développement Web & IA',
    role: 'staff',
    level: 'Or',
    points: 1850,
    badges: ['Newcomer', 'Knowledge Seeker', 'Super Actif', 'Leader'],
    join_date: '2023-10-15',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    bio: 'Passionné par le développement Web fullstack et la cyber-sécurité. Trésorier adjoint du club Joker ESEN.',
    skills: ['React', 'TypeScript', 'Node.js', 'UI/UX Design', 'Git'],
    status: 'active',
    events_attended: 12,
    formations_completed: 8,
    streak_months: 5,
  },
  {
    id: 'mem-002',
    full_name: 'Sarra Mansouri',
    email: 'sarra.mansouri@esen.tn',
    password: 'password123',
    cin: '11223344',
    phone: '55 987 654',
    major: 'Master E-Business (MEB)',
    department: 'Communication & Design',
    role: 'moderator',
    level: 'Platine',
    points: 3420,
    badges: ['Newcomer', 'Knowledge Seeker', 'Super Actif', 'Mentor', 'Innovateur', 'Leader', 'Expert Certifié', 'On Fire'],
    join_date: '2022-09-20',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    bio: 'Responsable Communication & Branding Joker ESEN. Passionnée de Digital Marketing.',
    skills: ['Photoshop', 'Canva', 'Social Media', 'Copywriting', 'Public Speaking'],
    status: 'active',
    events_attended: 24,
    formations_completed: 15,
    streak_months: 12,
  },
  {
    id: 'mem-003',
    full_name: 'Youssef Karray',
    email: 'youssef.karray@esen.tn',
    password: 'password123',
    cin: '07456123',
    phone: '98 333 444',
    major: 'Licence Business Analytics (LBA)',
    department: 'Événementiel & Logistique',
    role: 'member',
    level: 'Argent',
    points: 850,
    badges: ['Newcomer', 'Knowledge Seeker'],
    join_date: '2024-01-10',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    bio: 'Membre actif pôle logistique. Toujours prêt à donner un coup de main lors des événements Joker.',
    skills: ['Logistique', 'Organisation', 'Gestion du Temps', 'Data Analysis'],
    status: 'active',
    events_attended: 6,
    formations_completed: 4,
    streak_months: 3,
  },
  {
    id: 'mem-004',
    full_name: 'Nour El Hoda Gharbi',
    email: 'nour.gharbi@esen.tn',
    password: 'password123',
    cin: '12345678',
    phone: '20 555 666',
    major: 'Licence E-Commerce (LEC)',
    department: 'Sponsoring & Relations Extérieures',
    role: 'member',
    level: 'Bronze',
    points: 380,
    badges: ['Newcomer'],
    join_date: '2024-02-01',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    bio: 'Nouveau membre motivé. Négociation de partenariats et sponsoring pour le club.',
    skills: ['Négociation', 'Cold Mailing', 'Relations Publiques'],
    status: 'active',
    events_attended: 3,
    formations_completed: 2,
    streak_months: 1,
  },
];

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
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_DEMO_MEMBERS));
      return INITIAL_DEMO_MEMBERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DEMO_MEMBERS;
  }
}

export function saveStoredMembers(members: ClubMember[]) {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
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

  // Simple password check (defaults to password123 if not explicitly set)
  const validPassword = found.password || 'password123';
  if (pass !== validPassword) {
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
// Admin Member Management (CRUD)
// ------------------------------------------------------------------------------

export function createMemberByAdmin(memberData: Omit<ClubMember, 'id' | 'points' | 'level' | 'badges' | 'join_date' | 'status'>): ClubMember {
  const members = getStoredMembers();
  const newMember: ClubMember = {
    ...memberData,
    id: `mem-${Date.now().toString().slice(-4)}`,
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

  members.unshift(newMember);
  saveStoredMembers(members);
  return newMember;
}

export function updateMemberStatus(memberId: string, status: 'active' | 'suspended'): ClubMember[] {
  const members = getStoredMembers();
  const updated = members.map((m) => (m.id === memberId ? { ...m, status } : m));
  saveStoredMembers(updated);
  return updated;
}

export function addPointsToMember(memberId: string, amount: number, _reason?: string): ClubMember[] {
  const members = getStoredMembers();
  const updated = members.map((m) => {
    if (m.id === memberId) {
      const newPoints = Math.max(0, m.points + amount);
      const newLevel = calculateLevel(newPoints);
      return {
        ...m,
        points: newPoints,
        level: newLevel,
      };
    }
    return m;
  });

  saveStoredMembers(updated);

  // Sync current active session if it's the logged-in member
  const current = getCurrentMemberSession();
  if (current && current.id === memberId) {
    const updatedSelf = updated.find((m) => m.id === memberId);
    if (updatedSelf) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_MEMBER, JSON.stringify(updatedSelf));
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

  // Award +20 points for proposing an idea!
  addPointsToMember(author.id, 20, 'Proposition d\'idée sur le forum');

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

export function getMemberEventRegistrations(memberId: string): MemberEventRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    const registrations: MemberEventRegistration[] = raw ? JSON.parse(raw) : [];
    return registrations.filter((r) => r.member_id === memberId);
  } catch (e) {
    return [];
  }
}

export function toggleEventRegistration(member: ClubMember, eventId: string, eventTitle: string): { registrations: MemberEventRegistration[]; isRegistered: boolean } {
  const raw = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
  let allRegs: MemberEventRegistration[] = raw ? JSON.parse(raw) : [];

  const existingIndex = allRegs.findIndex((r) => r.member_id === member.id && r.event_id === eventId);
  let isRegistered = false;

  if (existingIndex >= 0) {
    // Cancel registration
    allRegs.splice(existingIndex, 1);
    isRegistered = false;
  } else {
    // Register
    const newReg: MemberEventRegistration = {
      id: `reg-${Date.now()}`,
      event_id: eventId,
      event_title: eventTitle,
      member_id: member.id,
      status: 'confirmed',
      registered_at: new Date().toISOString().split('T')[0],
    };
    allRegs.push(newReg);
    isRegistered = true;

    // Award +10 pts for event registration!
    addPointsToMember(member.id, 10, `Inscription événement: ${eventTitle}`);
  }

  localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(allRegs));
  return {
    registrations: allRegs.filter((r) => r.member_id === member.id),
    isRegistered,
  };
}
