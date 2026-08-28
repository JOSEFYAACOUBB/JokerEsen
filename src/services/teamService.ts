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
      if (Array.isArray(parsed)) {
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
    // 1. Fetch from Supabase SDK
    const { data: sdkData, error: sdkError } = await supabase
      .from('team_members')
      .select('*')
      .order('order_index', { ascending: true });

    if (!sdkError && sdkData) {
      if (sdkData.length === 0) {
        // If DB table is empty and user had saved cache, sync cache to DB or return cache
        return cached.length > 0 ? cached : [];
      }

      const teamList: TeamMember[] = sdkData.map((item: any) => ({
        id: item.id,
        name: item.name,
        role: item.role,
        suit: item.suit,
        suitColor: item.suit_color || '#F3C4A0',
        avatar: item.avatar,
        socials: {
          instagram: item.instagram || '#',
          linkedin: item.linkedin || '#',
        },
      }));

      cacheTeam(teamList);
      return teamList;
    }
  } catch (err) {
    console.warn('SDK fetch team members error, trying REST fallback:', err);
  }

  // 2. Fallback to REST
  const { data, error } = await supabaseDb.team.getAll();
  if (!error && data) {
    const teamList: TeamMember[] = data.map((item) => ({
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

    cacheTeam(teamList);
    return teamList;
  }

  return cached;
}

export async function saveTeamMember(
  member: TeamMember,
  orderIndex: number = 0,
  currentTeamList?: TeamMember[],
  previousName?: string
): Promise<boolean> {
  // Update localStorage immediately
  let updatedList: TeamMember[];
  if (currentTeamList) {
    updatedList = currentTeamList;
  } else {
    const existing = getCachedTeam();
    const index = existing.findIndex(
      (m) => (m.id && m.id === member.id) || (previousName && m.name === previousName) || m.name === member.name
    );
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
    let targetRowId: string | null = null;

    // 1. Find existing row by UUID
    if (isUUID) {
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('id', member.id)
        .maybeSingle();
      if (data?.id) targetRowId = data.id;
    }

    // 2. If not found, find by previousName
    if (!targetRowId && previousName) {
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('name', previousName)
        .maybeSingle();
      if (data?.id) targetRowId = data.id;
    }

    // 3. If not found, find by current name
    if (!targetRowId) {
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('name', member.name)
        .maybeSingle();
      if (data?.id) targetRowId = data.id;
    }

    // 4. Update if exists, else Insert
    if (targetRowId) {
      const { error: updateError } = await supabase
        .from('team_members')
        .update(payload)
        .eq('id', targetRowId);

      if (!updateError) return true;
      console.warn('Supabase update team member error:', updateError);
    } else {
      const { error: insertError } = await supabase
        .from('team_members')
        .insert([payload]);

      if (!insertError) return true;
      console.warn('Supabase insert team member error:', insertError);
    }
  } catch (err) {
    console.warn('saveTeamMember exception:', err);
  }

  return true;
}

export async function deleteTeamMember(
  id: string,
  memberName?: string,
  currentTeamList?: TeamMember[]
): Promise<boolean> {
  if (currentTeamList) {
    cacheTeam(currentTeamList);
  } else {
    const existing = getCachedTeam();
    const filtered = existing.filter(
      (m) => (m.id && m.id !== id) || (memberName && m.name !== memberName)
    );
    cacheTeam(filtered);
  }

  if (!isSupabaseConfigured) return true;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    if (isUUID) {
      await supabase.from('team_members').delete().eq('id', id);
    }
    if (memberName) {
      await supabase.from('team_members').delete().eq('name', memberName);
    }
  } catch (err) {
    console.warn('Error deleting team member from Supabase:', err);
  }

  return true;
}
