-- SKU Mapping table for mapping old/legacy SKUs to current SKUs
-- Used for inventory forecasting to consolidate historical order data
-- NOTE: This table already exists. This migration documents the schema.

-- Existing table structure:
-- CREATE TABLE sku_mapping (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   old_sku TEXT NOT NULL,
--   current_sku TEXT NOT NULL,
--   brand_id UUID REFERENCES brands(id),  -- Optional: brand filter
--   platform TEXT,                         -- Optional: shopify, etsy, or NULL for all
--   notes TEXT,                            -- Why this mapping exists
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Ensure indexes exist (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_sku_mapping_old_sku ON sku_mapping(old_sku);
CREATE INDEX IF NOT EXISTS idx_sku_mapping_current_sku ON sku_mapping(current_sku);

-- RLS policies (drop and recreate to ensure they exist)
ALTER TABLE sku_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view SKU mappings" ON sku_mapping;
DROP POLICY IF EXISTS "Admins can manage SKU mappings" ON sku_mapping;

-- Everyone can view mappings
CREATE POLICY "Users can view SKU mappings"
  ON sku_mapping FOR SELECT
  USING (true);

-- Only admins can create/update/delete mappings
CREATE POLICY "Admins can manage SKU mappings"
  ON sku_mapping FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

COMMENT ON TABLE sku_mapping IS 'Maps old/legacy SKUs to current SKUs for inventory forecasting';
COMMENT ON COLUMN sku_mapping.old_sku IS 'The legacy or alternate SKU that should be mapped';
COMMENT ON COLUMN sku_mapping.current_sku IS 'The current/canonical SKU to map to';
COMMENT ON COLUMN sku_mapping.brand_id IS 'Optional brand filter - NULL means all brands';
COMMENT ON COLUMN sku_mapping.platform IS 'Optional platform filter (shopify, etsy) - NULL means all platforms';
COMMENT ON COLUMN sku_mapping.notes IS 'Notes about why this mapping exists';
