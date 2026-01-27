-- Migration: 010_country_ad_spend.sql
-- Store ad spend by country from Meta Marketing API breakdown
-- Enables GP3 calculation in Country Analysis

CREATE TABLE IF NOT EXISTS country_ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  country_code VARCHAR(20) NOT NULL,  -- ISO 3166-1 alpha-2 code (or Meta region codes)
  platform VARCHAR(50) NOT NULL,     -- 'meta', 'google', etc.
  spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_attributed DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, date, country_code, platform)
);

-- Create index for faster queries in country analysis
CREATE INDEX IF NOT EXISTS idx_country_ad_spend_lookup
  ON country_ad_spend(brand_id, date, country_code);

-- Create index for date-range queries
CREATE INDEX IF NOT EXISTS idx_country_ad_spend_date
  ON country_ad_spend(brand_id, date);

-- Add comment explaining the table
COMMENT ON TABLE country_ad_spend IS 'Ad spend breakdown by country from Meta/Google API. Country code is where ad was shown (impression location), not shipping destination.';
COMMENT ON COLUMN country_ad_spend.country_code IS 'ISO 3166-1 alpha-2 country code where ad was delivered';
COMMENT ON COLUMN country_ad_spend.platform IS 'Ad platform: meta, google, etc.';

-- Enable RLS
ALTER TABLE country_ad_spend ENABLE ROW LEVEL SECURITY;

-- RLS policy - allow authenticated users to read
CREATE POLICY "Allow authenticated users to read country_ad_spend"
  ON country_ad_spend
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS policy - allow service role to insert/update
CREATE POLICY "Allow service role to manage country_ad_spend"
  ON country_ad_spend
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
