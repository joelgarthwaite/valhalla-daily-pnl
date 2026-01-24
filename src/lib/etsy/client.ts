// Etsy API Client for Order Sync
// Uses Etsy Open API v3 to fetch receipts (orders)

export interface EtsyPrice {
  amount: number;
  divisor: number;
  currency_code: string;
}

export interface EtsyReceipt {
  receipt_id: number;
  name: string;
  first_line: string;
  second_line: string | null;
  city: string;
  state: string;
  zip: string;
  formatted_address: string;
  country_iso: string;
  is_paid: boolean;
  is_shipped: boolean;
  create_timestamp: number;
  update_timestamp: number;
  grandtotal: EtsyPrice;
  subtotal: EtsyPrice;
  total_price: EtsyPrice;
  total_shipping_cost: EtsyPrice;
  total_tax_cost: EtsyPrice;
  total_vat_cost: EtsyPrice;
  discount_amt: EtsyPrice;
  shipments: Array<{
    tracking_code: string;
    carrier_name: string;
  }>;
  transactions: Array<{
    transaction_id: number;
    title: string;
    quantity: number;
    price: EtsyPrice;
    sku: string | null;
    listing_id: number;
  }>;
  buyer_email: string;
  adjustments?: Array<{
    type: string;
    amount: EtsyPrice;
    note: string;
  }>;
}

export interface TransformedOrder {
  platform_order_id: string;
  order_number: string;
  order_date: string;
  customer_name: string | null;
  customer_email: string | null;
  shipping_address: {
    name: string;
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    country: string;
    zip: string;
    country_code: string;
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
    sku: string | null;
  }>;
  raw_data: EtsyReceipt;
  tracking_numbers: string[];
  refund_amount: number;
  refund_status: 'none' | 'partial' | 'full';
}

/**
 * Convert Etsy price object to number
 * Etsy amounts are in smallest currency unit (pence/cents)
 */
function convertPrice(price: EtsyPrice): number {
  return price.amount / price.divisor;
}

/**
 * Fetch receipts from Etsy Open API v3
 */
