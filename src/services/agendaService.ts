import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AgendaItem, AgendaHelperRole, AgendaHelperSpot, AgendaTrainerContact } from '../types/member';

const LOCAL_STORAGE_AGENDA_KEY = 'joker_member_agenda_items';

function parseHelperRoles(raw: any): AgendaHelperRole[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }
  return [];
}

function parseTrainer(raw: any): AgendaTrainerContact | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object' && raw.name) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) return parsed;
    } catch (_) {}
  }
  return undefined;
}

export function getCachedAgendaItems(): AgendaItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_AGENDA_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          helper_roles: parseHelperRoles(item.helper_roles),
          trainer: parseTrainer(item.trainer),
        }));
      }
    }
  } catch (e) {
    console.warn('Could not read cached agenda items:', e);
  }
  return [];
}

export function cacheAgendaItems(items: AgendaItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_AGENDA_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Could not write cached agenda items:', e);
  }
}

export async function fetchAllAgendaItems(): Promise<AgendaItem[]> {
  const cached = getCachedAgendaItems();

  if (!isSupabaseConfigured) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('member_agenda')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const list: AgendaItem[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        edition: item.edition || '',
        date: item.date,
        location: item.location,
        program: item.program || '',
        meeting_url: item.meeting_url || '',
        event_type: (item.event_type as 'formation' | 'reunion' | 'evenement') || 'formation',
        max_seats: item.max_seats ?? 50,
        is_active: item.is_active ?? true,
        helper_roles: parseHelperRoles(item.helper_roles),
        trainer: parseTrainer(item.trainer),
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      cacheAgendaItems(list);
      return list;
    }
  } catch (err) {
    console.warn('Error fetching member_agenda from Supabase:', err);
  }

  return cached;
}

export async function createAgendaItem(
  item: Omit<AgendaItem, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<AgendaItem | null> {
  const newId = item.id || `agenda-${Date.now()}`;
  const newItem: AgendaItem = {
    id: newId,
    title: item.title,
    edition: item.edition || '',
    date: item.date,
    location: item.location,
    program: item.program || '',
    meeting_url: item.meeting_url || '',
    event_type: item.event_type || 'formation',
    max_seats: item.max_seats ?? 50,
    is_active: item.is_active ?? true,
    helper_roles: item.helper_roles || [],
    trainer: item.trainer,
    created_at: new Date().toISOString(),
  };

  const currentList = getCachedAgendaItems();
  const updatedList = [newItem, ...currentList.filter((i) => i.id !== newId)];
  cacheAgendaItems(updatedList);

  if (!isSupabaseConfigured) {
    return newItem;
  }

  try {
    const payload: any = {
      title: newItem.title,
      edition: newItem.edition,
      date: newItem.date,
      location: newItem.location,
      program: newItem.program,
      meeting_url: newItem.meeting_url,
      event_type: newItem.event_type,
      max_seats: newItem.max_seats,
      is_active: newItem.is_active,
      helper_roles: newItem.helper_roles,
      trainer: newItem.trainer,
    };

    let { data, error } = await supabase
      .from('member_agenda')
      .insert([payload])
      .select()
      .maybeSingle();

    // If helper_roles or trainer column does not exist yet on remote table, fallback gracefully
    if (error && (error.message?.includes('helper_roles') || error.message?.includes('trainer'))) {
      if (error.message?.includes('helper_roles')) delete payload.helper_roles;
      if (error.message?.includes('trainer')) delete payload.trainer;
      const res = await supabase
        .from('member_agenda')
        .insert([payload])
        .select()
        .maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      const saved: AgendaItem = {
        ...newItem,
        ...data,
        helper_roles: newItem.helper_roles,
        trainer: newItem.trainer,
      };
      const refreshed = updatedList.map((i) => (i.id === newId ? saved : i));
      cacheAgendaItems(refreshed);
      return saved;
    }
  } catch (err) {
    console.warn('Error creating member_agenda in Supabase:', err);
  }

  return newItem;
}

export async function updateAgendaItem(
  id: string,
  updates: Partial<AgendaItem>
): Promise<boolean> {
  const currentList = getCachedAgendaItems();
  const updatedList = currentList.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });
  cacheAgendaItems(updatedList);

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const payload: any = {
      ...(updates.title && { title: updates.title }),
      ...(updates.edition !== undefined && { edition: updates.edition }),
      ...(updates.date && { date: updates.date }),
      ...(updates.location && { location: updates.location }),
      ...(updates.program !== undefined && { program: updates.program }),
      ...(updates.meeting_url !== undefined && { meeting_url: updates.meeting_url }),
      ...(updates.event_type && { event_type: updates.event_type }),
      ...(updates.max_seats !== undefined && { max_seats: updates.max_seats }),
      ...(updates.is_active !== undefined && { is_active: updates.is_active }),
      ...(updates.helper_roles !== undefined && { helper_roles: updates.helper_roles }),
      ...(updates.trainer !== undefined && { trainer: updates.trainer }),
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('member_agenda')
      .update(payload)
      .eq('id', id);

    // If helper_roles or trainer column not present in DB, fallback without it
    if (error && (error.message?.includes('helper_roles') || error.message?.includes('trainer'))) {
      if (error.message?.includes('helper_roles')) delete payload.helper_roles;
      if (error.message?.includes('trainer')) delete payload.trainer;
      const res = await supabase.from('member_agenda').update(payload).eq('id', id);
      error = res.error;
    }

    return !error;
  } catch (err) {
    console.warn('Error updating member_agenda in Supabase:', err);
    return false;
  }
}

