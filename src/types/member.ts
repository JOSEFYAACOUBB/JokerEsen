export type MemberRole = 'member' | 'moderator' | 'staff';
export type MemberLevel = 'Bronze' | 'Argent' | 'Or' | 'Platine';
export type MemberStatus = 'active' | 'suspended';

export interface AgendaHelperSpot {
  member_id: string;
  member_name: string;
  member_email?: string;
  member_phone?: string;
  assigned_at: string;
}

export interface AgendaHelperRole {
  id: string;
  role_name: string;
  max_spots: number;
  points_reward?: number;
  helpers: AgendaHelperSpot[];
}

export interface AgendaItem {
  id: string;
  title: string;
  edition?: string;
  date: string;
  location: string;
  program?: string;
  meeting_url?: string;
  event_type: 'formation' | 'reunion' | 'evenement';
  max_seats?: number;
  is_active?: boolean;
  helper_roles?: AgendaHelperRole[];
  created_at?: string;
  updated_at?: string;
}


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
  birth_date?: string;
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
  member_name?: string;
  member_email?: string;
  status: 'confirmed' | 'pending' | 'declined' | 'cancelled';
  attendance_status?: 'pending' | 'present' | 'absent';
  absence_remark?: string;
  justification_reason?: string;
  meeting_url?: string;
  event_type?: 'formation' | 'reunion' | 'evenement';
  registered_at: string;
  cancelled_at?: string;
}

export interface CancellationLog {
  id: string;
  event_id: string;
  event_title: string;
  member_id: string;
  member_name: string;
  member_email: string;
  cancelled_at: string;
}

export interface EventFeedback {
  id: string;
  event_id: string;
  event_title: string;
  member_id: string;
  member_name: string;
  member_email?: string;
  member_avatar?: string;
  rating: number; // 1 to 5
  comment: string;
  aspects?: {
    organization?: number;
    content?: number;
    ambiance?: number;
  };
  created_at?: string;
}

export type EventIdeaStatus = 'pending' | 'approved' | 'planned' | 'rejected';

export interface EventIdea {
  id: string;
  title: string;
  category: string; // 'Formation' | 'Workshop' | 'Hackathon' | 'Teambuilding' | 'Conférence' | 'Autre'
  description: string;
  target_audience?: string;
  speaker_suggestion?: string;
  estimated_duration?: string;
  member_id: string;
  member_name: string;
  member_email?: string;
  member_avatar?: string;
  votes: string[]; // member IDs who upvoted
  status: EventIdeaStatus;
  admin_notes?: string;
  points_awarded?: number;
  created_at?: string;
}

