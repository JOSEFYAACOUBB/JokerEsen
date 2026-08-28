import { supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { ClubSettings } from '../types/database';

export async function fetchClubSettings(): Promise<ClubSettings | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabaseDb.settings.get();
  if (error || !data) {
    console.error('Failed to fetch club settings:', error);
    return null;
  }
  return data;
}

export async function updateClubSettings(settings: Partial<ClubSettings>): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabaseDb.settings.update(settings);
  if (error) {
    console.error('Failed to update club settings:', error);
    return false;
  }
  return true;
}
