-- Upload History Table for Invoice Uploads
-- Tracks all invoice uploads for audit trail

-- Create upload_history table
CREATE TABLE IF NOT EXISTS upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier VARCHAR(20) NOT NULL CHECK (carrier IN ('dhl', 'royalmail')),
  upload_mode VARCHAR(20) NOT NULL CHECK (upload_mode IN ('add_only', 'overwrite_all', 'update_if_higher', 'update_if_lower')),
  file_name TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add upload_history_id to shipments table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'upload_history_id'
  ) THEN
    ALTER TABLE shipments ADD COLUMN upload_history_id UUID REFERENCES upload_history(id);
  END IF;
END $$;

-- Add cost_updated_at to shipments table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'cost_updated_at'
  ) THEN
    ALTER TABLE shipments ADD COLUMN cost_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_upload_history_created_at ON upload_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_history_carrier ON upload_history(carrier);
CREATE INDEX IF NOT EXISTS idx_shipments_upload_history_id ON shipments(upload_history_id);

-- RLS policies for upload_history
ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read upload history
CREATE POLICY "Allow authenticated users to read upload_history"
  ON upload_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert upload history
CREATE POLICY "Allow authenticated users to insert upload_history"
  ON upload_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update upload history
CREATE POLICY "Allow authenticated users to update upload_history"
  ON upload_history
  FOR UPDATE
  TO authenticated
  USING (true);

-- Comment on table
COMMENT ON TABLE upload_history IS 'Tracks all carrier invoice uploads for audit trail';
COMMENT ON COLUMN upload_history.carrier IS 'Carrier type: dhl or royalmail';
COMMENT ON COLUMN upload_history.upload_mode IS 'Upload mode used: add_only, overwrite_all, update_if_higher, update_if_lower';
COMMENT ON COLUMN upload_history.blocked_count IS 'Records blocked (e.g., estimated costs cannot overwrite actual)';
