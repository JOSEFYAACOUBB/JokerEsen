import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { EventRecord } from '../types/database';

export const defaultEventData: EventRecord = {
  id: 'default-active-event',
  title: 'Joker Carnival Night 2026',
  edition: 'Édition Spéciale · 10ème Anniversaire',
  date: 'Samedi 26 Octobre 2026 · 20h00',
  location: 'Grand Cour & Amphi ESEN, Campus Manouba',
  program: 'Concerts live · DJ sets exclusifs · Buffet festif & Tombola avec de nombreux lots à gagner.',
  banner_url: '/images/event_banner.jpg',
  is_active: true,
  category: 'upcoming',
  ticket_available: true,
  show_access_info: true,
  show_entry_info: true,
  show_ambiance_info: true,
  show_program: true,
  access_info: 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
  entry_info: '100% Gratuite avec réservation préalable en ligne.',
  ambiance_info: 'Musique live, animations, buffet & tombola du club Joker ESEN.',
};

export const defaultEventsList: EventRecord[] = [
  defaultEventData,
  {
    id: 'evt-integration-2026',
    title: 'JOKER INTEGRATION DAY',
    edition: 'Édition Promo 2026-2027',
    date: 'Jeudi 15 Octobre 2026 · 14h00',
    location: 'Campus ESEN Manouba',
    program: 'Journée festive d’accueil des nouveaux étudiants, jeux d’équipes, animations musicales, showcases et remise des packs de bienvenue Joker.',
    banner_url: '/images/teambuilding.jpg',
    is_active: false,
    category: 'upcoming',
    ticket_available: true,
    show_access_info: true,
    show_entry_info: true,
    show_ambiance_info: true,
    show_program: true,
    access_info: 'Ouvert à tous les nouveaux étudiants et membres de l’ESEN.',
    entry_info: 'Entrée libre et animations gratuites.',
    ambiance_info: 'Jeux interactifs, distribution de goodies Joker et musique festive.',
  },
  {
    id: 'evt-cyber-2025',
    title: 'CYBER NIGHT & LAN ARENA',
    edition: 'Édition Spring 2025',
    date: 'Vendredi 24 Mai 2025 · 21h00',
    location: 'ESEN Labs & Salle Polyvalente',
    program: 'Tournoi esport inter-universitaire, compétition Valorant & FIFA, stand rétro-gaming et ambiance DJ jusqu’au petit matin.',
    banner_url: '/images/hero_deck.jpg',
    is_active: false,
    category: 'previous',
    ticket_available: false,
    show_access_info: false,
    show_entry_info: false,
    show_ambiance_info: false,
    show_program: true,
    access_info: '',
    entry_info: '',
    ambiance_info: '',
  },
  {
    id: 'evt-workshop-2025',
    title: 'CREATIVE WORKSHOP & DJ ACADEMY',
    edition: 'Session Hiver 2025',
    date: 'Mercredi 12 Février 2025 · 15h00',
    location: 'Amphi B, ESEN Manouba',
    program: 'Masterclass sur la production audio, création visuelle pour festivals et initiation aux platines numériques animée par le pôle technique.',
    banner_url: '/images/workshop.jpg',
    is_active: false,
    category: 'previous',
    ticket_available: false,
    show_access_info: false,
    show_entry_info: false,
    show_ambiance_info: false,
    show_program: true,
    access_info: '',
    entry_info: '',
    ambiance_info: '',
  },
  {
    id: 'evt-gala-2024',
    title: 'JOKER GALA & RÉTROSPECTIVE',
    edition: 'Édition Annuelle 2024',
    date: 'Samedi 18 Mai 2024 · 19h30',
    location: 'Espace Culturel Manouba',
    program: 'Célébration des réussites de l’année, remise des trophées du club Joker, cocktail dînatoire et rétrospective en images des grands projets.',
    banner_url: '/images/about_card_fan.jpg',
    is_active: false,
    category: 'previous',
    ticket_available: false,
    show_access_info: false,
    show_entry_info: false,
    show_ambiance_info: false,
    show_program: true,
    access_info: '',
    entry_info: '',
    ambiance_info: '',
  },
];

