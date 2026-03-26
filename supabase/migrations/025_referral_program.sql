-- Referral Program: tracking codes, clicks, conversions, rewards

-- Add referral columns to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referred_by_tenant_id UUID REFERENCES tenants(id);

-- Referral tracking table
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referee_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  referee_email TEXT,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'paid', 'rewarded')),
  reward_type TEXT,
  reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read own referrals"
  ON referrals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = referrals.referrer_tenant_id
    AND tm.user_id = auth.uid()
  ));

-- Referral click tracking (public, anonymous)
CREATE TABLE referral_clicks (
  id SERIAL PRIMARY KEY,
  referral_code TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read own referral clicks"
  ON referral_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenants t
    JOIN tenant_members tm ON tm.tenant_id = t.id
    WHERE t.referral_code = referral_clicks.referral_code
    AND tm.user_id = auth.uid()
  ));

CREATE INDEX idx_referrals_referrer ON referrals(referrer_tenant_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referral_clicks_code ON referral_clicks(referral_code);
