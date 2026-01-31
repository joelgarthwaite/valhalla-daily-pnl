// P&L Calculation Engine
// Core functions for calculating P&L metrics

import type {
  Order,
  Shipment,
  AdSpend,
  B2BRevenue,
  DailyPnL,
  PnLSummary,
  PnLSummaryWithComparison,
  WaterfallDataPoint,
  ROASByChannel,
  AdPlatform,
  CostConfig,
} from '@/types';
import { format, startOfDay } from 'date-fns';

// ============================================
// Constants (Defaults)
// ============================================

export const DEFAULT_COGS_PERCENTAGE = 0.30; // 30% of revenue for 70% gross margin
export const DEFAULT_PICK_PACK_PERCENTAGE = 0.05; // 5% of revenue
export const DEFAULT_LOGISTICS_PERCENTAGE = 0.03; // 3% of revenue
export const SHOPIFY_FEE_PERCENTAGE = 0.029; // 2.9%
export const SHOPIFY_FEE_FIXED = 0.30; // £0.30 per transaction
export const ETSY_FEE_PERCENTAGE = 0.065; // ~6.5% (transaction + payment processing)

// Legacy alias
export const COGS_PERCENTAGE = DEFAULT_COGS_PERCENTAGE;

// ============================================
// Core Calculation Functions
// ============================================

/**
 * Calculate COGS as a blended percentage of revenue
 */
export function calculateCOGS(revenue: number, cogsPercentage = COGS_PERCENTAGE): number {
  return revenue * cogsPercentage;
}

/**
 * Calculate Shopify fees (2.9% + £0.30 per transaction)
 */
export function calculateShopifyFees(revenue: number, orderCount: number): number {
  const percentageFee = revenue * SHOPIFY_FEE_PERCENTAGE;
  const fixedFee = orderCount * SHOPIFY_FEE_FIXED;
  return percentageFee + fixedFee;
}

/**
 * Calculate Etsy fees (~6.5% of transaction)
 */
export function calculateEtsyFees(revenue: number): number {
  return revenue * ETSY_FEE_PERCENTAGE;
}

/**
 * Calculate ROAS (Return on Ad Spend)
 */
export function calculateROAS(revenue: number, adSpend: number): number {
  if (adSpend === 0) return 0;
  return revenue / adSpend;
}

/**
 * Calculate CPA (Cost Per Acquisition)
 */
export function calculateCPA(adSpend: number, conversions: number): number {
  if (conversions === 0) return 0;
  return adSpend / conversions;
}

/**
 * Calculate percentage change between two values
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Calculate margin percentage
 */
export function calculateMarginPct(profit: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (profit / revenue) * 100;
}

// ============================================
// Enhanced Profit Metrics (GP1, GP2, GP3)
// ============================================

/**
 * Calculate Pick & Pack cost as percentage of revenue
 */
export function calculatePickPackCost(revenue: number, pickPackPct = DEFAULT_PICK_PACK_PERCENTAGE): number {
  return revenue * pickPackPct;
}

/**
 * Calculate Logistics cost as percentage of revenue
 */
export function calculateLogisticsCost(revenue: number, logisticsPct = DEFAULT_LOGISTICS_PERCENTAGE): number {
  return revenue * logisticsPct;
}

/**
 * Calculate GP1 (Gross Profit 1): Revenue - COGS
 */
export function calculateGP1(revenue: number, cogs: number): number {
  return revenue - cogs;
}

/**
 * Calculate GP2 (Gross Profit 2): GP1 - Pick&Pack - Payment Fees - Logistics
 * @deprecated Use calculateGP2WithShipping for new calculations
 */
export function calculateGP2(
  gp1: number,
  pickPackCost: number,
  platformFees: number,
  logisticsCost: number
): number {
  return gp1 - pickPackCost - platformFees - logisticsCost;
}

