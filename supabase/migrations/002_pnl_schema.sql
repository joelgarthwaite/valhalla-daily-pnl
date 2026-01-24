-- P&L Dashboard Schema Extension
-- This migration adds tables for P&L tracking on top of existing Valhalla tables

-- ============================================
-- 1. Ad Spend Table (manual entry)
-- ============================================
CREATE TABLE IF NOT EXISTS ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL, -- 'meta', 'google', 'microsoft', 'etsy_ads'
  spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_attributed DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, date, platform)
);

-- ============================================
-- 2. B2B Revenue Table (manual entry)
-- ============================================
CREATE TABLE IF NOT EXISTS b2b_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  shipping_charged DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50), -- 'bank_transfer', 'shopify', 'other'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Quarterly Goals Table
-- ============================================
CREATE TABLE IF NOT EXISTS quarterly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  revenue_target DECIMAL(14, 2) NOT NULL DEFAULT 0,
  gross_margin_target DECIMAL(5, 2) DEFAULT 70.00,
  net_margin_target DECIMAL(5, 2) DEFAULT 25.00,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, year, quarter)
);

-- ============================================
-- 4. Promotions Table
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount', 'free_shipping', 'bogo'
  value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['shopify', 'etsy']
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Calendar Events Table
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE, -- NULL = applies to all brands
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- 'holiday', 'golf_tournament', 'promotion', 'internal', 'other'
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  color VARCHAR(20) DEFAULT '#3b82f6',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. P&L Notes Table
-- ============================================
CREATE TABLE IF NOT EXISTS pnl_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE, -- NULL = applies to all brands
  date DATE NOT NULL,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. User Roles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'admin', 'editor', 'viewer'
  brand_access UUID[] DEFAULT ARRAY[]::UUID[], -- empty = all brands
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 8. Pre-aggregated Daily P&L Table (for performance)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_pnl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Revenue
  shopify_revenue DECIMAL(14, 2) DEFAULT 0,
  etsy_revenue DECIMAL(14, 2) DEFAULT 0,
  b2b_revenue DECIMAL(14, 2) DEFAULT 0,
  total_revenue DECIMAL(14, 2) DEFAULT 0,

  -- Shipping
  shipping_charged DECIMAL(12, 2) DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  shipping_margin DECIMAL(12, 2) DEFAULT 0,

  -- COGS (estimated at 30%)
  cogs_estimated DECIMAL(14, 2) DEFAULT 0,

  -- Ad Spend
  meta_spend DECIMAL(12, 2) DEFAULT 0,
  google_spend DECIMAL(12, 2) DEFAULT 0,
  microsoft_spend DECIMAL(12, 2) DEFAULT 0,
  etsy_ads_spend DECIMAL(12, 2) DEFAULT 0,
  total_ad_spend DECIMAL(12, 2) DEFAULT 0,

  -- Fees
  shopify_fees DECIMAL(12, 2) DEFAULT 0,
  etsy_fees DECIMAL(12, 2) DEFAULT 0,
  total_platform_fees DECIMAL(12, 2) DEFAULT 0,

  -- Discounts
  total_discounts DECIMAL(12, 2) DEFAULT 0,

  -- Calculated metrics
  gross_profit DECIMAL(14, 2) DEFAULT 0,
  gross_margin_pct DECIMAL(5, 2) DEFAULT 0,
  net_profit DECIMAL(14, 2) DEFAULT 0,
  net_margin_pct DECIMAL(5, 2) DEFAULT 0,

  -- Order counts
  shopify_orders INTEGER DEFAULT 0,
  etsy_orders INTEGER DEFAULT 0,
  b2b_orders INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, date)
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ad_spend_brand_date ON ad_spend(brand_id, date);
CREATE INDEX IF NOT EXISTS idx_b2b_revenue_brand_date ON b2b_revenue(brand_id, date);
CREATE INDEX IF NOT EXISTS idx_quarterly_goals_brand_year ON quarterly_goals(brand_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_promotions_brand_dates ON promotions(brand_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_pnl_notes_brand_date ON pnl_notes(brand_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_pnl_brand_date ON daily_pnl(brand_id, date);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pnl ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR(20) AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_id = user_uuid),
    'viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check brand access
CREATE OR REPLACE FUNCTION has_brand_access(user_uuid UUID, check_brand_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
    AND (
      brand_access = ARRAY[]::UUID[] -- empty array = all brands
      OR check_brand_id = ANY(brand_access)
    )
  ) OR NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = user_uuid
  ); -- If no role record, grant access (will use viewer role)
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for ad_spend
CREATE POLICY "Users can view ad_spend for their brands" ON ad_spend
  FOR SELECT USING (has_brand_access(auth.uid(), brand_id));

CREATE POLICY "Editors can insert ad_spend" ON ad_spend
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'editor')
    AND has_brand_access(auth.uid(), brand_id)
  );

