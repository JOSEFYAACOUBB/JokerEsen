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
  try {
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
  } catch (err) {
    console.warn('REST fetch team members error:', err);
  }

  return cached;
}

export function normalizeSuit(suit?: string): '♠' | '♥' | '♦' | '♣' {
  if (!suit) return '♠';
  const str = String(suit).trim();
  if (str === '♠' || str === '♥' || str === '♦' || str === '♣') return str as '♠' | '♥' | '♦' | '♣';
  if (str.includes('♠') || str.toLowerCase().includes('pique') || str.toLowerCase().includes('spade') || str.includes('â™ ') || str.includes('\u2660')) return '♠';
  if (str.includes('♥') || str.toLowerCase().includes('cœur') || str.toLowerCase().includes('coeur') || str.toLowerCase().includes('heart') || str.includes('â™¥') || str.includes('\u2665')) return '♥';
  if (str.includes('♦') || str.toLowerCase().includes('carreau') || str.toLowerCase().includes('diamond') || str.includes('â™¦') || str.includes('\u2666')) return '♦';
  if (str.includes('♣') || str.toLowerCase().includes('trèfle') || str.toLowerCase().includes('trefle') || str.toLowerCase().includes('club') || str.includes('â™£') || str.includes('\u2663')) return '♣';
  return '♠';
}

export async function saveTeamMember(
  member: TeamMember,
  orderIndex: number = 0,
  currentTeamList?: TeamMember[],
  previousName?: string
): Promise<TeamMember> {
  // Update localStorage immediately
  let updatedList: TeamMember[];
  if (currentTeamList) {
    updatedList = currentTeamList;
  } else {
    const existing = getCachedTeam();
    const index = existing.findIndex(
      (m) => (member.id && m.id === member.id) || (previousName && m.name === previousName) || m.name === member.name
    );
    if (index >= 0) {
      existing[index] = member;
    } else {
      existing.push(member);
    }
    updatedList = existing;
  }
  cacheTeam(updatedList);

  if (!isSupabaseConfigured) return member;

  const isUUID = member.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

  const payload: Partial<TeamMemberRecord> = {
    name: member.name,
    role: member.role,
    suit: normalizeSuit(member.suit),
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

      if (!updateError) {
        const savedMember = { ...member, id: targetRowId };
        const refreshed = getCachedTeam().map(m => m.name === savedMember.name ? savedMember : m);
        cacheTeam(refreshed);
        return savedMember;
      }
      console.warn('Supabase update team member error:', updateError);
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('team_members')
        .insert([payload])
        .select()
        .maybeSingle();

      if (!insertError && insertData) {
        const savedMember: TeamMember = {
          id: insertData.id,
          name: insertData.name,
          role: insertData.role,
          suit: insertData.suit,
          suitColor: insertData.suit_color,
          avatar: insertData.avatar,
          socials: {
            instagram: insertData.instagram,
            linkedin: insertData.linkedin,
          },
        };
        const refreshed = getCachedTeam().map(m => m.name === savedMember.name ? savedMember : m);
        cacheTeam(refreshed);
        return savedMember;
      }
      console.warn('Supabase insert team member error:', insertError);
    }
  } catch (err) {
    console.warn('saveTeamMember exception:', err);
  }

  // 5. REST Fallback
  try {
    await supabaseDb.team.upsert(payload);
  } catch (err) {
    console.warn('REST upsert team member error:', err);
  }

  return member;
}

export async function deleteTeamMember(
  id: string,
  memberName?: string,
  currentTeamList?: TeamMember[]
): Promise<boolean> {
  // Update local cache immediately with proper filter condition
  if (currentTeamList) {
    cacheTeam(currentTeamList);
  } else {
    const existing = getCachedTeam();
    const filtered = existing.filter(
      (m) => (id ? m.id !== id : true) && (memberName ? m.name !== memberName : true)
    );
    cacheTeam(filtered);
  }

  if (!isSupabaseConfigured) return true;

  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Try Supabase SDK
  try {
    if (isUUID) {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (!error) return true;
    }
    if (memberName) {
      const { error } = await supabase.from('team_members').delete().eq('name', memberName);
      if (!error) return true;
    }
  } catch (err) {
    console.warn('Error deleting team member via SDK, trying REST fallback:', err);
  }

  // 2. Try REST Fallback
  try {
    if (isUUID) {
      await supabaseDb.team.delete(id);
    }
    if (memberName) {
      await supabaseDb.team.deleteByName(memberName);
    }
  } catch (err) {
    console.warn('Error deleting team member via REST:', err);
  }

  return true;
}