/**
 * Calculate GP2 with shipping margin included
 * New formula: GP1 - Platform Fees + Shipping Margin
 * (Pick & Pack and Logistics are now part of COGS via manufacturing overhead)
 */
export function calculateGP2WithShipping(
  gp1: number,
  platformFees: number,
  shippingCharged: number,
  shippingCost: number
): number {
  const shippingMargin = shippingCharged - shippingCost;
  return gp1 - platformFees + shippingMargin;
}

/**
 * Calculate GP3 (Gross Profit 3): GP2 + IC Revenue - IC Expense - Ad Spend (True Profit)
 * IC amounts are now positioned between GP2 and Ad Spend per the updated waterfall
 */
export function calculateGP3(
  gp2: number,
  adSpend: number,
  icRevenue: number = 0,
  icExpense: number = 0
): number {
  return gp2 + icRevenue - icExpense - adSpend;
}

/**
 * Calculate POAS (Profit on Ad Spend): (GP3 / Ad Spend) * 100
 */
export function calculatePOAS(gp3: number, adSpend: number): number {
  if (adSpend === 0) return 0;
  return (gp3 / adSpend) * 100;
}

/**
 * Calculate CoP (Cost of Profit): Total Costs / GP3
 */
export function calculateCoP(totalCosts: number, gp3: number): number {
  if (gp3 === 0) return 0;
  return totalCosts / gp3;
}

/**
 * Calculate MER (Marketing Efficiency Ratio): Total Revenue / Total Ad Spend
 */
export function calculateMER(revenue: number, adSpend: number): number {
  if (adSpend === 0) return 0;
  return revenue / adSpend;
}

/**
 * Calculate Marketing Cost Ratio: (Ad Spend / Revenue) * 100
 */
export function calculateMarketingCostRatio(adSpend: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (adSpend / revenue) * 100;
}

/**
 * Calculate Gross AOV (Average Order Value): Total Revenue / Total Orders
 */
/**
 * Calculate Gross AOV: (Product Revenue + Shipping Charged) / Orders
 * This is the total amount customers paid per order
 */
export function calculateGrossAOV(
  revenue: number,
  shippingCharged: number,
  orders: number
): number {
  if (orders === 0) return 0;
  return (revenue + shippingCharged) / orders;
}

/**
 * Calculate Net AOV: (Product Revenue - Discounts) / Orders
 * This is the actual product value earned per order (excluding shipping, after discounts)
 */
export function calculateNetAOV(
  revenue: number,
  discounts: number,
  orders: number
): number {
  if (orders === 0) return 0;
  return (revenue - discounts) / orders;
}

/**
 * Extract refund data from order raw_data
 * Shopify: financial_status = 'refunded' or 'partially_refunded'
 * Etsy: Look for refund adjustments
 */
export function extractRefundFromOrder(order: Order): { amount: number; status: 'none' | 'partial' | 'full' } {
  // If refund fields are already populated
  if (order.refund_amount !== undefined && order.refund_amount > 0) {
    return {
      amount: order.refund_amount,
      status: order.refund_status || 'partial',
    };
  }

  // Try to extract from raw_data
  const rawData = order.raw_data;
  if (!rawData) {
    return { amount: 0, status: 'none' };
  }

  if (order.platform === 'shopify') {
    const financialStatus = (rawData as Record<string, unknown>).financial_status as string | undefined;
    const refundLines = (rawData as Record<string, unknown>).refunds as unknown[] | undefined;

    if (financialStatus === 'refunded') {
      return { amount: order.total, status: 'full' };
    }

    if (financialStatus === 'partially_refunded' && Array.isArray(refundLines)) {
      // Sum up refund amounts
      let totalRefund = 0;
      for (const refund of refundLines) {
        const refundObj = refund as Record<string, unknown>;
        const transactions = refundObj.transactions as Array<Record<string, unknown>> | undefined;
        if (transactions) {
          for (const t of transactions) {
            totalRefund += parseFloat(String(t.amount || 0));
          }
        }
      }
      return { amount: totalRefund, status: 'partial' };
    }
  }

  if (order.platform === 'etsy') {
    const adjustments = (rawData as Record<string, unknown>).adjustments as unknown[] | undefined;
    if (Array.isArray(adjustments) && adjustments.length > 0) {
      let totalRefund = 0;
      for (const adj of adjustments) {
        const adjObj = adj as Record<string, unknown>;
        if (adjObj.type === 'refund') {
          totalRefund += Math.abs(parseFloat(String(adjObj.amount || 0)));
        }
      }
      if (totalRefund > 0) {
        return {
          amount: totalRefund,
          status: totalRefund >= order.total ? 'full' : 'partial',
        };
      }
    }
  }

  return { amount: 0, status: 'none' };
}

