-- Migration 022: Add enterprise plan to tenants CHECK constraint
-- Required for $5M ARR roadmap: Free/$49/$149/$499 pricing tiers

-- Drop old constraint that only allowed free/starter/pro
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;

-- Add new constraint including enterprise
ALTER TABLE tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'enterprise'));
