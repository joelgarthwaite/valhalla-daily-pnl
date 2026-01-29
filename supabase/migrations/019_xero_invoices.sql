-- Xero invoices sync table for B2B order approval workflow
-- This stores PAID invoices from Xero for review and approval

CREATE TABLE xero_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  xero_invoice_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  invoice_date DATE,
  due_date DATE,
  subtotal DECIMAL(12, 2),
  tax_total DECIMAL(12, 2),
  total DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'GBP',
  xero_status VARCHAR(50),  -- PAID, AUTHORISED, etc.

  -- Approval workflow
  approval_status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, ignored
  matched_order_id UUID REFERENCES orders(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,

  -- Metadata
  line_items JSONB,
  contact_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, xero_invoice_id)
);

-- Indexes for common queries
CREATE INDEX idx_xero_invoices_brand ON xero_invoices(brand_id);
CREATE INDEX idx_xero_invoices_status ON xero_invoices(approval_status);
CREATE INDEX idx_xero_invoices_date ON xero_invoices(invoice_date DESC);
CREATE INDEX idx_xero_invoices_synced ON xero_invoices(synced_at DESC);

-- Enable Row Level Security
ALTER TABLE xero_invoices ENABLE ROW LEVEL SECURITY;

-- Policies
-- All authenticated users can view invoices
CREATE POLICY "Authenticated users can view xero_invoices"
  ON xero_invoices
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage xero_invoices"
  ON xero_invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE xero_invoices IS 'Stores synced PAID invoices from Xero for B2B order approval workflow';
COMMENT ON COLUMN xero_invoices.approval_status IS 'pending = awaiting review, approved = B2B order created, ignored = dismissed with notes';
COMMENT ON COLUMN xero_invoices.matched_order_id IS 'Links to the B2B order created when approved';
