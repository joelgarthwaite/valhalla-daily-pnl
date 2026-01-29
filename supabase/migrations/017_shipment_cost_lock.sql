-- Migration: 017_shipment_cost_lock.sql
-- Add cost_locked field to shipments to prevent automated updates from overwriting manual edits

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS cost_locked BOOLEAN DEFAULT FALSE;

-- Index for quick lookups of locked shipments
CREATE INDEX IF NOT EXISTS idx_shipments_cost_locked ON shipments(cost_locked) WHERE cost_locked = true;

COMMENT ON COLUMN shipments.cost_locked IS 'When true, automated invoice uploads will not overwrite this shipment cost';
