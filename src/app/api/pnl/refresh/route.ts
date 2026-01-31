import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CostConfig } from '@/types';
import {
  calculateGP1,
  calculateGP2,
  calculateGP3,
  calculatePOAS,
  calculateCoP,
  calculateMER,
  calculateMarketingCostRatio,
  calculateGrossAOV,
  calculateNetAOV,
} from '@/lib/pnl/calculations';
import { getBaseSku } from '@/lib/inventory/sku-utils';

// Allow up to 120 seconds for P&L refresh (Pro plan allows up to 300s)
export const maxDuration = 120;

// Default cost percentages
const DEFAULT_COGS_RATE = 0.30; // 30% COGS for 70% gross margin
const DEFAULT_PICK_PACK_RATE = 0.05; // 5% pick & pack
const DEFAULT_LOGISTICS_RATE = 0.03; // 3% logistics
const SHOPIFY_FEE_RATE = 0.029; // 2.9%
const SHOPIFY_FEE_FIXED = 0.30; // £0.30 per transaction
const ETSY_FEE_RATE = 0.065; // ~6.5% total Etsy fees

// ============================================
// Actual COGS Types and Helpers
// ============================================

interface BOMEntry {
  product_sku: string;
  component_id: string;
  quantity: number;
}

interface ComponentCost {
  id: string;
  sku: string;
  unit_cost: number | null;
}

interface SKUMapping {
  old_sku: string;
  current_sku: string;
}

interface LineItem {
  sku?: string;
  quantity: number;
  price: number;
}

interface COGSDataCache {
  bomBySku: Map<string, BOMEntry[]>;
  componentById: Map<string, ComponentCost>;
  skuMappingByOld: Map<string, string>;
  isLoaded: boolean;
  hasActualData: boolean;
}

/**
 * Load COGS reference data (BOM, component costs, SKU mappings) once for batch processing.
 */
async function loadCOGSData(supabase: SupabaseClient): Promise<COGSDataCache> {
  const cache: COGSDataCache = {
    bomBySku: new Map(),
    componentById: new Map(),
    skuMappingByOld: new Map(),
    isLoaded: false,
    hasActualData: false,
  };

  try {
    const [bomResult, componentResult, mappingResult] = await Promise.all([
      supabase.from('bom').select('product_sku, component_id, quantity'),
      supabase.from('components').select(`
        id,
        sku,
        component_suppliers!inner (
          unit_cost,
          is_preferred
        )
      `).eq('is_active', true),
      supabase.from('sku_mapping').select('old_sku, current_sku'),
    ]);

    // Process BOM data
    for (const entry of bomResult.data || []) {
      const sku = entry.product_sku;
      const entries = cache.bomBySku.get(sku) || [];
      entries.push(entry);
      cache.bomBySku.set(sku, entries);
      // Also store uppercase version
      const upperSku = sku.toUpperCase();
      if (upperSku !== sku) {
        const upperEntries = cache.bomBySku.get(upperSku) || [];
        upperEntries.push(entry);
        cache.bomBySku.set(upperSku, upperEntries);
      }
    }

    // Process component costs (get preferred supplier cost)
    for (const comp of componentResult.data || []) {
      const suppliers = comp.component_suppliers as Array<{ unit_cost: number; is_preferred: boolean }>;
      const preferredSupplier = suppliers.find(s => s.is_preferred) || suppliers[0];
      cache.componentById.set(comp.id, {
        id: comp.id,
        sku: comp.sku,
        unit_cost: preferredSupplier?.unit_cost || null,
      });
    }

    // Process SKU mappings
    for (const mapping of mappingResult.data || []) {
      cache.skuMappingByOld.set(mapping.old_sku.toLowerCase(), mapping.current_sku);
    }

    cache.isLoaded = true;
    cache.hasActualData = cache.bomBySku.size > 0 && cache.componentById.size > 0;

    console.log(`COGS data loaded: ${cache.bomBySku.size} BOMs, ${cache.componentById.size} components, ${cache.skuMappingByOld.size} mappings`);
  } catch (error) {
    console.error('Error loading COGS data:', error);
    // Return empty cache - will use fallback percentages
  }

  return cache;
}

