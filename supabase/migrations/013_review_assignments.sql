-- Migration 013: Review Assignments for Team Inbox
-- Adds assignment tracking to reviews for team workflow.

-- Add assigned_to column (nullable UUID references profiles)
ALTER TABLE public.reviews_raw
  ADD COLUMN IF NOT EXISTS assigned_to UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_by UUID DEFAULT NULL;

COMMENT ON COLUMN public.reviews_raw.assigned_to IS 'Team member assigned to handle this review (FK to profiles.id)';
COMMENT ON COLUMN public.reviews_raw.assigned_at IS 'When the review was assigned';
COMMENT ON COLUMN public.reviews_raw.assigned_by IS 'Who assigned the review (FK to profiles.id)';

-- Index for efficient team inbox queries
CREATE INDEX IF NOT EXISTS idx_reviews_assigned_to ON public.reviews_raw(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_unassigned ON public.reviews_raw(store_id, reply_status) WHERE assigned_to IS NULL AND reply_status IN ('pending', 'drafted');
