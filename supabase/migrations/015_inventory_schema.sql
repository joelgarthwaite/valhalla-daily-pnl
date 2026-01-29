-- Inventory Management Schema
-- Phase A: Core stock tracking with components, suppliers, stock levels, and BOM
-- Tables for purchase orders and notifications are created now for future phases

-- ============================================
-- Component Categories (Lookup Table)
-- ============================================
CREATE TABLE IF NOT EXISTS component_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO component_categories (name, description, display_order) VALUES
  ('cases', 'Display cases, ball cases, presentation boxes', 1),
  ('bases', 'Wooden bases, acrylic bases, stands', 2),
  ('accessories', 'Plaques, nameplates, inserts', 3),
  ('packaging', 'Boxes, foam, tissue paper, bags', 4),
  ('display_accessories', 'Risers, brackets, mounting hardware', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Components (Master Data)
-- ============================================
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,

  -- Core identification
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  category_id UUID REFERENCES component_categories(id) ON DELETE SET NULL,

  -- Attributes
  material VARCHAR(100),  -- e.g., 'oak', 'walnut', 'acrylic'
  variant VARCHAR(100),   -- e.g., 'small', 'large', 'personalized'

  -- Reorder settings
  safety_stock_days INT DEFAULT 14,  -- Days of stock to maintain as buffer
  min_order_qty INT DEFAULT 1,
  lead_time_days INT,                -- Override supplier default

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per brand
  UNIQUE(brand_id, sku)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_components_brand ON components(brand_id);
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category_id);
CREATE INDEX IF NOT EXISTS idx_components_sku ON components(sku);
CREATE INDEX IF NOT EXISTS idx_components_active ON components(is_active);

-- ============================================
-- Suppliers
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),  -- Short code for reference

  -- Contact
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  country VARCHAR(100),

  -- Default terms
  default_lead_time_days INT DEFAULT 14,
  min_order_qty INT DEFAULT 1,
  min_order_value DECIMAL(10,2),
  payment_terms VARCHAR(100),  -- e.g., 'Net 30', 'Prepaid'
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================
-- Component Suppliers (Many-to-Many)
-- ============================================
CREATE TABLE IF NOT EXISTS component_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,

  -- Supplier-specific details
  supplier_sku VARCHAR(100),     -- Supplier's SKU for this component
  unit_cost DECIMAL(10,2),       -- Cost per unit from this supplier
  lead_time_days INT,            -- Override supplier default
  min_order_qty INT,             -- Override supplier default

  -- Priority (1 = primary supplier)
  priority INT DEFAULT 1,
  is_preferred BOOLEAN DEFAULT false,

  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(component_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_component_suppliers_component ON component_suppliers(component_id);
CREATE INDEX IF NOT EXISTS idx_component_suppliers_supplier ON component_suppliers(supplier_id);

-- ============================================
-- Bill of Materials (BOM)
-- ============================================
CREATE TABLE IF NOT EXISTS bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product identification (from orders)
  product_sku VARCHAR(100) NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,

  -- Component used
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,

  -- Quantity of this component per product
  quantity INT NOT NULL DEFAULT 1,

  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One component per product SKU
  UNIQUE(product_sku, component_id)
);

CREATE INDEX IF NOT EXISTS idx_bom_product_sku ON bom(product_sku);
CREATE INDEX IF NOT EXISTS idx_bom_component ON bom(component_id);
CREATE INDEX IF NOT EXISTS idx_bom_brand ON bom(brand_id);

-- ============================================
-- Stock Levels
-- ============================================
CREATE TABLE IF NOT EXISTS stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE UNIQUE,

  -- Quantities
  on_hand INT NOT NULL DEFAULT 0,      -- Physical stock in warehouse
  reserved INT NOT NULL DEFAULT 0,      -- Reserved for pending orders
  on_order INT NOT NULL DEFAULT 0,      -- Ordered but not received
  available INT GENERATED ALWAYS AS (on_hand - reserved) STORED,  -- Available for new orders

  -- Tracking
  last_count_date DATE,                 -- Last physical inventory count
  last_movement_at TIMESTAMPTZ,         -- Last stock movement

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_levels_component ON stock_levels(component_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_available ON stock_levels(available);

-- ============================================
-- Stock Transactions (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,

  -- Transaction type
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'receive',      -- Stock received from supplier
    'ship',         -- Stock shipped to customer
    'adjust',       -- Manual adjustment
    'count',        -- Physical count adjustment
    'reserve',      -- Reserved for order
    'unreserve',    -- Reservation released
    'transfer',     -- Transfer between locations (future)
    'return',       -- Customer return
    'scrap'         -- Damaged/scrapped stock
  )),

  -- Quantities (positive = add, negative = remove)
  quantity INT NOT NULL,
  quantity_before INT,
  quantity_after INT,

  -- Reference
  reference_type VARCHAR(50),   -- 'purchase_order', 'order', 'manual'
  reference_id UUID,            -- PO ID, Order ID, etc.

  -- Details
  notes TEXT,

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transactions_component ON stock_transactions(component_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_created ON stock_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_reference ON stock_transactions(reference_type, reference_id);

-- ============================================
-- Purchase Orders (Header)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,

  -- PO identification
  po_number VARCHAR(50) NOT NULL UNIQUE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Being created
    'pending',      -- Awaiting approval
    'approved',     -- Approved, ready to send
    'sent',         -- Sent to supplier
    'confirmed',    -- Supplier confirmed
    'partial',      -- Partially received
    'received',     -- Fully received
    'cancelled'     -- Cancelled
  )),

  -- Dates
  ordered_date DATE,
  expected_date DATE,
  received_date DATE,

  -- Totals
  subtotal DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Details
  shipping_address TEXT,
  notes TEXT,

  -- Audit
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_brand ON purchase_orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);

