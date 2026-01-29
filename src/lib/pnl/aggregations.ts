// P&L Time Period Aggregations
// Functions for rolling up daily data to weekly, monthly, quarterly, yearly

import type { DailyPnL, PeriodType, DateRange } from '@/types';
import {
  format,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  getQuarter,
  getYear,
  getWeek,
  getMonth,
  subYears,
  isWithinInterval,
} from 'date-fns';

// ============================================
// Aggregation Types
// ============================================

export interface AggregatedPnL {
  period: string; // e.g., "2024-W01", "2024-01", "2024-Q1", "2024"
  periodLabel: string; // e.g., "Week 1, 2024", "January 2024", "Q1 2024", "2024"
  startDate: string;
  endDate: string;
  dayCount: number;

  // Revenue
  totalRevenue: number;
  shopifyRevenue: number;
  etsyRevenue: number;
  b2bRevenue: number;

  // Costs
  cogsEstimated: number;
  shippingCost: number;
  totalAdSpend: number;
  totalPlatformFees: number;
  totalDiscounts: number;

  // Margins
  grossProfit: number;
  grossMarginPct: number;
  shippingMargin: number;
  netProfit: number;
  netMarginPct: number;

  // Orders
  totalOrders: number;
  shopifyOrders: number;
  etsyOrders: number;
  b2bOrders: number;
  avgOrderValue: number;
  avgDailyRevenue: number;
  avgDailyOrders: number;
}

// Extended type with YoY comparison data
export interface AggregatedPnLWithYoY extends AggregatedPnL {
  // Period key for matching (e.g., "W05" for weeks, "01" for months)
  periodKey: string;

  // Previous year values
  yoyTotalRevenue?: number;
  yoyShopifyRevenue?: number;
  yoyEtsyRevenue?: number;
  yoyB2bRevenue?: number;
  yoyTotalOrders?: number;
  yoyTotalAdSpend?: number;
  yoyNetProfit?: number;

  // Percentage changes
  revenueChangePercent?: number;
  ordersChangePercent?: number;
  adSpendChangePercent?: number;
  profitChangePercent?: number;
}

// ============================================
// Period Helpers
// ============================================

export function getPeriodStart(date: Date, periodType: PeriodType): Date {
  switch (periodType) {
    case 'weekly':
      return startOfWeek(date, { weekStartsOn: 1 }); // Monday start
    case 'monthly':
      return startOfMonth(date);
    case 'quarterly':
      return startOfQuarter(date);
    case 'yearly':
      return startOfYear(date);
    default:
      return date;
  }
}

export function getPeriodEnd(date: Date, periodType: PeriodType): Date {
  switch (periodType) {
    case 'weekly':
      return endOfWeek(date, { weekStartsOn: 1 });
    case 'monthly':
      return endOfMonth(date);
    case 'quarterly':
      return endOfQuarter(date);
    case 'yearly':
      return endOfYear(date);
    default:
      return date;
  }
}

export function getPeriodKey(date: Date, periodType: PeriodType): string {
  switch (periodType) {
    case 'weekly':
      return format(date, "yyyy-'W'ww");
    case 'monthly':
      return format(date, 'yyyy-MM');
    case 'quarterly':
      return `${getYear(date)}-Q${getQuarter(date)}`;
    case 'yearly':
      return format(date, 'yyyy');
    default:
      return format(date, 'yyyy-MM-dd');
  }
}

export function getPeriodLabel(date: Date, periodType: PeriodType): string {
  switch (periodType) {
    case 'weekly':
      return `Week ${format(date, 'w')}, ${format(date, 'yyyy')}`;
    case 'monthly':
      return format(date, 'MMMM yyyy');
    case 'quarterly':
      return `Q${getQuarter(date)} ${format(date, 'yyyy')}`;
    case 'yearly':
      return format(date, 'yyyy');
    default:
      return format(date, 'MMM d, yyyy');
  }
}

// ============================================
// Aggregation Functions
// ============================================

/**
 * Aggregate daily P&L data into specified period buckets
 */