export async function deleteAgendaItem(id: string): Promise<boolean> {
  const currentList = getCachedAgendaItems();
  const updatedList = currentList.filter((item) => item.id !== id);
  cacheAgendaItems(updatedList);

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase.from('member_agenda').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.warn('Error deleting member_agenda in Supabase:', err);
    return false;
  }
}

// ── Volunteer / Helper Role Management Functions ──

export async function volunteerForRole(
  agendaId: string,
  roleId: string,
  member: { id: string; full_name: string; email?: string; phone?: string }
): Promise<{ success: boolean; message: string; updatedItem?: AgendaItem }> {
  const currentList = getCachedAgendaItems();
  const event = currentList.find((e) => e.id === agendaId);
  if (!event) {
    return { success: false, message: 'Événement introuvable.' };
  }

  const helperRoles = event.helper_roles ? [...event.helper_roles] : [];
  const targetRoleIndex = helperRoles.findIndex((r) => r.id === roleId);
  if (targetRoleIndex === -1) {
    return { success: false, message: 'Poste d\'aide introuvable.' };
  }

  // Check if member already volunteered for any role in this event
  for (const r of helperRoles) {
    if (r.helpers && r.helpers.some((h) => h.member_id === member.id)) {
      if (r.id === roleId) {
        return { success: false, message: 'Vous êtes déjà inscrit(e) sur ce poste d\'aide.' };
      } else {
        return {
          success: false,
          message: `Vous êtes déjà inscrit(e) sur un autre poste ("${r.role_name}"). Désistez-vous d'abord.`,
        };
      }
    }
  }

  const targetRole = { ...helperRoles[targetRoleIndex] };
  const currentHelpers = targetRole.helpers ? [...targetRole.helpers] : [];

  if (currentHelpers.length >= targetRole.max_spots) {
    return { success: false, message: 'Ce poste d\'aide est déjà complet.' };
  }

  const newSpot: AgendaHelperSpot = {
    member_id: member.id,
    member_name: member.full_name,
    member_email: member.email || '',
    member_phone: member.phone || '',
    assigned_at: new Date().toISOString(),
  };

  targetRole.helpers = [...currentHelpers, newSpot];
  helperRoles[targetRoleIndex] = targetRole;

  await updateAgendaItem(agendaId, { helper_roles: helperRoles });

  const updatedItem = getCachedAgendaItems().find((e) => e.id === agendaId);
  return {
    success: true,
    message: `Merci pour votre aide ! Vous êtes inscrit(e) sur le poste "${targetRole.role_name}".`,
    updatedItem,
  };
}

