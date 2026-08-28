import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
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

  try {
    // 1. Try official SDK insert (without .select() to avoid requiring SELECT permissions on anon insert)
    const { error: sdkError } = await supabase
      .from('recruitment_applications')
      .insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        major: data.major,
        department: data.department,
        motivation: data.motivation || '',
        status: 'pending',
      });

    if (!sdkError) {
      return { success: true };
    }

    console.warn('SDK insert failed, trying REST fallback:', sdkError);

    // 2. Fallback to native REST with minimal return header
    const { error: restError } = await supabaseDb.recruitment.submit({
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      major: data.major,
      department: data.department,
      motivation: data.motivation || '',
    });

    if (restError) {
      console.error('Failed to submit application to Supabase:', restError);
      return { success: false, error: restError.message || sdkError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de l\'envoi de la candidature' };
  }
}

export async function fetchRecruitmentApplications(): Promise<RecruitmentApplication[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  try {
    const { data: sdkData, error: sdkError } = await supabase
      .from('recruitment_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sdkError && sdkData) {
      return sdkData;
    }
  } catch (err) {
    console.warn('SDK fetch applications failed, using REST fallback:', err);
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

  try {
    const { error: sdkError } = await supabase
      .from('recruitment_applications')
      .update({ status })
      .eq('id', id);

    if (!sdkError) return true;
  } catch (err) {
    console.warn('SDK update status failed, using REST fallback:', err);
  }

  const { error } = await supabaseDb.recruitment.updateStatus(id, status);
  if (error) {
    console.error('Failed to update status in Supabase:', error);
    return false;
  }
  return true;
}

export async function deleteRecruitmentApplication(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error: sdkError } = await supabase
      .from('recruitment_applications')
      .delete()
      .eq('id', id);

    if (!sdkError) return true;
  } catch (err) {
    console.warn('SDK delete application failed, using REST fallback:', err);
  }

  const { error } = await supabaseDb.recruitment.delete(id);
  if (error) {
    console.error('Failed to delete application in Supabase:', error);
    return false;
  }
  return true;
}