export function aggregatePnLByPeriod(
  dailyData: DailyPnL[],
  periodType: PeriodType
): AggregatedPnL[] {
  // Filter out entries with invalid dates
  const validData = dailyData.filter((d) => {
    if (!d.date) return false;
    const date = new Date(d.date);
    return !isNaN(date.getTime());
  });

  if (periodType === 'daily') {
    // Return daily data as-is
    return validData.map((d) => {
      const date = new Date(d.date);
      return {
        period: d.date,
        periodLabel: format(date, 'MMM d, yyyy'),
        startDate: d.date,
        endDate: d.date,
        dayCount: 1,
        totalRevenue: d.total_revenue,
        shopifyRevenue: d.shopify_revenue,
        etsyRevenue: d.etsy_revenue,
        b2bRevenue: d.b2b_revenue,
        cogsEstimated: d.cogs_estimated,
        shippingCost: d.shipping_cost,
        totalAdSpend: d.total_ad_spend,
        totalPlatformFees: d.total_platform_fees,
        totalDiscounts: d.total_discounts,
        grossProfit: d.gross_profit,
        grossMarginPct: d.gross_margin_pct,
        shippingMargin: d.shipping_margin,
        netProfit: d.net_profit,
        netMarginPct: d.net_margin_pct,
        totalOrders: d.total_orders,
        shopifyOrders: d.shopify_orders,
        etsyOrders: d.etsy_orders,
        b2bOrders: d.b2b_orders,
        avgOrderValue: d.total_orders > 0 ? d.total_revenue / d.total_orders : 0,
        avgDailyRevenue: d.total_revenue,
        avgDailyOrders: d.total_orders,
      };
    });
  }

  // Group daily data by period
  const periodMap = new Map<string, DailyPnL[]>();

  validData.forEach((d) => {
    const date = new Date(d.date);
    const periodKey = getPeriodKey(date, periodType);

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, []);
    }
    periodMap.get(periodKey)!.push(d);
  });

  // Aggregate each period
  const aggregated: AggregatedPnL[] = [];

  periodMap.forEach((periodData, periodKey) => {
    if (periodData.length === 0) return;

    const dates = periodData.map((d) => new Date(d.date)).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const totalRevenue = periodData.reduce((sum, d) => sum + d.total_revenue, 0);
    const shopifyRevenue = periodData.reduce((sum, d) => sum + d.shopify_revenue, 0);
    const etsyRevenue = periodData.reduce((sum, d) => sum + d.etsy_revenue, 0);
    const b2bRevenue = periodData.reduce((sum, d) => sum + d.b2b_revenue, 0);
    const cogsEstimated = periodData.reduce((sum, d) => sum + d.cogs_estimated, 0);
    const shippingCost = periodData.reduce((sum, d) => sum + d.shipping_cost, 0);
    const totalAdSpend = periodData.reduce((sum, d) => sum + d.total_ad_spend, 0);
    const totalPlatformFees = periodData.reduce((sum, d) => sum + d.total_platform_fees, 0);
    const totalDiscounts = periodData.reduce((sum, d) => sum + d.total_discounts, 0);
    const grossProfit = periodData.reduce((sum, d) => sum + d.gross_profit, 0);
    const shippingMargin = periodData.reduce((sum, d) => sum + d.shipping_margin, 0);
    const netProfit = periodData.reduce((sum, d) => sum + d.net_profit, 0);
    const totalOrders = periodData.reduce((sum, d) => sum + d.total_orders, 0);
    const shopifyOrders = periodData.reduce((sum, d) => sum + d.shopify_orders, 0);
    const etsyOrders = periodData.reduce((sum, d) => sum + d.etsy_orders, 0);
    const b2bOrders = periodData.reduce((sum, d) => sum + d.b2b_orders, 0);
    const dayCount = periodData.length;

    aggregated.push({
      period: periodKey,
      periodLabel: getPeriodLabel(firstDate, periodType),
      startDate: format(firstDate, 'yyyy-MM-dd'),
      endDate: format(lastDate, 'yyyy-MM-dd'),
      dayCount,
      totalRevenue,
      shopifyRevenue,
      etsyRevenue,
      b2bRevenue,
      cogsEstimated,
      shippingCost,
      totalAdSpend,
      totalPlatformFees,
      totalDiscounts,
      grossProfit,
      grossMarginPct: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      shippingMargin,
      netProfit,
      netMarginPct: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      totalOrders,
      shopifyOrders,
      etsyOrders,
      b2bOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      avgDailyRevenue: totalRevenue / dayCount,
      avgDailyOrders: totalOrders / dayCount,
    });
  });

  // Sort by period
  return aggregated.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Get date range for YoY comparison
 */
export function getYoYDateRange(dateRange: DateRange): DateRange {
  return {
    from: subYears(dateRange.from, 1),
    to: subYears(dateRange.to, 1),
  };
}

/**
 * Generate all periods within a date range
 */
