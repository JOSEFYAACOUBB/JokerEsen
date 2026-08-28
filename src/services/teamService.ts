import { supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { TeamMember } from '../components/Team';
import type { TeamMemberRecord } from '../types/database';

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

export async function saveTeamMember(member: TeamMember, orderIndex: number = 0): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const record: Partial<TeamMemberRecord> = {
    id: member.id,
    name: member.name,
    role: member.role,
    suit: (member.suit as '♠' | '♥' | '♦' | '♣') || '♠',
    suit_color: member.suitColor,
    avatar: member.avatar,
    instagram: member.socials?.instagram || '#',
    linkedin: member.socials?.linkedin || '#',
    order_index: orderIndex,
  };

  const { error } = await supabaseDb.team.upsert(record);
  if (error) {
    console.error('Failed to save team member in Supabase:', error);
    return false;
  }
  return true;
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabaseDb.team.delete(id);
  if (error) {
    console.error('Failed to delete team member in Supabase:', error);
    return false;
  }
  return true;
}
