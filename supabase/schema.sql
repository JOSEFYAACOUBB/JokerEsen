-- ==============================================================================
-- JOKER ESEN - SUPABASE DATABASE SCHEMA (BaaS)
-- ==============================================================================
-- Paste and run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CLUB SETTINGS (Global config, recruitment status, announcements, JSON stores)
-- ------------------------------------------------------------------------------
create table if not exists public.club_settings (
  id text primary key default 'default',
  recruitment_open boolean default true not null,
  announcement text,
  partners jsonb default '[]'::jsonb,
  about_data jsonb default '{}'::jsonb,
  form_config jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed default settings if not exists
insert into public.club_settings (id, recruitment_open, announcement)
values ('default', true, 'Bienvenue sur la plateforme officielle du Club Joker ESEN!')
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- 2. PARTNERS (Partenaires & Organisations Officielles)
-- ------------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  short_name text not null,
  svg_color text not null default '#F3C4A0',
  logo_url text,
  order_index integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed default partners
insert into public.partners (name, short_name, svg_color, order_index)
values
  ('ESEN Manouba', 'ESEN MANOUBA', '#F3C4A0', 1),
  ('Red Bull', 'RED BULL', '#DB0A40', 2),
  ('Orange Tunisie', 'ORANGE', '#FF6600', 3),
  ('Ooredoo', 'OOREDOO', '#ED1C24', 4),
  ('IEEE ESEN', 'IEEE ESEN', '#006699', 5),
  ('Enactus', 'ENACTUS', '#FFC20E', 6),
  ('JCI Manouba', 'JCI MANOUBA', '#5A459C', 7),
  ('Vercel', 'VERCEL', '#F5EDE4', 8)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 3. EVENTS (Upcoming and past events)
-- ------------------------------------------------------------------------------
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  edition text not null,
  date text not null,
  location text not null,
  program text not null,
  banner_url text not null default '/images/event_banner.jpg',
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed default event
insert into public.events (title, edition, date, location, program, banner_url, is_active)
values (
  'Joker Carnival Night 2026',
  'Édition Spéciale · 10ème Anniversaire',
  'Samedi 26 Octobre 2026 · 20h00',
  'Grand Cour & Amphi ESEN, Campus Manouba',
  'Concerts live · DJ set · Buffet · Tombola',
  '/images/event_banner.jpg',
  true
)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 4. TEAM MEMBERS (Le Bureau Exécutif)
-- ------------------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  suit text not null check (suit in ('♠', '♥', '♦', '♣')),
  suit_color text not null default '#F3C4A0',
  avatar text not null,
  instagram text default '#',
  linkedin text default '#',
  order_index integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 5. RECRUITMENT APPLICATIONS (Adhésions / Candidatures)
-- ------------------------------------------------------------------------------
create table if not exists public.recruitment_applications (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  major text not null,
  department text not null,
  motivation text,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'contacted')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 6. GALLERY IMAGES (Cloudinary + Supabase metadata)
-- ------------------------------------------------------------------------------
create table if not exists public.gallery_images (
  id uuid default gen_random_uuid() primary key,
  cloudinary_url text not null unique,
  cloudinary_public_id text not null unique,
  title text,
  description text,
  width integer,
  height integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 7. GRANT TABLE PERMISSIONS TO PUBLIC ROLES
-- ------------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, postgres, service_role;
grant all on all tables in schema public to anon, authenticated, postgres, service_role;
grant all on all sequences in schema public to anon, authenticated, postgres, service_role;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.club_settings enable row level security;
alter table public.partners enable row level security;
alter table public.events enable row level security;
alter table public.team_members enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.gallery_images enable row level security;

-- Drop existing policies to prevent conflicts
drop policy if exists "Public manage club settings" on public.club_settings;
drop policy if exists "Public manage partners" on public.partners;
drop policy if exists "Public manage events" on public.events;
drop policy if exists "Public manage team members" on public.team_members;
drop policy if exists "Public manage recruitment" on public.recruitment_applications;
drop policy if exists "Public manage gallery" on public.gallery_images;

-- Allow Public Management (for anon + authenticated)
create policy "Public manage club settings"
  on public.club_settings for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

create policy "Public manage partners"
  on public.partners for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

create policy "Public manage events"
  on public.events for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

create policy "Public manage team members"
  on public.team_members for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

create policy "Public manage recruitment"
  on public.recruitment_applications for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

create policy "Public manage gallery"
  on public.gallery_images for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

-- ------------------------------------------------------------------------------
-- 8. NEWSLETTER SUBSCRIBERS
-- ------------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  source text default 'website_agenda',
  synced_to_brevo boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create policy "Public manage newsletter"
  on public.newsletter_subscribers for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

-- ------------------------------------------------------------------------------
-- 9. REALTIME REPLICATION
-- ------------------------------------------------------------------------------
alter publication supabase_realtime add table public.club_settings;
alter publication supabase_realtime add table public.partners;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.recruitment_applications;
alter publication supabase_realtime add table public.gallery_images;
alter publication supabase_realtime add table public.newsletter_subscribers;
