import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { EventRecord } from '../types/database';

export const defaultEventData: EventRecord = {
  id: 'default-event',
  title: 'Joker Carnival Night 2026',
  edition: 'Édition Spéciale · 10ème Anniversaire',
  date: 'Samedi 26 Octobre 2026 · 20h00',
  location: 'Grand Cour & Amphi ESEN, Campus Manouba',
  program: 'Concerts live · DJ set · Buffet · Tombola',
  banner_url: '/images/event_banner.jpg',
  is_active: true,
};

export function getCachedEvent(): EventRecord {
  return defaultEventData;
}

export function cacheEvent(_event: any) {}

export async function fetchAllEvents(): Promise<EventRecord[]> {
  if (!isSupabaseConfigured) {
    return [defaultEventData];
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('SDK fetch all events failed, trying REST fallback:', err);
  }

  try {
    const { data, error } = await supabaseDb.events.getAll();
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('REST fetch all events failed:', err);
  }

  return [defaultEventData];
}

export async function fetchActiveEvent(): Promise<EventRecord | null> {
  if (!isSupabaseConfigured) {
    return defaultEventData;
  }

  try {
    const { data: sdkData, error: sdkError } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sdkError && sdkData) {
      return sdkData;
    }
  } catch (err) {
    console.warn('SDK fetch active event failed, using REST fallback:', err);
  }

  try {
    const { data, error } = await supabaseDb.events.getActive();
    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('REST fetch active event failed:', err);
  }

  return defaultEventData;
}

export async function createEvent(event: Omit<EventRecord, 'id' | 'created_at' | 'updated_at'>): Promise<EventRecord | null> {
  if (!isSupabaseConfigured) {
    return { ...event, id: String(Date.now()) };
  }

  // If this new event is active, deactivate others
  if (event.is_active) {
    try {
      await supabase.from('events').update({ is_active: false }).neq('id', 'placeholder');
    } catch (e) {
      console.warn('Could not deactivate previous active events:', e);
    }
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title: event.title,
          edition: event.edition,
          date: event.date,
          location: event.location,
          program: event.program,
          banner_url: event.banner_url || '/images/event_banner.jpg',
          is_active: event.is_active ?? true,
        },
      ])
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Error creating event in Supabase:', err);
  }

  return null;
}

export async function updateEventDetails(
  id: string,
  updates: {
    title: string;
    edition: string;
    date: string;
    location: string;
    program: string;
    bannerUrl?: string;
    banner_url?: string;
    is_active?: boolean;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return true;
  }

  const banner = updates.banner_url || updates.bannerUrl || '/images/event_banner.jpg';
  const payload: Partial<EventRecord> = {
    title: updates.title,
    edition: updates.edition,
    date: updates.date,
    location: updates.location,
    program: updates.program,
    banner_url: banner,
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.is_active === 'boolean') {
    payload.is_active = updates.is_active;
  }

  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    if (isUUID) {
      const { error } = await supabase.from('events').update(payload).eq('id', id);
      if (!error) return true;
    } else {
      // Find the first active event or first event
      const { data: existing } = await supabase.from('events').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from('events').update(payload).eq('id', existing.id);
        if (!error) return true;
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (!error) return true;
      }
    }
  } catch (err) {
    console.warn('Error updating event in Supabase:', err);
  }

  return true;
}

export async function setActiveEvent(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    // 1. Deactivate all
    await supabase.from('events').update({ is_active: false }).neq('id', id);
    // 2. Activate target
    const { error } = await supabase.from('events').update({ is_active: true }).eq('id', id);
    return !error;
  } catch (e) {
    console.warn('Error setting active event in Supabase:', e);
    return false;
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) return true;
  } catch (err) {
    console.warn('Error deleting event via SDK, trying REST:', err);
  }

  try {
    await supabaseDb.events.delete(id);
    return true;
  } catch (err) {
    console.warn('Error deleting event via REST:', err);
  }

  return false;
}
