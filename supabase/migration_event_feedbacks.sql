-- ==============================================================================
-- JOKER ESEN - MIGRATION : TABLE EVENT FEEDBACKS (AVIS MEMBRES POST-ÉVÉNEMENT)
-- ==============================================================================
-- Exécutez ce script dans Supabase SQL Editor pour enregistrer et synchroniser
-- les avis et évaluations laissés par les membres après chaque événement / formation.
-- ==============================================================================

create table if not exists public.event_feedbacks (
  id uuid default gen_random_uuid() primary key,
  event_id text not null,
  event_title text not null,
  member_id text not null,
  member_name text not null,
  member_email text default '',
  member_avatar text default '',
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text default '',
  aspects jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.event_feedbacks enable row level security;

-- Policies
drop policy if exists "Allow read access to everyone" on public.event_feedbacks;
drop policy if exists "Allow insert for everyone" on public.event_feedbacks;
drop policy if exists "Allow full management for admin" on public.event_feedbacks;

create policy "Allow read access to everyone" on public.event_feedbacks
  for select using (true);

create policy "Allow insert for everyone" on public.event_feedbacks
  for insert with check (true);

create policy "Allow full management for admin" on public.event_feedbacks
  for all using (true) with check (true);

-- Permissions
grant all on public.event_feedbacks to anon, authenticated, postgres, service_role;

-- Realtime replication
alter publication supabase_realtime add table public.event_feedbacks;