/**
 * Calculate actual COGS for an order's line items using BOM and component costs.
 * Returns null if data is unavailable (will use fallback percentage).
 */
function calculateOrderActualCOGS(
  lineItems: LineItem[] | null,
  cogsCache: COGSDataCache
): { actualCOGS: number; coverage: 'full' | 'partial' | 'none' } | null {
  if (!lineItems || lineItems.length === 0 || !cogsCache.hasActualData) {
    return null;
  }

  let totalCOGS = 0;
  let itemsWithCOGS = 0;
  let itemsWithoutCOGS = 0;

  for (const item of lineItems) {
    let sku = item.sku || '';
    const quantity = item.quantity || 1;
    const price = item.price || 0;

    if (!sku) {
      // No SKU - can't calculate actual COGS
      itemsWithoutCOGS++;
      continue;
    }

    // Resolve SKU through mappings
    const normalized = sku.toLowerCase();
    const mapped = cogsCache.skuMappingByOld.get(normalized);
    if (mapped) sku = mapped;

    // Get base SKU (handles P suffix)
    const baseSku = getBaseSku(sku);

    // Look up BOM
    let bomEntries = cogsCache.bomBySku.get(sku)
      || cogsCache.bomBySku.get(baseSku)
      || cogsCache.bomBySku.get(sku.toUpperCase())
      || cogsCache.bomBySku.get(baseSku.toUpperCase());

    if (!bomEntries || bomEntries.length === 0) {
      itemsWithoutCOGS++;
      continue;
    }

    // Calculate component costs
    let unitCost = 0;
    let hasAllCosts = true;

    for (const bomEntry of bomEntries) {
      const component = cogsCache.componentById.get(bomEntry.component_id);
      if (!component || component.unit_cost === null) {
        hasAllCosts = false;
        continue;
      }
      unitCost += bomEntry.quantity * component.unit_cost;
    }

    if (unitCost > 0) {
      totalCOGS += unitCost * quantity;
      itemsWithCOGS++;
      if (!hasAllCosts) {
        itemsWithoutCOGS++;
      }
    } else {
      itemsWithoutCOGS++;
    }
  }

  const totalItems = itemsWithCOGS + itemsWithoutCOGS;
  if (totalItems === 0) return null;

  const coverage = itemsWithoutCOGS === 0 ? 'full'
    : itemsWithCOGS === 0 ? 'none'
    : 'partial';

  return { actualCOGS: totalCOGS, coverage };
}

/**
 * Extract line items from order raw_data.
 */
function extractLineItems(rawData: Record<string, unknown> | null): LineItem[] {
  if (!rawData) return [];

  // Shopify GraphQL format: lineItems.edges[].node
  const lineItemsData = rawData.lineItems as { edges?: Array<{ node: unknown }> } | undefined;
  if (lineItemsData?.edges) {
    return lineItemsData.edges.map(edge => {
      const node = edge.node as {
        sku?: string;
        quantity?: number;
        priceSet?: { shopMoney?: { amount?: string } };
        originalUnitPriceSet?: { shopMoney?: { amount?: string } };
      };
      const price = parseFloat(node.priceSet?.shopMoney?.amount || node.originalUnitPriceSet?.shopMoney?.amount || '0');
      return {
        sku: node.sku || '',
        quantity: node.quantity || 1,
        price,
      };
    });
  }

  // Shopify REST format: line_items array
  const restLineItems = rawData.line_items as Array<{
    sku?: string;
    quantity?: number;
    price?: string;
  }> | undefined;
  if (Array.isArray(restLineItems)) {
    return restLineItems.map(item => ({
      sku: item.sku || '',
      quantity: item.quantity || 1,
      price: parseFloat(item.price || '0'),
    }));
  }

  return [];
}

