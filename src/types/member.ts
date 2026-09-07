export type MemberRole = 'member' | 'moderator' | 'staff';
export type MemberLevel = 'Bronze' | 'Argent' | 'Or' | 'Platine';
export type MemberStatus = 'active' | 'suspended';

export interface ClubMember {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  cin: string;
  phone: string;
  major: string;
  department: string;
  role: MemberRole;
  level: MemberLevel;
  points: number;
  badges: string[];
  join_date: string;
  avatar_url?: string;
  bio?: string;
  skills?: string[];
  status: MemberStatus;
  events_attended?: number;
  formations_completed?: number;
  streak_months?: number;
}

export interface MemberCertificate {
  id: string;
  member_id: string;
  member_name: string;
  title: string;
  event_title: string;
  issue_date: string;
  instructor: string;
  skills: string[];
  certificate_code: string;
}

export interface ForumIdea {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  category: 'evenement' | 'formation' | 'projet' | 'autre';
  description: string;
  votes: number;
  voted_by: string[]; // member ids
  comments_count: number;
  created_at: string;
}

export interface MemberResource {
  id: string;
  title: string;
  category: 'slides' | 'pdf' | 'video' | 'code' | 'exercice';
  description: string;
  file_url: string;
  file_type: string;
  file_size: string;
  download_count: number;
  uploaded_at: string;
}

export interface MemberEventRegistration {
  id: string;
  event_id: string;
  event_title: string;
  member_id: string;
  status: 'confirmed' | 'pending' | 'declined';
  registered_at: string;
}
