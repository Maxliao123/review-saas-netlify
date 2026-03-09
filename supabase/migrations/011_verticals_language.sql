-- Migration 011: Multi-Vertical Support + Language Detection
-- Enables AI templates for medical, hotel, auto repair, salon, etc.
-- Stores detected language per review for analytics

-- Add business vertical to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS business_vertical TEXT DEFAULT 'restaurant'
    CHECK (business_vertical IN (
      'restaurant', 'medical', 'hotel', 'auto_repair', 'salon', 'retail', 'fitness', 'other'
    ));

COMMENT ON COLUMN public.stores.business_vertical IS 'Business type for vertical-specific AI reply templates';

-- Add detected language to reviews_raw
ALTER TABLE public.reviews_raw
  ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT NULL;

COMMENT ON COLUMN public.reviews_raw.detected_language IS 'AI-detected language of the review (e.g. en, zh-TW, ko, ja)';

-- Index for vertical analytics
CREATE INDEX IF NOT EXISTS idx_stores_business_vertical ON public.stores(business_vertical);
