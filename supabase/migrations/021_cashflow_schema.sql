-- Cash Flow Forecasting Module Schema
-- Provides real-time cash position visibility, historical trends, and forecasting

-- ============================================
-- Cash Balance Snapshots (Daily Balance History)
-- ============================================
CREATE TABLE IF NOT EXISTS cash_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  account_name TEXT NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('BANK', 'CREDITCARD')),
  balance DECIMAL(14, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, brand_id, account_name)
);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_cash_snapshots_date ON cash_balance_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_snapshots_brand ON cash_balance_snapshots(brand_id);

-- ============================================
-- Cash Events (Unified Cash Event Calendar)
-- ============================================
CREATE TABLE IF NOT EXISTS cash_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
    -- Inflows
    'platform_payout',     -- Shopify/Etsy payouts
    'b2b_receivable',      -- B2B invoice payments
    'other_inflow',        -- Miscellaneous income
    -- Outflows
    'supplier_payment',    -- Purchase order payments
    'opex_payment',        -- Operating expense payments
    'ad_platform_invoice', -- Meta/Google/Microsoft ad invoices
    'vat_payment',         -- VAT/tax payments
    'other_outflow'        -- Miscellaneous expenses
  )),
  amount DECIMAL(14, 2) NOT NULL,  -- positive=inflow, negative=outflow
  description TEXT,
  reference_type VARCHAR(30),      -- 'purchase_order', 'xero_invoice', 'opex', etc.
  reference_id UUID,               -- ID of the related record
  probability_pct DECIMAL(5,2) DEFAULT 100,  -- Likelihood of occurrence (for forecasting)
  status VARCHAR(20) DEFAULT 'forecast' CHECK (status IN (
    'forecast',   -- Predicted event
    'confirmed',  -- Confirmed but not yet paid
    'paid',       -- Already paid/received
    'cancelled'   -- Cancelled, won't happen
  )),
  is_recurring BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cash_events_date ON cash_events(event_date);
CREATE INDEX IF NOT EXISTS idx_cash_events_brand ON cash_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_cash_events_type ON cash_events(event_type);
CREATE INDEX IF NOT EXISTS idx_cash_events_status ON cash_events(status);
CREATE INDEX IF NOT EXISTS idx_cash_events_reference ON cash_events(reference_type, reference_id);

-- ============================================
-- Cash Forecast Scenarios (Saved Scenarios)
-- ============================================
CREATE TABLE IF NOT EXISTS cash_forecast_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  revenue_adjustment_pct DECIMAL(5,2) DEFAULT 0,   -- +20 = 20% increase, -20 = 20% decrease
  cost_adjustment_pct DECIMAL(5,2) DEFAULT 0,      -- +10 = 10% increase, -10 = 10% decrease
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default scenario per brand
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_scenarios_default ON cash_forecast_scenarios(brand_id) WHERE is_default = true;

-- ============================================
-- Platform Payout Schedules (Config)
-- ============================================
CREATE TABLE IF NOT EXISTS platform_payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('shopify', 'etsy')),
  payout_frequency VARCHAR(20) DEFAULT 'daily' CHECK (payout_frequency IN (
    'daily',
    'weekly',
    'biweekly',
    'monthly'
  )),
  payout_delay_days INT DEFAULT 2,  -- Days from sale to payout
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, platform)
);

-- ============================================
-- Extend Purchase Orders for Cash Flow
-- ============================================
-- Add payment tracking fields to purchase_orders table
DO $$
BEGIN
  -- Add payment_due_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'payment_due_date'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN payment_due_date DATE;
  END IF;

  -- Add payment_date if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN payment_date DATE;
  END IF;

  -- Add payment_status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'
      CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
  END IF;
END $$;

-- ============================================
-- Extend Operating Expenses for Cash Flow
-- ============================================
-- Add payment day tracking to operating_expenses table
DO $$
BEGIN
  -- Add payment_day if not exists (day of month when payment is due)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operating_expenses' AND column_name = 'payment_day'
  ) THEN
    ALTER TABLE operating_expenses ADD COLUMN payment_day INT
      CHECK (payment_day IS NULL OR (payment_day >= 1 AND payment_day <= 31));
  END IF;
END $$;

-- ============================================
-- RLS Policies
-- ============================================

-- Cash Balance Snapshots
ALTER TABLE cash_balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cash_balance_snapshots" ON cash_balance_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage cash_balance_snapshots" ON cash_balance_snapshots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Cash Events
ALTER TABLE cash_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cash_events" ON cash_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage cash_events" ON cash_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Cash Forecast Scenarios
ALTER TABLE cash_forecast_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cash_forecast_scenarios" ON cash_forecast_scenarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage cash_forecast_scenarios" ON cash_forecast_scenarios
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Platform Payout Schedules
ALTER TABLE platform_payout_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform_payout_schedules" ON platform_payout_schedules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage platform_payout_schedules" ON platform_payout_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Seed Default Scenarios
-- ============================================
INSERT INTO cash_forecast_scenarios (name, description, revenue_adjustment_pct, cost_adjustment_pct, is_default) VALUES
  ('Baseline', 'Current trajectory based on actual data', 0, 0, true),
  ('Optimistic', 'Revenue up 20%, costs down 10%', 20, -10, false),
  ('Pessimistic', 'Revenue down 20%, costs up 10%', -20, 10, false)
ON CONFLICT DO NOTHING;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE cash_balance_snapshots IS 'Daily snapshots of bank account and credit card balances for historical tracking';
COMMENT ON TABLE cash_events IS 'Unified calendar of all cash inflows and outflows (forecasted, confirmed, and paid)';
COMMENT ON TABLE cash_forecast_scenarios IS 'Saved scenarios for what-if cash flow projections';
COMMENT ON TABLE platform_payout_schedules IS 'Configuration for when platform payouts are expected (Shopify/Etsy)';

COMMENT ON COLUMN cash_events.amount IS 'Positive for inflows (money coming in), negative for outflows (money going out)';
COMMENT ON COLUMN cash_events.probability_pct IS 'Likelihood of occurrence, used for probability-weighted forecasting';
COMMENT ON COLUMN cash_forecast_scenarios.revenue_adjustment_pct IS 'Percentage adjustment to revenue (+20 = 20% increase)';
COMMENT ON COLUMN cash_forecast_scenarios.cost_adjustment_pct IS 'Percentage adjustment to costs (+10 = 10% increase)';
