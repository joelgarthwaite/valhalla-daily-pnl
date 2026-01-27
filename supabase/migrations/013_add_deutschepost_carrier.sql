-- Migration: Add Deutsche Post as a supported carrier
-- This allows syncing shipments from ShipStation's Deutsche Post Cross-Border service

-- Drop the old constraints on carrier_accounts
ALTER TABLE carrier_accounts DROP CONSTRAINT IF EXISTS carrier_accounts_carrier_check;

-- Add new constraint with deutschepost included
ALTER TABLE carrier_accounts ADD CONSTRAINT carrier_accounts_carrier_check
  CHECK (carrier IN ('dhl', 'royalmail', 'deutschepost'));

-- Drop the old constraint on shipments
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_carrier_check;

-- Add new constraint with deutschepost included
ALTER TABLE shipments ADD CONSTRAINT shipments_carrier_check
  CHECK (carrier IN ('dhl', 'royalmail', 'deutschepost'));

-- Insert Deutsche Post carrier account if it doesn't exist
INSERT INTO carrier_accounts (carrier, account_name)
VALUES ('deutschepost', 'Deutsche Post Cross-Border')
ON CONFLICT DO NOTHING;
