-- ============================================
-- Migration 020: Weekly Report Toggle per Store
-- ============================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN DEFAULT true;
