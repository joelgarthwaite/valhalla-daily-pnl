import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  fetchShopifyOrders,
  transformShopifyOrder,
  getShopifyStoresFromDb,
} from '@/lib/shopify/client';
import {
  fetchEtsyReceipts,
  transformEtsyReceipt,
  getEtsyStoresFromDb,
} from '@/lib/etsy/client';
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
import type { CostConfig } from '@/types';

// Default cost percentages
const DEFAULT_COGS_RATE = 0.30;
const DEFAULT_PICK_PACK_RATE = 0.05;
const DEFAULT_LOGISTICS_RATE = 0.03;
const SHOPIFY_FEE_RATE = 0.029;
const SHOPIFY_FEE_FIXED = 0.30;
const ETSY_FEE_RATE = 0.065;

async function refreshPnLData(supabase: SupabaseClient) {
  const { data: brands, error: brandsError } = await supabase
    .from('brands')
    .select('id, code');

  if (brandsError) throw brandsError;
  if (!brands || brands.length === 0) return { recordsProcessed: 0 };

  let totalRecordsProcessed = 0;

  for (const brand of brands) {
    const { data: costConfigData } = await supabase
      .from('cost_config')
      .select('*')
      .eq('brand_id', brand.id)
      .single();

    const costConfig: CostConfig | null = costConfigData;
    const cogsRate = costConfig ? costConfig.cogs_pct / 100 : DEFAULT_COGS_RATE;
    const pickPackRate = costConfig ? costConfig.pick_pack_pct / 100 : DEFAULT_PICK_PACK_RATE;
    const logisticsRate = costConfig ? costConfig.logistics_pct / 100 : DEFAULT_LOGISTICS_RATE;

    const { data: orders } = await supabase
      .from('orders')
      .select('order_date, platform, subtotal, shipping_charged, total, raw_data')
      .eq('brand_id', brand.id);

    const { data: shipments } = await supabase
      .from('shipments')
      .select('shipping_date, shipping_cost')
      .eq('brand_id', brand.id)
      .not('shipping_date', 'is', null);

    const { data: adSpend } = await supabase
      .from('ad_spend')
      .select('date, platform, spend')
      .eq('brand_id', brand.id);

    const { data: b2bRevenue } = await supabase
      .from('b2b_revenue')
      .select('date, subtotal, shipping_charged, total')
      .eq('brand_id', brand.id);

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
        });
      }
      return dailyDataMap.get(date)!;
    };

    for (const order of orders || []) {
      const date = order.order_date?.split('T')[0];
      if (!date) continue;

      const day = getOrCreateDay(date);
      const revenue = Number(order.subtotal) || 0;
      const shippingCharged = Number(order.shipping_charged) || 0;

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

      if (order.platform === 'shopify') {
        day.shopify_revenue += revenue;
        day.shopify_orders += 1;
      } else if (order.platform === 'etsy') {
        day.etsy_revenue += revenue;
        day.etsy_orders += 1;
      }
      day.shipping_charged += shippingCharged;
    }

    for (const shipment of shipments || []) {
      const date = shipment.shipping_date?.split('T')[0];
      if (!date) continue;
      const day = getOrCreateDay(date);
      day.shipping_cost += Number(shipment.shipping_cost) || 0;
    }

    for (const ad of adSpend || []) {
      const date = ad.date;
      if (!date) continue;
      const day = getOrCreateDay(date);
      const spend = Number(ad.spend) || 0;
      switch (ad.platform) {
        case 'meta': day.meta_spend += spend; break;
        case 'google': day.google_spend += spend; break;
        case 'microsoft': day.microsoft_spend += spend; break;
        case 'etsy_ads': day.etsy_ads_spend += spend; break;
      }
    }

    for (const b2b of b2bRevenue || []) {
      const date = b2b.date;
      if (!date) continue;
      const day = getOrCreateDay(date);
      day.b2b_revenue += Number(b2b.subtotal) || 0;
      day.shipping_charged += Number(b2b.shipping_charged) || 0;
      day.b2b_orders += 1;
    }

    const records: Record<string, unknown>[] = [];

    for (const [date, data] of dailyDataMap) {
      const totalRevenue = data.shopify_revenue + data.etsy_revenue + data.b2b_revenue;
      const netRevenue = totalRevenue - data.total_refunds;
      const totalAdSpend = data.meta_spend + data.google_spend + data.microsoft_spend + data.etsy_ads_spend;
      const totalOrders = data.shopify_orders + data.etsy_orders + data.b2b_orders;

      const cogsEstimated = netRevenue * cogsRate;
      const pickPackCost = netRevenue * pickPackRate;
      const logisticsCost = netRevenue * logisticsRate;
      const shopifyFees = (data.shopify_revenue * SHOPIFY_FEE_RATE) + (data.shopify_orders * SHOPIFY_FEE_FIXED);
      const etsyFees = data.etsy_revenue * ETSY_FEE_RATE;
      const totalPlatformFees = shopifyFees + etsyFees;

      const gp1 = calculateGP1(netRevenue, cogsEstimated);
      const gp2 = calculateGP2(gp1, pickPackCost, totalPlatformFees, logisticsCost);
      const gp3 = calculateGP3(gp2, totalAdSpend);

      const grossProfit = gp1;
      const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
      const shippingMargin = data.shipping_charged - data.shipping_cost;
      const netProfit = gp3;
      const netMarginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

      const grossAov = calculateGrossAOV(totalRevenue, data.shipping_charged, totalOrders);
      const netAov = calculateNetAOV(netRevenue, 0, totalOrders);
      const poas = calculatePOAS(gp3, totalAdSpend);
      const totalCosts = cogsEstimated + pickPackCost + logisticsCost + totalPlatformFees + totalAdSpend + data.shipping_cost;
      const cop = calculateCoP(totalCosts, gp3);
      const mer = calculateMER(totalRevenue, totalAdSpend);
      const marketingCostRatio = calculateMarketingCostRatio(totalAdSpend, totalRevenue);

      records.push({
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
      });
    }

    if (records.length > 0) {
      const { error: upsertError } = await supabase
        .from('daily_pnl')
        .upsert(records, { onConflict: 'brand_id,date' });

      if (upsertError) throw upsertError;
      totalRecordsProcessed += records.length;
    }
  }

  return { recordsProcessed: totalRecordsProcessed };
}

