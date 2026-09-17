-- ==============================================================================
-- JOKER ESEN - MIGRATION : TABLE MEMBER REGISTRATIONS (INSCRIPTIONS & ÉMARGEMENT)
-- ==============================================================================
-- Exécutez ce script dans le Supabase SQL Editor pour créer la table dédiée
-- aux inscriptions et au suivi de présence (émargement/absences) des membres.
-- ==============================================================================

create table if not exists public.member_registrations (
  id text primary key,
  event_id text not null,
  event_title text not null,
  member_id text not null,
  member_name text default '',
  member_email text default '',
  status text default 'confirmed',
  attendance_status text default 'pending',
  absence_remark text default '',
  justification_reason text default '',
  meeting_url text default '',
  event_type text default 'formation',
  registered_at text default '',
  cancelled_at text default '',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.member_registrations enable row level security;

-- Policies for open read and management
create policy "Allow read access to everyone" on public.member_registrations
  for select using (true);

create policy "Allow full management for all users" on public.member_registrations
  for all using (true) with check (true);
