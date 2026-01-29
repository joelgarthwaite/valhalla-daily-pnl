// Shipping module types

export type CostConfidence =
  | 'actual'
  | 'estimated_tracking'
  | 'estimated_date_country'
  | 'estimated_country_only';

export type CarrierType = 'dhl' | 'royalmail' | 'deutschepost';

export interface Shipment {
  id: string;
  order_id: string | null;
  brand_id: string;
  carrier: CarrierType;
  carrier_account_id: string | null;
  tracking_number: string | null;
  service_type: string | null;
  direction: 'outbound' | 'inbound';
  origin_country: string | null;
  destination_country: string | null;
  weight_kg: number | null;
  dimensions: { length: number; width: number; height: number } | null;
  shipping_cost: number;
  shipping_date: string | null;
  delivery_date: string | null;
  status: string | null;
  raw_data: Record<string, unknown> | null;
  cost_updated_at: string | null;
  upload_history_id: string | null;
  cost_confidence: CostConfidence | null;
  match_method: string | null;
  candidates_in_window: number | null;
  cost_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingOrder {
  id: string;
  store_id: string;
  brand_id: string;
  platform: 'shopify' | 'etsy';
  platform_order_id: string;
  order_number: string | null;
  order_date: string;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    country_code?: string;
  } | null;
  subtotal: number;
  shipping_charged: number;
  tax: number;
  total: number;
  currency: string;
  status: string | null;
  fulfillment_status: string | null;
  line_items: Array<{
    id: string;
    title: string;
    quantity: number;
    price: number;
    sku?: string;
  }> | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ShippingOrderWithShipment extends ShippingOrder {
  shipment?: Shipment;
  brand?: { id: string; name: string; code: string };
}

export type RegionCode = 'UK' | 'EUROPE' | 'NORTH_AMERICA' | 'APAC' | 'OTHER';

export interface CountryFilter {
  countries: string[];
  regions: RegionCode[];
}

export interface ShippingKPIData {
  shippingRevenue: number;
  shippingRevenueChange: number;
  shippingExpenditure: number;
  shippingExpenditureChange: number;
  shippingMargin: number;
  shippingMarginChange: number;
  orderCount: number;
  orderCountChange: number;
}

export interface ShippingTrendData {
  date: string;
  shippingRevenue: number;
  shippingExpenditure: number;
  shippingMargin: number;
}

export interface CarrierBreakdownData {
  carrier: string;
  cost: number;
  percentage: number;
  shipmentCount: number;
}

export interface CountryBreakdownData {
  countryCode: string;
  countryName: string;
  region: RegionCode;
  orderCount: number;
  orderPercentage: number;
  shippingRevenue: number;
  shippingCost: number;
  shippingMargin: number;
}

export interface PlatformByRegionData {
  region: RegionCode;
  regionName: string;
  shopify: { orderCount: number; orderPercentage: number; revenue: number };
  etsy: { orderCount: number; orderPercentage: number; revenue: number };
  totalOrders: number;
}

export interface CountryOption {
  code: string;
  name: string;
  count: number;
  region: RegionCode;
}

export type ComparisonMode = 'none' | 'previous_period' | 'same_period_last_year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}
