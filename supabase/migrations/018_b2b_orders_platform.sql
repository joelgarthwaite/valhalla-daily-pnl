-- Migration: 018_b2b_orders_platform.sql
-- Add support for B2B orders as a platform type in the orders table
-- This allows B2B orders to be linked to shipments via tracking numbers

-- Note: The platform column likely has a check constraint or is just a text field
-- We're adding 'b2b' as a valid platform type

-- First, let's check if there's a constraint and drop it if needed
DO $$
BEGIN
  -- Try to drop any existing constraint on platform
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_platform_check;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Constraint doesn't exist, that's fine
END $$;

-- Add a comment to document the valid platform types
COMMENT ON COLUMN orders.platform IS 'Order source platform: shopify, etsy, or b2b (manual B2B orders)';

-- Create an index for B2B orders for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_platform_b2b ON orders(platform) WHERE platform = 'b2b';

-- Add order_number to the index for B2B shipment matching
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number) WHERE order_number IS NOT NULL;
