-- Inter-Company Transactions
-- Tracks transactions between DC and BI for arms-length service agreements
-- DC provides services (manufacturing, materials, labor, overhead) to BI
-- Creates revenue for sender and expense for receiver in P&L

-- ============================================
-- Inter-Company Transactions Table
-- ============================================

CREATE TABLE inter_company_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Direction: from_brand provides service, to_brand receives service
  from_brand_id UUID NOT NULL REFERENCES brands(id),  -- Service provider (shows as revenue)
  to_brand_id UUID NOT NULL REFERENCES brands(id),    -- Service receiver (shows as expense)

  -- Transaction details
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,  -- manufacturing, materials, labor, overhead, services, etc.

  -- Amounts (NET of VAT, GBP)
  subtotal DECIMAL(12, 2) NOT NULL,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,

  -- Xero linkage (for future automation)
  xero_invoice_id TEXT,
  xero_invoice_number TEXT,

  -- Status workflow
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'voided')),
  approved_at TIMESTAMPTZ,
  approved_by UUID,

  -- Documentation
  pricing_notes TEXT,  -- Transfer pricing justification
  notes TEXT,

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure transactions are between different brands
  CONSTRAINT different_brands CHECK (from_brand_id != to_brand_id)
);

-- Indexes for performance
CREATE INDEX idx_ic_transactions_from_brand ON inter_company_transactions(from_brand_id);
CREATE INDEX idx_ic_transactions_to_brand ON inter_company_transactions(to_brand_id);
CREATE INDEX idx_ic_transactions_date ON inter_company_transactions(transaction_date);
CREATE INDEX idx_ic_transactions_status ON inter_company_transactions(status);

-- ============================================
-- Update daily_pnl with IC columns
-- ============================================

ALTER TABLE daily_pnl
  ADD COLUMN IF NOT EXISTS ic_revenue DECIMAL(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ic_expense DECIMAL(14, 2) DEFAULT 0;

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE inter_company_transactions ENABLE ROW LEVEL SECURITY;

-- View: All authenticated users can view
CREATE POLICY "inter_company_transactions_select_policy"
  ON inter_company_transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Only admins can create
CREATE POLICY "inter_company_transactions_insert_policy"
  ON inter_company_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Update: Only admins can update
CREATE POLICY "inter_company_transactions_update_policy"
  ON inter_company_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Delete: Only admins can delete
CREATE POLICY "inter_company_transactions_delete_policy"
  ON inter_company_transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_inter_company_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_inter_company_transactions_updated_at
  BEFORE UPDATE ON inter_company_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inter_company_transactions_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE inter_company_transactions IS 'Inter-company transactions between DC and BI for arms-length service agreements';
COMMENT ON COLUMN inter_company_transactions.from_brand_id IS 'Service provider - transaction appears as IC Revenue in their P&L';
COMMENT ON COLUMN inter_company_transactions.to_brand_id IS 'Service receiver - transaction appears as IC Expense in their P&L';
COMMENT ON COLUMN inter_company_transactions.category IS 'Transaction category: manufacturing, materials, labor, overhead, services';
COMMENT ON COLUMN inter_company_transactions.subtotal IS 'Amount NET of VAT in GBP';
COMMENT ON COLUMN inter_company_transactions.pricing_notes IS 'Transfer pricing justification for audit trail';
COMMENT ON COLUMN daily_pnl.ic_revenue IS 'Inter-company revenue (services provided to sister company)';
COMMENT ON COLUMN daily_pnl.ic_expense IS 'Inter-company expense (services received from sister company)';
