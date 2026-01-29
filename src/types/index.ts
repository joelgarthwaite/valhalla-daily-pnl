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
  is_b2b: boolean;
  b2b_customer_name: string | null;
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
  gp3: number; // GP2 - Ad Spend (Contribution Margin after Ads)

  // Operating Expenses (OPEX)
  totalOpex: number;        // Total operating expenses for period
  opexByCategory: Record<string, number>;  // Breakdown by category

  // True Net Profit (GP3 - OPEX)
  trueNetProfit: number;    // GP3 - OPEX = actual bottom line
  trueNetMarginPct: number; // trueNetProfit / totalRevenue * 100

  // Margins (legacy - kept for compatibility)
  grossProfit: number;
  grossMarginPct: number;
  shippingMargin: number;
  netProfit: number;        // Now same as trueNetProfit
  netMarginPct: number;     // Now same as trueNetMarginPct

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
      upload_history: {
        Row: UploadHistory;
        Insert: Omit<UploadHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<UploadHistory, 'id' | 'created_at'>>;
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

// ============================================
// Operating Expenses (OPEX) Types
// ============================================

export type OpexCategory =
  | 'staff'           // Salaries, wages, NI, pensions, benefits
  | 'premises'        // Rent, rates, utilities, building insurance
  | 'software'        // Subscriptions (Shopify, tools, etc.)
  | 'professional'    // Accountant, legal, consultants
  | 'marketing_other' // Non-ad marketing (PR, events, sponsorships)
  | 'insurance'       // Business insurance (not premises)
  | 'equipment'       // Equipment, maintenance, repairs
  | 'travel'          // Business travel, vehicle costs
  | 'banking'         // Bank fees, interest (not payment processing)
  | 'other';          // Miscellaneous overhead

export type OpexFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';

export interface OperatingExpense {
  id: string;
  brand_id: string | null;  // NULL = company-wide expense
  name: string;
  description: string | null;
  category: OpexCategory;
  amount: number;
  frequency: OpexFrequency;
  start_date: string;
  end_date: string | null;  // NULL = ongoing
  expense_date: string | null;  // For one-time expenses
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperatingExpenseFormData {
  brand_id?: string;
  name: string;
  description?: string;
  category: OpexCategory;
  amount: number;
  frequency: OpexFrequency;
  start_date: string;
  end_date?: string;
  expense_date?: string;
  is_active?: boolean;
  notes?: string;
}

export interface OpexSummary {
  totalMonthly: number;      // Total monthly equivalent of all active OPEX
  totalAnnual: number;       // Total annualized OPEX
  byCategory: Record<OpexCategory, number>;  // Monthly by category
  dailyAllocation: number;   // Daily OPEX for P&L calculations
}

// Category display labels
export const OPEX_CATEGORY_LABELS: Record<OpexCategory, string> = {
  staff: 'Staff Costs',
  premises: 'Premises',
  software: 'Software & Subscriptions',
  professional: 'Professional Services',
  marketing_other: 'Other Marketing',
  insurance: 'Insurance',
  equipment: 'Equipment',
  travel: 'Travel & Vehicles',
  banking: 'Banking & Finance',
  other: 'Other Overheads',
};

export const OPEX_FREQUENCY_LABELS: Record<OpexFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  one_time: 'One-time',
};

// ============================================
// Invoice Upload Types
// ============================================

export type UploadMode = 'add_only' | 'overwrite_all' | 'update_if_higher' | 'update_if_lower' | 'add_to_existing';

export interface UploadModeOption {
  value: UploadMode;
  label: string;
  description: string;
  newRecords: string;
  existingSameCost: string;
  existingDifferentCost: string;
}

// Analysis types for pre-upload preview
export type RecordAction = 'create' | 'update' | 'skip' | 'blocked' | 'add';

export interface AnalyzedRecord {
  tracking_number: string;
  shipping_cost: number;
  currency: string;
  service_type: string;
  weight_kg: number;
  shipping_date: string;
  action: RecordAction;
  reason: string;
  existing_cost?: number;
  existing_cost_type?: 'actual' | 'estimated';
  cost_difference?: number;
}

export interface AnalysisResult {
  total: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  toBlock: number;
  toAdd: number;  // For add_to_existing mode - costs to add to existing shipments
  records: AnalyzedRecord[];
  warnings: string[];
}

// Upload History types
export interface UploadHistory {
  id: string;
  carrier: 'dhl' | 'royalmail';
  upload_mode: UploadMode;
  file_name: string | null;
  total_records: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  blocked_count: number;
  uploaded_by: string | null;
  created_at: string;
}

// Extended upload result with action type
export interface UploadResultExtended {
  tracking_number: string;
  status: 'success' | 'error' | 'not_found' | 'skipped' | 'blocked';
  action: 'created' | 'updated' | 'added' | 'skipped' | 'blocked' | 'error';
  message: string;
}

// ============================================
// Xero Integration Types
// ============================================

export interface XeroConnection {
  id: string;
  brand_id: string;
  tenant_id: string;           // Xero organization ID
  tenant_name: string;         // "Display Champ" or "Bright Ivy"
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface XeroBankBalance {
  brand: string;               // Brand code (DC, BI) or "SHARED" for shared accounts
  brandName: string;
  accountName: string;
  accountType: 'BANK' | 'CREDITCARD';
  balance: number;
  currency: string;
}

export interface XeroBalancesResponse {
  success: boolean;
  balances: XeroBankBalance[];
  totals: {
    totalCash: number;         // Sum of all bank accounts
    totalCredit: number;       // Sum of credit card balances (usually negative)
    netPosition: number;       // totalCash + totalCredit
  };
  lastUpdated: string;
  errors?: string[];
}

// ============================================
// Unmatched Invoice Records Types
// ============================================

export type UnmatchedRecordStatus = 'pending' | 'matched' | 'voided' | 'resolved';

export interface UnmatchedInvoiceRecord {
  id: string;
  tracking_number: string;
  carrier: 'dhl' | 'royalmail';
  shipping_cost: number;
  currency: string;
  service_type: string | null;
  weight_kg: number | null;
  shipping_date: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  file_name: string | null;
  destination_country: string | null;
  destination_city: string | null;
  receiver_name: string | null;
  status: UnmatchedRecordStatus;
  resolution_notes: string | null;
  matched_order_id: string | null;
  matched_shipment_id: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  raw_data: Record<string, unknown> | null;
}

export const UNMATCHED_STATUS_LABELS: Record<UnmatchedRecordStatus, string> = {
  pending: 'Pending Review',
  matched: 'Matched to Order',
  voided: 'Voided/Wasted',
  resolved: 'Resolved',
};

// ============================================
// Investor Metrics Types
// ============================================

export interface MonthlyInvestorMetrics {
  month: string; // YYYY-MM
  monthLabel: string; // "Jan 2025"
  revenue: number;
  orders: number;
  uniqueCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  cogs: number;
  gp1: number;
  gp2: number;
  gp3: number;
  trueNetProfit: number;
  adSpend: number;
  grossMarginPct: number;
  netMarginPct: number;
  avgOrderValue: number;
  revenueGrowthMoM: number | null;
  revenueGrowthYoY: number | null;
}

export interface CustomerCohort {
  firstOrderMonth: string;
  customersAcquired: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrdersPerCustomer: number;
  avgRevenuePerCustomer: number;
}

export interface InvestorMetrics {
  // Headline metrics
  ttmRevenue: number;          // Trailing 12 months
  ttmGP1: number;
  ttmGP3: number;
  ttmTrueNetProfit: number;
  annualRunRate: number;       // Based on last 3 months
  revenueGrowthYoY: number;

  // Margins
  grossMarginPct: number;      // GP1 / Revenue
  contributionMarginPct: number; // GP3 / Revenue
  netMarginPct: number;        // True Net Profit / Revenue

  // Customer metrics
  totalCustomers: number;
  repeatPurchaseRate: number;
  avgOrdersPerCustomer: number;
  avgCustomerLifetimeValue: number;
  customerAcquisitionCost: number;
  ltvCacRatio: number;

  // Efficiency
  ttmAdSpend: number;
  blendedCac: number;          // Ad spend / new customers
  mer: number;                 // Marketing efficiency ratio
  paybackPeriodMonths: number;

  // Monthly data
  monthlyMetrics: MonthlyInvestorMetrics[];

  // Cohort data
  cohorts: CustomerCohort[];

  // Data quality
  dataStartDate: string;
  dataEndDate: string;
  monthsOfData: number;
}

// ============================================
// Inventory Management Types
// ============================================

export type ComponentCategoryName = 'cases' | 'bases' | 'accessories' | 'packaging' | 'display_accessories';

export interface ComponentCategory {
  id: string;
  name: ComponentCategoryName;
  description: string | null;
  display_order: number;
  created_at: string;
}

// Product SKU status
export type ProductSkuStatus = 'active' | 'historic' | 'discontinued';

// Product SKU - master table of canonical product SKUs
export interface ProductSku {
  id: string;
  sku: string;
  name: string;
  brand_id: string | null;
  status: ProductSkuStatus;
  platforms: string[];  // e.g., ['shopify', 'etsy']
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  brand?: Brand;
  bom_entries?: BomEntry[];
}

export interface ProductSkuFormData {
  sku: string;
  name: string;
  brand_id?: string;
  status?: ProductSkuStatus;
  platforms?: string[];
  description?: string;
  notes?: string;
}

// SKU Mapping - maps old/legacy SKUs to current canonical SKUs
export interface SkuMapping {
  id: string;
  old_sku: string;
  current_sku: string;
  brand_id: string | null;
  platform: string | null;  // 'shopify' | 'etsy' | null (all platforms)
  product_sku_id: string | null;  // FK to product_skus
  notes: string | null;
  created_at: string;
  // Joined
  product_sku?: ProductSku;
}

export interface Component {
  id: string;
  brand_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  material: string | null;
  variant: string | null;
  safety_stock_days: number;
  min_order_qty: number;
  lead_time_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: ComponentCategory;
  brand?: Brand;
  stock?: StockLevel;
}

export interface ComponentFormData {
  brand_id?: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  material?: string;
  variant?: string;
  safety_stock_days?: number;
  min_order_qty?: number;
  lead_time_days?: number;
  is_active?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  country: string | null;
  default_lead_time_days: number;
  min_order_qty: number;
  min_order_value: number | null;
  payment_terms: string | null;
  currency: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComponentSupplier {
  id: string;
  component_id: string;
  supplier_id: string;
  supplier_sku: string | null;
  unit_cost: number | null;
  lead_time_days: number | null;
  min_order_qty: number | null;
  priority: number;
  is_preferred: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
}

export interface BomEntry {
  id: string;
  product_sku: string;
  brand_id: string | null;
  component_id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  component?: Component;
}

export interface StockLevel {
  id: string;
  component_id: string;
  on_hand: number;
  reserved: number;
  on_order: number;
  available: number;  // Generated column
  last_count_date: string | null;
  last_movement_at: string | null;
  created_at: string;
  updated_at: string;
}

export type StockTransactionType =
  | 'receive'
  | 'ship'
  | 'adjust'
  | 'count'
  | 'reserve'
  | 'unreserve'
  | 'transfer'
  | 'return'
  | 'scrap';

export interface StockTransaction {
  id: string;
  component_id: string;
  transaction_type: StockTransactionType;
  quantity: number;
  quantity_before: number | null;
  quantity_after: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'sent'
  | 'confirmed'
  | 'partial'
  | 'received'
  | 'cancelled';

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  brand_id: string | null;
  po_number: string;
  status: PurchaseOrderStatus;
  ordered_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
  shipping_address: string | null;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  component_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  line_total: number;  // Generated column
  is_complete: boolean;  // Generated column
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  component?: Component;
}

export interface InventoryNotificationPrefs {
  id: string;
  user_id: string;
  low_stock_email: boolean;
  reorder_email: boolean;
  po_status_email: boolean;
  critical_threshold_days: number;
  warning_threshold_days: number;
  created_at: string;
  updated_at: string;
}

// Stock status for UI display
export type StockStatus = 'ok' | 'warning' | 'critical' | 'out_of_stock';

export interface StockStatusInfo {
  status: StockStatus;
  daysRemaining: number | null;
  velocity: number;  // Units per day
  reorderPoint: number;  // When to reorder
}

// Component with stock for dashboard
export interface ComponentWithStock extends Component {
  stock: StockLevel;
  statusInfo: StockStatusInfo;
}

// Stock adjustment types
export type StockAdjustmentType = 'count' | 'add' | 'remove';

export interface StockAdjustmentRequest {
  component_id: string;
  adjustment_type: StockAdjustmentType;
  quantity: number;
  notes?: string;
}

// Category labels for display
export const COMPONENT_CATEGORY_LABELS: Record<ComponentCategoryName, string> = {
  cases: 'Cases',
  bases: 'Bases',
  accessories: 'Accessories',
  packaging: 'Packaging',
  display_accessories: 'Display Accessories',
};

// Stock status labels and colors
export const STOCK_STATUS_CONFIG: Record<StockStatus, { label: string; color: string; bgColor: string }> = {
  ok: { label: 'In Stock', color: 'text-green-700', bgColor: 'bg-green-100' },
  warning: { label: 'Low Stock', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-900', bgColor: 'bg-red-200' },
};
