import { isSupabaseConfigured } from '../lib/supabase';
import type { FormConfig } from '../types/database';
import { fetchClubSettings, updateClubSettings } from './settingsService';

export const defaultFormConfig: FormConfig = {
  majors: [
    'L1 Business Computing',
    'L2 Business Computing',
    'L3 Business Analytics',
    'L1 E-Commerce & Digital',
    'L2/L3 E-Commerce',
    'Master ESEN',
  ],
  departments: [
    'Événementiel & Animation',
    'Design & Multimédia',
    'Sponsoring & Relations Publiques',
    'Logistique & Trésorerie',
    'Ressources Humaines & Communication',
  ],
  welcome_badge: '05 · RECRUTEMENT 2026',
  welcome_title: "Rejoins L'Aventure",
  welcome_subtitle: 'Salut & Bienvenue !',
  form_heading: 'Inscris-toi',
  form_subheading: 'Complète tes informations pour rejoindre le club JokerEsen.',
};

export async function fetchFormConfig(): Promise<FormConfig> {
  if (!isSupabaseConfigured) {
    return defaultFormConfig;
  }

  try {
    const settings = await fetchClubSettings();
    if (settings?.form_config) {
      return {
        ...defaultFormConfig,
        ...settings.form_config,
        majors: settings.form_config.majors || defaultFormConfig.majors,
        departments: settings.form_config.departments || defaultFormConfig.departments,
      };
    }
  } catch (err) {
    console.warn('Error fetching form config from Supabase:', err);
  }

  return defaultFormConfig;
}

export async function saveFormConfig(config: Partial<FormConfig>): Promise<FormConfig> {
  const current = await fetchFormConfig();
  const merged: FormConfig = {
    ...current,
    ...config,
    majors: config.majors || current.majors,
    departments: config.departments || current.departments,
  };

  if (isSupabaseConfigured) {
    try {
      await updateClubSettings({ form_config: merged });
    } catch (err) {
      console.warn('Error saving form config in Supabase:', err);
    }
  }

  return merged;
}
