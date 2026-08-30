-- ==============================================================================
-- JOKER ESEN - COMPLETE SUPABASE POSTGRESQL SETUP SCRIPT
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. CLUB SETTINGS (Global config, recruitment status, announcements, JSON config)
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

-- Seed default settings
insert into public.club_settings (id, recruitment_open, announcement)
values ('default', true, 'Bienvenue sur la plateforme officielle du Club Joker ESEN!')
on conflict (id) do update set
  updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. PARTNERS & ORGANISATIONS
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
-- 4. EVENTS (Upcoming and past events)
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
  access_info text default 'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
  entry_info text default '100% Gratuite avec réservation préalable en ligne.',
  ambiance_info text default 'Musique live, animations, buffet & tombola du club Joker ESEN.',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure existing table has the new columns
alter table public.events add column if not exists access_info text default 'Ouvert aux étudiants munis de leur réservation / pass gratuit.';
alter table public.events add column if not exists entry_info text default '100% Gratuite avec réservation préalable en ligne.';
alter table public.events add column if not exists ambiance_info text default 'Musique live, animations, buffet & tombola du club Joker ESEN.';

-- Seed default active event
insert into public.events (title, edition, date, location, program, banner_url, is_active, access_info, entry_info, ambiance_info)
values (
  'Joker Carnival Night 2026',
  'Édition Spéciale · 10ème Anniversaire',
  'Samedi 26 Octobre 2026 · 20h00',
  'Grand Cour & Amphi ESEN, Campus Manouba',
  'Concerts live · DJ set · Buffet · Tombola',
  '/images/event_banner.jpg',
  true,
  'Ouvert aux étudiants munis de leur réservation / pass gratuit.',
  '100% Gratuite avec réservation préalable en ligne.',
  'Musique live, animations, buffet & tombola du club Joker ESEN.'
)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 5. TEAM MEMBERS (Le Bureau Exécutif)
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

-- Seed default team members
insert into public.team_members (name, role, suit, suit_color, avatar, instagram, linkedin, order_index)
values
  ('Yasmine Ben Salem', 'Présidente du Club', '♠', '#F3C4A0', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=800', '#', '#', 1),
  ('Youssef Trabelsi', 'Vice-Président', '♥', '#B93A34', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600&h=800', '#', '#', 2),
  ('Sarra Chaabane', 'Secrétaire Générale', '♦', '#4E4F9E', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600&h=800', '#', '#', 3),
  ('Amine Karray', 'Trésorier & Logistics', '♣', '#F3C4A0', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600&h=800', '#', '#', 4),
  ('Nour El Hoda Gharbi', 'Chef Pôle Design', '♦', '#A66B95', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600&h=800', '#', '#', 5),
  ('Kahlil Ferjani', 'Chef Événementiel', '♣', '#4E4F9E', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600&h=800', '#', '#', 6)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 6. RECRUITMENT APPLICATIONS (Candidatures en ligne)
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
-- 7. GALLERY IMAGES (Cloudinary + Supabase metadata)
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
-- 8. GRANT USAGE & PERMISSIONS
-- ------------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, postgres, service_role;
grant all on all tables in schema public to anon, authenticated, postgres, service_role;
grant all on all sequences in schema public to anon, authenticated, postgres, service_role;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.club_settings enable row level security;
alter table public.partners enable row level security;
alter table public.events enable row level security;
alter table public.team_members enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.gallery_images enable row level security;

-- Drop existing policies if any
drop policy if exists "Public manage club settings" on public.club_settings;
drop policy if exists "Public manage partners" on public.partners;
drop policy if exists "Public manage events" on public.events;
drop policy if exists "Public manage team members" on public.team_members;
drop policy if exists "Public manage recruitment" on public.recruitment_applications;
drop policy if exists "Public manage gallery" on public.gallery_images;

-- Create Open Public Access Policies
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
-- 10. REALTIME SUBSCRIPTIONS
-- ------------------------------------------------------------------------------
alter publication supabase_realtime add table public.club_settings;
alter publication supabase_realtime add table public.partners;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.recruitment_applications;
alter publication supabase_realtime add table public.gallery_images;