export function generatePeriods(dateRange: DateRange, periodType: PeriodType): Date[] {
  const interval = { start: dateRange.from, end: dateRange.to };

  switch (periodType) {
    case 'daily':
      return eachDayOfInterval(interval);
    case 'weekly':
      return eachWeekOfInterval(interval, { weekStartsOn: 1 });
    case 'monthly':
      return eachMonthOfInterval(interval);
    case 'quarterly':
      return eachQuarterOfInterval(interval);
    case 'yearly':
      // Not directly supported by date-fns, implement manually
      const years: Date[] = [];
      let current = startOfYear(dateRange.from);
      while (current <= dateRange.to) {
        years.push(current);
        current = startOfYear(new Date(current.getFullYear() + 1, 0, 1));
      }
      return years;
    default:
      return eachDayOfInterval(interval);
  }
}

/**
 * Filter daily data to a specific date range
 */
export function filterByDateRange(
  dailyData: DailyPnL[],
  dateRange: DateRange
): DailyPnL[] {
  return dailyData.filter((d) => {
    const date = new Date(d.date);
    return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
  });
}

/**
 * Get cumulative totals for running chart
 */
export function getCumulativeTotals(
  aggregatedData: AggregatedPnL[]
): (AggregatedPnL & { cumulativeRevenue: number; cumulativeOrders: number })[] {
  let cumulativeRevenue = 0;
  let cumulativeOrders = 0;

  return aggregatedData.map((d) => {
    cumulativeRevenue += d.totalRevenue;
    cumulativeOrders += d.totalOrders;
    return {
      ...d,
      cumulativeRevenue,
      cumulativeOrders,
    };
  });
}

/**
 * Extract period key for YoY matching (e.g., "W05" for weeks, "01" for months)
 * This allows matching W5 2026 with W5 2025
 */
export function extractPeriodKey(period: string, periodType: PeriodType): string {
  switch (periodType) {
    case 'weekly':
      // "2025-W05" -> "W05"
      return period.split('-')[1] || period;
    case 'monthly':
      // "2025-01" -> "01"
      return period.split('-')[1] || period;
    case 'quarterly':
      // "2025-Q1" -> "Q1"
      return period.split('-')[1] || period;
    case 'yearly':
      // For yearly, we don't do YoY comparison (no equivalent period)
      return period;
    case 'daily':
    default:
      // "2025-01-15" -> "01-15" (month-day)
      const parts = period.split('-');
      return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : period;
  }
}

/**
 * Align current and YoY periods for comparison
 * Maps current period data with previous year data by period key
 */
export function alignYoYPeriods(
  currentData: AggregatedPnL[],
  yoyData: AggregatedPnL[],
  periodType: PeriodType
): AggregatedPnLWithYoY[] {
  // Create a map of YoY data by period key for fast lookup
  const yoyMap = new Map<string, AggregatedPnL>();
  yoyData.forEach((d) => {
    const key = extractPeriodKey(d.period, periodType);
    yoyMap.set(key, d);
  });

  // Map current data with YoY comparisons
  return currentData.map((current) => {
    const periodKey = extractPeriodKey(current.period, periodType);
    const yoy = yoyMap.get(periodKey);

    // Calculate percentage changes
    const calcChange = (currentVal: number, yoyVal: number | undefined): number | undefined => {
      if (yoyVal === undefined || yoyVal === 0) return undefined;
      return ((currentVal - yoyVal) / yoyVal) * 100;
    };

    return {
      ...current,
      periodKey,
      // Previous year values
      yoyTotalRevenue: yoy?.totalRevenue,
      yoyShopifyRevenue: yoy?.shopifyRevenue,
      yoyEtsyRevenue: yoy?.etsyRevenue,
      yoyB2bRevenue: yoy?.b2bRevenue,
      yoyTotalOrders: yoy?.totalOrders,
      yoyTotalAdSpend: yoy?.totalAdSpend,
      yoyNetProfit: yoy?.netProfit,
      // Percentage changes
      revenueChangePercent: calcChange(current.totalRevenue, yoy?.totalRevenue),
      ordersChangePercent: calcChange(current.totalOrders, yoy?.totalOrders),
      adSpendChangePercent: calcChange(current.totalAdSpend, yoy?.totalAdSpend),
      profitChangePercent: calcChange(current.netProfit, yoy?.netProfit),
    };
  });
}

/**
 * Get the year from an aggregated period
 */
export function getYearFromPeriod(period: string): number {
  // All period formats start with the year: "2025-W05", "2025-01", "2025-Q1", "2025"
  return parseInt(period.split('-')[0], 10);
}
