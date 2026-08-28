import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { EventRecord } from '../types/database';

const LOCAL_STORAGE_EVENT_KEY = 'joker_event_data';

export const defaultEventData = {
  id: '',
  title: 'Joker Carnival Night 2026',
  edition: 'Édition Spéciale · 10ème Anniversaire',
  date: 'Samedi 26 Octobre 2026 · 20h00',
  location: 'Grand Cour & Amphi ESEN, Campus Manouba',
  program: 'Concerts live · DJ set · Buffet · Tombola',
  bannerUrl: '/images/event_banner.jpg',
};

// Helper: load from localStorage cache
export function getCachedEvent() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_EVENT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.title || parsed.bannerUrl)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached event:', e);
  }
  return defaultEventData;
}

export async function fetchActiveEvent(): Promise<EventRecord | null> {
  const cached = getCachedEvent();

  if (!isSupabaseConfigured) {
    return cached;
  }

  try {
    // 1. Try SDK fetch
    const { data: sdkData, error: sdkError } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sdkError && sdkData) {
      // If local cache has a custom user banner (e.g. Cloudinary) and DB has default, prefer custom
      const isCustomCachedBanner = cached.bannerUrl && cached.bannerUrl.includes('cloudinary');
      const finalBanner = (isCustomCachedBanner && sdkData.banner_url === '/images/event_banner.jpg')
        ? cached.bannerUrl
        : (sdkData.banner_url || cached.bannerUrl || '/images/event_banner.jpg');

      const merged = {
        id: sdkData.id,
        title: sdkData.title || cached.title,
        edition: sdkData.edition || cached.edition,
        date: sdkData.date || cached.date,
        location: sdkData.location || cached.location,
        program: sdkData.program || cached.program,
        bannerUrl: finalBanner,
      };

      localStorage.setItem(LOCAL_STORAGE_EVENT_KEY, JSON.stringify(merged));
      return {
        ...sdkData,
        banner_url: finalBanner,
      };
    }
  } catch (err) {
    console.warn('SDK fetch event failed, using REST fallback:', err);
  }

  // 2. Fallback to REST
  const { data, error } = await supabaseDb.events.getActive();
  if (!error && data) {
    const isCustomCachedBanner = cached.bannerUrl && cached.bannerUrl.includes('cloudinary');
    const finalBanner = (isCustomCachedBanner && data.banner_url === '/images/event_banner.jpg')
      ? cached.bannerUrl
      : (data.banner_url || cached.bannerUrl || '/images/event_banner.jpg');

    const merged = {
      id: data.id,
      title: data.title || cached.title,
      edition: data.edition || cached.edition,
      date: data.date || cached.date,
      location: data.location || cached.location,
      program: data.program || cached.program,
      bannerUrl: finalBanner,
    };

    localStorage.setItem(LOCAL_STORAGE_EVENT_KEY, JSON.stringify(merged));
    return {
      ...data,
      banner_url: finalBanner,
    };
  }

  return cached;
}

export async function updateEventDetails(
  id: string,
  updates: {
    title: string;
    edition: string;
    date: string;
    location: string;
    program: string;
    bannerUrl: string;
  }
): Promise<boolean> {
  // 1. Always update local storage cache immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_EVENT_KEY, JSON.stringify({ ...updates, id }));
  } catch (e) {
    console.warn('Failed to cache event to localStorage:', e);
  }

  if (!isSupabaseConfigured) {
    return true;
  }

  const payload: Partial<EventRecord> = {
    title: updates.title,
    edition: updates.edition,
    date: updates.date,
    location: updates.location,
    program: updates.program,
    banner_url: updates.bannerUrl,
    is_active: true,
  };

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    // Check if an event exists in DB
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id || isUUID) {
      const targetId = existing?.id || id;
      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', targetId);

      if (!error) return true;
      console.warn('SDK update event failed:', error);
    } else {
      // Insert new active event
      const { error } = await supabase
        .from('events')
        .insert([payload]);

      if (!error) return true;
      console.warn('SDK insert event failed:', error);
    }
  } catch (err) {
    console.warn('SDK update event error, trying REST fallback:', err);
  }

  // REST Fallback
  if (isUUID) {
    const { error } = await supabaseDb.events.update(id, payload);
    return !error;
  }

  return true;
}
