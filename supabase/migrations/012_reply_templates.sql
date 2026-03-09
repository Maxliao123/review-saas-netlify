-- Migration 012: Reply Templates Library
-- Pre-built templates reduce AI costs and speed up auto-replies for common patterns.

CREATE TABLE IF NOT EXISTS public.reply_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                        -- Human label, e.g. "5-Star Thank You"
  category    TEXT NOT NULL DEFAULT 'general',      -- e.g. positive, negative, neutral, food_quality, service, etc.
  min_rating  INTEGER NOT NULL DEFAULT 1 CHECK (min_rating BETWEEN 1 AND 5),
  max_rating  INTEGER NOT NULL DEFAULT 5 CHECK (max_rating BETWEEN 1 AND 5),
  vertical    TEXT DEFAULT NULL,                    -- NULL = all verticals
  language    TEXT NOT NULL DEFAULT 'en',           -- Language code (en, zh, ko, ja, fr, es)
  body        TEXT NOT NULL,                        -- The template text with {{variables}}
  variables   JSONB DEFAULT '[]'::jsonb,            -- Available variables: [{key, label, default}]
  is_active   BOOLEAN NOT NULL DEFAULT true,
  use_count   INTEGER NOT NULL DEFAULT 0,           -- How many times this template was used
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_rating_range CHECK (min_rating <= max_rating)
);

-- RLS
ALTER TABLE public.reply_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.reply_templates
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reply_templates_tenant ON public.reply_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reply_templates_lookup ON public.reply_templates(tenant_id, is_active, language, category);

COMMENT ON TABLE public.reply_templates IS 'Pre-built reply templates to reduce AI costs and speed up common replies';
COMMENT ON COLUMN public.reply_templates.body IS 'Template body. Supports {{store_name}}, {{author_name}}, {{rating}} placeholders';
COMMENT ON COLUMN public.reply_templates.category IS 'Matches AI-detected review category (positive, negative, food_quality, service, etc.)';
