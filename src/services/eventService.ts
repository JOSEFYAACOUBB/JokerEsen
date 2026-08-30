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
  access_info: 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
  entry_info: '100% Gratuite avec réservation préalable en ligne.',
  ambiance_info: 'Musique live, animations, buffet & tombola du club Joker ESEN.',
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
      return data.map((evt) => ({
        ...evt,
        access_info: evt.access_info || defaultEventData.access_info,
        entry_info: evt.entry_info || defaultEventData.entry_info,
        ambiance_info: evt.ambiance_info || defaultEventData.ambiance_info,
      }));
    }
  } catch (err) {
    console.warn('SDK fetch all events failed, trying REST fallback:', err);
  }

  try {
    const { data, error } = await supabaseDb.events.getAll();
    if (!error && data && data.length > 0) {
      return data.map((evt: any) => ({
        ...evt,
        access_info: evt.access_info || defaultEventData.access_info,
        entry_info: evt.entry_info || defaultEventData.entry_info,
        ambiance_info: evt.ambiance_info || defaultEventData.ambiance_info,
      }));
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
      return {
        ...sdkData,
        access_info: sdkData.access_info || defaultEventData.access_info,
        entry_info: sdkData.entry_info || defaultEventData.entry_info,
        ambiance_info: sdkData.ambiance_info || defaultEventData.ambiance_info,
      };
    }
  } catch (err) {
    console.warn('SDK fetch active event failed, using REST fallback:', err);
  }

  try {
    const { data, error } = await supabaseDb.events.getActive();
    if (!error && data) {
      return {
        ...data,
        access_info: data.access_info || defaultEventData.access_info,
        entry_info: data.entry_info || defaultEventData.entry_info,
        ambiance_info: data.ambiance_info || defaultEventData.ambiance_info,
      };
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

  const basePayload = {
    title: event.title,
    edition: event.edition,
    date: event.date,
    location: event.location,
    program: event.program,
    banner_url: event.banner_url || '/images/event_banner.jpg',
    is_active: event.is_active ?? true,
    access_info: event.access_info || defaultEventData.access_info,
    entry_info: event.entry_info || defaultEventData.entry_info,
    ambiance_info: event.ambiance_info || defaultEventData.ambiance_info,
  };

  try {
    const { data, error } = await supabase
      .from('events')
      .insert([basePayload])
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Error creating event with extra columns, trying fallback:', err);
  }

  // Fallback without extra columns if columns are not created in Supabase yet
  try {
    const { access_info, entry_info, ambiance_info, ...simplePayload } = basePayload;
    const { data, error } = await supabase
      .from('events')
      .insert([simplePayload])
      .select()
      .maybeSingle();

    if (!error && data) {
      return { ...data, access_info, entry_info, ambiance_info };
    }
  } catch (err) {
    console.warn('Fallback error creating event in Supabase:', err);
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
    access_info?: string;
    entry_info?: string;
    ambiance_info?: string;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return true;
  }

  const banner = updates.banner_url || updates.bannerUrl || '/images/event_banner.jpg';
  const fullPayload: Record<string, any> = {
    title: updates.title,
    edition: updates.edition,
    date: updates.date,
    location: updates.location,
    program: updates.program,
    banner_url: banner,
    access_info: updates.access_info || defaultEventData.access_info,
    entry_info: updates.entry_info || defaultEventData.entry_info,
    ambiance_info: updates.ambiance_info || defaultEventData.ambiance_info,
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.is_active === 'boolean') {
    fullPayload.is_active = updates.is_active;
  }

  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    if (isUUID) {
      const { error } = await supabase.from('events').update(fullPayload).eq('id', id);
      if (!error) return true;
    } else {
      const { data: existing } = await supabase.from('events').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from('events').update(fullPayload).eq('id', existing.id);
        if (!error) return true;
      }
    }
  } catch (err) {
    console.warn('Error updating with extra columns, trying fallback:', err);
  }

  // Fallback without extra columns if not migrated yet
  try {
    const { access_info, entry_info, ambiance_info, ...simplePayload } = fullPayload;
    if (isUUID) {
      const { error } = await supabase.from('events').update(simplePayload).eq('id', id);
      if (!error) return true;
    } else {
      const { data: existing } = await supabase.from('events').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from('events').update(simplePayload).eq('id', existing.id);
        if (!error) return true;
      }
    }
  } catch (err) {
    console.warn('Error in fallback updateEventDetails:', err);
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
