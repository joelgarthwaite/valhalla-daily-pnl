// Cash Flow Event Generation
// Generates forecasted cash events from various data sources

import { addDays, format, startOfMonth, endOfMonth, addMonths, getDate } from 'date-fns';

// ============================================
// Types
// ============================================

export interface CashEvent {
  id: string;
  brand_id: string | null;
  event_date: string;
  event_type: CashEventType;
  amount: number;  // positive = inflow, negative = outflow
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  probability_pct: number;
  status: CashEventStatus;
  is_recurring: boolean;
  notes: string | null;
}

export type CashEventType =
  | 'platform_payout'
  | 'b2b_receivable'
  | 'other_inflow'
  | 'supplier_payment'
  | 'opex_payment'
  | 'ad_platform_invoice'
  | 'vat_payment'
  | 'other_outflow';

export type CashEventStatus = 'forecast' | 'confirmed' | 'paid' | 'cancelled';

export interface PayoutSchedule {
  platform: 'shopify' | 'etsy';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  delayDays: number;
}

export interface OperatingExpense {
  id: string;
  brand_id: string | null;
  name: string;
  category: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  payment_day: number | null;  // Explicit override, or null to use start_date's day
  start_date: string;
  end_date: string | null;
  expense_date: string | null;
}

export interface PurchaseOrder {
  id: string;
  brand_id: string;
  po_number: string;
  supplier_name: string;
  total_amount: number;
  payment_due_date: string | null;
  payment_status: 'unpaid' | 'partial' | 'paid';
  status: string;
}

// ============================================
// Platform Payout Estimation
// ============================================

/**
 * Estimate platform payouts based on recent revenue
 * Shopify: typically pays out daily, 2 business days delay
 * Etsy: typically pays out weekly or biweekly
 */
export function estimatePlatformPayouts(
  dailyRevenue: { date: string; shopify: number; etsy: number }[],
  schedules: PayoutSchedule[],
  forecastDays: number = 30
): CashEvent[] {
  const events: CashEvent[] = [];
  const today = new Date();

  // Get average daily revenue per platform (last 7 days)
  const recentRevenue = dailyRevenue.slice(-7);
  const avgShopify = recentRevenue.reduce((sum, d) => sum + d.shopify, 0) / recentRevenue.length || 0;
  const avgEtsy = recentRevenue.reduce((sum, d) => sum + d.etsy, 0) / recentRevenue.length || 0;

  // Get schedules with defaults
  const shopifySchedule = schedules.find(s => s.platform === 'shopify') || {
    platform: 'shopify' as const,
    frequency: 'daily' as const,
    delayDays: 2,
  };
  const etsySchedule = schedules.find(s => s.platform === 'etsy') || {
    platform: 'etsy' as const,
    frequency: 'weekly' as const,
    delayDays: 3,
  };

  // Generate Shopify payout events (daily)
  for (let i = 0; i < forecastDays; i++) {
    const payoutDate = addDays(today, i);
    // Skip weekends for Shopify
    if (payoutDate.getDay() === 0 || payoutDate.getDay() === 6) continue;

    if (avgShopify > 0) {
      events.push({
        id: `shopify-payout-${format(payoutDate, 'yyyy-MM-dd')}`,
        brand_id: null,  // Cross-brand
        event_date: format(payoutDate, 'yyyy-MM-dd'),
        event_type: 'platform_payout',
        amount: Math.round(avgShopify * 100) / 100,
        description: 'Shopify Daily Payout',
        reference_type: 'platform',
        reference_id: 'shopify',
        probability_pct: 95,
        status: 'forecast',
        is_recurring: true,
        notes: `Estimated from ${recentRevenue.length}-day average`,
      });
    }
  }

  // Generate Etsy payout events (weekly, typically Monday)
  const etsyPayoutDays = etsySchedule.frequency === 'weekly' ? 7 :
                         etsySchedule.frequency === 'biweekly' ? 14 : 30;
  const etsyAmount = avgEtsy * etsyPayoutDays;

  for (let i = 0; i < forecastDays; i += etsyPayoutDays) {
    const payoutDate = addDays(today, i + etsySchedule.delayDays);

    if (etsyAmount > 0) {
      events.push({
        id: `etsy-payout-${format(payoutDate, 'yyyy-MM-dd')}`,
        brand_id: null,
        event_date: format(payoutDate, 'yyyy-MM-dd'),
        event_type: 'platform_payout',
        amount: Math.round(etsyAmount * 100) / 100,
        description: `Etsy ${etsySchedule.frequency.charAt(0).toUpperCase() + etsySchedule.frequency.slice(1)} Payout`,
        reference_type: 'platform',
        reference_id: 'etsy',
        probability_pct: 90,
        status: 'forecast',
        is_recurring: true,
        notes: `Estimated from ${recentRevenue.length}-day average`,
      });
    }
  }

  return events;
}

// ============================================
// OPEX Payment Events
// ============================================

/**
 * Generate cash events from operating expenses
 */