CREATE POLICY "Editors can update ad_spend" ON ad_spend
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('admin', 'editor')
    AND has_brand_access(auth.uid(), brand_id)
  );

CREATE POLICY "Admins can delete ad_spend" ON ad_spend
  FOR DELETE USING (
    get_user_role(auth.uid()) = 'admin'
    AND has_brand_access(auth.uid(), brand_id)
  );

-- Policies for b2b_revenue
CREATE POLICY "Users can view b2b_revenue for their brands" ON b2b_revenue
  FOR SELECT USING (has_brand_access(auth.uid(), brand_id));

CREATE POLICY "Editors can insert b2b_revenue" ON b2b_revenue
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('admin', 'editor')
    AND has_brand_access(auth.uid(), brand_id)
  );

CREATE POLICY "Editors can update b2b_revenue" ON b2b_revenue
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('admin', 'editor')
    AND has_brand_access(auth.uid(), brand_id)
  );

CREATE POLICY "Admins can delete b2b_revenue" ON b2b_revenue
  FOR DELETE USING (
    get_user_role(auth.uid()) = 'admin'
    AND has_brand_access(auth.uid(), brand_id)
  );

-- Policies for quarterly_goals
CREATE POLICY "Users can view quarterly_goals" ON quarterly_goals
  FOR SELECT USING (has_brand_access(auth.uid(), brand_id));

CREATE POLICY "Admins can manage quarterly_goals" ON quarterly_goals
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
    AND has_brand_access(auth.uid(), brand_id)
  );

-- Policies for promotions
CREATE POLICY "Users can view promotions" ON promotions
  FOR SELECT USING (has_brand_access(auth.uid(), brand_id));

CREATE POLICY "Editors can manage promotions" ON promotions
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('admin', 'editor')
    AND has_brand_access(auth.uid(), brand_id)
  );

-- Policies for calendar_events
CREATE POLICY "Users can view calendar_events" ON calendar_events
  FOR SELECT USING (
    brand_id IS NULL OR has_brand_access(auth.uid(), brand_id)
  );

CREATE POLICY "Editors can manage calendar_events" ON calendar_events
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('admin', 'editor')
  );

-- Policies for pnl_notes
CREATE POLICY "Users can view pnl_notes" ON pnl_notes
  FOR SELECT USING (
    brand_id IS NULL OR has_brand_access(auth.uid(), brand_id)
  );

CREATE POLICY "Editors can manage pnl_notes" ON pnl_notes
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('admin', 'editor')
  );

-- Policies for user_roles
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Policies for daily_pnl
CREATE POLICY "Users can view daily_pnl" ON daily_pnl
  FOR SELECT USING (has_brand_access(auth.uid(), brand_id));

CREATE POLICY "System can manage daily_pnl" ON daily_pnl
  FOR ALL USING (TRUE); -- Managed by server-side functions

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ad_spend_updated_at
  BEFORE UPDATE ON ad_spend
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_b2b_revenue_updated_at
  BEFORE UPDATE ON b2b_revenue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quarterly_goals_updated_at
  BEFORE UPDATE ON quarterly_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pnl_notes_updated_at
  BEFORE UPDATE ON pnl_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_pnl_updated_at
  BEFORE UPDATE ON daily_pnl
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
