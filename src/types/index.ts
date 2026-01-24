// P&L Dashboard Types
// Extends and builds on Valhalla Dashboard types

// ============================================
// Core Types (from Valhalla)
// ============================================

export interface Brand {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Store {
  id: string;
  brand_id: string;
  platform: 'shopify' | 'etsy';
  store_name: string;
  api_credentials: Record<string, unknown> | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  brand_id: string;
  platform: 'shopify' | 'etsy';
  platform_order_id: string;
  order_number: string | null;
  order_date: string;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: ShippingAddress | null;
  subtotal: number;
  shipping_charged: number;
  tax: number;
  total: number;
  currency: string;
  status: string | null;
  fulfillment_status: string | null;
  line_items: LineItem[] | null;
  raw_data: Record<string, unknown> | null;
  refund_amount: number;
  refund_status: 'none' | 'partial' | 'full';
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  country_code?: string;
}

export interface LineItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  sku?: string;
}

export interface Shipment {
  id: string;
  order_id: string | null;
  brand_id: string;
  carrier: 'dhl' | 'royalmail';
  carrier_account_id: string | null;
  tracking_number: string | null;
  service_type: string | null;
  direction: 'outbound' | 'inbound';
  origin_country: string | null;
  destination_country: string | null;
  weight_kg: number | null;
  dimensions: Dimensions | null;
  shipping_cost: number;
  shipping_date: string | null;
  delivery_date: string | null;
  status: string | null;
  raw_data: Record<string, unknown> | null;
  cost_updated_at: string | null;
  upload_history_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

// ============================================
// P&L Specific Types
// ============================================

export type AdPlatform = 'meta' | 'google' | 'microsoft' | 'etsy_ads';

export interface AdSpend {
  id: string;
  brand_id: string;
  date: string;
  platform: AdPlatform;
  spend: number;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  revenue_attributed: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'bank_transfer' | 'shopify' | 'other';

export interface B2BRevenue {
  id: string;
  brand_id: string;
  date: string;
  customer_name: string;
  invoice_number: string | null;
  subtotal: number;
  shipping_charged: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuarterlyGoal {
  id: string;
  brand_id: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  revenue_target: number;
  gross_margin_target: number;
  net_margin_target: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PromotionType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';

export interface Promotion {
  id: string;
  brand_id: string;
  name: string;
  code: string | null;
  type: PromotionType;
  value: number;
  start_date: string;
  end_date: string;
  platforms: string[];
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EventCategory = 'holiday' | 'golf_tournament' | 'promotion' | 'internal' | 'other';

export interface CalendarEvent {
  id: string;
  brand_id: string | null;
  date: string;
  title: string;
  category: EventCategory | null;
  description: string | null;
  is_recurring: boolean;
  color: string;
  country: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostConfig {
  id: string;
  brand_id: string | null;
  pick_pack_pct: number;
  logistics_pct: number;
  payment_fee_pct: number;
  cogs_pct: number;
  created_at: string;
  updated_at: string;
}

export interface PnLNote {
  id: string;
  brand_id: string | null;
  date: string;
  note: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  brand_access: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyPnL {
  id: string;
  brand_id: string;
  date: string;

  // Revenue
  shopify_revenue: number;
  etsy_revenue: number;
  b2b_revenue: number;
  total_revenue: number;

  // Refunds
  total_refunds: number;
  net_revenue: number;
  refund_count: number;

  // Shipping
  shipping_charged: number;
  shipping_cost: number;
  shipping_margin: number;

  // COGS
  cogs_estimated: number;

  // Operational Costs
  pick_pack_cost: number;
  logistics_cost: number;

  // Ad Spend
  meta_spend: number;
  google_spend: number;
  microsoft_spend: number;
  etsy_ads_spend: number;
  total_ad_spend: number;

  // Fees
  shopify_fees: number;
  etsy_fees: number;
  total_platform_fees: number;

  // Discounts
  total_discounts: number;

  // Gross Profit Tiers
  gp1: number; // Revenue - COGS
  gp2: number; // GP1 - Pick&Pack - Payment Fees - Logistics
  gp3: number; // GP2 - Ad Spend (True Profit)

  // Calculated metrics (legacy)
  gross_profit: number;
  gross_margin_pct: number;
  net_profit: number;
  net_margin_pct: number;

  // Enhanced Metrics
  gross_aov: number;
  net_aov: number;
  poas: number; // Profit on Ad Spend
  cop: number; // Cost of Profit
  mer: number; // Marketing Efficiency Ratio
  marketing_cost_ratio: number;

  // Order counts
  shopify_orders: number;
  etsy_orders: number;
  b2b_orders: number;
  total_orders: number;

  // Metadata
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Aggregated / Calculated Types
// ============================================

export interface DateRange {
  from: Date;
  to: Date;
}

export type BrandFilter = 'all' | 'DC' | 'BI';

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type DateSelectionMode = 'single' | 'range' | 'week';

export interface WeekSelection {
  year: number;
  week: number; // 1-52 (ISO week number)
}

export interface PnLFilters {
  brandFilter: BrandFilter;
  dateRange: DateRange;
  periodType: PeriodType;
  showYoY: boolean;
}

export interface PnLSummary {
  // Revenue Breakdown (for transparency)
  // productRevenue = subtotals only (excludes shipping/tax) - apples-to-apples across platforms
  // shippingCharged = shipping paid by customers
  // grossRevenue = productRevenue + shippingCharged (total customer paid, excluding tax)
  totalRevenue: number;        // Product revenue (subtotals) - PRIMARY revenue metric
  shopifyRevenue: number;      // Shopify product revenue (subtotal)
  etsyRevenue: number;         // Etsy product revenue (subtotal)
  b2bRevenue: number;          // B2B product revenue (subtotal)
  shippingCharged: number;     // Total shipping charged to customers
  grossRevenue: number;        // totalRevenue + shippingCharged (what customers actually paid)

  // Refunds
  totalRefunds: number;
  netRevenue: number;          // totalRevenue - refunds (product revenue after refunds)
  refundCount: number;

  // Costs
  cogs: number;
  shippingCost: number;
  pickPackCost: number;
  logisticsCost: number;
  totalAdSpend: number;
  platformFees: number;
  totalDiscounts: number;

  // Gross Profit Tiers
  gp1: number; // Revenue - COGS
  gp2: number; // GP1 - Pick&Pack - Payment Fees - Logistics
  gp3: number; // GP2 - Ad Spend (True Profit / Marketing Contribution)

  // Margins (legacy)
  grossProfit: number;
  grossMarginPct: number;
  shippingMargin: number;
  netProfit: number;
  netMarginPct: number;

  // Orders
  totalOrders: number;
  grossAOV: number;
  netAOV: number;

  // Ad metrics
  blendedRoas: number;
  poas: number; // Profit on Ad Spend
  cop: number; // Cost of Profit
  mer: number; // Marketing Efficiency Ratio
  marketingCostRatio: number;
}

export interface PnLSummaryWithComparison extends PnLSummary {
  previous: PnLSummary;
  changes: {
    totalRevenue: number;
    grossProfit: number;
    netProfit: number;
    totalOrders: number;
    grossMarginPct: number;
    netMarginPct: number;
    gp1: number;
    gp2: number;
    gp3: number;
    poas: number;
    mer: number;
  };
}

export interface PnLTrendPoint {
  date: string;
  totalRevenue: number;
  grossProfit: number;
  netProfit: number;
  totalOrders: number;
  // YoY comparison (optional)
  previousYearRevenue?: number;
  previousYearGrossProfit?: number;
  previousYearNetProfit?: number;
}

export interface WaterfallDataPoint {
  name: string;
  value: number;
  isTotal?: boolean;
  isSubtraction?: boolean;
}

export interface ROASByChannel {
  platform: AdPlatform;
  platformName: string;
  spend: number;
  revenueAttributed: number;
  roas: number;
  mer: number;
}

export interface QuarterlyProgress {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  targetRevenue: number;
  actualRevenue: number;
  progressPct: number;
  weeklyTarget: number;
  dailyTarget: number;
  daysRemaining: number;
  onTrack: boolean;
}

// ============================================
// Form Types
// ============================================

export interface AdSpendFormData {
  brand_id: string;
  date: string;
  platform: AdPlatform;
  spend: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenue_attributed?: number;
  notes?: string;
}

export interface B2BRevenueFormData {
  brand_id: string;
  date: string;
  customer_name: string;
  invoice_number?: string;
  subtotal: number;
  shipping_charged?: number;
  tax?: number;
  total: number;
  payment_method?: PaymentMethod;
  notes?: string;
}

export interface QuarterlyGoalFormData {
  brand_id: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  revenue_target: number;
  gross_margin_target?: number;
  net_margin_target?: number;
  notes?: string;
}

export interface PromotionFormData {
  brand_id: string;
  name: string;
  code?: string;
  type: PromotionType;
  value: number;
  start_date: string;
  end_date: string;
  platforms?: string[];
  notes?: string;
}

export interface CalendarEventFormData {
  brand_id?: string;
  date: string;
  title: string;
  category?: EventCategory;
  description?: string;
  is_recurring?: boolean;
  color?: string;
}

// ============================================
// Database Types (Supabase)
// ============================================

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: Brand;
        Insert: Omit<Brand, 'id' | 'created_at'>;
        Update: Partial<Omit<Brand, 'id' | 'created_at'>>;
      };
      stores: {
        Row: Store;
        Insert: Omit<Store, 'id' | 'created_at'>;
        Update: Partial<Omit<Store, 'id' | 'created_at'>>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>;
      };
      shipments: {
        Row: Shipment;
        Insert: Omit<Shipment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Shipment, 'id' | 'created_at' | 'updated_at'>>;
      };
      ad_spend: {
        Row: AdSpend;
        Insert: Omit<AdSpend, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AdSpend, 'id' | 'created_at' | 'updated_at'>>;
      };
      b2b_revenue: {
        Row: B2BRevenue;
        Insert: Omit<B2BRevenue, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<B2BRevenue, 'id' | 'created_at' | 'updated_at'>>;
      };
      quarterly_goals: {
        Row: QuarterlyGoal;
        Insert: Omit<QuarterlyGoal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<QuarterlyGoal, 'id' | 'created_at' | 'updated_at'>>;
      };
      promotions: {
        Row: Promotion;
        Insert: Omit<Promotion, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Promotion, 'id' | 'created_at' | 'updated_at'>>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>>;
      };
      pnl_notes: {
        Row: PnLNote;
        Insert: Omit<PnLNote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PnLNote, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_roles: {
        Row: UserRoleRecord;
        Insert: Omit<UserRoleRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserRoleRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
      daily_pnl: {
        Row: DailyPnL;
        Insert: Omit<DailyPnL, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DailyPnL, 'id' | 'created_at' | 'updated_at'>>;
      };
      cost_config: {
        Row: CostConfig;
        Insert: Omit<CostConfig, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CostConfig, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// ============================================
// User & Auth Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  brandAccess: string[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Reconciliation Types
// ============================================

export interface ReconciliationRevenueBreakdown {
  shopify: number;
  etsy: number;
  b2b: number;
  total: number;
}

export interface ReconciliationRow {
  week: string; // "Week 1 (2025)"
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  expected: ReconciliationRevenueBreakdown;
  actual: ReconciliationRevenueBreakdown;
  variance: ReconciliationRevenueBreakdown;
  variancePct: ReconciliationRevenueBreakdown;
  hasDiscrepancy: boolean;
}

export interface B2BImportEntry {
  year: number;
  week: number;
  subtotal: number;
  notes?: string;
}
