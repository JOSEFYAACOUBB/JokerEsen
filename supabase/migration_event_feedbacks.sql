-- ==============================================================================
-- JOKER ESEN - MIGRATION : TABLE EVENT FEEDBACKS (AVIS MEMBRES POST-ÉVÉNEMENT)
-- ==============================================================================
-- 100% SÉCURISÉ : Ne supprime aucune table ni aucune donnée existante.
-- Ce script crée uniquement la NOUVELLE table pour enregistrer les avis.
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

-- Activation de la sécurité RLS
alter table public.event_feedbacks enable row level security;

-- Création sécurisée des politiques (sans commande DROP)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'event_feedbacks' and policyname = 'Allow read access to everyone'
  ) then
    create policy "Allow read access to everyone" on public.event_feedbacks
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'event_feedbacks' and policyname = 'Allow insert for everyone'
  ) then
    create policy "Allow insert for everyone" on public.event_feedbacks
      for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'event_feedbacks' and policyname = 'Allow full management for admin'
  ) then
    create policy "Allow full management for admin" on public.event_feedbacks
      for all using (true) with check (true);
  end if;
end
$$;

-- Permissions d'accès pour l'application
grant all on public.event_feedbacks to anon, authenticated, postgres, service_role;

-- Synchronisation en temps réel (Realtime)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'event_feedbacks'
  ) then
    alter publication supabase_realtime add table public.event_feedbacks;
  end if;
end
$$;