// ============================================
// Daily P&L Calculation
// ============================================

interface DailyDataInput {
  orders: Order[];
  shipments: Shipment[];
  adSpend: AdSpend[];
  b2bRevenue: B2BRevenue[];
  brandId: string;
  date: string;
  costConfig?: CostConfig;
}

/**
 * Calculate daily P&L for a specific brand and date
 */
export function calculateDailyPnL(input: DailyDataInput): Omit<DailyPnL, 'id' | 'created_at' | 'updated_at'> {
  const { orders, shipments, adSpend, b2bRevenue, brandId, date, costConfig } = input;

  // Get cost percentages from config or use defaults
  const cogsPct = (costConfig?.cogs_pct ?? DEFAULT_COGS_PERCENTAGE * 100) / 100;
  const pickPackPct = (costConfig?.pick_pack_pct ?? DEFAULT_PICK_PACK_PERCENTAGE * 100) / 100;
  const logisticsPct = (costConfig?.logistics_pct ?? DEFAULT_LOGISTICS_PERCENTAGE * 100) / 100;

  // Filter orders by date
  const dayStart = startOfDay(new Date(date));
  const dayOrders = orders.filter((order) => {
    const orderDate = startOfDay(new Date(order.order_date));
    return orderDate.getTime() === dayStart.getTime();
  });

  // Separate orders by platform
  const shopifyOrders = dayOrders.filter((o) => o.platform === 'shopify');
  const etsyOrders = dayOrders.filter((o) => o.platform === 'etsy');

  // Calculate refunds
  let totalRefunds = 0;
  let refundCount = 0;
  for (const order of dayOrders) {
    const refund = extractRefundFromOrder(order);
    if (refund.amount > 0) {
      totalRefunds += refund.amount;
      refundCount++;
    }
  }

  // Calculate product revenue (SUBTOTAL - excludes shipping and tax)
  // This ensures apples-to-apples comparison across Shopify and Etsy
  // Shopify: subtotal_price = line items after discounts, excludes shipping/tax
  // Etsy: subtotal = total_price minus coupon discounts, excludes shipping/tax
  const shopifyRevenue = shopifyOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const etsyRevenue = etsyOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const b2bRevenueTotal = b2bRevenue
    .filter((b) => b.date === date)
    .reduce((sum, b) => sum + Number(b.subtotal || 0), 0);
  const totalRevenue = shopifyRevenue + etsyRevenue + b2bRevenueTotal;

  // Net revenue after refunds
  const netRevenue = totalRevenue - totalRefunds;

  // Calculate shipping
  const shippingCharged = dayOrders.reduce((sum, o) => sum + Number(o.shipping_charged || 0), 0);

  // Create map of ALL shipments by order_id (an order can have multiple shipments)
  const shipmentsByOrderId = new Map<string, Shipment[]>();
  shipments.forEach((s) => {
    if (s.order_id) {
      const existing = shipmentsByOrderId.get(s.order_id) || [];
      existing.push(s);
      shipmentsByOrderId.set(s.order_id, existing);
    }
  });

  // Sum ALL shipment costs for each order (including duties, split shipments, etc.)
  const shippingCost = dayOrders.reduce((sum, order) => {
    const orderShipments = shipmentsByOrderId.get(order.id) || [];
    const orderShippingCost = orderShipments.reduce((s, shipment) => s + Number(shipment.shipping_cost || 0), 0);
    return sum + orderShippingCost;
  }, 0);
  const shippingMargin = shippingCharged - shippingCost;

  // Calculate COGS based on net revenue
  const cogsEstimated = calculateCOGS(netRevenue, cogsPct);

  // Calculate operational costs
  const pickPackCost = calculatePickPackCost(netRevenue, pickPackPct);
  const logisticsCost = calculateLogisticsCost(netRevenue, logisticsPct);

  // Calculate ad spend by platform
  const dayAdSpend = adSpend.filter((a) => a.date === date);
  const metaSpend = dayAdSpend.filter((a) => a.platform === 'meta').reduce((sum, a) => sum + Number(a.spend || 0), 0);
  const googleSpend = dayAdSpend.filter((a) => a.platform === 'google').reduce((sum, a) => sum + Number(a.spend || 0), 0);
  const microsoftSpend = dayAdSpend.filter((a) => a.platform === 'microsoft').reduce((sum, a) => sum + Number(a.spend || 0), 0);
  const etsyAdsSpend = dayAdSpend.filter((a) => a.platform === 'etsy_ads').reduce((sum, a) => sum + Number(a.spend || 0), 0);
  const totalAdSpend = metaSpend + googleSpend + microsoftSpend + etsyAdsSpend;

  // Calculate platform fees
  const shopifyFees = calculateShopifyFees(shopifyRevenue, shopifyOrders.length);
  const etsyFees = calculateEtsyFees(etsyRevenue);
  const totalPlatformFees = shopifyFees + etsyFees;

  // Order counts
  const b2bOrderCount = b2bRevenue.filter((b) => b.date === date).length;
  const totalOrders = shopifyOrders.length + etsyOrders.length + b2bOrderCount;

  // Calculate GP1, GP2, GP3
  const gp1 = calculateGP1(netRevenue, cogsEstimated);
  const gp2 = calculateGP2(gp1, pickPackCost, totalPlatformFees, logisticsCost);
  const gp3 = calculateGP3(gp2, totalAdSpend);

  // Legacy gross/net profit (for backwards compatibility)
  const grossProfit = gp1;
  const grossMarginPct = calculateMarginPct(grossProfit, netRevenue);
  const netProfit = gp3; // GP3 is now the true net profit
  const netMarginPct = calculateMarginPct(netProfit, netRevenue);

  // Calculate enhanced metrics
  const grossAov = calculateGrossAOV(totalRevenue, shippingCharged, totalOrders);
  const netAov = calculateNetAOV(netRevenue, 0, totalOrders); // discounts = 0 for now
  const poas = calculatePOAS(gp3, totalAdSpend);
  const totalCosts = cogsEstimated + pickPackCost + logisticsCost + totalPlatformFees + totalAdSpend + shippingCost;
  const cop = calculateCoP(totalCosts, gp3);
  const mer = calculateMER(totalRevenue, totalAdSpend);
  const marketingCostRatio = calculateMarketingCostRatio(totalAdSpend, totalRevenue);

  return {
    brand_id: brandId,
    date,
    shopify_revenue: shopifyRevenue,
    etsy_revenue: etsyRevenue,
    b2b_revenue: b2bRevenueTotal,
    total_revenue: totalRevenue,
    total_refunds: totalRefunds,
    net_revenue: netRevenue,
    refund_count: refundCount,
    shipping_charged: shippingCharged,
    shipping_cost: shippingCost,
    shipping_margin: shippingMargin,
    cogs_estimated: cogsEstimated,
    pick_pack_cost: pickPackCost,
    logistics_cost: logisticsCost,
    meta_spend: metaSpend,
    google_spend: googleSpend,
    microsoft_spend: microsoftSpend,
    etsy_ads_spend: etsyAdsSpend,
    total_ad_spend: totalAdSpend,
    shopify_fees: shopifyFees,
    etsy_fees: etsyFees,
    total_platform_fees: totalPlatformFees,
    total_discounts: 0, // TODO: Calculate from promotions
    // Inter-Company (IC) - default to 0, set by refresh route
    ic_revenue: 0,
    ic_expense: 0,
    gp1,
    gp2,
    gp3,
    gross_profit: grossProfit,
    gross_margin_pct: grossMarginPct,
    net_profit: netProfit,
    net_margin_pct: netMarginPct,
    gross_aov: grossAov,
    net_aov: netAov,
    poas,
    cop,
    mer,
    marketing_cost_ratio: marketingCostRatio,
    shopify_orders: shopifyOrders.length,
    etsy_orders: etsyOrders.length,
    b2b_orders: b2bOrderCount,
    total_orders: totalOrders,
    last_calculated_at: new Date().toISOString(),
  };
}