export async function fetchEtsyReceipts(
  apiKey: string,
  shopId: string,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<EtsyReceipt[]> {
  const baseUrl = 'https://openapi.etsy.com/v3';
  const receipts: EtsyReceipt[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    if (startDate) {
      params.set('min_created', String(Math.floor(startDate.getTime() / 1000)));
    }
    if (endDate) {
      params.set('max_created', String(Math.floor(endDate.getTime() / 1000)));
    }

    const response: Response = await fetch(
      `${baseUrl}/application/shops/${shopId}/receipts?${params.toString()}`,
      {
        headers: {
          'x-api-key': apiKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Etsy API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    receipts.push(...data.results);

    if (data.results.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }

    // Safety limit to prevent infinite loops
    if (receipts.length >= 1000) break;
  }

  return receipts;
}

/**
 * Transform Etsy receipt to database format
 * CRITICAL: Uses subtotal (NOT grandtotal) for revenue
 */
export function transformEtsyReceipt(receipt: EtsyReceipt): TransformedOrder {
  // Collect tracking numbers from shipments
  const trackingNumbers = receipt.shipments
    ?.filter((s) => s.tracking_code)
    .map((s) => s.tracking_code) || [];

  // Calculate refund amount from adjustments
  let refundAmount = 0;
  if (receipt.adjustments) {
    receipt.adjustments.forEach((adj) => {
      if (adj.type === 'refund') {
        refundAmount += Math.abs(convertPrice(adj.amount));
      }
    });
  }

  // Determine refund status
  const total = convertPrice(receipt.grandtotal);
  let refundStatus: 'none' | 'partial' | 'full' = 'none';
  if (refundAmount > 0) {
    refundStatus = refundAmount >= total ? 'full' : 'partial';
  }

  return {
    platform_order_id: String(receipt.receipt_id),
    order_number: String(receipt.receipt_id),
    order_date: new Date(receipt.create_timestamp * 1000).toISOString(),
    customer_name: receipt.name || null,
    customer_email: receipt.buyer_email || null,
    shipping_address: {
      name: receipt.name,
      address1: receipt.first_line,
      address2: receipt.second_line,
      city: receipt.city,
      province: receipt.state,
      country: receipt.formatted_address,
      zip: receipt.zip,
      country_code: receipt.country_iso,
    },
    // CRITICAL: Use subtotal for revenue (product revenue only, excludes shipping/tax)
    subtotal: convertPrice(receipt.subtotal),
    shipping_charged: convertPrice(receipt.total_shipping_cost),
    tax: convertPrice(receipt.total_tax_cost) + convertPrice(receipt.total_vat_cost),
    total: convertPrice(receipt.grandtotal),
    currency: receipt.grandtotal.currency_code,
    status: receipt.is_paid ? 'paid' : 'pending',
    fulfillment_status: receipt.is_shipped ? 'fulfilled' : 'unfulfilled',
    line_items: receipt.transactions?.map((t) => ({
      id: String(t.transaction_id),
      title: t.title,
      quantity: t.quantity,
      price: convertPrice(t.price),
      sku: t.sku,
    })) || [],
    raw_data: receipt,
    tracking_numbers: trackingNumbers,
    refund_amount: refundAmount,
    refund_status: refundStatus,
  };
}

/**
 * Refresh Etsy OAuth access token
 */
export async function refreshEtsyToken(
  apiKey: string,
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  try {
    const response: Response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: apiKey,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Etsy token refresh failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Etsy token refresh error:', error);
    return null;
  }
}

/**
 * Verify Etsy credentials by fetching shop info
 */
export async function verifyEtsyCredentials(
  apiKey: string,
  shopId: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string; shopName?: string }> {
  try {
    const response: Response = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}`,
      {
        headers: {
          'x-api-key': apiKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { valid: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { valid: true, shopName: data.shop_name };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get configured Etsy stores from environment variables (fallback)
 */
export function getEtsyStoresFromEnv(): Array<{
  code: string;
  apiKey: string | undefined;
  shopId: string | undefined;
  accessToken: string | undefined;
  refreshToken: string | undefined;
}> {
  return [
    {
      code: 'DC',
      apiKey: process.env.ETSY_DC_API_KEY,
      shopId: process.env.ETSY_DC_SHOP_ID,
      accessToken: process.env.ETSY_DC_ACCESS_TOKEN,
      refreshToken: process.env.ETSY_DC_REFRESH_TOKEN,
    },
    {
      code: 'BI',
      apiKey: process.env.ETSY_BI_API_KEY,
      shopId: process.env.ETSY_BI_SHOP_ID,
      accessToken: process.env.ETSY_BI_ACCESS_TOKEN,
      refreshToken: process.env.ETSY_BI_REFRESH_TOKEN,
    },
  ];
}

export interface EtsyStoreCredentials {
  brandId: string;
  brandCode: string;
  brandName: string;
  storeId: string;
  storeName: string;
  apiKey: string;
  shopId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  lastSyncAt: string | null;
}

/**
 * Get Etsy store credentials from database (stored by Valhalla Dashboard OAuth)
 */
export async function getEtsyStoresFromDb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<EtsyStoreCredentials[]> {
  const { data: stores, error } = await supabase
    .from('stores')
    .select(`
      id,
      brand_id,
      store_name,
      api_credentials,
      last_sync_at,
      brands!inner (
        id,
        code,
        name
      )
    `)
    .eq('platform', 'etsy')
    .not('api_credentials', 'is', null);

  if (error || !stores) {
    console.error('Error fetching Etsy stores from DB:', error);
    return [];
  }

  // Define the shape of the store row from Supabase
  interface StoreRow {
    id: string;
    brand_id: string;
    store_name: string;
    api_credentials: {
      api_key?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: string;
      shop_id?: number | string;
    } | null;
    last_sync_at: string | null;
    brands: { id: string; code: string; name: string };
  }

  return (stores as StoreRow[])
    .filter((store) => {
      const creds = store.api_credentials;
      return creds?.api_key && creds?.access_token && creds?.shop_id;
    })
    .map((store) => {
      const creds = store.api_credentials!;
      const brand = store.brands;
      return {
        brandId: brand.id,
        brandCode: brand.code,
        brandName: brand.name,
        storeId: store.id,
        storeName: store.store_name,
        apiKey: creds.api_key!,
        shopId: String(creds.shop_id),
        accessToken: creds.access_token!,
        refreshToken: creds.refresh_token || null,
        expiresAt: creds.expires_at || null,
        lastSyncAt: store.last_sync_at,
      };
    });
}
