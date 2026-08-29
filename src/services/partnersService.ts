import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Partner } from '../types/database';
import { fetchClubSettings, updateClubSettings } from './settingsService';

export const defaultPartners: Partner[] = [
  {
    id: 'esen',
    name: 'ESEN Manouba',
    short_name: 'ESEN MANOUBA',
    svg_color: '#F3C4A0',
    order_index: 1,
  },
  {
    id: 'redbull',
    name: 'Red Bull',
    short_name: 'RED BULL',
    svg_color: '#DB0A40',
    order_index: 2,
  },
  {
    id: 'orange',
    name: 'Orange Tunisie',
    short_name: 'ORANGE',
    svg_color: '#FF6600',
    order_index: 3,
  },
  {
    id: 'ooredoo',
    name: 'Ooredoo',
    short_name: 'OOREDOO',
    svg_color: '#ED1C24',
    order_index: 4,
  },
  {
    id: 'ieee',
    name: 'IEEE ESEN',
    short_name: 'IEEE ESEN',
    svg_color: '#006699',
    order_index: 5,
  },
  {
    id: 'enactus',
    name: 'Enactus',
    short_name: 'ENACTUS',
    svg_color: '#FFC20E',
    order_index: 6,
  },
  {
    id: 'jci',
    name: 'JCI Manouba',
    short_name: 'JCI MANOUBA',
    svg_color: '#5A459C',
    order_index: 7,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    short_name: 'VERCEL',
    svg_color: '#F5EDE4',
    order_index: 8,
  },
];

export async function fetchPartners(): Promise<Partner[]> {
  if (!isSupabaseConfigured) {
    return defaultPartners;
  }

  // 1. Try fetching from dedicated Supabase 'partners' table
  try {
    const { data: partnersData, error } = await supabase
      .from('partners')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && partnersData && partnersData.length > 0) {
      return partnersData.map((p: any) => ({
        id: p.id,
        name: p.name,
        short_name: p.short_name || p.name,
        svg_color: p.svg_color || '#F3C4A0',
        logo_url: p.logo_url || undefined,
        order_index: p.order_index ?? 0,
      }));
    }
  } catch (e) {
    console.warn('Supabase partners table fetch error, falling back to club_settings:', e);
  }

  // 2. Try fetching from 'club_settings' in Supabase
  try {
    const settings = await fetchClubSettings();
    if (settings?.partners && Array.isArray(settings.partners) && settings.partners.length > 0) {
      return settings.partners;
    }
  } catch (err) {
    console.warn('Could not fetch partners from settings:', err);
  }

  return defaultPartners;
}

export async function savePartner(partner: Partner): Promise<Partner[]> {
  const currentPartners = await fetchPartners();
  const id = partner.id || String(Date.now());
  const partnerToSave: Partner = {
    ...partner,
    id,
    order_index: partner.order_index ?? currentPartners.length + 1,
  };

  const index = currentPartners.findIndex((p) => (partner.id && p.id === partner.id) || p.name === partner.name);
  let updatedList: Partner[];
  if (index >= 0) {
    updatedList = currentPartners.map((p, i) => (i === index ? partnerToSave : p));
  } else {
    updatedList = [...currentPartners, partnerToSave];
  }

  // Persist to Supabase
  if (isSupabaseConfigured) {
    // 1. Save in club_settings in Supabase
    try {
      await updateClubSettings({ partners: updatedList });
    } catch (e) {
      console.warn('Error saving partner to club_settings in Supabase:', e);
    }

    // 2. Try saving to dedicated 'partners' table if it exists
    try {
      await supabase.from('partners').upsert({
        id: isNaN(Number(id)) ? id : undefined,
        name: partnerToSave.name,
        short_name: partnerToSave.short_name,
        svg_color: partnerToSave.svg_color,
        logo_url: partnerToSave.logo_url || null,
        order_index: partnerToSave.order_index,
      });
    } catch (err) {
      console.warn('Partners table upsert exception:', err);
    }
  }

  return updatedList;
}

export async function deletePartner(id: string, name?: string): Promise<Partner[]> {
  const currentPartners = await fetchPartners();
  const updatedList = currentPartners.filter((p) => (id ? p.id !== id : true) && (name ? p.name !== name : true));

  if (isSupabaseConfigured) {
    // 1. Update club_settings in Supabase
    try {
      await updateClubSettings({ partners: updatedList });
    } catch (e) {
      console.warn('Error deleting partner from club_settings:', e);
    }

    // 2. Try deleting from dedicated 'partners' table in Supabase
    try {
      if (id) {
        await supabase.from('partners').delete().eq('id', id);
      } else if (name) {
        await supabase.from('partners').delete().eq('name', name);
      }
    } catch (err) {
      console.warn('Partners table delete exception:', err);
    }
  }

  return updatedList;
}