// ============================================
// Summary Calculation
// ============================================

/**
 * Calculate P&L summary from daily data
 * @param dailyData - Array of daily P&L records
 * @param totalOpex - Optional total OPEX for the period
 * @param opexByCategory - Optional breakdown of OPEX by category
 */
export function calculatePnLSummary(
  dailyData: DailyPnL[],
  totalOpex: number = 0,
  opexByCategory: Record<string, number> = {}
): PnLSummary {
  // Revenue Breakdown
  // totalRevenue = product revenue only (subtotals, excludes shipping/tax)
  // This ensures apples-to-apples comparison across Shopify and Etsy
  const totalRevenue = dailyData.reduce((sum, d) => sum + Number(d.total_revenue || 0), 0);
  const shopifyRevenue = dailyData.reduce((sum, d) => sum + Number(d.shopify_revenue || 0), 0);
  const etsyRevenue = dailyData.reduce((sum, d) => sum + Number(d.etsy_revenue || 0), 0);
  const b2bRevenue = dailyData.reduce((sum, d) => sum + Number(d.b2b_revenue || 0), 0);

  // Shipping charged to customers (separate from product revenue)
  const shippingCharged = dailyData.reduce((sum, d) => sum + Number(d.shipping_charged || 0), 0);

  // Gross revenue = what customers actually paid (product + shipping, excluding tax)
  const grossRevenue = totalRevenue + shippingCharged;

  // Refunds - calculate netRevenue from totalRevenue - refunds (for backward compatibility)
  const totalRefunds = dailyData.reduce((sum, d) => sum + Number(d.total_refunds || 0), 0);
  const refundCount = dailyData.reduce((sum, d) => sum + Number(d.refund_count || 0), 0);
  // Use database net_revenue if available, otherwise calculate from totalRevenue - totalRefunds
  // Note: netRevenue could be negative if refunds exceed new sales for the period
  const dbNetRevenue = dailyData.reduce((sum, d) => sum + Number(d.net_revenue || 0), 0);
  const netRevenue = dbNetRevenue !== 0 ? dbNetRevenue : totalRevenue - totalRefunds;

  // Costs
  const cogs = dailyData.reduce((sum, d) => sum + Number(d.cogs_estimated || 0), 0);
  const shippingCost = dailyData.reduce((sum, d) => sum + Number(d.shipping_cost || 0), 0);
  const totalAdSpend = dailyData.reduce((sum, d) => sum + Number(d.total_ad_spend || 0), 0);
  const platformFees = dailyData.reduce((sum, d) => sum + Number(d.total_platform_fees || 0), 0);
  const totalDiscounts = dailyData.reduce((sum, d) => sum + Number(d.total_discounts || 0), 0);

  // Pick/Pack and Logistics costs - calculate from revenue if not in database
  // This ensures correct GP2/GP3 even if daily_pnl hasn't been refreshed with new columns
  const dbPickPackCost = dailyData.reduce((sum, d) => sum + Number(d.pick_pack_cost || 0), 0);
  const dbLogisticsCost = dailyData.reduce((sum, d) => sum + Number(d.logistics_cost || 0), 0);
  const pickPackCost = dbPickPackCost > 0 ? dbPickPackCost : calculatePickPackCost(netRevenue || totalRevenue);
  const logisticsCost = dbLogisticsCost > 0 ? dbLogisticsCost : calculateLogisticsCost(netRevenue || totalRevenue);

  // Inter-Company (IC) amounts
  const icRevenue = dailyData.reduce((sum, d) => sum + Number(d.ic_revenue || 0), 0);
  const icExpense = dailyData.reduce((sum, d) => sum + Number(d.ic_expense || 0), 0);

  // Gross Profit Tiers - calculate fallbacks if DB columns don't exist
  const dbGp1 = dailyData.reduce((sum, d) => sum + Number(d.gp1 || 0), 0);
  const dbGp2 = dailyData.reduce((sum, d) => sum + Number(d.gp2 || 0), 0);
  const dbGp3 = dailyData.reduce((sum, d) => sum + Number(d.gp3 || 0), 0);

  // Calculate GP tiers if not in database
  // Note: We use !== 0 instead of > 0 to correctly handle negative profit days
  // A zero sum with daily data indicates the columns exist but sum to zero (break-even)
  // which is different from no GP columns existing (old schema fallback)
  const gp1 = dbGp1 !== 0 ? dbGp1 : calculateGP1(netRevenue, cogs);
  const gp2 = dbGp2 !== 0 ? dbGp2 : calculateGP2(gp1, pickPackCost, platformFees, logisticsCost);
  const gp3 = dbGp3 !== 0 ? dbGp3 : calculateGP3(gp2, totalAdSpend, icRevenue, icExpense);

  // Legacy (backwards compatibility)
  const grossProfit = dailyData.reduce((sum, d) => sum + Number(d.gross_profit || 0), 0) || gp1;
  const shippingMargin = dailyData.reduce((sum, d) => sum + Number(d.shipping_margin || 0), 0);
  const netProfit = dailyData.reduce((sum, d) => sum + Number(d.net_profit || 0), 0) || gp3;

  // Orders
  const totalOrders = dailyData.reduce((sum, d) => sum + Number(d.total_orders || 0), 0);
  const shopifyOrders = dailyData.reduce((sum, d) => sum + Number(d.shopify_orders || 0), 0);
  const etsyOrders = dailyData.reduce((sum, d) => sum + Number(d.etsy_orders || 0), 0);
  const b2bOrders = dailyData.reduce((sum, d) => sum + Number(d.b2b_orders || 0), 0);

  // Calculate averaged AOV values (shippingCharged already calculated above)
  const grossAOV = calculateGrossAOV(totalRevenue, shippingCharged, totalOrders);
  const netAOV = calculateNetAOV(netRevenue, totalDiscounts, totalOrders);

  // Calculate totalized metrics
  const poas = calculatePOAS(gp3, totalAdSpend);
  const totalCosts = cogs + pickPackCost + logisticsCost + platformFees + totalAdSpend + shippingCost;
  const cop = calculateCoP(totalCosts, gp3);
  const mer = calculateMER(totalRevenue, totalAdSpend);
  const marketingCostRatio = calculateMarketingCostRatio(totalAdSpend, totalRevenue);

  // Calculate True Net Profit (GP3 - OPEX)
  const trueNetProfit = gp3 - totalOpex;
  const trueNetMarginPct = calculateMarginPct(trueNetProfit, netRevenue || totalRevenue);

  return {
    // Revenue breakdown
    totalRevenue,      // Product revenue (subtotals only)
    shopifyRevenue,
    etsyRevenue,
    b2bRevenue,
    shippingCharged,   // Shipping charged to customers
    grossRevenue,      // Total customer paid (product + shipping)
    // Refunds
    totalRefunds,
    netRevenue,        // Product revenue after refunds
    refundCount,
    // Costs
    cogs,
    shippingCost,
    pickPackCost,
    logisticsCost,
    totalAdSpend,
    platformFees,
    totalDiscounts,
    // Inter-Company (IC)
    icRevenue,         // Services provided TO sister company
    icExpense,         // Services received FROM sister company
    // Profit tiers
    gp1,
    gp2,
    gp3,
    // Operating Expenses (OPEX)
    totalOpex,
    opexByCategory,
    // True Net Profit (GP3 - OPEX)
    trueNetProfit,
    trueNetMarginPct,
    // Legacy/derived (netProfit now equals trueNetProfit for backwards compatibility)
    grossProfit,
    grossMarginPct: calculateMarginPct(grossProfit, netRevenue || totalRevenue),
    shippingMargin,
    netProfit: trueNetProfit,  // Updated to be true net profit
    netMarginPct: trueNetMarginPct,
    // Orders
    totalOrders,
    shopifyOrders,
    etsyOrders,
    b2bOrders,
    grossAOV,
    netAOV,
    // Efficiency metrics
    blendedRoas: calculateROAS(totalRevenue, totalAdSpend),
    poas,
    cop,
    mer,
    marketingCostRatio,
  };
}

