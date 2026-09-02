import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { ClubSettings } from '../types/database';

const LOCAL_STORAGE_SETTINGS_KEY = 'joker_club_settings';

export function getCachedSettings(): Partial<ClubSettings> | null {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached club settings:', e);
  }
  return null;
}

export function cacheSettings(settings: Partial<ClubSettings>) {
  try {
    const existing = getCachedSettings() || {};
    const merged = { ...existing, ...settings };
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Could not write cached club settings:', e);
  }
}

export async function fetchClubSettings(): Promise<ClubSettings | null> {
  const cached = getCachedSettings();

  if (!isSupabaseConfigured) {
    return (cached as ClubSettings) || null;
  }

  try {
    // 1. Fetch from Supabase SDK
    const { data: sdkData, error: sdkError } = await supabase
      .from('club_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (!sdkError && sdkData) {
      cacheSettings(sdkData);
      return sdkData as ClubSettings;
    }
  } catch (err) {
    console.warn('SDK fetch settings error, trying REST fallback:', err);
  }

  // 2. Fallback to REST
  const { data, error } = await supabaseDb.settings.get();
  if (!error && data) {
    cacheSettings(data);
    return data;
  }

  return (cached as ClubSettings) || null;
}

export async function updateClubSettings(settings: Partial<ClubSettings>): Promise<boolean> {
  // Update local cache immediately
  cacheSettings(settings);

  if (!isSupabaseConfigured) return true;

  const payload = {
    id: 'default',
    ...settings,
    updated_at: new Date().toISOString(),
  };

  try {
    // 1. Try SDK update first
    const { error: updateError, data: updateData } = await supabase
      .from('club_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default')
      .select();

    if (!updateError && updateData && updateData.length > 0) {
      return true;
    }

    // 2. Try SDK upsert
    const { error: upsertError } = await supabase
      .from('club_settings')
      .upsert(payload);

    if (!upsertError) {
      return true;
    }
    console.warn('SDK update settings failed, trying REST fallback:', upsertError || updateError);
  } catch (err) {
    console.warn('SDK update settings exception:', err);
  }

  // 3. REST Fallback (PATCH first, then UPSERT)
  try {
    const { error: patchError } = await supabaseDb.settings.update(settings);
    if (!patchError) return true;

    const { error: upsertError } = await supabaseDb.settings.upsert(payload);
    if (!upsertError) return true;
  } catch (err) {
    console.warn('REST update club settings error:', err);
  }

  return true;
}

export const defaultClubSocials = {
  instagram: 'https://www.instagram.com/joker_esen/',
  facebook: 'https://www.facebook.com/joker.esen',
  tiktok: 'https://www.tiktok.com/@joker.esen',
  linkedin: 'https://www.linkedin.com/company/jokeresen/',
};

export function getCachedClubSocials() {
  const settings = getCachedSettings();
  if (settings?.social_links) {
    return {
      instagram: settings.social_links.instagram ?? defaultClubSocials.instagram,
      facebook: settings.social_links.facebook ?? defaultClubSocials.facebook,
      tiktok: settings.social_links.tiktok ?? defaultClubSocials.tiktok,
      linkedin: settings.social_links.linkedin ?? defaultClubSocials.linkedin,
    };
  }

  return {
    instagram: localStorage.getItem('joker_club_instagram') || defaultClubSocials.instagram,
    facebook: localStorage.getItem('joker_club_facebook') || defaultClubSocials.facebook,
    tiktok: localStorage.getItem('joker_club_tiktok') || defaultClubSocials.tiktok,
    linkedin: localStorage.getItem('joker_club_linkedin') || defaultClubSocials.linkedin,
  };
}

export async function saveClubSocials(socials: {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  linkedin?: string;
}): Promise<boolean> {
  // Update localStorage immediately for fast local retrieval
  if (socials.instagram !== undefined) localStorage.setItem('joker_club_instagram', socials.instagram);
  if (socials.facebook !== undefined) localStorage.setItem('joker_club_facebook', socials.facebook);
  if (socials.tiktok !== undefined) localStorage.setItem('joker_club_tiktok', socials.tiktok);
  if (socials.linkedin !== undefined) localStorage.setItem('joker_club_linkedin', socials.linkedin);

  // Sync to Supabase club_settings row
  return updateClubSettings({ social_links: socials });
}

