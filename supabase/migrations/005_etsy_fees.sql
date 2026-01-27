-- Etsy Fees Table
-- Stores actual fees from Etsy Payment Account Ledger
-- More accurate than estimated percentages

CREATE TABLE IF NOT EXISTS etsy_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  store_id UUID REFERENCES stores(id),
  date DATE NOT NULL,

  -- Fee breakdown (all in GBP/main currency)
  transaction_fees DECIMAL(10,2) DEFAULT 0,      -- 6.5% on items
  processing_fees DECIMAL(10,2) DEFAULT 0,       -- ~4% + fixed
  listing_fees DECIMAL(10,2) DEFAULT 0,          -- £0.16 per listing
  shipping_transaction_fees DECIMAL(10,2) DEFAULT 0, -- 6.5% on shipping
  regulatory_operating_fees DECIMAL(10,2) DEFAULT 0, -- ~0.32%
  offsite_ads_fees DECIMAL(10,2) DEFAULT 0,      -- 12-15% if applicable
  vat_on_fees DECIMAL(10,2) DEFAULT 0,           -- VAT on seller fees
  other_fees DECIMAL(10,2) DEFAULT 0,            -- Any other fees

  -- Totals
  total_fees DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Metadata
  currency TEXT DEFAULT 'GBP',
  entry_count INTEGER DEFAULT 0,                 -- Number of ledger entries
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per brand per date
  CONSTRAINT etsy_fees_brand_date_unique UNIQUE (brand_id, date)
);

-- Index for fast lookups by date range
CREATE INDEX IF NOT EXISTS idx_etsy_fees_date ON etsy_fees(date);
CREATE INDEX IF NOT EXISTS idx_etsy_fees_brand_date ON etsy_fees(brand_id, date);

-- Enable RLS
ALTER TABLE etsy_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all authenticated users to read
CREATE POLICY "Allow authenticated read etsy_fees"
  ON etsy_fees FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow service role to insert/update
CREATE POLICY "Allow service role write etsy_fees"
  ON etsy_fees FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE etsy_fees IS 'Actual Etsy fees from Payment Account Ledger API - more accurate than estimates';