/**
 * Calculate P&L summary with YoY or period comparison
 * @param currentData - Current period daily P&L data
 * @param previousData - Previous period daily P&L data (for comparison)
 * @param totalOpex - Total OPEX for the current period
 * @param opexByCategory - OPEX breakdown by category
 */
export function calculatePnLSummaryWithComparison(
  currentData: DailyPnL[],
  previousData: DailyPnL[],
  totalOpex: number = 0,
  opexByCategory: Record<string, number> = {}
): PnLSummaryWithComparison {
  const current = calculatePnLSummary(currentData, totalOpex, opexByCategory);
  const previous = calculatePnLSummary(previousData); // Previous period doesn't have OPEX comparison yet

  return {
    ...current,
    previous,
    changes: {
      totalRevenue: calculateChange(current.totalRevenue, previous.totalRevenue),
      grossProfit: calculateChange(current.grossProfit, previous.grossProfit),
      netProfit: calculateChange(current.netProfit, previous.netProfit),
      totalOrders: calculateChange(current.totalOrders, previous.totalOrders),
      grossMarginPct: current.grossMarginPct - previous.grossMarginPct,
      netMarginPct: current.netMarginPct - previous.netMarginPct,
      gp1: calculateChange(current.gp1, previous.gp1),
      gp2: calculateChange(current.gp2, previous.gp2),
      gp3: calculateChange(current.gp3, previous.gp3),
      poas: current.poas - previous.poas, // Points difference
      mer: calculateChange(current.mer, previous.mer),
    },
  };
}

