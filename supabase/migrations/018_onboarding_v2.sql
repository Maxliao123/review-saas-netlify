-- Migration 018: Onboarding V2 — track completion
-- Adds onboarding_completed_at to tenants table

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
