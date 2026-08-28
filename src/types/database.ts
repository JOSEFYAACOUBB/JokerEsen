export interface ClubSettings {
  id: string;
  recruitment_open: boolean;
  announcement?: string;
  updated_at?: string;
}

export interface EventRecord {
  id: string;
  title: string;
  edition: string;
  date: string;
  location: string;
  program: string;
  banner_url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type Event = EventRecord;

export interface TeamMemberRecord {
  id: string;
  name: string;
  role: string;
  suit: '♠' | '♥' | '♦' | '♣';
  suit_color: string;
  avatar: string;
  instagram?: string;
  linkedin?: string;
  order_index?: number;
  created_at?: string;
}

export type TeamMember = TeamMemberRecord;

export interface RecruitmentApplication {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  major: string;
  department: string;
  motivation?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'contacted';
  created_at?: string;
}

export interface GalleryImage {
  id: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  uploaded_by?: string;
  created_at: string;
  updated_at?: string;
  display_url?: string;
  thumbnail_url?: string;
}
