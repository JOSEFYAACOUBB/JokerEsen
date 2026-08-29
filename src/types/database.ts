export interface Partner {
  id?: string;
  name: string;
  short_name: string;
  svg_color: string;
  logo_url?: string;
  order_index?: number;
  created_at?: string;
}

export interface AboutPillar {
  id: string;
  suit: string;
  name: string;
  title: string;
  desc: string;
  color: string;
  bgGlow?: string;
}

export interface AboutStat {
  id?: string;
  number: string;
  label: string;
  color: string;
  icon?: 'Calendar' | 'Users' | 'Trophy' | 'Heart' | 'Sparkles' | 'Star';
}

export interface AboutData {
  badge: string;
  title_prefix: string;
  title_highlight: string;
  story_badge: string;
  story_location: string;
  story_heading: string;
  story_text: string;
  founded_year: string;
  editorial_badge: string;
  editorial_text: string;
  stats: AboutStat[];
  pillars: AboutPillar[];
}

export interface FormConfig {
  majors: string[];
  departments: string[];
  welcome_badge: string;
  welcome_title: string;
  welcome_subtitle: string;
  form_heading: string;
  form_subheading: string;
}

export interface ClubSettings {
  id: string;
  recruitment_open: boolean;
  announcement?: string;
  partners?: Partner[];
  about_data?: AboutData;
  form_config?: FormConfig;
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
