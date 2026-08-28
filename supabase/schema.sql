-- ==============================================================================
-- JOKER ESEN - SUPABASE DATABASE SCHEMA (BaaS)
-- ==============================================================================
-- Paste and run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CLUB SETTINGS (Global config, recruitment status, announcements)
-- ------------------------------------------------------------------------------
create table if not exists public.club_settings (
  id text primary key default 'default',
  recruitment_open boolean default true not null,
  announcement text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed default settings if not exists
insert into public.club_settings (id, recruitment_open, announcement)
values ('default', true, 'Bienvenue sur la plateforme officielle du Club Joker ESEN!')
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- 2. EVENTS (Upcoming and past events)
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
-- 3. TEAM MEMBERS (Le Bureau Exécutif)
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
-- 4. RECRUITMENT APPLICATIONS (Adhésions / Candidatures)
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
-- 5. GALLERY IMAGES (Cloudinary + Supabase metadata)
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
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.club_settings enable row level security;
alter table public.events enable row level security;
alter table public.team_members enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.gallery_images enable row level security;

-- Policies for club_settings
create policy "Anyone can read club settings"
  on public.club_settings for select
  using (true);

create policy "Authenticated users can update club settings"
  on public.club_settings for update
  to authenticated
  using (true)
  with check (true);

-- Policies for events
create policy "Anyone can view active events"
  on public.events for select
  using (true);

create policy "Authenticated users can insert/update/delete events"
  on public.events for all
  to authenticated
  using (true)
  with check (true);

-- Policies for team_members
create policy "Anyone can view team members"
  on public.team_members for select
  using (true);

create policy "Authenticated users can manage team members"
  on public.team_members for all
  to authenticated
  using (true)
  with check (true);

-- Policies for recruitment_applications
create policy "Anyone can submit a recruitment application"
  on public.recruitment_applications for insert
  with check (true);

create policy "Authenticated users can view recruitment applications"
  on public.recruitment_applications for select
  to authenticated
  using (true);

create policy "Authenticated users can update application status"
  on public.recruitment_applications for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete applications"
  on public.recruitment_applications for delete
  to authenticated
  using (true);

-- Policies for gallery_images
create policy "Anyone can read gallery"
  on public.gallery_images for select
  using (true);

create policy "Only authenticated can upload gallery images"
  on public.gallery_images for insert
  with check (auth.role() = 'authenticated' or true); -- Allows client/admin upload

create policy "Users can delete gallery images"
  on public.gallery_images for delete
  using (auth.uid() = uploaded_by or auth.role() = 'authenticated' or true);

-- ------------------------------------------------------------------------------
-- 7. REALTIME REPLICATION
-- ------------------------------------------------------------------------------
alter publication supabase_realtime add table public.club_settings;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.recruitment_applications;
alter publication supabase_realtime add table public.gallery_images;
