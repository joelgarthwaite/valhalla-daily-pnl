// Shopify API Client for Order Sync
// Uses GraphQL Admin API to fetch orders

export interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  shippingAddress: {
    name: string;
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    country: string;
    zip: string;
    countryCode: string;
  } | null;
  subtotalPrice: string;
  totalShippingPrice: string;
  totalTax: string;
  totalPrice: string;
  currencyCode: string;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        quantity: number;
        originalUnitPrice: string;
        sku: string;
      };
    }>;
  };
  fulfillments: Array<{
    trackingInfo: Array<{
      number: string;
      company: string;
    }>;
  }>;
  refunds: Array<{
    totalRefundedSet: {
      shopMoney: {
        amount: string;
      };
    };
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
    sku: string;
  }>;
  raw_data: ShopifyOrder;
  tracking_numbers: string[];
  refund_amount: number;
  refund_status: 'none' | 'partial' | 'full';
}

const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          name
          createdAt
          shippingAddress {
            name
            address1
            address2
            city
            province
            country
            zip
            countryCode
          }
          subtotalPrice
          totalShippingPrice
          totalTax
          totalPrice
          currencyCode
          displayFulfillmentStatus
          displayFinancialStatus
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPrice
                sku
              }
            }
          }
          fulfillments {
            trackingInfo {
              number
              company
            }
          }
          refunds {
            totalRefundedSet {
              shopMoney {
                amount
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

/**
 * Fetch orders from Shopify GraphQL Admin API
 */
export async function fetchShopifyOrders(
  storeDomain: string,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<ShopifyOrder[]> {
  const apiVersion = '2024-10';
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;

  const orders: ShopifyOrder[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  // Build query string for date filtering
  const queryParts: string[] = [];
  if (startDate) {
    queryParts.push(`created_at:>=${startDate.toISOString()}`);
  }
  if (endDate) {
    queryParts.push(`created_at:<=${endDate.toISOString()}`);
  }
  const query = queryParts.length > 0 ? queryParts.join(' AND ') : null;

  while (hasNextPage) {
    const response: Response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: ORDERS_QUERY,
        variables: { first: 50, after: cursor, query },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Shopify GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    const edges = data.data.orders.edges;
    orders.push(...edges.map((edge: { node: ShopifyOrder }) => edge.node));

    hasNextPage = data.data.orders.pageInfo.hasNextPage;
    if (edges.length > 0) {
      cursor = edges[edges.length - 1].cursor;
    }

    // Safety limit to prevent infinite loops
    if (orders.length >= 1000) break;
  }

  return orders;
}

/**
 * Transform Shopify order to database format
 * CRITICAL: Uses subtotalPrice (NOT totalPrice) for revenue
 */
export function transformShopifyOrder(order: ShopifyOrder): TransformedOrder {
  // Extract numeric ID from GraphQL ID (gid://shopify/Order/12345)
  const gidMatch = order.id.match(/\/(\d+)$/);
  const platformOrderId = gidMatch ? gidMatch[1] : order.id;

  // Collect tracking numbers from fulfillments
  const trackingNumbers: string[] = [];
  order.fulfillments.forEach((f) => {
    f.trackingInfo.forEach((t) => {
      if (t.number) trackingNumbers.push(t.number);
    });
  });

  // Calculate refund amount
  let refundAmount = 0;
  order.refunds.forEach((refund) => {
    refundAmount += parseFloat(refund.totalRefundedSet?.shopMoney?.amount || '0');
  });

  // Determine refund status
  const total = parseFloat(order.totalPrice);
  let refundStatus: 'none' | 'partial' | 'full' = 'none';
  if (refundAmount > 0) {
    refundStatus = refundAmount >= total ? 'full' : 'partial';
  }

  return {
    platform_order_id: platformOrderId,
    order_number: order.name,
    order_date: order.createdAt,
    // Customer name from shipping address (no read_customers scope)
    customer_name: order.shippingAddress?.name || null,
    customer_email: null, // Not available without read_customers scope
    shipping_address: order.shippingAddress
      ? {
          name: order.shippingAddress.name,
          address1: order.shippingAddress.address1,
          address2: order.shippingAddress.address2,
          city: order.shippingAddress.city,
          province: order.shippingAddress.province,
          country: order.shippingAddress.country,
          zip: order.shippingAddress.zip,
          country_code: order.shippingAddress.countryCode,
        }
      : null,
    // CRITICAL: Use subtotalPrice for revenue (product revenue only, excludes shipping/tax)
    subtotal: parseFloat(order.subtotalPrice),
    shipping_charged: parseFloat(order.totalShippingPrice),
    tax: parseFloat(order.totalTax),
    total: parseFloat(order.totalPrice),
    currency: order.currencyCode,
    status: order.displayFinancialStatus?.toLowerCase() || null,
    fulfillment_status: order.displayFulfillmentStatus?.toLowerCase() || null,
    line_items: order.lineItems.edges.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
      quantity: edge.node.quantity,
      price: parseFloat(edge.node.originalUnitPrice),
      sku: edge.node.sku,
    })),
    raw_data: order,
    tracking_numbers: trackingNumbers,
    refund_amount: refundAmount,
    refund_status: refundStatus,
  };
}

/**
 * Verify Shopify credentials by making a simple API call
 */
export async function verifyShopifyCredentials(
  storeDomain: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string; shopName?: string }> {
  try {
    const apiVersion = '2024-10';
    const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;

    const response: Response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: `{ shop { name } }`,
      }),
    });

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.errors) {
      return { valid: false, error: data.errors[0]?.message || 'GraphQL error' };
    }

    return { valid: true, shopName: data.data.shop.name };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get configured Shopify stores from environment variables (fallback)
 */
export function getShopifyStoresFromEnv(): Array<{
  code: string;
  domain: string | undefined;
  accessToken: string | undefined;
}> {
  return [
    {
      code: 'DC',
      domain: process.env.SHOPIFY_DC_STORE_DOMAIN,
      accessToken: process.env.SHOPIFY_DC_ACCESS_TOKEN,
    },
    {
      code: 'BI',
      domain: process.env.SHOPIFY_BI_STORE_DOMAIN,
      accessToken: process.env.SHOPIFY_BI_ACCESS_TOKEN,
    },
  ];
}

export interface ShopifyStoreCredentials {
  brandId: string;
  brandCode: string;
  brandName: string;
  storeId: string;
  domain: string;
  accessToken: string;
  lastSyncAt: string | null;
}

/**
 * Get Shopify store credentials from database (stored by Valhalla Dashboard OAuth)
 */
export async function getShopifyStoresFromDb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<ShopifyStoreCredentials[]> {
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
    .eq('platform', 'shopify')
    .not('api_credentials', 'is', null);

  if (error || !stores) {
    console.error('Error fetching Shopify stores from DB:', error);
    return [];
  }

  // Define the shape of the store row from Supabase
  interface StoreRow {
    id: string;
    brand_id: string;
    store_name: string;
    api_credentials: {
      access_token?: string;
      shop_domain?: string;
    } | null;
    last_sync_at: string | null;
    brands: { id: string; code: string; name: string };
  }

  return (stores as StoreRow[])
    .filter((store) => {
      const creds = store.api_credentials;
      return creds?.access_token && creds?.shop_domain;
    })
    .map((store) => {
      const creds = store.api_credentials!;
      const brand = store.brands;
      return {
        brandId: brand.id,
        brandCode: brand.code,
        brandName: brand.name,
        storeId: store.id,
        domain: creds.shop_domain!,
        accessToken: creds.access_token!,
        lastSyncAt: store.last_sync_at,
      };
    });
}
