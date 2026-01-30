import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, subDays } from 'date-fns';
import {
  sendLowStockAlertEmail,
  type LowStockAlertData,
  type LowStockItem,
  type StockStatus,
} from '@/lib/email/low-stock-alert';

// Recipients for low stock alerts
const DEFAULT_RECIPIENTS = [
  'joel@displaychamp.com',
  'lee@displaychamp.com',
];

// Supabase returns arrays for nested selects, so we need to handle that
interface StockLevelRow {
  id: string;
  component_id: string;
  on_hand: number;
  reserved: number;
  on_order: number;
  available: number;
  last_movement_at: string | null;
  component: Array<{
    id: string;
    sku: string;
    name: string;
    safety_days: number;
    category: Array<{ name: string }>;
  }>;
}

interface BOMEntry {
  component_id: string;
  quantity: number;
  product_sku: string;
}

interface SKUMapping {
  old_sku: string;
  current_sku: string;
}

interface OrderLineItem {
  quantity: number;
  sku: string | null;
}

/**
 * POST /api/email/low-stock-alert
 * Send low stock alert email for items that need attention
 *
 * Query params:
 * - test: If "true", only logs the email, doesn't send
 * - to: Optional override recipient email
 */
export async function POST(request: NextRequest) {
  // Verify authorization for manual triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel cron (no auth header) or manual trigger with secret
  if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const isTest = searchParams.get('test') === 'true';
  const toParam = searchParams.get('to');

  const recipients = toParam ? [toParam] : DEFAULT_RECIPIENTS;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch stock levels with component details
    const { data: stockLevels, error: stockError } = await supabase
      .from('stock_levels')
      .select(`
        id,
        component_id,
        on_hand,
        reserved,
        on_order,
        available,
        last_movement_at,
        component:components(
          id,
          sku,
          name,
          safety_days,
          category:component_categories(name)
        )
      `)
      .gt('on_hand', -1); // Get all stock records

    if (stockError) throw stockError;

    // Fetch BOM entries for velocity calculation
    const { data: bomEntries, error: bomError } = await supabase
      .from('bom')
      .select('component_id, quantity, product_sku');

    if (bomError) throw bomError;

    // Fetch SKU mappings
    const { data: skuMappings, error: mappingError } = await supabase
      .from('sku_mapping')
      .select('old_sku, current_sku');

    if (mappingError) throw mappingError;

    // Fetch order line items from last 30 days
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('raw_data')
      .gte('order_date', thirtyDaysAgo)
      .is('excluded_at', null);

    if (ordersError) throw ordersError;

    // Extract line items from orders
    const orderLineItems: OrderLineItem[] = [];
    for (const order of orders || []) {
      const rawData = order.raw_data as Record<string, unknown>;
      if (!rawData) continue;

      // Handle Shopify format
      if (rawData.lineItems && typeof rawData.lineItems === 'object') {
        const lineItems = rawData.lineItems as { edges?: Array<{ node?: { sku?: string; quantity?: number } }> };
        if (lineItems.edges) {
          for (const edge of lineItems.edges) {
            if (edge.node?.sku) {
              orderLineItems.push({
                sku: edge.node.sku,
                quantity: edge.node.quantity || 1,
              });
            }
          }
        }
      }

      // Handle Etsy format
      if (rawData.transactions && Array.isArray(rawData.transactions)) {
        for (const txn of rawData.transactions) {
          const transaction = txn as { sku?: string; quantity?: number };
          if (transaction.sku) {
            orderLineItems.push({
              sku: transaction.sku,
              quantity: transaction.quantity || 1,
            });
          }
        }
      }
    }

    // Calculate velocity per component
    const velocityMap = calculateComponentVelocity(
      bomEntries as BOMEntry[] || [],
      skuMappings as SKUMapping[] || [],
      orderLineItems,
      30
    );

    // Get default lead time (fetch from suppliers or use default)
    const defaultLeadTime = 14; // Default 14 days lead time

    // Process stock levels and categorize
    const outOfStockItems: LowStockItem[] = [];
    const criticalItems: LowStockItem[] = [];
    const warningItems: LowStockItem[] = [];

    for (const stock of (stockLevels || []) as StockLevelRow[]) {
      // Extract component from array (Supabase returns arrays for nested selects)
      const component = Array.isArray(stock.component) ? stock.component[0] : stock.component;
      if (!component) continue;

      const velocity = velocityMap.get(stock.component_id) || 0;
      const safetyDays = component.safety_days || 7;
      const leadTime = defaultLeadTime;
      const reorderPoint = Math.ceil(velocity * (leadTime + safetyDays));
      const available = stock.available || 0;

      // Calculate days remaining
      let daysRemaining: number | null = null;
      if (velocity > 0) {
        daysRemaining = Math.floor(available / velocity);
      }

      // Determine status
      let status: StockStatus | 'ok' = 'ok';
      if (available <= 0) {
        status = 'out_of_stock';
      } else if (daysRemaining !== null && daysRemaining <= leadTime + safetyDays) {
        status = 'critical';
      } else if (daysRemaining !== null && daysRemaining <= leadTime + safetyDays + 7) {
        status = 'warning';
      }

      // Only include items that need attention
      if (status === 'ok') continue;

      // Extract category name (also an array from Supabase)
      const categoryName = Array.isArray(component.category) && component.category[0]
        ? component.category[0].name
        : 'Uncategorized';

      const item: LowStockItem = {
        componentId: stock.component_id,
        sku: component.sku,
        name: component.name,
        category: categoryName,
        status,
        onHand: stock.on_hand,
        available,
        onOrder: stock.on_order,
        velocity,
        daysRemaining,
        reorderPoint,
        leadTime,
        safetyDays,
      };

      if (status === 'out_of_stock') {
        outOfStockItems.push(item);
      } else if (status === 'critical') {
        criticalItems.push(item);
      } else if (status === 'warning') {
        warningItems.push(item);
      }
    }

    // Sort each category by days remaining (most urgent first)
    const sortByUrgency = (a: LowStockItem, b: LowStockItem) => {
      const aDays = a.daysRemaining ?? -1;
      const bDays = b.daysRemaining ?? -1;
      return aDays - bDays;
    };

    outOfStockItems.sort(sortByUrgency);
    criticalItems.sort(sortByUrgency);
    warningItems.sort(sortByUrgency);

    const totalLowStockItems = outOfStockItems.length + criticalItems.length + warningItems.length;

    // If no items need attention, don't send email
    if (totalLowStockItems === 0) {
      return NextResponse.json({
        success: true,
        message: 'No low stock items - email not sent',
        emailSent: false,
        data: {
          outOfStock: 0,
          critical: 0,
          warning: 0,
        },
      });
    }

    // Prepare email data
    const emailData: LowStockAlertData = {
      date: format(new Date(), 'yyyy-MM-dd'),
      outOfStockItems,
      criticalItems,
      warningItems,
      totalLowStockItems,
    };

    // Log for debugging
    console.log('Low Stock Alert Data:', {
      outOfStock: outOfStockItems.length,
      critical: criticalItems.length,
      warning: warningItems.length,
      total: totalLowStockItems,
    });

    if (isTest) {
      return NextResponse.json({
        success: true,
        message: 'Test mode - email not sent',
        data: emailData,
        recipients,
      });
    }

    // Send the email
    const result = await sendLowStockAlertEmail(emailData, recipients);

    if (!result.success) {
      console.error('Failed to send low stock alert email:', result.error);
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Low stock alert email sent to ${recipients.join(', ')}`,
      emailSent: true,
      data: {
        outOfStock: outOfStockItems.length,
        critical: criticalItems.length,
        warning: warningItems.length,
        total: totalLowStockItems,
      },
    });
  } catch (error) {
    console.error('Error generating low stock alert:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing in browser
export async function GET(request: NextRequest) {
  return POST(request);
}

/**
 * Calculate velocity per component based on BOM and order history
 */
function calculateComponentVelocity(
  bomEntries: BOMEntry[],
  skuMappings: SKUMapping[],
  orderLineItems: OrderLineItem[],
  days: number
): Map<string, number> {
  // Build SKU to component+quantity mapping from BOM
  const skuToBOM = new Map<string, { componentId: string; quantity: number }[]>();
  for (const entry of bomEntries) {
    const existing = skuToBOM.get(entry.product_sku) || [];
    existing.push({ componentId: entry.component_id, quantity: entry.quantity });
    skuToBOM.set(entry.product_sku, existing);
  }

  // Build old SKU to current SKU mapping
  const oldToCurrentSku = new Map<string, string>();
  for (const mapping of skuMappings) {
    oldToCurrentSku.set(mapping.old_sku, mapping.current_sku);
  }

  // Count component usage from orders
  const componentUsage = new Map<string, number>();

  for (const lineItem of orderLineItems) {
    if (!lineItem.sku) continue;

    // Resolve SKU (handle legacy mappings)
    let resolvedSku = lineItem.sku;
    if (oldToCurrentSku.has(lineItem.sku)) {
      resolvedSku = oldToCurrentSku.get(lineItem.sku)!;
    }

    // Get BOM entries for this SKU
    const bomForSku = skuToBOM.get(resolvedSku);
    if (!bomForSku) continue;

    // Add usage for each component in the BOM
    for (const bom of bomForSku) {
      const currentUsage = componentUsage.get(bom.componentId) || 0;
      componentUsage.set(bom.componentId, currentUsage + lineItem.quantity * bom.quantity);
    }
  }

  // Convert to daily velocity
  const velocityMap = new Map<string, number>();
  for (const [componentId, totalUsage] of componentUsage) {
    velocityMap.set(componentId, totalUsage / days);
  }

  return velocityMap;
}
