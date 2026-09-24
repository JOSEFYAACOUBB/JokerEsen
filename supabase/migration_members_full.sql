-- ==============================================================================
-- JOKER ESEN - MIGRATION : MEMBRES & INSCRIPTIONS (cross-device sync)
-- ==============================================================================
-- Executez ce script dans Supabase SQL Editor UNE SEULE FOIS.
-- Il cree les tables club_members et member_registrations si elles n'existent
-- pas, et configure les permissions pour que tous les appareils voient les
-- memes donnees.
-- ==============================================================================

-- 1. TABLE : MEMBRES DU CLUB
-- ==============================================================================
create table if not exists public.club_members (
  id text primary key,
  full_name text not null,
  email text not null,
  password text default 'joker2024',
  cin text default '',
  phone text default '',
  birth_date text,
  major text default '',
  department text default '',
  role text default 'member',
  bio text default '',
  avatar_url text default '',
  skills text[] default '{}',
  points integer default 50,
  level text default 'Bronze',
  badges text[] default '{Newcomer}',
  join_date text default '',
  status text default 'active',
  events_attended integer default 0,
  formations_completed integer default 0,
  streak_months integer default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.club_members enable row level security;

-- Drop old policies to avoid conflicts
drop policy if exists "Public manage club members" on public.club_members;

-- Open read/write policy (admin-controlled app)
create policy "Public manage club members"
  on public.club_members for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

-- Permissions
grant all on public.club_members to anon, authenticated, postgres, service_role;

-- Realtime
alter publication supabase_realtime add table public.club_members;


-- 2. TABLE : INSCRIPTIONS & PRESENCES
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

-- Enable RLS
alter table public.member_registrations enable row level security;

-- Drop old policies to avoid conflicts
drop policy if exists "Allow read access to everyone" on public.member_registrations;
drop policy if exists "Allow full management for all users" on public.member_registrations;

-- Policies
create policy "Allow read access to everyone" on public.member_registrations
  for select using (true);

create policy "Allow full management for all users" on public.member_registrations
  for all using (true) with check (true);

-- Permissions
grant all on public.member_registrations to anon, authenticated, postgres, service_role;

-- Realtime (so other devices get live updates)
alter publication supabase_realtime add table public.member_registrations;
