-- Manufacturing Overhead Configuration
-- Stores allocation percentages for COGS calculation

CREATE TABLE IF NOT EXISTS manufacturing_overhead_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Premises allocation
  production_premises_pct DECIMAL(5,2) NOT NULL DEFAULT 50.00,

  -- Staff allocations (JSONB for flexibility)
  -- Format: { "staff_description": { "direct_labor_pct": 100, "overhead_pct": 0 } }
  -- Example: { "Edvin": { "direct_labor_pct": 100 }, "Jake": { "direct_labor_pct": 25, "overhead_pct": 75 } }
  staff_allocations JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Equipment allocations (JSONB)
  -- Format: { "equipment_description": 100 } meaning 100% to manufacturing
  -- Example: { "Mimaki UJF 6042 MkII e UV Printer": 100 }
  equipment_allocations JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one config row should exist
CREATE UNIQUE INDEX IF NOT EXISTS manufacturing_overhead_config_singleton
  ON manufacturing_overhead_config ((true));

-- Insert default configuration based on user requirements
INSERT INTO manufacturing_overhead_config (
  production_premises_pct,
  staff_allocations,
  equipment_allocations,
  notes
) VALUES (
  50.00,
  '{
    "Edvin": { "direct_labor_pct": 100, "overhead_pct": 0 },
    "Sophie": { "direct_labor_pct": 100, "overhead_pct": 0 },
    "Jake": { "direct_labor_pct": 25, "overhead_pct": 75 }
  }'::jsonb,
  '{
    "Mimaki UJF 6042 MkII e UV Printer": 100
  }'::jsonb,
  'Initial configuration: 50% premises, Edvin/Sophie 100% direct labor, Jake 25% direct + 75% overhead, UV Printer 100%'
) ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE manufacturing_overhead_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
CREATE POLICY "Anyone can read manufacturing config"
  ON manufacturing_overhead_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update manufacturing config"
  ON manufacturing_overhead_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE manufacturing_overhead_config IS 'Configuration for manufacturing overhead allocation to COGS. Staff and equipment descriptions must match OPEX entries exactly.';
