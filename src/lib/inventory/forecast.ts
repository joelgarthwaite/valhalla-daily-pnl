/**
 * Inventory Forecast Calculations
 *
 * This module provides functions for calculating:
 * - Sales velocity (units sold per day)
 * - Days of stock remaining
 * - Stock status (ok, warning, critical, out_of_stock)
 * - Reorder points
 *
 * Phase B Complete: Full BOM-based velocity calculation from order history
 */

import type { StockStatus } from '@/types';

export interface VelocityResult {
  unitsPerDay: number;
  periodDays: number;
  totalUnitsSold: number;
  ordersCount: number;
}

export interface ForecastResult {
  velocity: number;          // Units per day
  daysRemaining: number | null;  // Days until stockout (null if no velocity)
  reorderPoint: number;      // When to reorder (units)
  reorderDate: Date | null;  // When to reorder by (date)
  status: StockStatus;
  statusReason: string;
}

/**
 * Data needed for velocity calculation (fetched from API)
 */
export interface VelocityData {
  bomEntries: Array<{
    product_sku: string;
    quantity: number;
  }>;
  skuMappings: Array<{
    old_sku: string;
    current_sku: string;
  }>;
  orderLineItems: Array<{
    sku: string;
    quantity: number;
    order_date: string;
  }>;
}

/**
 * Calculate daily velocity (units sold per day) from pre-fetched data
 *
 * This is a pure calculation function - data fetching happens in the API route.
 *
 * @param data - Pre-fetched BOM entries, SKU mappings, and order line items
 * @param days - Number of days in the period
 * @returns VelocityResult with units per day
 */
export function calculateVelocityFromData(
  data: VelocityData,
  days: number = 30
): VelocityResult {
  const { bomEntries, skuMappings, orderLineItems } = data;

  // Build a map of SKU -> BOM quantity for this component
  // Key is product SKU, value is how many of this component it needs
  const skuToBomQty = new Map<string, number>();
  for (const bom of bomEntries) {
    skuToBomQty.set(bom.product_sku.toUpperCase(), bom.quantity);
  }

  // Build a map of old SKU -> current SKU for legacy SKU resolution
  const skuMap = new Map<string, string>();
  for (const mapping of skuMappings) {
    skuMap.set(mapping.old_sku.toUpperCase(), mapping.current_sku.toUpperCase());
  }

  // Calculate total component units consumed
  let totalUnits = 0;
  const seenOrders = new Set<string>();

  for (const item of orderLineItems) {
    if (!item.sku) continue;

    // Resolve SKU (check mapping for legacy SKUs)
    let resolvedSku = item.sku.toUpperCase();
    const mappedSku = skuMap.get(resolvedSku);
    if (mappedSku) {
      resolvedSku = mappedSku;
    }

    // Check if this SKU uses this component
    const bomQty = skuToBomQty.get(resolvedSku);
    if (bomQty) {
      // Units consumed = order quantity × BOM quantity
      totalUnits += item.quantity * bomQty;
      seenOrders.add(item.order_date);
    }
  }

  return {
    unitsPerDay: days > 0 ? totalUnits / days : 0,
    periodDays: days,
    totalUnitsSold: totalUnits,
    ordersCount: seenOrders.size,
  };
}

/**
 * Calculate daily velocity (units sold per day)
 *
 * @deprecated Use calculateVelocityFromData with pre-fetched data instead
 * This function is kept for backwards compatibility but returns 0.
 */
export function calculateVelocity(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _componentId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _days: number = 30
): VelocityResult {
  // This function cannot fetch data directly (no async in pure module)
  // Use calculateVelocityFromData with pre-fetched data instead
  return {
    unitsPerDay: 0,
    periodDays: 30,
    totalUnitsSold: 0,
    ordersCount: 0,
  };
}

/**
 * Calculate days of stock remaining
 *
 * @param available - Available stock units
 * @param velocity - Daily velocity (units per day)
 * @returns Days remaining, or null if velocity is 0
 */
export function calculateDaysRemaining(
  available: number,
  velocity: number
): number | null {
  if (velocity <= 0) return null;
  if (available <= 0) return 0;
  return Math.floor(available / velocity);
}

/**
 * Calculate reorder point in units
 * Reorder point = (Lead Time + Safety Stock Days) × Daily Velocity
 *
 * @param velocity - Daily velocity (units per day)
 * @param leadTimeDays - Days to receive from supplier
 * @param safetyStockDays - Buffer days to maintain
 * @returns Reorder point in units
 */
export function calculateReorderPoint(
  velocity: number,
  leadTimeDays: number,
  safetyStockDays: number
): number {
  return Math.ceil(velocity * (leadTimeDays + safetyStockDays));
}