const LOCAL_STORAGE_ALL_EVENTS_KEY = 'joker_all_events_data';
const LOCAL_STORAGE_ACTIVE_EVENT_KEY = 'joker_active_event_data';

export function detectCategory(evt: Partial<EventRecord>): 'upcoming' | 'previous' {
  if (evt.category === 'previous' || evt.category === 'upcoming') {
    return evt.category;
  }
  const textToCheck = `${evt.edition || ''} ${evt.date || ''} ${evt.title || ''}`.toLowerCase();
  if (textToCheck.includes('2024') || textToCheck.includes('2025') || textToCheck.includes('archive') || textToCheck.includes('passé') || textToCheck.includes('retrospective') || textToCheck.includes('rétrospective')) {
    return 'previous';
  }
  return 'upcoming';
}

export function getCachedAllEvents(): EventRecord[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ALL_EVENTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((e) => ({
          ...e,
          category: detectCategory(e),
          banner_url: e.banner_url || e.bannerUrl || '/images/event_banner.jpg',
          access_info: e.access_info || '',
          entry_info: e.entry_info || '',
          ambiance_info: e.ambiance_info || '',
        }));
      }
    }
  } catch (e) {
    console.warn('Could not read cached events:', e);
  }
  return defaultEventsList;
}

export function cacheAllEvents(events: EventRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ALL_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn('Could not write cached events:', e);
  }
}

export function getCachedEvent(): EventRecord {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_EVENT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.title) {
        return {
          ...parsed,
          category: detectCategory(parsed),
          banner_url: parsed.banner_url || parsed.bannerUrl || '/images/event_banner.jpg',
          access_info: parsed.access_info || '',
          entry_info: parsed.entry_info || '',
          ambiance_info: parsed.ambiance_info || '',
        };
      }
    }
  } catch (e) {
    console.warn('Could not read cached active event:', e);
  }
  const all = getCachedAllEvents();
  const active = all.find((e) => e.is_active);
  return active || defaultEventData;
}

export function cacheEvent(event: any) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_EVENT_KEY, JSON.stringify(event));
  } catch (e) {
    console.warn('Could not write cached active event:', e);
  }
}

export async function fetchAllEvents(): Promise<EventRecord[]> {
  const cached = getCachedAllEvents();

  if (!isSupabaseConfigured) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const list: EventRecord[] = data.map((evt: any) => ({
        ...evt,
        category: evt.category ? evt.category : detectCategory(evt),
        banner_url: evt.banner_url || '/images/event_banner.jpg',
        access_info: evt.access_info || '',
        entry_info: evt.entry_info || '',
        ambiance_info: evt.ambiance_info || '',
      }));
      cacheAllEvents(list);
      const active = list.find((e) => e.is_active);
      if (active) cacheEvent(active);
      return list;
    }
  } catch (err) {
    console.warn('SDK fetch all events failed, trying REST fallback:', err);
  }

  try {
    const { data, error } = await supabaseDb.events.getAll();
    if (!error && data && data.length > 0) {
      const list: EventRecord[] = data.map((evt: any) => ({
        ...evt,
        category: evt.category ? evt.category : detectCategory(evt),
        banner_url: evt.banner_url || '/images/event_banner.jpg',
        access_info: evt.access_info || '',
        entry_info: evt.entry_info || '',
        ambiance_info: evt.ambiance_info || '',
      }));
      cacheAllEvents(list);
      const active = list.find((e) => e.is_active);
      if (active) cacheEvent(active);
      return list;
    }
  } catch (err) {
    console.warn('REST fetch all events failed:', err);
  }

  return cached;
}