interface SyncResult {
  platform: 'shopify' | 'etsy';
  brand: string;
  recordsSynced: number;
  errors: string[];
  dateRange: { start: string; end: string };
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      startDate,
      endDate,
      brandCode,
      platforms,
    }: {
      startDate?: string;
      endDate?: string;
      brandCode?: 'DC' | 'BI' | 'all';
      platforms?: ('shopify' | 'etsy')[];
    } = body;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Default to all platforms
    const platformsToSync = platforms || ['shopify', 'etsy'];

    const results: SyncResult[] = [];

    // =========== SHOPIFY SYNC ===========
    if (platformsToSync.includes('shopify')) {
      const shopifyStores = await getShopifyStoresFromDb(supabase);

      const storesToSync = brandCode && brandCode !== 'all'
        ? shopifyStores.filter((s) => s.brandCode === brandCode)
        : shopifyStores;

      for (const store of storesToSync) {
        const errors: string[] = [];
        let syncedCount = 0;

        try {
          const orders = await fetchShopifyOrders(
            store.domain,
            store.accessToken,
            start,
            end
          );

          for (const order of orders) {
            const transformed = transformShopifyOrder(order);

            const { error } = await supabase.from('orders').upsert(
              {
                store_id: store.storeId,
                brand_id: store.brandId,
                platform: 'shopify',
                platform_order_id: transformed.platform_order_id,
                order_number: transformed.order_number,
                order_date: transformed.order_date,
                customer_name: transformed.customer_name,
                customer_email: transformed.customer_email,
                shipping_address: transformed.shipping_address,
                subtotal: transformed.subtotal,
                shipping_charged: transformed.shipping_charged,
                tax: transformed.tax,
                total: transformed.total,
                currency: transformed.currency,
                status: transformed.status,
                fulfillment_status: transformed.fulfillment_status,
                line_items: transformed.line_items,
                raw_data: transformed.raw_data,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'platform,platform_order_id' }
            );

            if (error) {
              errors.push(`Order ${transformed.order_number}: ${error.message}`);
            } else {
              syncedCount++;
            }
          }

          await supabase
            .from('stores')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', store.storeId);

          results.push({
            platform: 'shopify',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        } catch (error) {
          errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.push({
            platform: 'shopify',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        }
      }
    }

    // =========== ETSY SYNC ===========
    if (platformsToSync.includes('etsy')) {
      const etsyStores = await getEtsyStoresFromDb(supabase);

      const storesToSync = brandCode && brandCode !== 'all'
        ? etsyStores.filter((s) => s.brandCode === brandCode)
        : etsyStores;

      for (const store of storesToSync) {
        const errors: string[] = [];
        let syncedCount = 0;

        try {
          const receipts = await fetchEtsyReceipts(
            store.apiKey,
            store.shopId,
            store.accessToken,
            start,
            end
          );

          for (const receipt of receipts) {
            const transformed = transformEtsyReceipt(receipt);

            const { error } = await supabase.from('orders').upsert(
              {
                store_id: store.storeId,
                brand_id: store.brandId,
                platform: 'etsy',
                platform_order_id: transformed.platform_order_id,
                order_number: transformed.order_number,
                order_date: transformed.order_date,
                customer_name: transformed.customer_name,
                customer_email: transformed.customer_email,
                shipping_address: transformed.shipping_address,
                subtotal: transformed.subtotal,
                shipping_charged: transformed.shipping_charged,
                tax: transformed.tax,
                total: transformed.total,
                currency: transformed.currency,
                status: transformed.status,
                fulfillment_status: transformed.fulfillment_status,
                line_items: transformed.line_items,
                raw_data: transformed.raw_data,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'platform,platform_order_id' }
            );

            if (error) {
              errors.push(`Receipt ${transformed.order_number}: ${error.message}`);
            } else {
              syncedCount++;
            }
          }

          await supabase
            .from('stores')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', store.storeId);

          results.push({
            platform: 'etsy',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        } catch (error) {
          errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.push({
            platform: 'etsy',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        }
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.recordsSynced, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `Order sync complete: ${totalSynced} orders synced across ${platformsToSync.join(' and ')}${totalErrors > 0 ? `, ${totalErrors} errors` : ''}. Click "Refresh P&L" to update the dashboard.`,
      results,
    });
  } catch (error) {
    console.error('Error syncing orders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        platforms: { shopify: { configured: 0 }, etsy: { configured: 0 } },
        error: 'Missing Supabase credentials',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [shopifyStores, etsyStores] = await Promise.all([
      getShopifyStoresFromDb(supabase),
      getEtsyStoresFromDb(supabase),
    ]);

    return NextResponse.json({
      platforms: {
        shopify: {
          configured: shopifyStores.length,
          stores: shopifyStores.map((s) => ({
            brand: s.brandCode,
            configured: true,
            domain: s.domain,
            lastSyncAt: s.lastSyncAt,
          })),
        },
        etsy: {
          configured: etsyStores.length,
          stores: etsyStores.map((s) => ({
            brand: s.brandCode,
            configured: true,
            shopId: s.shopId,
            lastSyncAt: s.lastSyncAt,
          })),
        },
      },
      usage: {
        method: 'POST',
        body: {
          startDate: '2025-01-01 (optional, defaults to 30 days ago)',
          endDate: '2025-01-24 (optional, defaults to today)',
          brandCode: 'DC | BI | all (optional, defaults to all)',
          platforms: "['shopify', 'etsy'] (optional, defaults to all platforms)",
        },
      },
      note: 'Credentials are loaded from database (connect stores via Valhalla Dashboard)',
    });
  } catch (error) {
    console.error('Error getting order sync status:', error);
    return NextResponse.json({
      platforms: { shopify: { configured: 0 }, etsy: { configured: 0 } },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