// ============================================
// Waterfall Chart Data
// ============================================

/**
 * Generate waterfall chart data from P&L summary
 * Shows: Product Revenue → Refunds → Net Revenue → COGS → GP1 → Ops → GP2 → IC → Ads → GP3 → OPEX → True Net
 * Note: Product Revenue = subtotals only (excludes shipping charged to customers)
 * Shipping margin is tracked separately and not included in this P&L flow
 * IC (Inter-Company) amounts appear between GP2 and Ad Spend
 */
export function generateWaterfallData(summary: PnLSummary): WaterfallDataPoint[] {
  const data: WaterfallDataPoint[] = [
    { name: 'Product Revenue', value: summary.totalRevenue, isTotal: true },
    { name: 'Refunds', value: -summary.totalRefunds, isSubtraction: true },
    { name: 'Net Revenue', value: summary.netRevenue || (summary.totalRevenue - summary.totalRefunds), isTotal: true },
    { name: 'COGS (30%)', value: -summary.cogs, isSubtraction: true },
    { name: 'GP1', value: summary.gp1, isTotal: true },
    { name: 'Pick & Pack', value: -summary.pickPackCost, isSubtraction: true },
    { name: 'Platform Fees', value: -summary.platformFees, isSubtraction: true },
    { name: 'Logistics', value: -summary.logisticsCost, isSubtraction: true },
    { name: 'GP2', value: summary.gp2, isTotal: true },
  ];

  // Add IC amounts if they exist (after GP2, before Ad Spend)
  if (summary.icRevenue > 0) {
    data.push({ name: 'IC Revenue', value: summary.icRevenue, isSubtraction: false });
  }
  if (summary.icExpense > 0) {
    data.push({ name: 'IC Expense', value: -summary.icExpense, isSubtraction: true });
  }

  data.push(
    { name: 'Ad Spend', value: -summary.totalAdSpend, isSubtraction: true },
    { name: 'GP3 (Contribution)', value: summary.gp3, isTotal: true },
  );

  // Add OPEX and True Net Profit if OPEX exists
  if (summary.totalOpex > 0) {
    data.push(
      { name: 'OPEX', value: -summary.totalOpex, isSubtraction: true },
      { name: 'True Net Profit', value: summary.trueNetProfit, isTotal: true }
    );
  }

  return data;
}

