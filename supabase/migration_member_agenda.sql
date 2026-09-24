-- ==============================================================================
-- JOKER ESEN - MIGRATION : TABLE MEMBER AGENDA (FORMATIONS & RÉUNIONS)
-- ==============================================================================
-- Exécutez ce script dans le Supabase SQL Editor pour créer la table dédiée
-- à l'agenda des membres (Formations, Réunions & Ateliers internes).
-- ==============================================================================

create table if not exists public.member_agenda (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  edition text default '',
  date text not null,
  location text not null,
  program text default '',
  meeting_url text default '',
  event_type text default 'formation',
  max_seats integer default 50,
  helper_roles jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.member_agenda enable row level security;

-- Policies
create policy "Allow read access to everyone" on public.member_agenda
  for select using (true);

create policy "Allow full management for admin/service_role" on public.member_agenda
  for all using (true) with check (true);
