-- ==============================================================================
-- JOKER ESEN - MIGRATION : COLONNES RECRUTEMENT / QUESTIONNAIRE
-- ==============================================================================
-- Exécutez ce script dans le Supabase SQL Editor pour ajouter les nouvelles
-- colonnes du questionnaire au formulaire de candidature.
-- ==============================================================================

alter table if exists public.recruitment_applications 
  add column if not exists why_join text,
  add column if not exists event_idea text,
  add column if not exists skills text[] default array[]::text[],
  add column if not exists activity_axes text[] default array[]::text[],
  add column if not exists desired_trainings text[] default array[]::text[];
