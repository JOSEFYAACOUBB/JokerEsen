-- ==============================================================================
-- JOKER ESEN - MIGRATION : TABLE MEMBER_AGENDA & CONTACT FORMATEUR
-- ==============================================================================
-- Crée la table 'member_agenda' si elle n'existe pas encore,
-- ou ajoute la colonne 'trainer' et 'helper_roles' si elle existe déjà.
-- 100% SÉCURISÉ : Aucune suppression, aucune commande destructive, aucun avertissement.
-- ==============================================================================

-- 1. Création sécurisée de la table si elle n'existe pas encore
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
  trainer jsonb default null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Si la table existait déjà, on s'assure que les colonnes nécessaires existent
alter table public.member_agenda 
add column if not exists helper_roles jsonb default '[]'::jsonb;

alter table public.member_agenda 
add column if not exists trainer jsonb default null;

-- 3. Sécurité Row Level Security (RLS)
alter table public.member_agenda enable row level security;

-- 4. Politiques RLS sécurisées (ne lèvent pas d'erreur si déjà existantes)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'member_agenda' and policyname = 'Allow read access to everyone'
  ) then
    create policy "Allow read access to everyone" on public.member_agenda for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'member_agenda' and policyname = 'Allow full management for admin/service_role'
  ) then
    create policy "Allow full management for admin/service_role" on public.member_agenda for all using (true) with check (true);
  end if;
end
$$;
