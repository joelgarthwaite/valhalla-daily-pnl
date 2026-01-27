-- Xero Integration
-- Stores OAuth tokens for Xero API access to fetch bank balances

CREATE TABLE IF NOT EXISTS xero_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Brand association (one Xero org per brand)
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Xero organization identifiers
  tenant_id TEXT NOT NULL,                    -- Xero tenant/organization ID
  tenant_name TEXT,                           -- "Display Champ" or "Bright Ivy"

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Scopes granted
  scopes TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One connection per brand
  UNIQUE(brand_id)
);

-- Create indexes
CREATE INDEX idx_xero_connections_brand ON xero_connections(brand_id);
CREATE INDEX idx_xero_connections_tenant ON xero_connections(tenant_id);

-- RLS Policies
ALTER TABLE xero_connections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read xero connections
CREATE POLICY "Authenticated users can read xero_connections" ON xero_connections
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage xero connections
CREATE POLICY "Authenticated users can manage xero_connections" ON xero_connections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_xero_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_xero_connections_updated_at
  BEFORE UPDATE ON xero_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_xero_connections_updated_at();

-- Comment on table
COMMENT ON TABLE xero_connections IS 'OAuth tokens for Xero API integration - one connection per brand for bank balance fetching';
