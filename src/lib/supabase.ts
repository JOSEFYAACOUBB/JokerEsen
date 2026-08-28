import { createClient } from '@supabase/supabase-js';
import type {
  ClubSettings,
  EventRecord,
  TeamMemberRecord,
  RecruitmentApplication,
  GalleryImage,
} from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder')
);

// Official Supabase Client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

/**
 * Lightweight REST client for Supabase BaaS.
 */
async function supabaseFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
    };
  }

  try {
    const url = `${supabaseUrl}/rest/v1/${endpoint}`;
    const customHeaders = (options.headers as Record<string, string>) || {};
    const headers: Record<string, string> = {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...customHeaders,
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { data: null, error: new Error(`Supabase Error (${res.status}): ${errorText}`) };
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return { data: null, error: null };
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ------------------------------------------------------------------------------
// Database Operations API
// ------------------------------------------------------------------------------

export const supabaseDb = {
  // 1. Recruitment Applications
  recruitment: {
    async submit(application: Omit<RecruitmentApplication, 'id' | 'created_at' | 'status'>) {
      return supabaseFetch<RecruitmentApplication[]>('recruitment_applications', {
        method: 'POST',
        headers: {
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          ...application,
          status: 'pending',
        }),
      });
    },

    async getAll() {
      return supabaseFetch<RecruitmentApplication[]>('recruitment_applications?order=created_at.desc');
    },

    async updateStatus(id: string, status: 'pending' | 'accepted' | 'rejected' | 'contacted') {
      return supabaseFetch<RecruitmentApplication[]>(`recruitment_applications?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },

    async delete(id: string) {
      return supabaseFetch(`recruitment_applications?id=eq.${id}`, {
        method: 'DELETE',
      });
    },
  },

  // 2. Club Settings
  settings: {
    async get() {
      const { data, error } = await supabaseFetch<ClubSettings[]>('club_settings?id=eq.default&limit=1');
      return { data: data?.[0] ?? null, error };
    },

    async update(settings: Partial<ClubSettings>) {
      return supabaseFetch<ClubSettings[]>('club_settings?id=eq.default', {
        method: 'PATCH',
        body: JSON.stringify({
          ...settings,
          updated_at: new Date().toISOString(),
        }),
      });
    },

    async upsert(settings: Partial<ClubSettings>) {
      return supabaseFetch<ClubSettings[]>('club_settings', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          id: 'default',
          ...settings,
          updated_at: new Date().toISOString(),
        }),
      });
    },
  },

  // 3. Events
  events: {
    async getActive() {
      const { data, error } = await supabaseFetch<EventRecord[]>('events?is_active=eq.true&order=created_at.desc&limit=1');
      return { data: data?.[0] ?? null, error };
    },

    async getAll() {
      return supabaseFetch<EventRecord[]>('events?order=created_at.desc');
    },

    async update(id: string, updates: Partial<EventRecord>) {
      return supabaseFetch<EventRecord[]>(`events?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString(),
        }),
      });
    },

    async create(event: Omit<EventRecord, 'id' | 'created_at' | 'updated_at'>) {
      return supabaseFetch<EventRecord[]>('events', {
        method: 'POST',
        body: JSON.stringify(event),
      });
    },
  },

  // 4. Team Members
  team: {
    async getAll() {
      return supabaseFetch<TeamMemberRecord[]>('team_members?order=order_index.asc');
    },

    async upsert(member: Partial<TeamMemberRecord>) {
      return supabaseFetch<TeamMemberRecord[]>('team_members', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(member),
      });
    },

    async delete(id: string) {
      return supabaseFetch(`team_members?id=eq.${id}`, {
        method: 'DELETE',
      });
    },

    async deleteByName(name: string) {
      return supabaseFetch(`team_members?name=eq.${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
    },
  },

  // 5. Gallery Images
  gallery: {
    async getAll() {
      return supabaseFetch<GalleryImage[]>('gallery_images?order=created_at.desc');
    },

    async insert(image: Partial<GalleryImage>) {
      return supabaseFetch<GalleryImage[]>('gallery_images', {
        method: 'POST',
        body: JSON.stringify(image),
      });
    },

    async delete(id: string) {
      return supabaseFetch(`gallery_images?id=eq.${id}`, {
        method: 'DELETE',
      });
    },
  },
};
