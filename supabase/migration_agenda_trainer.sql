-- ==============================================================================
-- JOKER ESEN - MIGRATION : CONTACT DU FORMATEUR (AGENDA DES FORMATIONS)
-- ==============================================================================
-- Ajoute la colonne 'trainer' (JSONB) à la table 'member_agenda'
-- pour stocker les informations de contact du formateur :
-- Nom, Téléphone/Numéro, Email, Type de Formation, et Liens (LinkedIn, GitHub, Portfolio).
-- 100% SÉCURISÉ : Ne supprime aucune table ni aucune donnée existante.
-- ==============================================================================

alter table public.member_agenda 
add column if not exists trainer jsonb default null;
