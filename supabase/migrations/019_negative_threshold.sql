-- Add configurable negative review alert threshold per store
-- Default: 2 (only 1-2 star reviews trigger urgent alerts)
-- Owners can set to 3 to include 3-star reviews

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS negative_review_threshold INTEGER DEFAULT 2
    CHECK (negative_review_threshold BETWEEN 1 AND 5);

COMMENT ON COLUMN public.stores.negative_review_threshold IS
  'Star rating at or below which reviews trigger urgent alerts. Default: 2 (1-2 stars).';
