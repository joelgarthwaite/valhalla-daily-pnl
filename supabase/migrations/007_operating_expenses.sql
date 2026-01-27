-- Operating Expenses (OPEX) Table
-- Tracks all business overhead costs not captured in COGS or variable costs
-- These are subtracted from GP3 to get true Net Profit

CREATE TABLE IF NOT EXISTS operating_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Optional brand association (NULL = company-wide expense)
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,

  -- Expense details
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Category for grouping/reporting
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'staff',           -- Salaries, wages, NI, pensions, benefits
    'premises',        -- Rent, rates, utilities, building insurance
    'software',        -- Subscriptions (Shopify, tools, etc.)
    'professional',    -- Accountant, legal, consultants
    'marketing_other', -- Non-ad marketing (PR, events, sponsorships)
    'insurance',       -- Business insurance (not premises)
    'equipment',       -- Equipment, maintenance, repairs
    'travel',          -- Business travel, vehicle costs
    'banking',         -- Bank fees, interest (not payment processing)
    'other'            -- Miscellaneous overhead
  )),

  -- Cost amount and frequency
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN (
    'monthly',    -- Recurring monthly
    'quarterly',  -- Recurring quarterly
    'annual',     -- Recurring annually
    'one_time'    -- One-off expense
  )),

  -- Date range when this expense applies
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,  -- NULL = ongoing

  -- For one-time expenses, the specific date
  expense_date DATE,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_opex_category ON operating_expenses(category);
CREATE INDEX idx_opex_brand ON operating_expenses(brand_id);
CREATE INDEX idx_opex_active ON operating_expenses(is_active);
CREATE INDEX idx_opex_dates ON operating_expenses(start_date, end_date);

-- RLS Policies
ALTER TABLE operating_expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all expenses
CREATE POLICY "Authenticated users can read operating_expenses" ON operating_expenses
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage expenses
CREATE POLICY "Authenticated users can manage operating_expenses" ON operating_expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Helper view to calculate daily OPEX allocation
-- This spreads recurring costs across days for P&L calculations
CREATE OR REPLACE VIEW daily_opex AS
SELECT
  d.date,
  oe.brand_id,
  oe.category,
  SUM(
    CASE oe.frequency
      WHEN 'monthly' THEN oe.amount / DATE_PART('day', DATE_TRUNC('month', d.date) + INTERVAL '1 month' - INTERVAL '1 day')
      WHEN 'quarterly' THEN oe.amount / 91  -- Average days per quarter
      WHEN 'annual' THEN oe.amount / 365
      WHEN 'one_time' THEN
        CASE WHEN oe.expense_date = d.date THEN oe.amount ELSE 0 END
    END
  ) as daily_amount
FROM
  generate_series(
    CURRENT_DATE - INTERVAL '2 years',
    CURRENT_DATE + INTERVAL '1 year',
    '1 day'::interval
  ) AS d(date)
CROSS JOIN operating_expenses oe
WHERE
  oe.is_active = true
  AND d.date >= oe.start_date
  AND (oe.end_date IS NULL OR d.date <= oe.end_date)
  AND (oe.frequency != 'one_time' OR oe.expense_date = d.date)
GROUP BY d.date, oe.brand_id, oe.category;

-- Comment on table
COMMENT ON TABLE operating_expenses IS 'Operating expenses (OPEX) - overhead costs subtracted from GP3 to calculate true Net Profit';
