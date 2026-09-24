-- ==============================================================================
-- JOKER ESEN - MIGRATION : POSTES D'AIDE & BÉNÉVOLAT (AGENDA FORMATIONS & EVENTS)
-- ==============================================================================
-- Exécutez ce script dans Supabase SQL Editor.
-- Il ajoute la colonne helper_roles à la table member_agenda pour stocker
-- les postes d'aide ouverts aux membres (logistique, décoration, accueil...)
-- ainsi que le nombre de places et les membres inscrits.
-- ==============================================================================

alter table public.member_agenda 
add column if not exists helper_roles jsonb default '[]'::jsonb;
