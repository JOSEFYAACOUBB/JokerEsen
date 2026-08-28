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
