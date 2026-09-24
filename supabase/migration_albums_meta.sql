-- ==============================================================================
-- JOKER ESEN - MIGRATION : ALBUMS META
-- ==============================================================================
-- Executez ce script dans Supabase SQL Editor (une seule fois).
-- Il ajoute la colonne albums_meta manquante dans club_settings,
-- ce qui permet de sauvegarder les categories d'albums dans la base de donnees.
-- ==============================================================================

-- 1. Ajouter la colonne albums_meta si elle n'existe pas encore
alter table if exists public.club_settings
  add column if not exists albums_meta jsonb default '[]'::jsonb;

-- 2. Corriger les liens sociaux par defaut avec les vraies URLs officielles
update public.club_settings
set social_links = '{
  "instagram": "https://www.instagram.com/jokeresen/",
  "facebook":  "https://www.facebook.com/JokerEsen.JE",
  "tiktok":    "https://www.tiktok.com/@jokeresen",
  "linkedin":  "https://www.linkedin.com/company/joker-esen/posts/?feedView=all"
}'::jsonb
where id = 'default'
  and (
    social_links->>'instagram' = 'https://www.instagram.com/joker_esen/'
    or social_links->>'facebook'  = 'https://www.facebook.com/joker.esen'
    or social_links->>'tiktok'    = 'https://www.tiktok.com/@joker.esen'
  );
