-- Unmatched Invoice Records
-- Captures invoice line items that don't match any order in the system
-- Used for reconciliation: identifying wasted labels, missing order links, etc.

CREATE TABLE IF NOT EXISTS unmatched_invoice_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice/shipment details
  tracking_number TEXT NOT NULL,
  carrier VARCHAR(50) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  service_type TEXT,
  weight_kg DECIMAL(10, 3),
  shipping_date DATE,

  -- Invoice metadata
  invoice_number TEXT,
  invoice_date DATE,
  file_name TEXT,

  -- Destination info (for context when reviewing)
  destination_country TEXT,
  destination_city TEXT,
  receiver_name TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'voided', 'resolved')),
  resolution_notes TEXT,

  -- If matched to an order
  matched_order_id UUID REFERENCES orders(id),
  matched_shipment_id UUID REFERENCES shipments(id),

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  -- Store full row data for reference
  raw_data JSONB,

  -- Prevent duplicate entries for same tracking/invoice
  UNIQUE(tracking_number, invoice_number)
);

-- Index for quick lookups
CREATE INDEX idx_unmatched_invoices_status ON unmatched_invoice_records(status);
CREATE INDEX idx_unmatched_invoices_carrier ON unmatched_invoice_records(carrier);
CREATE INDEX idx_unmatched_invoices_created ON unmatched_invoice_records(created_at DESC);
CREATE INDEX idx_unmatched_invoices_tracking ON unmatched_invoice_records(tracking_number);

-- RLS policies
ALTER TABLE unmatched_invoice_records ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON unmatched_invoice_records
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert" ON unmatched_invoice_records
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON unmatched_invoice_records
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE unmatched_invoice_records IS 'Stores invoice line items that could not be matched to orders - for reconciliation';
COMMENT ON COLUMN unmatched_invoice_records.status IS 'pending = needs review, matched = linked to order, voided = wasted label, resolved = handled with notes';