-- ============================================
-- Purchase Order Items (Line Items)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE RESTRICT,

  -- Quantities
  quantity_ordered INT NOT NULL,
  quantity_received INT NOT NULL DEFAULT 0,

  -- Pricing
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,

  -- Status
  is_complete BOOLEAN GENERATED ALWAYS AS (quantity_received >= quantity_ordered) STORED,

  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_component ON purchase_order_items(component_id);

-- ============================================
-- Inventory Notification Preferences
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Alert settings
  low_stock_email BOOLEAN DEFAULT true,
  reorder_email BOOLEAN DEFAULT true,
  po_status_email BOOLEAN DEFAULT false,

  -- Thresholds
  critical_threshold_days INT DEFAULT 7,   -- Days before stockout to alert as critical
  warning_threshold_days INT DEFAULT 14,   -- Days before stockout to alert as warning

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- RLS Policies
-- ============================================

-- Component Categories
ALTER TABLE component_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view component categories"
  ON component_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage component categories"
  ON component_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Components
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view components"
  ON components FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage components"
  ON components FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suppliers"
  ON suppliers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Component Suppliers
ALTER TABLE component_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view component suppliers"
  ON component_suppliers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage component suppliers"
  ON component_suppliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- BOM
ALTER TABLE bom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view BOM"
  ON bom FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage BOM"
  ON bom FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Stock Levels
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stock levels"
  ON stock_levels FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage stock levels"
  ON stock_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Stock Transactions
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stock transactions"
  ON stock_transactions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage stock transactions"
  ON stock_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Purchase Orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view purchase orders"
  ON purchase_orders FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage purchase orders"
  ON purchase_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Purchase Order Items
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view purchase order items"
  ON purchase_order_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage purchase order items"
  ON purchase_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Notification Preferences
ALTER TABLE inventory_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification prefs"
  ON inventory_notification_prefs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notification prefs"
  ON inventory_notification_prefs FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- Helper Function: Get Lead Time for Component
-- ============================================
CREATE OR REPLACE FUNCTION get_component_lead_time(p_component_id UUID)
RETURNS INT AS $$
DECLARE
  v_lead_time INT;
BEGIN
  -- First check component-level override
  SELECT lead_time_days INTO v_lead_time
  FROM components
  WHERE id = p_component_id AND lead_time_days IS NOT NULL;

  IF v_lead_time IS NOT NULL THEN
    RETURN v_lead_time;
  END IF;

  -- Then check preferred supplier
  SELECT COALESCE(cs.lead_time_days, s.default_lead_time_days)
  INTO v_lead_time
  FROM component_suppliers cs
  JOIN suppliers s ON s.id = cs.supplier_id
  WHERE cs.component_id = p_component_id
    AND cs.is_preferred = true
  LIMIT 1;

  -- Default to 14 days if nothing found
  RETURN COALESCE(v_lead_time, 14);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE component_categories IS 'Lookup table for component categories (cases, bases, accessories, etc.)';
COMMENT ON TABLE components IS 'Master list of inventory components with SKU, category, and reorder settings';
COMMENT ON TABLE suppliers IS 'Supplier master data with contact info and default terms';
COMMENT ON TABLE component_suppliers IS 'Many-to-many linking components to their suppliers with pricing';
COMMENT ON TABLE bom IS 'Bill of Materials - links product SKUs to their component requirements';
COMMENT ON TABLE stock_levels IS 'Current inventory levels per component';
COMMENT ON TABLE stock_transactions IS 'Audit trail of all stock movements';
COMMENT ON TABLE purchase_orders IS 'Purchase order headers';
COMMENT ON TABLE purchase_order_items IS 'Purchase order line items';
COMMENT ON TABLE inventory_notification_prefs IS 'User preferences for inventory alerts';
