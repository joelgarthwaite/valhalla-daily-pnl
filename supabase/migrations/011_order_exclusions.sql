-- Migration: 011_order_exclusions.sql
-- Allow permanently excluding orders (e.g., test orders) from P&L calculations
-- Excluded orders will be skipped during re-sync to prevent reappearing

-- Add exclusion columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS exclusion_reason TEXT;

-- Create index for faster exclusion lookups
CREATE INDEX IF NOT EXISTS idx_orders_excluded ON orders(platform, platform_order_id) WHERE excluded_at IS NOT NULL;

-- Create a separate table to track excluded platform order IDs
-- This ensures exclusions persist even if order record is deleted
CREATE TABLE IF NOT EXISTS excluded_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,  -- 'shopify', 'etsy'
  platform_order_id TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  order_number TEXT,  -- For reference
  customer_name TEXT, -- For reference
  order_date DATE,    -- For reference
  total DECIMAL(12, 2), -- For reference
  exclusion_reason TEXT,
  excluded_at TIMESTAMPTZ DEFAULT NOW(),
  excluded_by TEXT,   -- User email who excluded it
  UNIQUE(platform, platform_order_id)
);

-- Create index for sync lookups
CREATE INDEX IF NOT EXISTS idx_excluded_orders_lookup ON excluded_orders(platform, platform_order_id);

-- Add comments
COMMENT ON TABLE excluded_orders IS 'Permanently excluded orders - sync will skip these platform_order_ids';
COMMENT ON COLUMN orders.excluded_at IS 'When order was excluded from P&L calculations';
COMMENT ON COLUMN orders.exclusion_reason IS 'Why order was excluded (e.g., test order, duplicate)';

-- Enable RLS
ALTER TABLE excluded_orders ENABLE ROW LEVEL SECURITY;

-- RLS policy - allow authenticated users to read
CREATE POLICY "Allow authenticated users to read excluded_orders"
  ON excluded_orders
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS policy - allow service role to manage
CREATE POLICY "Allow service role to manage excluded_orders"
  ON excluded_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