export function generateOpexEvents(
  expenses: OperatingExpense[],
  forecastDays: number = 90
): CashEvent[] {
  const events: CashEvent[] = [];
  const today = new Date();
  const endDate = addDays(today, forecastDays);

  for (const expense of expenses) {
    // Skip inactive or expired expenses
    if (expense.end_date && new Date(expense.end_date) < today) continue;
    if (new Date(expense.start_date) > endDate) continue;

    if (expense.frequency === 'one_time') {
      // One-time expense
      if (expense.expense_date) {
        const expenseDate = new Date(expense.expense_date);
        if (expenseDate >= today && expenseDate <= endDate) {
          events.push(createOpexEvent(expense, expense.expense_date));
        }
      }
    } else {
      // Recurring expense
      // Use explicit payment_day if set, otherwise extract day from start_date
      const startDateObj = new Date(expense.start_date);
      const paymentDay = expense.payment_day || getDate(startDateObj);  // Use start_date's day
      let currentDate = startOfMonth(today);

      while (currentDate <= endDate) {
        // Set to payment day
        const paymentDate = new Date(currentDate);
        paymentDate.setDate(Math.min(paymentDay, endOfMonth(currentDate).getDate()));

        // Check if this payment is within our forecast window
        if (paymentDate >= today && paymentDate <= endDate) {
          // Check frequency
          const monthDiff = (paymentDate.getFullYear() - today.getFullYear()) * 12 +
                           (paymentDate.getMonth() - today.getMonth());

          let shouldInclude = false;
          if (expense.frequency === 'monthly') {
            shouldInclude = true;
          } else if (expense.frequency === 'quarterly') {
            shouldInclude = monthDiff % 3 === 0;
          } else if (expense.frequency === 'annual') {
            shouldInclude = monthDiff % 12 === 0;
          }

          if (shouldInclude) {
            events.push(createOpexEvent(expense, format(paymentDate, 'yyyy-MM-dd')));
          }
        }

        currentDate = addMonths(currentDate, 1);
      }
    }
  }

  return events;
}

function createOpexEvent(expense: OperatingExpense, date: string): CashEvent {
  return {
    id: `opex-${expense.id}-${date}`,
    brand_id: expense.brand_id,
    event_date: date,
    event_type: 'opex_payment',
    amount: -expense.amount,  // Negative for outflow
    description: expense.name,
    reference_type: 'operating_expense',
    reference_id: expense.id,
    probability_pct: 100,  // Committed expense
    status: 'forecast',
    is_recurring: expense.frequency !== 'one_time',
    notes: `Category: ${expense.category}`,
  };
}

// ============================================
// Purchase Order Payment Events
// ============================================

/**
 * Generate cash events from unpaid purchase orders
 */
export function generatePOPaymentEvents(
  purchaseOrders: PurchaseOrder[]
): CashEvent[] {
  const events: CashEvent[] = [];

  for (const po of purchaseOrders) {
    // Only include orders that are sent/confirmed but not fully paid
    if (!['sent', 'confirmed', 'partial'].includes(po.status)) continue;
    if (po.payment_status === 'paid') continue;

    // Use payment due date if set, otherwise estimate
    const paymentDate = po.payment_due_date || format(addDays(new Date(), 14), 'yyyy-MM-dd');

    events.push({
      id: `po-${po.id}`,
      brand_id: po.brand_id,
      event_date: paymentDate,
      event_type: 'supplier_payment',
      amount: -po.total_amount,  // Negative for outflow
      description: `${po.supplier_name} (${po.po_number})`,
      reference_type: 'purchase_order',
      reference_id: po.id,
      probability_pct: po.status === 'confirmed' ? 100 : 90,
      status: po.payment_status === 'partial' ? 'confirmed' : 'forecast',
      is_recurring: false,
      notes: `Status: ${po.status}`,
    });
  }

  return events;
}

// ============================================
// Ad Platform Invoice Events
// ============================================

/**
 * Ad platform billing thresholds (configurable per platform)
 * Meta: Threshold-based - charges every time spend hits threshold
 * Google: Threshold-based or monthly (we use threshold model)
 * Microsoft: Monthly billing
 */
export interface AdPlatformBillingConfig {
  metaThreshold: number;      // Default £700
  googleThreshold: number;    // Default £500
  microsoftMonthly: boolean;  // True = monthly, false = threshold
}

const DEFAULT_BILLING_CONFIG: AdPlatformBillingConfig = {
  metaThreshold: 700,
  googleThreshold: 500,
  microsoftMonthly: true,
};

/**
 * Estimate ad platform charges based on recent spend and billing models
 *
 * Meta: Threshold-based billing - charges £700 every time spend accumulates to threshold
 * Google: Threshold-based billing - charges when threshold reached
 * Microsoft: Monthly billing - charges at end of month
 */
