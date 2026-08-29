import { isSupabaseConfigured } from '../lib/supabase';
import type { AboutData } from '../types/database';
import { fetchClubSettings, updateClubSettings } from './settingsService';

export const defaultAboutData: AboutData = {
  badge: '01 · QUI SOMMES-NOUS',
  title_prefix: "Plus Qu'Un Club, ",
  title_highlight: 'Une Aventure Humaine.',
  story_badge: '♠ Notre Histoire',
  story_location: 'ESEN Manouba',
  story_heading: "Éveiller l'énergie créative de chaque étudiant.",
  story_text:
    "Fondé en 2016 au sein de l'École Supérieure d'Économie Numérique, JokerEsen tire son nom du Joker — symbole d'imprévisibilité joyeuse et d'atout gagnant. Notre mission est de faire vibrer le campus à travers des soirées mythiques, des projets ambitieux et une véritable synergie d'équipe.",
  founded_year: '2016',
  editorial_badge: 'DEPUIS 2016',
  editorial_text: "L'énergie étudiante & créative au cœur de l'ESEN Manouba.",
  stats: [
    { number: '2016', label: 'Fondation', color: '#F3C4A0', icon: 'Calendar' },
    { number: '500+', label: 'Membres', color: '#E06060', icon: 'Users' },
    { number: '50+', label: 'Événements', color: '#7B7EDA', icon: 'Trophy' },
    { number: '100%', label: 'Passion', color: '#C98EC0', icon: 'Heart' },
  ],
  pillars: [
    {
      id: 'spade',
      suit: '♠',
      name: 'As de Pique',
      title: 'Audace & Créativité',
      desc: "Inventer des concepts d'événements uniques qui marquent la vie universitaire.",
      color: '#E05A52',
      bgGlow: 'rgba(224, 90, 82, 0.15)',
    },
    {
      id: 'heart',
      suit: '♥',
      name: 'As de Cœur',
      title: 'Esprit de Famille',
      desc: "Une communauté chaleureuse où chaque étudiant s'épanouit et crée du lien.",
      color: '#E87A5D',
      bgGlow: 'rgba(232, 122, 93, 0.15)',
    },
    {
      id: 'diamond',
      suit: '♦',
      name: 'As de Carreau',
      title: 'Excellence & Impact',
      desc: "Une organisation rigoureuse au service de projets ambitieux à l'ESEN.",
      color: '#7B7EDA',
      bgGlow: 'rgba(123, 126, 218, 0.15)',
    },
    {
      id: 'club',
      suit: '♣',
      name: 'As de Trèfle',
      title: 'Opportunités & Talent',
      desc: 'Développer des compétences pratiques en design, évènementiel & communication.',
      color: '#C98EC0',
      bgGlow: 'rgba(201, 142, 192, 0.15)',
    },
  ],
};

export async function fetchAboutData(): Promise<AboutData> {
  if (!isSupabaseConfigured) {
    return defaultAboutData;
  }

  try {
    const settings = await fetchClubSettings();
    if (settings?.about_data) {
      return {
        ...defaultAboutData,
        ...settings.about_data,
        stats: settings.about_data.stats || defaultAboutData.stats,
        pillars: settings.about_data.pillars || defaultAboutData.pillars,
      };
    }
  } catch (err) {
    console.warn('Error fetching about data from Supabase:', err);
  }

  return defaultAboutData;
}

export async function saveAboutData(data: Partial<AboutData>): Promise<AboutData> {
  const current = await fetchAboutData();
  const merged: AboutData = {
    ...current,
    ...data,
    stats: data.stats || current.stats,
    pillars: data.pillars || current.pillars,
  };

  if (isSupabaseConfigured) {
    try {
      await updateClubSettings({ about_data: merged });
    } catch (err) {
      console.warn('Error saving about data in Supabase:', err);
    }
  }

  return merged;
}
