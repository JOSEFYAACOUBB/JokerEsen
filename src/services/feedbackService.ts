import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EventFeedback } from '../types/member';

const LOCAL_STORAGE_FEEDBACKS_KEY = 'joker_event_feedbacks';

export function getCachedFeedbacks(): EventFeedback[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_FEEDBACKS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached event feedbacks:', e);
  }
  return [];
}

export function cacheFeedbacks(feedbacks: EventFeedback[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_FEEDBACKS_KEY, JSON.stringify(feedbacks));
  } catch (e) {
    console.warn('Could not write cached event feedbacks:', e);
  }
}

export async function fetchAllFeedbacks(): Promise<EventFeedback[]> {
  const cached = getCachedFeedbacks();

  if (!isSupabaseConfigured) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('event_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const list: EventFeedback[] = data.map((item: any) => ({
        id: item.id,
        event_id: item.event_id,
        event_title: item.event_title,
        member_id: item.member_id,
        member_name: item.member_name,
        member_email: item.member_email || '',
        member_avatar: item.member_avatar || '',
        rating: item.rating,
        comment: item.comment || '',
        aspects: item.aspects || {},
        created_at: item.created_at,
      }));
      cacheFeedbacks(list);
      return list;
    }
  } catch (err) {
    console.warn('Error fetching event_feedbacks from Supabase:', err);
  }

  return cached;
}

export async function fetchFeedbacksForEvent(eventId: string): Promise<EventFeedback[]> {
  const all = await fetchAllFeedbacks();
  return all.filter((f) => f.event_id === eventId);
}

export async function submitFeedback(
  feedback: Omit<EventFeedback, 'id' | 'created_at'> & { id?: string }
): Promise<EventFeedback> {
  const newId = feedback.id || `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newFeedback: EventFeedback = {
    ...feedback,
    id: newId,
    created_at: new Date().toISOString(),
  };

  const currentList = getCachedFeedbacks();
  // If member already gave feedback for this event, replace it, otherwise prepend
  const updatedList = [
    newFeedback,
    ...currentList.filter(
      (f) => !(f.event_id === newFeedback.event_id && f.member_id === newFeedback.member_id)
    ),
  ];
  cacheFeedbacks(updatedList);

  if (!isSupabaseConfigured) {
    return newFeedback;
  }

  try {
    const payload = {
      event_id: newFeedback.event_id,
      event_title: newFeedback.event_title,
      member_id: newFeedback.member_id,
      member_name: newFeedback.member_name,
      member_email: newFeedback.member_email || '',
      member_avatar: newFeedback.member_avatar || '',
      rating: newFeedback.rating,
      comment: newFeedback.comment || '',
      aspects: newFeedback.aspects || {},
    };

    const { data, error } = await supabase
      .from('event_feedbacks')
      .insert([payload])
      .select()
      .maybeSingle();

    if (!error && data) {
      const saved: EventFeedback = { ...newFeedback, ...data };
      const refreshed = updatedList.map((f) => (f.id === newId ? saved : f));
      cacheFeedbacks(refreshed);
      return saved;
    }
  } catch (err) {
    console.warn('Error inserting event_feedback in Supabase:', err);
  }

  return newFeedback;
}

export async function deleteFeedback(id: string): Promise<boolean> {
  const currentList = getCachedFeedbacks();
  const updatedList = currentList.filter((f) => f.id !== id);
  cacheFeedbacks(updatedList);

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase.from('event_feedbacks').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.warn('Error deleting event_feedback from Supabase:', err);
    return false;
  }
}

export function computeEventRatingSummary(feedbacks: EventFeedback[]) {
  if (feedbacks.length === 0) {
    return {
      average: 0,
      total: 0,
      counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      positivePercent: 0,
    };
  }

  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let positive = 0;

  feedbacks.forEach((f) => {
    const r = Math.min(5, Math.max(1, Math.round(f.rating)));
    counts[r] = (counts[r] || 0) + 1;
    sum += f.rating;
    if (f.rating >= 4) positive++;
  });

  const average = Number((sum / feedbacks.length).toFixed(1));
  const positivePercent = Math.round((positive / feedbacks.length) * 100);

  return {
    average,
    total: feedbacks.length,
    counts,
    positivePercent,
  };
}
