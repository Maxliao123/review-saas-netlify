-- Add review reward columns to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS reward_enabled BOOLEAN DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS reward_text_en TEXT DEFAULT 'Show this screen to staff for 10% off your next visit';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS reward_text_zh TEXT DEFAULT '出示此畫面給店員，下次消費享 9 折優惠';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS reward_valid_days INTEGER DEFAULT 30;
