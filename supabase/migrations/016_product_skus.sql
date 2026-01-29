-- Migration: 016_product_skus.sql
-- Product SKU Master table for tracking canonical product SKUs
-- This distinguishes between active (purchasable) and historic (merged/discontinued) SKUs

-- ============================================================================
-- PRODUCT SKUS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'historic', 'discontinued')),
  -- active: Currently available for purchase
  -- historic: Was sold before, no longer available, kept for forecasting
  -- discontinued: Permanently discontinued, won't return

  -- Platform availability (for active SKUs)
  platforms TEXT[] DEFAULT '{}',  -- e.g., ['shopify', 'etsy']

  -- Metadata
  description TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure SKU is unique per brand (NULL brand = shared across brands)
  UNIQUE(brand_id, sku)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_skus_sku ON product_skus(sku);
CREATE INDEX IF NOT EXISTS idx_product_skus_brand ON product_skus(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_skus_status ON product_skus(status);

-- ============================================================================
-- UPDATE SKU_MAPPING TO REFERENCE PRODUCT_SKUS
-- ============================================================================

-- Add foreign key relationship (optional - keeping current_sku as text for flexibility)
-- The current_sku should match a product_skus.sku entry
ALTER TABLE sku_mapping
  ADD COLUMN IF NOT EXISTS product_sku_id UUID REFERENCES product_skus(id) ON DELETE SET NULL;

-- Index for the new relationship
CREATE INDEX IF NOT EXISTS idx_sku_mapping_product_sku ON sku_mapping(product_sku_id);

-- ============================================================================
-- UPDATE BOM TO REFERENCE PRODUCT_SKUS
-- ============================================================================

-- Add foreign key to product_skus (keeping product_sku text field for backwards compatibility)
ALTER TABLE bom
  ADD COLUMN IF NOT EXISTS product_sku_id UUID REFERENCES product_skus(id) ON DELETE CASCADE;

-- Index for the new relationship
CREATE INDEX IF NOT EXISTS idx_bom_product_sku_id ON bom(product_sku_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view product SKUs
CREATE POLICY "Users can view product_skus"
  ON product_skus FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage product SKUs
CREATE POLICY "Admins can manage product_skus"
  ON product_skus FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Get canonical SKU for any input SKU
-- ============================================================================

CREATE OR REPLACE FUNCTION get_canonical_sku(input_sku TEXT, input_brand_id UUID DEFAULT NULL)
RETURNS TABLE(
  canonical_sku TEXT,
  product_sku_id UUID,
  product_name TEXT,
  status TEXT,
  was_mapped BOOLEAN
) AS $$
BEGIN
  -- First check if there's a mapping for this SKU
  RETURN QUERY
  WITH mapped AS (
    SELECT
      sm.current_sku,
      sm.product_sku_id,
      true AS was_mapped
    FROM sku_mapping sm
    WHERE sm.old_sku = input_sku
    AND (sm.brand_id IS NULL OR sm.brand_id = input_brand_id OR input_brand_id IS NULL)
    LIMIT 1
  ),
  result AS (
    SELECT
      COALESCE(m.current_sku, input_sku) AS canonical,
      COALESCE(m.product_sku_id, ps.id) AS ps_id,
      ps.name AS ps_name,
      ps.status AS ps_status,
      COALESCE(m.was_mapped, false) AS mapped
    FROM (SELECT 1) dummy
    LEFT JOIN mapped m ON true
    LEFT JOIN product_skus ps ON ps.sku = COALESCE(m.current_sku, input_sku)
      AND (ps.brand_id IS NULL OR ps.brand_id = input_brand_id OR input_brand_id IS NULL)
  )
  SELECT
    r.canonical,
    r.ps_id,
    r.ps_name,
    r.ps_status,
    r.mapped
  FROM result r;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE product_skus IS 'Master table of canonical product SKUs with status tracking (active/historic/discontinued)';
COMMENT ON COLUMN product_skus.status IS 'active=purchasable, historic=was sold but no longer available, discontinued=permanently removed';
COMMENT ON COLUMN product_skus.platforms IS 'Array of platforms where this SKU is sold: shopify, etsy';
COMMENT ON FUNCTION get_canonical_sku IS 'Resolves any SKU (including legacy) to its canonical form via sku_mapping';
