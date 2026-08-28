import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { TeamMember } from '../components/Team';
import type { TeamMemberRecord } from '../types/database';
import { defaultTeamMembers } from '../components/Team';

const LOCAL_STORAGE_TEAM_KEY = 'joker_team_data';

export function getCachedTeam(): TeamMember[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_TEAM_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached team:', e);
  }
  return defaultTeamMembers;
}

export function cacheTeam(team: TeamMember[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_TEAM_KEY, JSON.stringify(team));
  } catch (e) {
    console.warn('Could not write cached team:', e);
  }
}

export async function fetchTeamMembers(): Promise<TeamMember[] | null> {
  const cached = getCachedTeam();

  if (!isSupabaseConfigured) {
    return cached;
  }

  try {
    // 1. Try SDK Fetch
    const { data: sdkData, error: sdkError } = await supabase
      .from('team_members')
      .select('*')
      .order('order_index', { ascending: true });

    if (!sdkError && sdkData && sdkData.length > 0) {
      const teamList: TeamMember[] = sdkData.map((item: any) => {
        // Check if cached member with same name has a custom Cloudinary avatar
        const cachedMember = cached.find((c) => c.name.toLowerCase() === item.name.toLowerCase());
        const hasCustomCachedAvatar = cachedMember?.avatar && cachedMember.avatar.includes('cloudinary');
        const finalAvatar = hasCustomCachedAvatar ? cachedMember.avatar : item.avatar;

        return {
          id: item.id,
          name: item.name,
          role: item.role,
          suit: item.suit,
          suitColor: item.suit_color || '#F3C4A0',
          avatar: finalAvatar,
          socials: {
            instagram: item.instagram || '#',
            linkedin: item.linkedin || '#',
          },
        };
      });

      cacheTeam(teamList);
      return teamList;
    }
  } catch (err) {
    console.warn('SDK fetch team members error, using REST fallback:', err);
  }

  // 2. Fallback to REST
  const { data, error } = await supabaseDb.team.getAll();
  if (!error && data && data.length > 0) {
    const teamList: TeamMember[] = data.map((item) => {
      const cachedMember = cached.find((c) => c.name.toLowerCase() === item.name.toLowerCase());
      const hasCustomCachedAvatar = cachedMember?.avatar && cachedMember.avatar.includes('cloudinary');
      const finalAvatar = hasCustomCachedAvatar ? cachedMember.avatar : item.avatar;

      return {
        id: item.id,
        name: item.name,
        role: item.role,
        suit: item.suit,
        suitColor: item.suit_color,
        avatar: finalAvatar,
        socials: {
          instagram: item.instagram || '#',
          linkedin: item.linkedin || '#',
        },
      };
    });

    cacheTeam(teamList);
    return teamList;
  }

  return cached;
}

export async function saveTeamMember(
  member: TeamMember,
  orderIndex: number = 0,
  currentTeamList?: TeamMember[]
): Promise<boolean> {
  // Update localStorage immediately
  let updatedList: TeamMember[];
  if (currentTeamList) {
    updatedList = currentTeamList;
  } else {
    const existing = getCachedTeam();
    const index = existing.findIndex((m) => (m.id && m.id === member.id) || m.name === member.name);
    if (index >= 0) {
      existing[index] = member;
    } else {
      existing.push(member);
    }
    updatedList = existing;
  }
  cacheTeam(updatedList);

  if (!isSupabaseConfigured) return true;

  const isUUID = member.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

  const payload: Partial<TeamMemberRecord> = {
    name: member.name,
    role: member.role,
    suit: (member.suit as '♠' | '♥' | '♦' | '♣') || '♠',
    suit_color: member.suitColor || '#F3C4A0',
    avatar: member.avatar,
    instagram: member.socials?.instagram || '#',
    linkedin: member.socials?.linkedin || '#',
    order_index: orderIndex,
  };

  try {
    // 1. Check if member exists by UUID or by Name in Supabase
    let existingRowId: string | null = null;

    if (isUUID) {
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('id', member.id)
        .maybeSingle();
      if (data?.id) existingRowId = data.id;
    }

    if (!existingRowId) {
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('name', member.name)
        .maybeSingle();
      if (data?.id) existingRowId = data.id;
    }

    // 2. Perform Update or Insert
    if (existingRowId) {
      const { error: updateError } = await supabase
        .from('team_members')
        .update(payload)
        .eq('id', existingRowId);

      if (!updateError) return true;
      console.warn('SDK update team member error:', updateError);
    } else {
      const { error: insertError } = await supabase
        .from('team_members')
        .insert([payload]);

      if (!insertError) return true;
      console.warn('SDK insert team member error:', insertError);
    }
  } catch (err) {
    console.warn('SDK saveTeamMember exception:', err);
  }

  return true;
}

export async function deleteTeamMember(id: string, memberName?: string, currentTeamList?: TeamMember[]): Promise<boolean> {
  if (currentTeamList) {
    cacheTeam(currentTeamList);
  } else {
    const existing = getCachedTeam();
    const filtered = existing.filter((m) => (m.id && m.id !== id) || (memberName && m.name !== memberName));
    cacheTeam(filtered);
  }

  if (!isSupabaseConfigured) return true;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    if (isUUID) {
      await supabase.from('team_members').delete().eq('id', id);
    } else if (memberName) {
      await supabase.from('team_members').delete().eq('name', memberName);
    }
  } catch (err) {
    console.warn('Error deleting team member from Supabase:', err);
  }

  return true;
}