export async function POST(request: NextRequest) {
  try {
    // Use service role key for full access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Parse optional date range from request body
    const body = await request.json().catch(() => ({}));
    const { startDate, endDate, days } = body as {
      startDate?: string;
      endDate?: string;
      days?: number;
    };

    // Default to last 90 days if no date range specified (for performance)
    const defaultDays = days || 90;
    const toDate = endDate || new Date().toISOString().split('T')[0];
    const fromDate = startDate || new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, code');

    if (brandsError) throw brandsError;
    if (!brands || brands.length === 0) {
      return NextResponse.json({ error: 'No brands found' }, { status: 404 });
    }

    let totalRecordsProcessed = 0;
    let totalOrdersWithActualCOGS = 0;
    let totalOrdersWithFallback = 0;

    for (const brand of brands) {
      // Fetch cost config for the brand
      const { data: costConfigData } = await supabase
        .from('cost_config')
        .select('*')
        .eq('brand_id', brand.id)
        .single();

      const costConfig: CostConfig | null = costConfigData;
      const cogsRate = costConfig ? costConfig.cogs_pct / 100 : DEFAULT_COGS_RATE;
      const pickPackRate = costConfig ? costConfig.pick_pack_pct / 100 : DEFAULT_PICK_PACK_RATE;
      const logisticsRate = costConfig ? costConfig.logistics_pct / 100 : DEFAULT_LOGISTICS_RATE;

      // Fetch orders within date range (extract refunds from raw_data)
      // Exclude orders that have been manually excluded
      // Include line_items for actual COGS calculation
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('order_date, platform, subtotal, shipping_charged, total, raw_data, line_items')
        .eq('brand_id', brand.id)
        .is('excluded_at', null)  // Only include non-excluded orders
        .gte('order_date', fromDate)
        .lte('order_date', toDate + 'T23:59:59');

      if (ordersError) throw ordersError;

      // Fetch shipments within date range
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('shipping_date, shipping_cost')
        .eq('brand_id', brand.id)
        .not('shipping_date', 'is', null)
        .gte('shipping_date', fromDate)
        .lte('shipping_date', toDate + 'T23:59:59');

      if (shipmentsError) throw shipmentsError;

      // Fetch ad spend within date range
      const { data: adSpend, error: adSpendError } = await supabase
        .from('ad_spend')
        .select('date, platform, spend')
        .eq('brand_id', brand.id)
        .gte('date', fromDate)
        .lte('date', toDate);

      if (adSpendError) throw adSpendError;

      // Fetch B2B revenue within date range
      const { data: b2bRevenue, error: b2bError } = await supabase
        .from('b2b_revenue')
        .select('date, subtotal, shipping_charged, total')
        .eq('brand_id', brand.id)
        .gte('date', fromDate)
        .lte('date', toDate);

      if (b2bError) throw b2bError;

      // Aggregate data by date
      const dailyDataMap = new Map<string, {
        shopify_revenue: number;
        etsy_revenue: number;
        b2b_revenue: number;
        shipping_charged: number;
        shipping_cost: number;
        meta_spend: number;
        google_spend: number;
        microsoft_spend: number;
        etsy_ads_spend: number;
        shopify_orders: number;
        etsy_orders: number;
        b2b_orders: number;
        total_refunds: number;
        refund_count: number;
        // Actual COGS tracking
        actual_cogs: number;
        actual_cogs_orders: number;  // Orders with actual COGS calculated
        fallback_cogs_orders: number;  // Orders using percentage fallback
      }>();

      const getOrCreateDay = (date: string) => {
        if (!dailyDataMap.has(date)) {
          dailyDataMap.set(date, {
            shopify_revenue: 0,
            etsy_revenue: 0,
            b2b_revenue: 0,
            shipping_charged: 0,
            shipping_cost: 0,
            meta_spend: 0,
            google_spend: 0,
            microsoft_spend: 0,
            etsy_ads_spend: 0,
            shopify_orders: 0,
            etsy_orders: 0,
            b2b_orders: 0,
            total_refunds: 0,
            refund_count: 0,
            // Actual COGS tracking
            actual_cogs: 0,
            actual_cogs_orders: 0,
            fallback_cogs_orders: 0,
          });
        }
        return dailyDataMap.get(date)!;
      };

      // Load COGS reference data once for this batch
      const cogsCache = await loadCOGSData(supabase);

      // Process orders
      for (const order of orders || []) {
        const date = order.order_date?.split('T')[0];
        if (!date) continue;

        const day = getOrCreateDay(date);
        const revenue = Number(order.subtotal) || 0;
        const shippingCharged = Number(order.shipping_charged) || 0;

        // Extract refund amount from raw_data
        let refundAmount = 0;
        if (order.raw_data) {
          const rawData = order.raw_data as Record<string, unknown>;
          if (order.platform === 'shopify') {
            const financialStatus = rawData.financial_status as string | undefined;
            if (financialStatus === 'refunded') {
              refundAmount = Number(order.total) || 0;
            } else if (financialStatus === 'partially_refunded') {
              const refunds = rawData.refunds as Array<Record<string, unknown>> | undefined;
              if (refunds) {
                for (const refund of refunds) {
                  const transactions = refund.transactions as Array<Record<string, unknown>> | undefined;
                  if (transactions) {
                    for (const t of transactions) {
                      refundAmount += parseFloat(String(t.amount || 0));
                    }
                  }
                }
              }
            }
          } else if (order.platform === 'etsy') {
            // Etsy refunds from adjustments
            const adjustments = rawData.adjustments as Array<Record<string, unknown>> | undefined;
            if (adjustments) {
              for (const adj of adjustments) {
                if (adj.type === 'refund') {
                  refundAmount += Math.abs(parseFloat(String(adj.amount || 0)));
                }
              }
            }
          }
        }

        if (refundAmount > 0) {
          day.total_refunds += refundAmount;
          day.refund_count += 1;
        }

        // Calculate actual COGS from BOM if available
        // Try line_items first, then fall back to extracting from raw_data
        let lineItems = order.line_items as LineItem[] | null;
        if (!lineItems && order.raw_data) {
          lineItems = extractLineItems(order.raw_data as Record<string, unknown>);
        }

        const cogsResult = calculateOrderActualCOGS(lineItems, cogsCache);
        if (cogsResult && cogsResult.coverage !== 'none') {
          day.actual_cogs += cogsResult.actualCOGS;
          day.actual_cogs_orders += 1;
        } else {
          day.fallback_cogs_orders += 1;
        }

        if (order.platform === 'shopify') {
          day.shopify_revenue += revenue;
          day.shopify_orders += 1;
        } else if (order.platform === 'etsy') {
          day.etsy_revenue += revenue;
          day.etsy_orders += 1;
        } else if (order.platform === 'b2b') {
          // B2B orders created directly in orders table
          day.b2b_revenue += revenue;
          day.b2b_orders += 1;
        }
        day.shipping_charged += shippingCharged;
      }

      // Process shipments
      for (const shipment of shipments || []) {
        const date = shipment.shipping_date?.split('T')[0];
        if (!date) continue;

        const day = getOrCreateDay(date);
        day.shipping_cost += Number(shipment.shipping_cost) || 0;
      }

      // Process ad spend
      for (const ad of adSpend || []) {
        const date = ad.date;
        if (!date) continue;

        const day = getOrCreateDay(date);
        const spend = Number(ad.spend) || 0;

        switch (ad.platform) {
          case 'meta':
            day.meta_spend += spend;
            break;
          case 'google':
            day.google_spend += spend;
            break;
          case 'microsoft':
            day.microsoft_spend += spend;
            break;
          case 'etsy_ads':
            day.etsy_ads_spend += spend;
            break;
        }
      }

      // Process B2B revenue
      for (const b2b of b2bRevenue || []) {
        const date = b2b.date;
        if (!date) continue;

        const day = getOrCreateDay(date);
        day.b2b_revenue += Number(b2b.subtotal) || 0;
        day.shipping_charged += Number(b2b.shipping_charged) || 0;
        day.b2b_orders += 1;
      }

      // Fetch approved inter-company transactions for this brand
      const { data: icTransactions } = await supabase
        .from('inter_company_transactions')
        .select('transaction_date, from_brand_id, to_brand_id, subtotal')
        .eq('status', 'approved')
        .or(`from_brand_id.eq.${brand.id},to_brand_id.eq.${brand.id}`)
        .gte('transaction_date', fromDate)
        .lte('transaction_date', toDate);

      // Process IC transactions - aggregate by date
      // If this brand is the sender (from_brand_id), it's IC revenue
      // If this brand is the receiver (to_brand_id), it's IC expense
      const icByDate = new Map<string, { ic_revenue: number; ic_expense: number }>();
      for (const ic of icTransactions || []) {
        const date = ic.transaction_date;
        if (!date) continue;

        if (!icByDate.has(date)) {
          icByDate.set(date, { ic_revenue: 0, ic_expense: 0 });
        }
        const icData = icByDate.get(date)!;

        if (ic.from_brand_id === brand.id) {
          // This brand provided the service - IC Revenue
          icData.ic_revenue += Number(ic.subtotal) || 0;
        } else if (ic.to_brand_id === brand.id) {
          // This brand received the service - IC Expense
          icData.ic_expense += Number(ic.subtotal) || 0;
        }
      }

      // Build records for batch upsert
      const baseRecords: Record<string, unknown>[] = [];
      const extendedRecords: Record<string, unknown>[] = [];

      for (const [date, data] of dailyDataMap) {
        const totalRevenue = data.shopify_revenue + data.etsy_revenue + data.b2b_revenue;
        const netRevenue = totalRevenue - data.total_refunds;
        const totalAdSpend = data.meta_spend + data.google_spend + data.microsoft_spend + data.etsy_ads_spend;
        const totalOrders = data.shopify_orders + data.etsy_orders + data.b2b_orders;

        // Get IC amounts for this date
        const icData = icByDate.get(date) || { ic_revenue: 0, ic_expense: 0 };
        const icRevenue = icData.ic_revenue;
        const icExpense = icData.ic_expense;

        // Calculate COGS - use actual COGS from BOM when available
        // For orders without actual COGS data, use percentage-based fallback
        let cogsEstimated: number;
        if (data.actual_cogs_orders > 0 && data.actual_cogs > 0) {
          // We have some actual COGS data
          // For orders with actual COGS: use the calculated amount
          // For orders with fallback: use percentage-based estimation
          const totalOrderCount = data.actual_cogs_orders + data.fallback_cogs_orders;
          if (data.fallback_cogs_orders === 0) {
            // All orders have actual COGS - use it directly
            cogsEstimated = data.actual_cogs;
          } else {
            // Mix of actual and fallback - blend them
            // Estimate revenue per order for fallback portion
            const avgRevenuePerOrder = totalRevenue / (totalOrderCount || 1);
            const fallbackRevenue = avgRevenuePerOrder * data.fallback_cogs_orders;
            const fallbackCOGS = fallbackRevenue * cogsRate;
            cogsEstimated = data.actual_cogs + fallbackCOGS;
          }
        } else {
          // No actual COGS data - use percentage-based fallback
          cogsEstimated = netRevenue * cogsRate;
        }

        // Calculate operational costs
        const pickPackCost = netRevenue * pickPackRate;
        const logisticsCost = netRevenue * logisticsRate;

        // Calculate platform fees
        const shopifyFees = (data.shopify_revenue * SHOPIFY_FEE_RATE) + (data.shopify_orders * SHOPIFY_FEE_FIXED);
        const etsyFees = data.etsy_revenue * ETSY_FEE_RATE;
        const totalPlatformFees = shopifyFees + etsyFees;

        // Calculate GP1, GP2, GP3 (GP3 now includes IC amounts)
        const gp1 = calculateGP1(netRevenue, cogsEstimated);
        const gp2 = calculateGP2(gp1, pickPackCost, totalPlatformFees, logisticsCost);
        const gp3 = calculateGP3(gp2, totalAdSpend, icRevenue, icExpense);

        // Legacy margins (GP1 = gross profit, GP3 = net profit)
        const grossProfit = gp1;
        const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
        const shippingMargin = data.shipping_charged - data.shipping_cost;
        const netProfit = gp3;
        const netMarginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

        // Calculate enhanced metrics
        const grossAov = calculateGrossAOV(totalRevenue, data.shipping_charged, totalOrders);
        const netAov = calculateNetAOV(netRevenue, 0, totalOrders); // discounts = 0 for now
        const poas = calculatePOAS(gp3, totalAdSpend);
        const totalCosts = cogsEstimated + pickPackCost + logisticsCost + totalPlatformFees + totalAdSpend + data.shipping_cost;
        const cop = calculateCoP(totalCosts, gp3);
        const mer = calculateMER(totalRevenue, totalAdSpend);
        const marketingCostRatio = calculateMarketingCostRatio(totalAdSpend, totalRevenue);

        // Base record (original schema)
        const baseRecord = {
          brand_id: brand.id,
          date,
          shopify_revenue: data.shopify_revenue,
          etsy_revenue: data.etsy_revenue,
          b2b_revenue: data.b2b_revenue,
          total_revenue: totalRevenue,
          shipping_charged: data.shipping_charged,
          shipping_cost: data.shipping_cost,
          shipping_margin: shippingMargin,
          cogs_estimated: cogsEstimated,
          meta_spend: data.meta_spend,
          google_spend: data.google_spend,
          microsoft_spend: data.microsoft_spend,
          etsy_ads_spend: data.etsy_ads_spend,
          total_ad_spend: totalAdSpend,
          shopify_fees: shopifyFees,
          etsy_fees: etsyFees,
          total_platform_fees: totalPlatformFees,
          total_discounts: 0,
          gross_profit: grossProfit,
          gross_margin_pct: grossMarginPct,
          net_profit: netProfit,
          net_margin_pct: netMarginPct,
          shopify_orders: data.shopify_orders,
          etsy_orders: data.etsy_orders,
          b2b_orders: data.b2b_orders,
          total_orders: totalOrders,
          last_calculated_at: new Date().toISOString(),
        };

        // Extended record (with migration 003 + IC fields)
        const extendedRecord = {
          ...baseRecord,
          total_refunds: data.total_refunds,
          net_revenue: netRevenue,
          refund_count: data.refund_count,
          pick_pack_cost: pickPackCost,
          logistics_cost: logisticsCost,
          gp1,
          gp2,
          gp3,
          gross_aov: grossAov,
          net_aov: netAov,
          poas,
          cop,
          mer,
          marketing_cost_ratio: marketingCostRatio,
          // Inter-Company amounts (migration 020)
          ic_revenue: icRevenue,
          ic_expense: icExpense,
        };

        baseRecords.push(baseRecord);
        extendedRecords.push(extendedRecord);

        // Track COGS statistics
        totalOrdersWithActualCOGS += data.actual_cogs_orders;
        totalOrdersWithFallback += data.fallback_cogs_orders;
      }

      // Batch upsert - try extended schema first, fall back to base
      if (extendedRecords.length > 0) {
        let { error: upsertError } = await supabase
          .from('daily_pnl')
          .upsert(extendedRecords, { onConflict: 'brand_id,date' });

        if (upsertError && upsertError.code === 'PGRST204') {
          console.log('Extended columns not found, using base schema for batch');
          const result = await supabase
            .from('daily_pnl')
            .upsert(baseRecords, { onConflict: 'brand_id,date' });
          upsertError = result.error;
        }

        if (upsertError) {
          console.error('Batch upsert error:', upsertError);
          throw upsertError;
        }

        totalRecordsProcessed += extendedRecords.length;
      }
    }

    const totalOrders = totalOrdersWithActualCOGS + totalOrdersWithFallback;
    const cogsAccuracy = totalOrders > 0
      ? Math.round((totalOrdersWithActualCOGS / totalOrders) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      message: `P&L data refreshed for ${fromDate} to ${toDate}`,
      recordsProcessed: totalRecordsProcessed,
      dateRange: { from: fromDate, to: toDate },
      cogsStats: {
        ordersWithActualCOGS: totalOrdersWithActualCOGS,
        ordersWithFallback: totalOrdersWithFallback,
        totalOrders,
        accuracyPercentage: cogsAccuracy,
        note: cogsAccuracy === 100
          ? 'All orders have actual COGS from BOM'
          : cogsAccuracy > 0
            ? `${cogsAccuracy}% of orders have actual COGS, rest use ${(DEFAULT_COGS_RATE * 100).toFixed(0)}% fallback`
            : 'Using percentage-based COGS (no BOM data available)',
      },
    });

  } catch (error) {
    console.error('Error refreshing P&L data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
