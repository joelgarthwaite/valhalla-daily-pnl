import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

// Allow up to 60 seconds for P&L refresh (max for Hobby plan)
export const maxDuration = 60;

// Default cost percentages
const DEFAULT_COGS_RATE = 0.30; // 30% COGS for 70% gross margin
const DEFAULT_PICK_PACK_RATE = 0.05; // 5% pick & pack
const DEFAULT_LOGISTICS_RATE = 0.03; // 3% logistics
const SHOPIFY_FEE_RATE = 0.029; // 2.9%
const SHOPIFY_FEE_FIXED = 0.30; // £0.30 per transaction
const ETSY_FEE_RATE = 0.065; // ~6.5% total Etsy fees

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
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('order_date, platform, subtotal, shipping_charged, total, raw_data')
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

        if (order.platform === 'shopify') {
          day.shopify_revenue += revenue;
          day.shopify_orders += 1;
        } else if (order.platform === 'etsy') {
          day.etsy_revenue += revenue;
          day.etsy_orders += 1;
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

      // Build records for batch upsert
      const baseRecords: Record<string, unknown>[] = [];
      const extendedRecords: Record<string, unknown>[] = [];

      for (const [date, data] of dailyDataMap) {
        const totalRevenue = data.shopify_revenue + data.etsy_revenue + data.b2b_revenue;
        const netRevenue = totalRevenue - data.total_refunds;
        const totalAdSpend = data.meta_spend + data.google_spend + data.microsoft_spend + data.etsy_ads_spend;
        const totalOrders = data.shopify_orders + data.etsy_orders + data.b2b_orders;

        // Calculate COGS based on net revenue (after refunds)
        const cogsEstimated = netRevenue * cogsRate;

        // Calculate operational costs
        const pickPackCost = netRevenue * pickPackRate;
        const logisticsCost = netRevenue * logisticsRate;

        // Calculate platform fees
        const shopifyFees = (data.shopify_revenue * SHOPIFY_FEE_RATE) + (data.shopify_orders * SHOPIFY_FEE_FIXED);
        const etsyFees = data.etsy_revenue * ETSY_FEE_RATE;
        const totalPlatformFees = shopifyFees + etsyFees;

        // Calculate GP1, GP2, GP3
        const gp1 = calculateGP1(netRevenue, cogsEstimated);
        const gp2 = calculateGP2(gp1, pickPackCost, totalPlatformFees, logisticsCost);
        const gp3 = calculateGP3(gp2, totalAdSpend);

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

        // Extended record (with migration 003 fields)
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
        };

        baseRecords.push(baseRecord);
        extendedRecords.push(extendedRecord);
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

    return NextResponse.json({
      success: true,
      message: `P&L data refreshed for ${fromDate} to ${toDate}`,
      recordsProcessed: totalRecordsProcessed,
      dateRange: { from: fromDate, to: toDate },
    });

  } catch (error) {
    console.error('Error refreshing P&L data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
