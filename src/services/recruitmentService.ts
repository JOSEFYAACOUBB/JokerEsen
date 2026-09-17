import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import type { RecruitmentApplication } from '../types/database';
import { getCachedSettings } from './settingsService';

export interface SubmitApplicationData {
  fullName: string;
  email: string;
  phone: string;
  birthDate?: string;
  major: string;
  department: string;
  faculty?: string;
  motivation?: string;
  whyJoin?: string;
  eventIdea?: string;
  facebookLink?: string;
  skills?: string[];
  activityAxes?: string[];
  desiredTrainings?: string[];
}

export async function submitRecruitmentApplication(data: SubmitApplicationData): Promise<{ success: boolean; error?: string }> {
  // Guard check: verify if recruitment is currently open
  const settings = getCachedSettings();
  if (settings && settings.recruitment_open === false) {
    return { success: false, error: 'Les adhésions sont actuellement suspendues pour cette session.' };
  }

  if (!isSupabaseConfigured) {
    console.info('[Supabase BaaS] Running in offline demo mode. Supabase credentials not set in .env.');
    return { success: true };
  }

  const facultyVal = data.faculty || data.department;

  const payload: any = {
    full_name: data.fullName,
    email: data.email,
    phone: data.phone,
    birth_date: data.birthDate || null,
    major: data.major,
    department: facultyVal,
    faculty: facultyVal,
    motivation: data.motivation || '',
    why_join: data.whyJoin || '',
    event_idea: data.eventIdea || '',
    facebook_link: data.facebookLink || '',
    skills: data.skills || [],
    activity_axes: data.activityAxes || [],
    desired_trainings: data.desiredTrainings || [],
    status: 'pending',
  };

  // 1. Try SDK insert with all new fields
  try {
    const { error: sdkErrorWithFaculty } = await supabase
      .from('recruitment_applications')
      .insert(payload);

    if (!sdkErrorWithFaculty) {
      return { success: true };
    }
  } catch {
    // continue to fallback
  }

  try {
    // 2. Fallback: SDK insert without faculty column if faculty column is absent
    const { faculty, ...standardPayload } = payload;
    const { error: sdkError } = await supabase
      .from('recruitment_applications')
      .insert(standardPayload);

    if (!sdkError) {
      return { success: true };
    }

    console.warn('SDK insert failed, trying REST fallback:', sdkError);

    // 3. Fallback to native REST with minimal return header
    const { error: restError } = await supabaseDb.recruitment.submit(standardPayload);

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
      return sdkData.map((item: any) => ({
        ...item,
        faculty: item.faculty || item.department || 'ESEN Manouba',
      }));
    }
  } catch (err) {
    console.warn('SDK fetch applications failed, using REST fallback:', err);
  }

  const { data, error } = await supabaseDb.recruitment.getAll();
  if (error || !data) {
    console.error('Failed to fetch applications from Supabase:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    faculty: item.faculty || item.department || 'ESEN Manouba',
  }));
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