/**
 * Calculate reorder date (when to place order by)
 *
 * @param daysRemaining - Days of stock remaining
 * @param leadTimeDays - Days to receive from supplier
 * @param safetyStockDays - Buffer days to maintain
 * @returns Date to reorder by, or null if no velocity
 */
export function calculateReorderDate(
  daysRemaining: number | null,
  leadTimeDays: number,
  safetyStockDays: number
): Date | null {
  if (daysRemaining === null) return null;

  const daysUntilReorder = daysRemaining - leadTimeDays - safetyStockDays;
  if (daysUntilReorder <= 0) {
    // Already past reorder point
    return new Date();
  }

  const reorderDate = new Date();
  reorderDate.setDate(reorderDate.getDate() + daysUntilReorder);
  return reorderDate;
}

/**
 * Determine stock status based on days remaining
 *
 * Status thresholds:
 * - OUT_OF_STOCK: Available <= 0
 * - CRITICAL: Days remaining <= lead time + safety days
 * - WARNING: Days remaining <= lead time + safety days + 7
 * - OK: Otherwise
 *
 * @param available - Available stock units
 * @param daysRemaining - Days of stock remaining
 * @param leadTimeDays - Days to receive from supplier
 * @param safetyStockDays - Buffer days to maintain
 * @returns Stock status
 */
export function getStockStatus(
  available: number,
  daysRemaining: number | null,
  leadTimeDays: number,
  safetyStockDays: number
): { status: StockStatus; reason: string } {
  if (available <= 0) {
    return {
      status: 'out_of_stock',
      reason: 'No available inventory',
    };
  }

  if (daysRemaining === null) {
    // No velocity data - assume OK if we have stock
    return {
      status: 'ok',
      reason: 'No sales velocity data',
    };
  }

  const criticalThreshold = leadTimeDays + safetyStockDays;
  const warningThreshold = criticalThreshold + 7;

  if (daysRemaining <= criticalThreshold) {
    return {
      status: 'critical',
      reason: `Only ${daysRemaining} days of stock remaining (need ${criticalThreshold} for lead time + safety)`,
    };
  }

  if (daysRemaining <= warningThreshold) {
    return {
      status: 'warning',
      reason: `${daysRemaining} days of stock remaining (approaching reorder point)`,
    };
  }

  return {
    status: 'ok',
    reason: `${daysRemaining} days of stock remaining`,
  };
}

/**
 * Get complete forecast for a component
 *
 * @param available - Available stock units
 * @param velocity - Daily velocity (units per day)
 * @param leadTimeDays - Days to receive from supplier
 * @param safetyStockDays - Buffer days to maintain
 * @returns Complete forecast result
 */
export function getForecast(
  available: number,
  velocity: number,
  leadTimeDays: number,
  safetyStockDays: number
): ForecastResult {
  const daysRemaining = calculateDaysRemaining(available, velocity);
  const reorderPoint = calculateReorderPoint(velocity, leadTimeDays, safetyStockDays);
  const reorderDate = calculateReorderDate(daysRemaining, leadTimeDays, safetyStockDays);
  const { status, reason: statusReason } = getStockStatus(
    available,
    daysRemaining,
    leadTimeDays,
    safetyStockDays
  );

  return {
    velocity,
    daysRemaining,
    reorderPoint,
    reorderDate,
    status,
    statusReason,
  };
}

/**
 * Calculate suggested reorder quantity
 *
 * Formula: (Target Days of Stock × Velocity) - Available - On Order
 * Rounds up to the component's minimum order quantity
 *
 * @param velocity - Daily velocity (units per day)
 * @param available - Currently available stock
 * @param onOrder - Stock already on order
 * @param minOrderQty - Minimum order quantity
 * @param targetDays - Target days of stock to maintain (default 60)
 * @returns Suggested order quantity
 */
export function calculateSuggestedOrderQty(
  velocity: number,
  available: number,
  onOrder: number,
  minOrderQty: number,
  targetDays: number = 60
): number {
  if (velocity <= 0) return 0;

  const targetStock = Math.ceil(velocity * targetDays);
  const currentCoverage = available + onOrder;
  const needed = targetStock - currentCoverage;

  if (needed <= 0) return 0;

  // Round up to minimum order quantity
  return Math.ceil(needed / minOrderQty) * minOrderQty;
}

/**
 * Format days remaining for display
 *
 * @param days - Days remaining (or null)
 * @returns Formatted string
 */
export function formatDaysRemaining(days: number | null): string {
  if (days === null) return '-';
  if (days === 0) return 'Out';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''}`;
}

/**
 * Format velocity for display
 *
 * @param velocity - Units per day
 * @returns Formatted string
 */
export function formatVelocity(velocity: number): string {
  if (velocity <= 0) return '-';
  if (velocity < 1) {
    const perWeek = velocity * 7;
    return `${perWeek.toFixed(1)}/week`;
  }
  return `${velocity.toFixed(1)}/day`;
}
