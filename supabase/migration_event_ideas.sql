-- ==============================================================================
-- JOKER ESEN - MIGRATION : TABLE EVENT IDEAS (BOÎTE À IDÉES ÉVÉNEMENTS)
-- ==============================================================================
-- Permet aux membres de soumettre des idées de formations, ateliers ou événements.
-- Les membres peuvent voter pour leurs idées favorites et l'admin peut les valider,
-- leur attribuer des points bonus, et les convertir en événements officiels.
-- 100% SÉCURISÉ : Ne supprime aucune table ni aucune donnée existante.
-- ==============================================================================

create table if not exists public.event_ideas (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  description text not null,
  target_audience text default '',
  speaker_suggestion text default '',
  estimated_duration text default '',
  member_id text not null,
  member_name text not null,
  member_email text default '',
  member_avatar text default '',
  votes text[] default '{}',
  status text default 'pending', -- 'pending' | 'approved' | 'planned' | 'rejected'
  admin_notes text default '',
  points_awarded integer default 0,
  created_at timestamp with time zone default now()
);

-- Activation de la sécurité RLS
alter table public.event_ideas enable row level security;

-- Politiques sécurisées sans commande DROP
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'event_ideas' and policyname = 'Allow read access to event_ideas for all'
  ) then
    create policy "Allow read access to event_ideas for all" on public.event_ideas
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'event_ideas' and policyname = 'Allow insert into event_ideas for all'
  ) then
    create policy "Allow insert into event_ideas for all" on public.event_ideas
      for insert with check (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'event_ideas' and policyname = 'Allow update and delete for event_ideas'
  ) then
    create policy "Allow update and delete for event_ideas" on public.event_ideas
      for all using (true) with check (true);
  end if;
end
$$;

-- Permissions pour les rôles Supabase
grant all on public.event_ideas to anon, authenticated, postgres, service_role;