// ============================================
// ROAS by Channel
// ============================================

const PLATFORM_NAMES: Record<AdPlatform, string> = {
  meta: 'Meta (Facebook/Instagram)',
  google: 'Google Ads',
  microsoft: 'Microsoft (Bing)',
  etsy_ads: 'Etsy Ads',
};

/**
 * Calculate ROAS breakdown by ad channel
 */
export function calculateROASByChannel(adSpend: AdSpend[], totalRevenue?: number): ROASByChannel[] {
  const platforms: AdPlatform[] = ['meta', 'google', 'microsoft', 'etsy_ads'];
  const totalSpend = adSpend.reduce((sum, a) => sum + Number(a.spend || 0), 0);

  return platforms.map((platform) => {
    const platformSpend = adSpend.filter((a) => a.platform === platform);
    const spend = platformSpend.reduce((sum, a) => sum + Number(a.spend || 0), 0);
    const revenueAttributed = platformSpend.reduce((sum, a) => sum + Number(a.revenue_attributed || 0), 0);

    // Calculate channel's contribution to total revenue (for MER)
    const channelRevenueContribution = totalRevenue && totalSpend > 0
      ? (spend / totalSpend) * totalRevenue
      : revenueAttributed;

    return {
      platform,
      platformName: PLATFORM_NAMES[platform],
      spend,
      revenueAttributed,
      roas: calculateROAS(revenueAttributed, spend),
      mer: calculateMER(channelRevenueContribution, spend),
    };
  }).filter((r) => r.spend > 0); // Only include channels with spend
}

// ============================================
// Trend Data
// ============================================

/**
 * Format daily P&L data for trend charts
 */
export function formatTrendData(
  currentData: DailyPnL[],
  previousYearData?: DailyPnL[]
) {
  // Create map of previous year data by month-day
  const previousByMonthDay = new Map<string, DailyPnL>();
  if (previousYearData) {
    previousYearData.forEach((d) => {
      const monthDay = format(new Date(d.date), 'MM-dd');
      previousByMonthDay.set(monthDay, d);
    });
  }

  return currentData.map((d) => {
    const monthDay = format(new Date(d.date), 'MM-dd');
    const previousYear = previousByMonthDay.get(monthDay);

    return {
      date: d.date,
      totalRevenue: d.total_revenue,
      grossProfit: d.gross_profit,
      netProfit: d.net_profit,
      totalOrders: d.total_orders,
      previousYearRevenue: previousYear?.total_revenue,
      previousYearGrossProfit: previousYear?.gross_profit,
      previousYearNetProfit: previousYear?.net_profit,
    };
  });
}
