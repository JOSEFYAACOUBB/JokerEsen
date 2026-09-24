import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { EventIdea, EventIdeaStatus } from '../types/member';

const LOCAL_STORAGE_IDEAS_KEY = 'joker_event_ideas';

export function getCachedIdeas(): EventIdea[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_IDEAS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached event ideas:', e);
  }
  return [];
}

export function cacheIdeas(ideas: EventIdea[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_IDEAS_KEY, JSON.stringify(ideas));
  } catch (e) {
    console.warn('Could not write cached event ideas:', e);
  }
}

export async function fetchAllEventIdeas(): Promise<EventIdea[]> {
  const cached = getCachedIdeas();

  if (!isSupabaseConfigured) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('event_ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const list: EventIdea[] = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description,
        target_audience: item.target_audience || '',
        speaker_suggestion: item.speaker_suggestion || '',
        estimated_duration: item.estimated_duration || '',
        member_id: item.member_id,
        member_name: item.member_name,
        member_email: item.member_email || '',
        member_avatar: item.member_avatar || '',
        votes: Array.isArray(item.votes) ? item.votes : [],
        status: (item.status as EventIdeaStatus) || 'pending',
        admin_notes: item.admin_notes || '',
        points_awarded: item.points_awarded || 0,
        created_at: item.created_at,
      }));
      cacheIdeas(list);
      return list;
    }
  } catch (err) {
    console.warn('Error fetching event_ideas from Supabase:', err);
  }

  return cached;
}

export async function createEventIdea(
  idea: Omit<EventIdea, 'id' | 'votes' | 'status' | 'created_at'>
): Promise<EventIdea> {
  const newId = `idea-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newIdea: EventIdea = {
    ...idea,
    id: newId,
    votes: [],
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const currentList = getCachedIdeas();
  const updatedList = [newIdea, ...currentList];
  cacheIdeas(updatedList);

  if (!isSupabaseConfigured) {
    return newIdea;
  }

  try {
    const payload = {
      title: newIdea.title,
      category: newIdea.category,
      description: newIdea.description,
      target_audience: newIdea.target_audience || '',
      speaker_suggestion: newIdea.speaker_suggestion || '',
      estimated_duration: newIdea.estimated_duration || '',
      member_id: newIdea.member_id,
      member_name: newIdea.member_name,
      member_email: newIdea.member_email || '',
      member_avatar: newIdea.member_avatar || '',
      votes: [],
      status: 'pending',
      admin_notes: '',
      points_awarded: 0,
    };

    const { data, error } = await supabase
      .from('event_ideas')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      const persistedIdea: EventIdea = {
        ...newIdea,
        id: data.id,
        created_at: data.created_at,
      };
      // Replace temporary id in cache
      const finalCached = updatedList.map((i) => (i.id === newId ? persistedIdea : i));
      cacheIdeas(finalCached);
      return persistedIdea;
    }
  } catch (err) {
    console.warn('Error creating event_idea in Supabase:', err);
  }

  return newIdea;
}

export async function toggleVoteIdea(ideaId: string, memberId: string): Promise<EventIdea | null> {
  const list = getCachedIdeas();
  const index = list.findIndex((i) => i.id === ideaId);
  if (index === -1) return null;

  const idea = { ...list[index] };
  const currentVotes = Array.isArray(idea.votes) ? [...idea.votes] : [];
  const hasVoted = currentVotes.includes(memberId);

  const updatedVotes = hasVoted
    ? currentVotes.filter((id) => id !== memberId)
    : [...currentVotes, memberId];

  idea.votes = updatedVotes;
  list[index] = idea;
  cacheIdeas(list);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('event_ideas')
        .update({ votes: updatedVotes })
        .eq('id', ideaId);
    } catch (err) {
      console.warn('Error updating votes in Supabase:', err);
    }
  }

  return idea;
}

export async function updateIdeaStatus(
  ideaId: string,
  status: EventIdeaStatus,
  adminNotes?: string,
  pointsAwarded?: number
): Promise<boolean> {
  const list = getCachedIdeas();
  const index = list.findIndex((i) => i.id === ideaId);
  if (index !== -1) {
    list[index] = {
      ...list[index],
      status,
      ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
      ...(pointsAwarded !== undefined ? { points_awarded: pointsAwarded } : {}),
    };
    cacheIdeas(list);
  }

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const updatePayload: Record<string, any> = { status };
    if (adminNotes !== undefined) updatePayload.admin_notes = adminNotes;
    if (pointsAwarded !== undefined) updatePayload.points_awarded = pointsAwarded;

    const { error } = await supabase
      .from('event_ideas')
      .update(updatePayload)
      .eq('id', ideaId);
    return !error;
  } catch (err) {
    console.warn('Error updating event_idea status in Supabase:', err);
    return false;
  }
}

export async function deleteEventIdea(ideaId: string): Promise<boolean> {
  const list = getCachedIdeas();
  const updatedList = list.filter((i) => i.id !== ideaId);
  cacheIdeas(updatedList);

  if (!isSupabaseConfigured) {
    return true;
  }

  try {
    const { error } = await supabase.from('event_ideas').delete().eq('id', ideaId);
    return !error;
  } catch (err) {
    console.warn('Error deleting event_idea from Supabase:', err);
    return false;
  }
}
