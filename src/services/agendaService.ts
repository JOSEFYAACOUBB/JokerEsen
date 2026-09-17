import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AgendaItem } from '../types/member';

const LOCAL_STORAGE_AGENDA_KEY = 'joker_member_agenda_items';

export function getCachedAgendaItems(): AgendaItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_AGENDA_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
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
    created_at: new Date().toISOString(),
  };

  const currentList = getCachedAgendaItems();
  const updatedList = [newItem, ...currentList.filter((i) => i.id !== newId)];
  cacheAgendaItems(updatedList);

  if (!isSupabaseConfigured) {
    return newItem;
  }

  try {
    const payload = {
      title: newItem.title,
      edition: newItem.edition,
      date: newItem.date,
      location: newItem.location,
      program: newItem.program,
      meeting_url: newItem.meeting_url,
      event_type: newItem.event_type,
      max_seats: newItem.max_seats,
      is_active: newItem.is_active,
    };

    const { data, error } = await supabase
      .from('member_agenda')
      .insert([payload])
      .select()
      .maybeSingle();

    if (!error && data) {
      const saved: AgendaItem = { ...newItem, ...data };
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
    const { error } = await supabase
      .from('member_agenda')
      .update({
        ...(updates.title && { title: updates.title }),
        ...(updates.edition !== undefined && { edition: updates.edition }),
        ...(updates.date && { date: updates.date }),
        ...(updates.location && { location: updates.location }),
        ...(updates.program !== undefined && { program: updates.program }),
        ...(updates.meeting_url !== undefined && { meeting_url: updates.meeting_url }),
        ...(updates.event_type && { event_type: updates.event_type }),
        ...(updates.max_seats !== undefined && { max_seats: updates.max_seats }),
        ...(updates.is_active !== undefined && { is_active: updates.is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

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
