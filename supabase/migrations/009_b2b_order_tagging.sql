-- Migration: 009_b2b_order_tagging.sql
-- Add B2B tagging capability to orders table
-- Allows marking Shopify orders as B2B directly from the orders list

-- Add B2B flag and customer name columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS b2b_customer_name TEXT;

-- Create index for faster B2B order queries
CREATE INDEX IF NOT EXISTS idx_orders_b2b ON orders(brand_id, order_date) WHERE is_b2b = TRUE;

-- Add comment explaining the columns
COMMENT ON COLUMN orders.is_b2b IS 'Flag to indicate if this order is a B2B sale (wholesale/trade)';
COMMENT ON COLUMN orders.b2b_customer_name IS 'Name of the B2B customer if order is tagged as B2B';
