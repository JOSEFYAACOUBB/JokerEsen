import { supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { RecruitmentApplication } from '../types/database';

export interface SubmitApplicationData {
  fullName: string;
  email: string;
  phone: string;
  major: string;
  department: string;
  motivation?: string;
}

export async function submitRecruitmentApplication(data: SubmitApplicationData): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    console.info('[Supabase BaaS] Running in offline demo mode. Supabase credentials not set in .env.');
    return { success: true };
  }

  const { error } = await supabaseDb.recruitment.submit({
    full_name: data.fullName,
    email: data.email,
    phone: data.phone,
    major: data.major,
    department: data.department,
    motivation: data.motivation || '',
  });

  if (error) {
    console.error('Failed to submit application to Supabase:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function fetchRecruitmentApplications(): Promise<RecruitmentApplication[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabaseDb.recruitment.getAll();
  if (error || !data) {
    console.error('Failed to fetch applications from Supabase:', error);
    return [];
  }

  return data;
}

export async function updateRecruitmentStatus(
  id: string,
  status: 'pending' | 'accepted' | 'rejected' | 'contacted'
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabaseDb.recruitment.updateStatus(id, status);
  if (error) {
    console.error('Failed to update status in Supabase:', error);
    return false;
  }
  return true;
}

export async function deleteRecruitmentApplication(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabaseDb.recruitment.delete(id);
  if (error) {
    console.error('Failed to delete application in Supabase:', error);
    return false;
  }
  return true;
}
