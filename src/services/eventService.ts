import { supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { EventRecord } from '../types/database';

export async function fetchActiveEvent(): Promise<EventRecord | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabaseDb.events.getActive();
  if (error || !data) {
    return null;
  }

  return data;
}

export async function updateEventDetails(id: string, updates: Partial<EventRecord>): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return true;
  }

  const { error } = await supabaseDb.events.update(id, updates);
  if (error) {
    console.error('Failed to update event in Supabase:', error);
    return false;
  }

  return true;
}
