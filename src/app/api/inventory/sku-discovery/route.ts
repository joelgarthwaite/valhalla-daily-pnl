import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SkuData {
  sku: string;
  productName: string;
  orderCount: number;
  totalQuantity: number;
  platforms: string[];
  brands: string[];
  firstSeen: string;
  lastSeen: string;
}

interface LineItem {
  sku?: string;
  name?: string;
  title?: string;
  quantity?: number;
}

interface ShopifyGraphQLLineItem {
  node?: {
    sku?: string;
    name?: string;
    title?: string;
    quantity?: number;
  };
}

/**
 * Excluded product keywords (not ball cases - Bright Ivy jewellery)
 * These are filtered out from SKU discovery
 */
const EXCLUDED_KEYWORDS = [
  'jewel',
  'jewelry',
  'jewellery',
  'necklace',
  'bracelet',
  'earring',
  'earrings',
  'studs',
  'pendant',
  '14k gold',
  'gold-filled',
  'gold filled',
  'hypoallergenic',
  'sterling silver',
  'paperclip chain',
  'xoxo',
  'ball studs',
  'hoop earrings',
];

/**
 * Check if a SKU/product name indicates an excluded product (jewellery)
 */
function isExcludedProduct(sku: string, productName: string): boolean {
  const combined = `${sku} ${productName}`.toLowerCase();
  return EXCLUDED_KEYWORDS.some(keyword => combined.includes(keyword));
}

/**
 * Extract SKUs from order line items.
 * Handles both Shopify REST, Shopify GraphQL, and Etsy formats.
 */
function extractLineItems(rawData: unknown): LineItem[] {
  if (!rawData || typeof rawData !== 'object') return [];

  const data = rawData as Record<string, unknown>;
  const items: LineItem[] = [];

  // Shopify GraphQL format: lineItems.edges[].node
  if (data.lineItems && typeof data.lineItems === 'object') {
    const lineItems = data.lineItems as Record<string, unknown>;
    if (Array.isArray(lineItems.edges)) {
      for (const edge of lineItems.edges as ShopifyGraphQLLineItem[]) {
        if (edge.node) {
          items.push({
            sku: edge.node.sku || undefined,
            name: edge.node.name || edge.node.title || undefined,
            quantity: edge.node.quantity || 1,
          });
        }
      }
      if (items.length > 0) return items;
    }
  }

  // Shopify REST format: line_items[]
  if (Array.isArray(data.line_items)) {
    for (const item of data.line_items as LineItem[]) {
      items.push({
        sku: item.sku || undefined,
        name: item.name || item.title || undefined,
        quantity: item.quantity || 1,
      });
    }
    if (items.length > 0) return items;
  }

  // Etsy format: transactions[]
  if (Array.isArray(data.transactions)) {
    for (const txn of data.transactions as Record<string, unknown>[]) {
      items.push({
        sku: (txn.product_data as Record<string, unknown>)?.sku as string || txn.sku as string || undefined,
        name: txn.title as string || undefined,
        quantity: txn.quantity as number || 1,
      });
    }
    if (items.length > 0) return items;
  }

  return items;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandCode = searchParams.get('brand') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10000');

    // Build query
    let query = supabase
      .from('orders')
      .select('id, platform, brand_id, order_date, raw_data, brands!inner(code)')
      .not('raw_data', 'is', null)
      .order('order_date', { ascending: false })
      .limit(limit);

    if (brandCode !== 'all') {
      query = query.eq('brands.code', brandCode);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate SKU data
    const skuMap = new Map<string, {
      sku: string;
      productNames: Set<string>;
      orderCount: number;
      totalQuantity: number;
      platforms: Set<string>;
      brands: Set<string>;
      firstSeen: string;
      lastSeen: string;
    }>();

    for (const order of orders || []) {
      const lineItems = extractLineItems(order.raw_data);
      const orderDate = order.order_date;
      const platform = order.platform || 'unknown';
      // Handle both single brand object and array from inner join
      const brandData = order.brands as unknown as { code: string } | { code: string }[] | null;
      const brand = Array.isArray(brandData) ? brandData[0]?.code : brandData?.code || 'unknown';

      for (const item of lineItems) {
        if (!item.sku) continue;

        const skuKey = item.sku.toUpperCase().trim();
        if (!skuKey) continue;

        const existing = skuMap.get(skuKey);
        if (existing) {
          existing.orderCount++;
          existing.totalQuantity += item.quantity || 1;
          existing.platforms.add(platform);
          existing.brands.add(brand);
          if (item.name) existing.productNames.add(item.name);
          if (orderDate < existing.firstSeen) existing.firstSeen = orderDate;
          if (orderDate > existing.lastSeen) existing.lastSeen = orderDate;
        } else {
          skuMap.set(skuKey, {
            sku: skuKey,
            productNames: new Set(item.name ? [item.name] : []),
            orderCount: 1,
            totalQuantity: item.quantity || 1,
            platforms: new Set([platform]),
            brands: new Set([brand]),
            firstSeen: orderDate,
            lastSeen: orderDate,
          });
        }
      }
    }

    // Convert to array, filter excluded products, and format
    const skus: SkuData[] = Array.from(skuMap.values())
      .map(data => ({
        sku: data.sku,
        productName: Array.from(data.productNames)[0] || '',
        orderCount: data.orderCount,
        totalQuantity: data.totalQuantity,
        platforms: Array.from(data.platforms),
        brands: Array.from(data.brands),
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen,
      }))
      // Filter out excluded products (jewellery)
      .filter(sku => !isExcludedProduct(sku.sku, sku.productName))
      .sort((a, b) => b.orderCount - a.orderCount);

    return NextResponse.json({
      success: true,
      count: skus.length,
      skus,
    });
  } catch (error) {
    console.error('SKU discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to discover SKUs' },
      { status: 500 }
    );
  }
}
