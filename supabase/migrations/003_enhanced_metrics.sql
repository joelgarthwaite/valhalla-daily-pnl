-- Enhanced P&L Metrics Schema
-- Adds GP1, GP2, GP3, POAS, CoP, MER, refund tracking, and cost configuration

-- ============================================
-- 1. Add new columns to daily_pnl table
-- ============================================
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS gp1 DECIMAL(14,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS gp2 DECIMAL(14,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS gp3 DECIMAL(14,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS pick_pack_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS logistics_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS total_refunds DECIMAL(14,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS net_revenue DECIMAL(14,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS refund_count INTEGER DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS gross_aov DECIMAL(10,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS net_aov DECIMAL(10,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS poas DECIMAL(8,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS cop DECIMAL(8,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS mer DECIMAL(8,2) DEFAULT 0;
ALTER TABLE daily_pnl ADD COLUMN IF NOT EXISTS marketing_cost_ratio DECIMAL(5,2) DEFAULT 0;

-- ============================================
-- 2. Add refund columns to orders table (if not exists)
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none';

-- ============================================
-- 3. Cost Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS cost_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  pick_pack_pct DECIMAL(5,2) DEFAULT 5.00,
  logistics_pct DECIMAL(5,2) DEFAULT 3.00,
  payment_fee_pct DECIMAL(5,2) DEFAULT 2.90,
  cogs_pct DECIMAL(5,2) DEFAULT 30.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id)
);

-- Create index for cost_config
CREATE INDEX IF NOT EXISTS idx_cost_config_brand ON cost_config(brand_id);

-- Enable RLS
ALTER TABLE cost_config ENABLE ROW LEVEL SECURITY;

-- Policies for cost_config
CREATE POLICY "Users can view cost_config for their brands" ON cost_config
  FOR SELECT USING (
    brand_id IS NULL OR has_brand_access(auth.uid(), brand_id)
  );

CREATE POLICY "Admins can manage cost_config" ON cost_config
  FOR ALL USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- Trigger for updated_at
CREATE TRIGGER update_cost_config_updated_at
  BEFORE UPDATE ON cost_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Make ad_spend columns nullable
-- ============================================
ALTER TABLE ad_spend ALTER COLUMN impressions DROP NOT NULL;
ALTER TABLE ad_spend ALTER COLUMN clicks DROP NOT NULL;
ALTER TABLE ad_spend ALTER COLUMN conversions DROP NOT NULL;

-- Set defaults for nullable columns
ALTER TABLE ad_spend ALTER COLUMN impressions SET DEFAULT NULL;
ALTER TABLE ad_spend ALTER COLUMN clicks SET DEFAULT NULL;
ALTER TABLE ad_spend ALTER COLUMN conversions SET DEFAULT NULL;

-- ============================================
-- 5. Insert default cost configuration for each brand
-- ============================================
INSERT INTO cost_config (brand_id, pick_pack_pct, logistics_pct, payment_fee_pct, cogs_pct)
SELECT id, 5.00, 3.00, 2.90, 30.00
FROM brands
WHERE NOT EXISTS (
  SELECT 1 FROM cost_config WHERE cost_config.brand_id = brands.id
);

-- ============================================
-- 6. Add country field to calendar_events for regional holidays
-- ============================================
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS country VARCHAR(10) DEFAULT NULL;

-- ============================================
-- 7. Comment documentation
-- ============================================
COMMENT ON COLUMN daily_pnl.gp1 IS 'Gross Profit 1: Revenue - COGS';
COMMENT ON COLUMN daily_pnl.gp2 IS 'Gross Profit 2: GP1 - Pick&Pack - Payment Fees - Logistics';
COMMENT ON COLUMN daily_pnl.gp3 IS 'Gross Profit 3: GP2 - Ad Spend (True Profit)';
COMMENT ON COLUMN daily_pnl.pick_pack_cost IS 'Pick and pack cost (default 5% of revenue)';
COMMENT ON COLUMN daily_pnl.logistics_cost IS 'Logistics overhead cost (default 3% of revenue)';
COMMENT ON COLUMN daily_pnl.total_refunds IS 'Total refund amount for the day';
COMMENT ON COLUMN daily_pnl.net_revenue IS 'Gross revenue minus refunds';
COMMENT ON COLUMN daily_pnl.refund_count IS 'Number of refunded orders';
COMMENT ON COLUMN daily_pnl.gross_aov IS 'Gross Average Order Value: Total Revenue / Total Orders';
COMMENT ON COLUMN daily_pnl.net_aov IS 'Net Average Order Value: (Revenue - Shipping - Discounts) / Orders';
COMMENT ON COLUMN daily_pnl.poas IS 'Profit on Ad Spend: (GP3 / Ad Spend) * 100';
COMMENT ON COLUMN daily_pnl.cop IS 'Cost of Profit: Total Costs / GP3';
COMMENT ON COLUMN daily_pnl.mer IS 'Marketing Efficiency Ratio: Total Revenue / Total Ad Spend';
COMMENT ON COLUMN daily_pnl.marketing_cost_ratio IS 'Marketing Cost Ratio: (Ad Spend / Revenue) * 100';

COMMENT ON TABLE cost_config IS 'Configuration for operational cost percentages per brand';
COMMENT ON COLUMN cost_config.pick_pack_pct IS 'Pick and pack cost as percentage of revenue';
COMMENT ON COLUMN cost_config.logistics_pct IS 'Logistics overhead as percentage of revenue';
COMMENT ON COLUMN cost_config.payment_fee_pct IS 'Payment processing fee percentage';
COMMENT ON COLUMN cost_config.cogs_pct IS 'Cost of Goods Sold percentage';