export async function fetchActiveEvent(): Promise<EventRecord | null> {
  const cached = getCachedEvent();

  if (!isSupabaseConfigured) {
    return cached;
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
      const res: EventRecord = {
        ...sdkData,
        category: 'upcoming',
        banner_url: sdkData.banner_url || '/images/event_banner.jpg',
        access_info: sdkData.access_info || '',
        entry_info: sdkData.entry_info || '',
        ambiance_info: sdkData.ambiance_info || '',
      };
      cacheEvent(res);
      return res;
    }
  } catch (err) {
    console.warn('SDK fetch active event failed, using REST fallback:', err);
  }

  try {
    const { data, error } = await supabaseDb.events.getActive();
    if (!error && data) {
      const res: EventRecord = {
        ...data,
        category: 'upcoming',
        banner_url: data.banner_url || '/images/event_banner.jpg',
        access_info: data.access_info || '',
        entry_info: data.entry_info || '',
        ambiance_info: data.ambiance_info || '',
      };
      cacheEvent(res);
      return res;
    }
  } catch (err) {
    console.warn('REST fetch active event failed:', err);
  }

  return cached;
}

export async function createEvent(
  event: Omit<EventRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<EventRecord | null> {
  const category = event.category || detectCategory(event);
  const newId = event.id || `evt-${Date.now()}`;

  const fullEvent: EventRecord = {
    id: newId,
    title: event.title,
    edition: event.edition,
    date: event.date,
    location: event.location,
    program: event.program || '',
    banner_url: event.banner_url || '/images/event_banner.jpg',
    is_active: Boolean(event.is_active),
    category,
    ticket_available: event.ticket_available ?? (category === 'upcoming'),
    show_access_info: event.show_access_info ?? Boolean(event.access_info),
    show_entry_info: event.show_entry_info ?? Boolean(event.entry_info),
    show_ambiance_info: event.show_ambiance_info ?? Boolean(event.ambiance_info),
    show_program: event.show_program ?? Boolean(event.program),
    access_info: event.access_info || '',
    entry_info: event.entry_info || '',
    ambiance_info: event.ambiance_info || '',
    created_at: new Date().toISOString(),
  };

  // Immediate Local Cache update
  const currentList = getCachedAllEvents();
  const updatedList = event.is_active
    ? [fullEvent, ...currentList.map((e) => ({ ...e, is_active: false }))]
    : [fullEvent, ...currentList];
  cacheAllEvents(updatedList);
  if (fullEvent.is_active) {
    cacheEvent(fullEvent);
  }

  if (!isSupabaseConfigured) {
    return fullEvent;
  }

  // If this new event is active, deactivate others on Supabase
  if (event.is_active) {
    try {
      await supabase.from('events').update({ is_active: false }).neq('id', 'placeholder');
    } catch (e) {
      console.warn('Could not deactivate previous active events in Supabase:', e);
    }
  }

  const basePayload: Record<string, any> = {
    title: fullEvent.title,
    edition: fullEvent.edition,
    date: fullEvent.date,
    location: fullEvent.location,
    program: fullEvent.program,
    banner_url: fullEvent.banner_url,
    is_active: fullEvent.is_active,
    access_info: fullEvent.access_info,
    entry_info: fullEvent.entry_info,
    ambiance_info: fullEvent.ambiance_info,
  };

  try {
    const { data, error } = await supabase
      .from('events')
      .insert([basePayload])
      .select()
      .maybeSingle();

    if (!error && data) {
      const saved: EventRecord = { ...data, category };
      const refreshed = updatedList.map((e) => (e.id === newId ? saved : e));
      cacheAllEvents(refreshed);
      return saved;
    }
  } catch (err) {
    console.warn('Error creating event with extra columns, trying fallback:', err);
  }

  // Fallback without extra columns
  try {
    const { access_info, entry_info, ambiance_info, ...simplePayload } = basePayload;
    const { data, error } = await supabase
      .from('events')
      .insert([simplePayload])
      .select()
      .maybeSingle();

    if (!error && data) {
      const saved: EventRecord = { ...data, category, access_info, entry_info, ambiance_info };
      const refreshed = updatedList.map((e) => (e.id === newId ? saved : e));
      cacheAllEvents(refreshed);
      return saved;
    }
  } catch (err) {
    console.warn('Fallback error creating event in Supabase:', err);
  }

  return fullEvent;
}

export async function updateEventDetails(
  id: string,
  updates: Partial<EventRecord> & { bannerUrl?: string }
): Promise<boolean> {
  const banner = updates.banner_url || updates.bannerUrl || '/images/event_banner.jpg';
  const category = updates.category || (updates.edition || updates.date ? detectCategory(updates) : undefined);

  // Update local cache immediately
  const currentList = getCachedAllEvents();
  const updatedList = currentList.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        ...updates,
        banner_url: banner,
        category: category || item.category || 'upcoming',
        access_info: updates.access_info !== undefined ? updates.access_info : item.access_info,
        entry_info: updates.entry_info !== undefined ? updates.entry_info : item.entry_info,
        ambiance_info: updates.ambiance_info !== undefined ? updates.ambiance_info : item.ambiance_info,
        program: updates.program !== undefined ? updates.program : item.program,
        updated_at: new Date().toISOString(),
      };
    }
    if (updates.is_active) {
      return { ...item, is_active: false };
    }
    return item;
  });
  cacheAllEvents(updatedList);

  const active = updatedList.find((e) => e.is_active);
  if (active) cacheEvent(active);

  if (!isSupabaseConfigured) {
    return true;
  }

  if (updates.is_active) {
    try {
      await supabase.from('events').update({ is_active: false }).neq('id', id);
    } catch (e) {
      console.warn('Could not deactivate other events in Supabase:', e);
    }
  }

  const fullPayload: Record<string, any> = {
    ...(updates.title && { title: updates.title }),
    ...(updates.edition && { edition: updates.edition }),
    ...(updates.date && { date: updates.date }),
    ...(updates.location && { location: updates.location }),
    ...(updates.program !== undefined && { program: updates.program }),
    banner_url: banner,
    access_info: updates.access_info !== undefined ? updates.access_info : '',
    entry_info: updates.entry_info !== undefined ? updates.entry_info : '',
    ambiance_info: updates.ambiance_info !== undefined ? updates.ambiance_info : '',
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.is_active === 'boolean') {
    fullPayload.is_active = updates.is_active;
  }

  // ✅ Always persist category and ticket/visibility flags when explicitly provided
  if (updates.category !== undefined) {
    fullPayload.category = updates.category;
  }
  if (typeof updates.ticket_available === 'boolean') {
    fullPayload.ticket_available = updates.ticket_available;
  }
  if (typeof updates.show_access_info === 'boolean') {
    fullPayload.show_access_info = updates.show_access_info;
  }
  if (typeof updates.show_entry_info === 'boolean') {
    fullPayload.show_entry_info = updates.show_entry_info;
  }
  if (typeof updates.show_ambiance_info === 'boolean') {
    fullPayload.show_ambiance_info = updates.show_ambiance_info;
  }
  if (typeof updates.show_program === 'boolean') {
    fullPayload.show_program = updates.show_program;
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

  // Fallback without extra columns (in case DB schema is missing optional columns)
  try {
    const {
      access_info,
      entry_info,
      ambiance_info,
      category: _cat,
      ticket_available: _ta,
      show_access_info: _sai,
      show_entry_info: _sei,
      show_ambiance_info: _sam,
      show_program: _sp,
      ...simplePayload
    } = fullPayload;
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
  const currentList = getCachedAllEvents();
  const updatedList = currentList.map((e) => ({
    ...e,
    is_active: e.id === id,
    category: e.id === id ? ('upcoming' as const) : e.category,
  }));
  cacheAllEvents(updatedList);

  const active = updatedList.find((e) => e.id === id);
  if (active) cacheEvent(active);

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
  const currentList = getCachedAllEvents();
  const updatedList = currentList.filter((e) => e.id !== id);
  cacheAllEvents(updatedList);

  if (!isSupabaseConfigured) return true;

  const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    if (isUUID) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (!error) return true;
    }
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