export async function withdrawFromRole(
  agendaId: string,
  roleId: string,
  memberId: string
): Promise<{ success: boolean; message: string; updatedItem?: AgendaItem }> {
  const currentList = getCachedAgendaItems();
  const event = currentList.find((e) => e.id === agendaId);
  if (!event) {
    return { success: false, message: 'Événement introuvable.' };
  }

  const helperRoles = event.helper_roles ? [...event.helper_roles] : [];
  const targetRoleIndex = helperRoles.findIndex((r) => r.id === roleId);
  if (targetRoleIndex === -1) {
    return { success: false, message: 'Poste d\'aide introuvable.' };
  }

  const targetRole = { ...helperRoles[targetRoleIndex] };
  targetRole.helpers = (targetRole.helpers || []).filter((h) => h.member_id !== memberId);
  helperRoles[targetRoleIndex] = targetRole;

  await updateAgendaItem(agendaId, { helper_roles: helperRoles });

  const updatedItem = getCachedAgendaItems().find((e) => e.id === agendaId);
  return {
    success: true,
    message: 'Vous avez été retiré(e) du poste d\'aide.',
    updatedItem,
  };
}

export async function addHelperRoleToAgenda(
  agendaId: string,
  roleName: string,
  maxSpots: number,
  pointsReward?: number
): Promise<AgendaItem | null> {
  const currentList = getCachedAgendaItems();
  const event = currentList.find((e) => e.id === agendaId);
  if (!event) return null;

  const newRole: AgendaHelperRole = {
    id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    role_name: roleName.trim(),
    max_spots: Math.max(1, maxSpots),
    points_reward: pointsReward && pointsReward > 0 ? pointsReward : 20,
    helpers: [],
  };

  const updatedRoles = [...(event.helper_roles || []), newRole];
  await updateAgendaItem(agendaId, { helper_roles: updatedRoles });
  return getCachedAgendaItems().find((e) => e.id === agendaId) || null;
}

export async function removeHelperRoleFromAgenda(
  agendaId: string,
  roleId: string
): Promise<AgendaItem | null> {
  const currentList = getCachedAgendaItems();
  const event = currentList.find((e) => e.id === agendaId);
  if (!event) return null;

  const updatedRoles = (event.helper_roles || []).filter((r) => r.id !== roleId);
  await updateAgendaItem(agendaId, { helper_roles: updatedRoles });
  return getCachedAgendaItems().find((e) => e.id === agendaId) || null;
}

export async function removeMemberFromHelperRole(
  agendaId: string,
  roleId: string,
  memberId: string
): Promise<AgendaItem | null> {
  const currentList = getCachedAgendaItems();
  const event = currentList.find((e) => e.id === agendaId);
  if (!event) return null;

  const updatedRoles = (event.helper_roles || []).map((r) => {
    if (r.id === roleId) {
      return {
        ...r,
        helpers: (r.helpers || []).filter((h) => h.member_id !== memberId),
      };
    }
    return r;
  });

  await updateAgendaItem(agendaId, { helper_roles: updatedRoles });
  return getCachedAgendaItems().find((e) => e.id === agendaId) || null;
}

export async function assignMemberToHelperRole(
  agendaId: string,
  roleId: string,
  member: { id: string; full_name: string; email?: string; phone?: string }
): Promise<AgendaItem | null> {
  const currentList = getCachedAgendaItems();
  const event = currentList.find((e) => e.id === agendaId);
  if (!event) return null;

  const updatedRoles = (event.helper_roles || []).map((r) => {
    if (r.id === roleId) {
      const existing = (r.helpers || []).find((h) => h.member_id === member.id);
      if (existing) return r;
      return {
        ...r,
        helpers: [
          ...(r.helpers || []),
          {
            member_id: member.id,
            member_name: member.full_name,
            member_email: member.email || '',
            member_phone: member.phone || '',
            assigned_at: new Date().toISOString(),
          },
        ],
      };
    }
    return r;
  });

  await updateAgendaItem(agendaId, { helper_roles: updatedRoles });
  return getCachedAgendaItems().find((e) => e.id === agendaId) || null;
}
