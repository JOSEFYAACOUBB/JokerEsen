import { supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { TeamMember } from '../components/Team';

export async function fetchTeamMembers(): Promise<TeamMember[] | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabaseDb.team.getAll();
  if (error || !data || data.length === 0) {
    return null;
  }

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    suit: item.suit,
    suitColor: item.suit_color,
    avatar: item.avatar,
    socials: {
      instagram: item.instagram || '#',
      linkedin: item.linkedin || '#',
    },
  }));
}
