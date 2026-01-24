/**
 * Revenue Reconciliation Utilities
 *
 * Compare system revenue data against spreadsheet to identify discrepancies.
 * All revenue values should be NET of shipping (product subtotals only)
 * to ensure apples-to-apples comparison.
 */

import { format, setWeek, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import type {
  ReconciliationRow,
  ReconciliationRevenueBreakdown,
} from '@/types';

// ============================================
// Expected 2025 Data (from CSV spreadsheet)
// All values are NET of shipping
// ============================================

export interface ExpectedWeeklyData {
  week: number;
  shopify: number;
  etsy: number;
  b2b: number;
}

// 2025 Expected Revenue from CSV Spreadsheet
// These values are product revenue only (excluding shipping)
export const EXPECTED_2025_DATA: ExpectedWeeklyData[] = [
  { week: 1, shopify: 3478, etsy: 1245, b2b: 0 },
  { week: 2, shopify: 3892, etsy: 1156, b2b: 0 },
  { week: 3, shopify: 4123, etsy: 987, b2b: 0 },
  { week: 4, shopify: 3756, etsy: 1078, b2b: 0 },
  { week: 5, shopify: 4289, etsy: 1234, b2b: 0 },
  { week: 6, shopify: 3945, etsy: 1089, b2b: 0 },
  { week: 7, shopify: 4567, etsy: 1178, b2b: 0 },
  { week: 8, shopify: 4234, etsy: 1067, b2b: 0 },
  { week: 9, shopify: 3890, etsy: 1145, b2b: 0 },
  { week: 10, shopify: 4456, etsy: 1256, b2b: 0 },
  { week: 11, shopify: 4123, etsy: 1034, b2b: 0 },
  { week: 12, shopify: 4678, etsy: 1189, b2b: 0 },
  { week: 13, shopify: 4345, etsy: 1278, b2b: 0 },
  { week: 14, shopify: 4012, etsy: 1156, b2b: 0 },
  { week: 15, shopify: 4567, etsy: 1089, b2b: 630 },
  { week: 16, shopify: 4890, etsy: 1234, b2b: 1614 },
  { week: 17, shopify: 4234, etsy: 1067, b2b: 0 },
  { week: 18, shopify: 4678, etsy: 1178, b2b: 0 },
  { week: 19, shopify: 4012, etsy: 1089, b2b: 0 },
  { week: 20, shopify: 4456, etsy: 1156, b2b: 0 },
  { week: 21, shopify: 4789, etsy: 1234, b2b: 0 },
  { week: 22, shopify: 4345, etsy: 1067, b2b: 0 },
  { week: 23, shopify: 4123, etsy: 1145, b2b: 0 },
  { week: 24, shopify: 4567, etsy: 1189, b2b: 0 },
  { week: 25, shopify: 4890, etsy: 1278, b2b: 0 },
  { week: 26, shopify: 4234, etsy: 1034, b2b: 0 },
  { week: 27, shopify: 4678, etsy: 1156, b2b: 0 },
  { week: 28, shopify: 4012, etsy: 1089, b2b: 0 },
  { week: 29, shopify: 4456, etsy: 1234, b2b: 0 },
  { week: 30, shopify: 4789, etsy: 1067, b2b: 0 },
  { week: 31, shopify: 4345, etsy: 1178, b2b: 0 },
  { week: 32, shopify: 4123, etsy: 1145, b2b: 1694 },
  { week: 33, shopify: 4567, etsy: 1089, b2b: 0 },
  { week: 34, shopify: 4890, etsy: 1234, b2b: 0 },
  { week: 35, shopify: 4234, etsy: 1067, b2b: 1664 },
  { week: 36, shopify: 4678, etsy: 1156, b2b: 0 },
  { week: 37, shopify: 4012, etsy: 1089, b2b: 0 },
  { week: 38, shopify: 4456, etsy: 1234, b2b: 0 },
  { week: 39, shopify: 4789, etsy: 1178, b2b: 0 },
  { week: 40, shopify: 4345, etsy: 1067, b2b: 0 },
  { week: 41, shopify: 4123, etsy: 1145, b2b: 1497 },
  { week: 42, shopify: 4567, etsy: 1089, b2b: 377 },
  { week: 43, shopify: 4890, etsy: 1234, b2b: 0 },
  { week: 44, shopify: 4234, etsy: 1067, b2b: 0 },
  { week: 45, shopify: 4678, etsy: 1178, b2b: 0 },
  { week: 46, shopify: 4012, etsy: 1089, b2b: 194 },
  { week: 47, shopify: 4456, etsy: 1156, b2b: 0 },
  { week: 48, shopify: 5234, etsy: 1345, b2b: 0 },
  { week: 49, shopify: 5678, etsy: 1456, b2b: 0 },
  { week: 50, shopify: 6234, etsy: 1567, b2b: 2275 },
  { week: 51, shopify: 5890, etsy: 1478, b2b: 956 },
  { week: 52, shopify: 4567, etsy: 1234, b2b: 0 },
];

// Note: The above data is PLACEHOLDER data
// Replace with actual CSV data when available

// ============================================
// Helper Functions
// ============================================

/**
 * Get the Monday of a specific ISO week
 */
export function getWeekMonday(year: number, week: number): Date {
  const baseDate = new Date(year, 0, 10);
  const weekDate = setWeek(baseDate, week, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  return startOfWeek(weekDate, { weekStartsOn: 1 });
}

/**
 * Get the Sunday of a specific ISO week
 */
export function getWeekSunday(year: number, week: number): Date {
  const baseDate = new Date(year, 0, 10);
  const weekDate = setWeek(baseDate, week, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  return endOfWeek(weekDate, { weekStartsOn: 1 });
}

/**
 * Format week label: "Week 1 (2025)"
 */
export function formatWeekLabel(year: number, week: number): string {
  return `Week ${week} (${year})`;
}

/**
 * Calculate variance between expected and actual
 */
function calculateVariance(expected: number, actual: number): number {
  return actual - expected;
}

/**
 * Calculate variance percentage
 * Returns percentage as a number (e.g., 5.5 for 5.5%)
 */
function calculateVariancePct(expected: number, actual: number): number {
  if (expected === 0) {
    return actual === 0 ? 0 : 100;
  }
  return ((actual - expected) / expected) * 100;
}

/**
 * Check if variance is significant (> threshold %)
 */
export function isSignificantVariance(
  expected: number,
  actual: number,
  threshold: number = 5
): boolean {
  const pct = Math.abs(calculateVariancePct(expected, actual));
  return pct > threshold;
}

// ============================================
// Reconciliation Logic
// ============================================

export interface ActualWeeklyData {
  week: number;
  year: number;
  shopify: number;
  etsy: number;
  b2b: number;
}

/**
 * Build reconciliation report comparing expected vs actual data
 */
export function buildReconciliationReport(
  year: number,
  expectedData: ExpectedWeeklyData[],
  actualData: ActualWeeklyData[],
  discrepancyThreshold: number = 5
): ReconciliationRow[] {
  const actualMap = new Map(
    actualData.map((d) => [d.week, d])
  );

  return expectedData.map((expected) => {
    const actual = actualMap.get(expected.week) || {
      week: expected.week,
      year,
      shopify: 0,
      etsy: 0,
      b2b: 0,
    };

    const expectedTotal = expected.shopify + expected.etsy + expected.b2b;
    const actualTotal = actual.shopify + actual.etsy + actual.b2b;

    const expectedBreakdown: ReconciliationRevenueBreakdown = {
      shopify: expected.shopify,
      etsy: expected.etsy,
      b2b: expected.b2b,
      total: expectedTotal,
    };

    const actualBreakdown: ReconciliationRevenueBreakdown = {
      shopify: actual.shopify,
      etsy: actual.etsy,
      b2b: actual.b2b,
      total: actualTotal,
    };

    const varianceBreakdown: ReconciliationRevenueBreakdown = {
      shopify: calculateVariance(expected.shopify, actual.shopify),
      etsy: calculateVariance(expected.etsy, actual.etsy),
      b2b: calculateVariance(expected.b2b, actual.b2b),
      total: calculateVariance(expectedTotal, actualTotal),
    };

    const variancePctBreakdown: ReconciliationRevenueBreakdown = {
      shopify: calculateVariancePct(expected.shopify, actual.shopify),
      etsy: calculateVariancePct(expected.etsy, actual.etsy),
      b2b: calculateVariancePct(expected.b2b, actual.b2b),
      total: calculateVariancePct(expectedTotal, actualTotal),
    };

    // Check if any channel has significant variance
    const hasDiscrepancy =
      isSignificantVariance(expected.shopify, actual.shopify, discrepancyThreshold) ||
      isSignificantVariance(expected.etsy, actual.etsy, discrepancyThreshold) ||
      isSignificantVariance(expected.b2b, actual.b2b, discrepancyThreshold) ||
      isSignificantVariance(expectedTotal, actualTotal, discrepancyThreshold);

    const monday = getWeekMonday(year, expected.week);
    const sunday = getWeekSunday(year, expected.week);

    return {
      week: formatWeekLabel(year, expected.week),
      weekNumber: expected.week,
      year,
      startDate: format(monday, 'yyyy-MM-dd'),
      endDate: format(sunday, 'yyyy-MM-dd'),
      expected: expectedBreakdown,
      actual: actualBreakdown,
      variance: varianceBreakdown,
      variancePct: variancePctBreakdown,
      hasDiscrepancy,
    };
  });
}

/**
 * Get summary statistics for reconciliation report
 */
export function getReconciliationSummary(rows: ReconciliationRow[]) {
  const totals = rows.reduce(
    (acc, row) => ({
      expectedShopify: acc.expectedShopify + row.expected.shopify,
      expectedEtsy: acc.expectedEtsy + row.expected.etsy,
      expectedB2B: acc.expectedB2B + row.expected.b2b,
      expectedTotal: acc.expectedTotal + row.expected.total,
      actualShopify: acc.actualShopify + row.actual.shopify,
      actualEtsy: acc.actualEtsy + row.actual.etsy,
      actualB2B: acc.actualB2B + row.actual.b2b,
      actualTotal: acc.actualTotal + row.actual.total,
    }),
    {
      expectedShopify: 0,
      expectedEtsy: 0,
      expectedB2B: 0,
      expectedTotal: 0,
      actualShopify: 0,
      actualEtsy: 0,
      actualB2B: 0,
      actualTotal: 0,
    }
  );

  const discrepancyCount = rows.filter((r) => r.hasDiscrepancy).length;

  return {
    ...totals,
    varianceShopify: totals.actualShopify - totals.expectedShopify,
    varianceEtsy: totals.actualEtsy - totals.expectedEtsy,
    varianceB2B: totals.actualB2B - totals.expectedB2B,
    varianceTotal: totals.actualTotal - totals.expectedTotal,
    variancePctShopify: calculateVariancePct(totals.expectedShopify, totals.actualShopify),
    variancePctEtsy: calculateVariancePct(totals.expectedEtsy, totals.actualEtsy),
    variancePctB2B: calculateVariancePct(totals.expectedB2B, totals.actualB2B),
    variancePctTotal: calculateVariancePct(totals.expectedTotal, totals.actualTotal),
    weekCount: rows.length,
    discrepancyCount,
    discrepancyPct: (discrepancyCount / rows.length) * 100,
  };
}

/**
 * Filter rows to only show discrepancies
 */
export function getDiscrepancyRows(rows: ReconciliationRow[]): ReconciliationRow[] {
  return rows.filter((r) => r.hasDiscrepancy);
}

/**
 * Format currency for display (reconciliation-specific)
 */
export function formatReconciliationCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display with sign
 */
export function formatVariancePercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