export function estimateAdPlatformInvoices(
  recentAdSpend: { date: string; meta: number; google: number; microsoft: number }[],
  forecastMonths: number = 3,
  config: Partial<AdPlatformBillingConfig> = {}
): CashEvent[] {
  const events: CashEvent[] = [];
  const today = new Date();
  const forecastDays = forecastMonths * 30;

  const billingConfig = { ...DEFAULT_BILLING_CONFIG, ...config };

  // Calculate daily average spend from recent data
  const totalDays = recentAdSpend.length || 1;
  const totalMeta = recentAdSpend.reduce((sum, d) => sum + d.meta, 0);
  const totalGoogle = recentAdSpend.reduce((sum, d) => sum + d.google, 0);
  const totalMicrosoft = recentAdSpend.reduce((sum, d) => sum + d.microsoft, 0);

  const dailyMeta = totalMeta / totalDays;
  const dailyGoogle = totalGoogle / totalDays;
  const dailyMicrosoft = totalMicrosoft / totalDays;

  // ========================================
  // Meta - Threshold-based billing
  // Charges every time spend accumulates to threshold
  // ========================================
  if (dailyMeta > 0) {
    const threshold = billingConfig.metaThreshold;
    const daysBetweenCharges = threshold / dailyMeta;

    // Generate charges for each threshold crossing
    let daysFromNow = daysBetweenCharges; // First charge after one threshold period
    let chargeNumber = 1;

    while (daysFromNow <= forecastDays) {
      const chargeDate = addDays(today, Math.ceil(daysFromNow));
      const chargeDateStr = format(chargeDate, 'yyyy-MM-dd');

      events.push({
        id: `meta-threshold-${chargeNumber}-${chargeDateStr}`,
        brand_id: null,
        event_date: chargeDateStr,
        event_type: 'ad_platform_invoice',
        amount: -threshold,
        description: 'Meta Ads Threshold Charge',
        reference_type: 'ad_platform',
        reference_id: 'meta',
        probability_pct: 85,  // Slightly uncertain on exact timing
        status: 'forecast',
        is_recurring: true,
        notes: `£${threshold} threshold @ £${Math.round(dailyMeta)}/day ≈ every ${daysBetweenCharges.toFixed(1)} days`,
      });

      daysFromNow += daysBetweenCharges;
      chargeNumber++;
    }
  }

  // ========================================
  // Google - Threshold-based billing
  // Similar to Meta, charges when threshold reached
  // ========================================
  if (dailyGoogle > 0) {
    const threshold = billingConfig.googleThreshold;
    const daysBetweenCharges = threshold / dailyGoogle;

    let daysFromNow = daysBetweenCharges;
    let chargeNumber = 1;

    while (daysFromNow <= forecastDays) {
      const chargeDate = addDays(today, Math.ceil(daysFromNow));
      const chargeDateStr = format(chargeDate, 'yyyy-MM-dd');

      events.push({
        id: `google-threshold-${chargeNumber}-${chargeDateStr}`,
        brand_id: null,
        event_date: chargeDateStr,
        event_type: 'ad_platform_invoice',
        amount: -threshold,
        description: 'Google Ads Threshold Charge',
        reference_type: 'ad_platform',
        reference_id: 'google',
        probability_pct: 85,
        status: 'forecast',
        is_recurring: true,
        notes: `£${threshold} threshold @ £${Math.round(dailyGoogle)}/day ≈ every ${daysBetweenCharges.toFixed(1)} days`,
      });

      daysFromNow += daysBetweenCharges;
      chargeNumber++;
    }
  }

  // ========================================
  // Microsoft - Monthly billing
  // Charges accumulated spend at end of month
  // ========================================
  if (dailyMicrosoft > 0) {
    const monthlyMicrosoft = dailyMicrosoft * 30.44;

    for (let i = 1; i <= forecastMonths; i++) {
      const invoiceDate = addMonths(startOfMonth(today), i);
      const invoiceDateStr = format(addDays(invoiceDate, 2), 'yyyy-MM-dd'); // Usually 2nd-3rd

      events.push({
        id: `microsoft-monthly-${invoiceDateStr}`,
        brand_id: null,
        event_date: invoiceDateStr,
        event_type: 'ad_platform_invoice',
        amount: -Math.round(monthlyMicrosoft * 100) / 100,
        description: 'Microsoft Ads Monthly Invoice',
        reference_type: 'ad_platform',
        reference_id: 'microsoft',
        probability_pct: 95,
        status: 'forecast',
        is_recurring: true,
        notes: `Monthly billing @ £${Math.round(dailyMicrosoft)}/day`,
      });
    }
  }

  return events;
}

// ============================================
// Event Sorting and Filtering
// ============================================

/**
 * Sort events by date
 */
export function sortEventsByDate(events: CashEvent[]): CashEvent[] {
  return [...events].sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
  events: CashEvent[],
  startDate: Date,
  endDate: Date
): CashEvent[] {
  return events.filter(event => {
    const eventDate = new Date(event.event_date);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

/**
 * Get events within N days
 */
export function getUpcomingEvents(
  events: CashEvent[],
  days: number = 30
): CashEvent[] {
  const today = new Date();
  const endDate = addDays(today, days);
  return filterEventsByDateRange(events, today, endDate);
}

/**
 * Separate events into inflows and outflows
 */
export function separateEventsByFlow(events: CashEvent[]): {
  inflows: CashEvent[];
  outflows: CashEvent[];
} {
  return {
    inflows: events.filter(e => e.amount > 0),
    outflows: events.filter(e => e.amount < 0),
  };
}
