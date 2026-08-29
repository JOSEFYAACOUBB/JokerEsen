-- ==============================================================================
-- JOKER ESEN - MIGRATION : NOUVELLES FONCTIONNALITÉS
-- ==============================================================================
-- Exécutez ce script dans Supabase SQL Editor pour ajouter uniquement les
-- nouvelles tables et colonnes (Partenaires, À Propos, Formulaire).
-- ==============================================================================

-- 1. Ajouter les nouvelles colonnes dans la table existante club_settings
alter table if exists public.club_settings 
  add column if not exists partners jsonb default '[]'::jsonb,
  add column if not exists about_data jsonb default '{}'::jsonb,
  add column if not exists form_config jsonb default '{}'::jsonb;

-- 2. Créer la nouvelle table pour les Partenaires & Organisations
create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  short_name text not null,
  svg_color text not null default '#F3C4A0',
  logo_url text,
  order_index integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Insérer les partenaires par défaut (si la table est vide)
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

-- 4. Activer la sécurité RLS sur la table partners
alter table public.partners enable row level security;

-- 5. Politique d'accès public (lecture / écriture)
drop policy if exists "Public manage partners" on public.partners;
create policy "Public manage partners"
  on public.partners for all
  to anon, authenticated, public, service_role
  using (true)
  with check (true);

-- 6. Permissions d'accès pour les rôles
grant all on public.partners to anon, authenticated, postgres, service_role;

-- 7. Ajouter la table partners à la réplication en temps réel Supabase
alter publication supabase_realtime add table public.partners;
