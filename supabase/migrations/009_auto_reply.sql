-- Migration 009: Auto-Reply Mode for Stores
-- Adds auto_reply_mode and auto_reply_min_rating columns to stores table
-- Enables 4-5 star reviews to be auto-approved and published without manual intervention

-- Add auto-reply columns to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS auto_reply_mode TEXT DEFAULT 'manual'
    CHECK (auto_reply_mode IN ('manual', 'auto_positive', 'auto_all')),
  ADD COLUMN IF NOT EXISTS auto_reply_min_rating INTEGER DEFAULT 4
    CHECK (auto_reply_min_rating BETWEEN 1 AND 5);

-- Comment on columns for documentation
COMMENT ON COLUMN public.stores.auto_reply_mode IS 'manual = require approval, auto_positive = auto-approve high-rated, auto_all = auto-approve all';
COMMENT ON COLUMN public.stores.auto_reply_min_rating IS 'Minimum star rating for auto-approval (used when auto_reply_mode = auto_positive)';

-- Add index for cron queries that filter by auto_reply_mode
CREATE INDEX IF NOT EXISTS idx_stores_auto_reply_mode ON public.stores(auto_reply_mode)
  WHERE auto_reply_mode != 'manual';
