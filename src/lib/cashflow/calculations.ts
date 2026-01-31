// Cash Flow Calculation Engine
// Core functions for burn rate, runway, and projections

import { differenceInDays, addDays, format, startOfDay, subDays } from 'date-fns';

// ============================================
// Types
// ============================================

export interface CashPosition {
  totalCash: number;
  totalCredit: number;
  netPosition: number;
  accounts: BrandBalance[];
}

export interface BrandBalance {
  brand: string;
  brandName: string;
  accountName: string;
  accountType: 'BANK' | 'CREDITCARD';
  balance: number;
  currency: string;
}

export interface BalanceSnapshot {
  date: string;
  balance: number;
}

export interface CashHistory {
  dates: string[];
  balances: number[];
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface BurnMetrics {
  burnRateDaily: number;
  burnRateWeekly: number;
  burnRateMonthly: number;
  isAccumulating: boolean;  // True if cash is growing, not burning
}

export interface RunwayMetrics {
  daysRemaining: number | null;  // null if infinite (not burning)
  weeksRemaining: number | null;
  monthsRemaining: number | null;
  projectedBalance: {
    week4: number;
    week8: number;
    week12: number;
  };
}

export interface CashFlowSummary {
  totalInflows: number;
  totalOutflows: number;
  netFlow: number;
  inflowsBySource: {
    platformPayouts: number;
    b2bReceivables: number;
    other: number;
  };
  outflowsByCategory: {
    supplierPayments: number;
    opex: number;
    adPlatforms: number;
    vat: number;
    other: number;
  };
}

export interface CashAlert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
}

// ============================================
// Alert Thresholds
// ============================================

export const ALERT_THRESHOLDS = {
  LOW_CASH: 5000,           // Critical alert when net position < £5,000
  RUNWAY_WARNING: 8,        // Warning when < 8 weeks runway
  LARGE_PAYMENT: 2000,      // Info alert for payments > £2,000 in next 7 days
  NEGATIVE_PROJECTION: 0,   // Critical when projected balance goes negative
} as const;

// ============================================
// Burn Rate Calculations
// ============================================

/**
 * Calculate burn rate from balance history
 * @param snapshots Array of balance snapshots sorted by date (oldest first)
 * @param days Number of days to calculate burn rate over
 */
export function calculateBurnRate(
  snapshots: BalanceSnapshot[],
  days: number = 30
): BurnMetrics {
  if (snapshots.length < 2) {
    return {
      burnRateDaily: 0,
      burnRateWeekly: 0,
      burnRateMonthly: 0,
      isAccumulating: false,
    };
  }

  // Get balance change over the period
  const oldestBalance = snapshots[0].balance;
  const latestBalance = snapshots[snapshots.length - 1].balance;
  const actualDays = differenceInDays(
    new Date(snapshots[snapshots.length - 1].date),
    new Date(snapshots[0].date)
  ) || days;

  const totalChange = latestBalance - oldestBalance;
  const burnRateDaily = -totalChange / actualDays;  // Negative change = positive burn

  return {
    burnRateDaily,
    burnRateWeekly: burnRateDaily * 7,
    burnRateMonthly: burnRateDaily * 30.44,  // Average days per month
    isAccumulating: totalChange > 0,
  };
}

/**
 * Analyze balance history trend
 */
export function analyzeBalanceTrend(
  snapshots: BalanceSnapshot[]
): CashHistory {
  const dates = snapshots.map(s => s.date);
  const balances = snapshots.map(s => s.balance);

  if (snapshots.length < 2) {
    return {
      dates,
      balances,
      trend: 'stable',
      changePercent: 0,
    };
  }

  const firstBalance = snapshots[0].balance;
  const lastBalance = snapshots[snapshots.length - 1].balance;
  const changePercent = firstBalance !== 0
    ? ((lastBalance - firstBalance) / Math.abs(firstBalance)) * 100
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercent > 5) trend = 'up';
  else if (changePercent < -5) trend = 'down';

  return {
    dates,
    balances,
    trend,
    changePercent,
  };
}

// ============================================
// Runway Calculations
// ============================================

/**
 * Calculate runway based on current position and burn rate
 */
export function calculateRunway(
  currentBalance: number,
  burnMetrics: BurnMetrics
): RunwayMetrics {
  const { burnRateDaily, isAccumulating } = burnMetrics;

  // If not burning (accumulating or flat), runway is infinite
  if (burnRateDaily <= 0 || isAccumulating) {
    return {
      daysRemaining: null,
      weeksRemaining: null,
      monthsRemaining: null,
      projectedBalance: {
        week4: currentBalance + (-burnRateDaily * 28),
        week8: currentBalance + (-burnRateDaily * 56),
        week12: currentBalance + (-burnRateDaily * 84),
      },
    };
  }

  const daysRemaining = currentBalance / burnRateDaily;

  return {
    daysRemaining: Math.max(0, Math.floor(daysRemaining)),
    weeksRemaining: Math.max(0, Math.floor(daysRemaining / 7)),
    monthsRemaining: Math.max(0, Math.round(daysRemaining / 30.44 * 10) / 10),
    projectedBalance: {
      week4: Math.max(0, currentBalance - (burnRateDaily * 28)),
      week8: Math.max(0, currentBalance - (burnRateDaily * 56)),
      week12: Math.max(0, currentBalance - (burnRateDaily * 84)),
    },
  };
}

// ============================================
// Cash Flow Projections
// ============================================

export interface ProjectionPoint {
  date: string;
  projected: number;
  optimistic: number;
  pessimistic: number;
}

/**
 * Generate cash flow projections for multiple scenarios
 */
export function generateProjections(
  currentBalance: number,
  burnMetrics: BurnMetrics,
  forecastDays: number = 84,  // 12 weeks default
  revenueAdjustment: number = 0,  // +20 = 20% more revenue = less burn
  costAdjustment: number = 0      // +10 = 10% more costs = more burn
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const today = startOfDay(new Date());

  // Adjust burn rates for scenarios
  // Revenue increase reduces burn, cost increase increases burn
  const baselineBurn = burnMetrics.burnRateDaily;
  const optimisticBurn = baselineBurn * (1 - 0.20 + 0.10);  // Revenue +20%, costs -10%
  const pessimisticBurn = baselineBurn * (1 + 0.20 - 0.10); // Revenue -20%, costs +10%

  // Custom scenario adjustment
  const adjustedBurn = baselineBurn * (1 - (revenueAdjustment / 100) + (costAdjustment / 100));

  for (let i = 0; i <= forecastDays; i += 7) {  // Weekly intervals
    const projDate = addDays(today, i);

    points.push({
      date: format(projDate, 'yyyy-MM-dd'),
      projected: Math.round(currentBalance - (adjustedBurn * i)),
      optimistic: Math.round(currentBalance - (optimisticBurn * i)),
      pessimistic: Math.round(currentBalance - (pessimisticBurn * i)),
    });
  }

  return points;
}

// ============================================
// Alert Generation
// ============================================

/**
 * Generate cash flow alerts based on current state
 */
export function generateAlerts(
  netPosition: number,
  runway: RunwayMetrics,
  upcomingLargePayments: { amount: number; date: string; description: string }[]
): CashAlert[] {
  const alerts: CashAlert[] = [];

  // Critical: Low cash
  if (netPosition < ALERT_THRESHOLDS.LOW_CASH) {
    alerts.push({
      type: 'critical',
      title: 'Low Cash Position',
      message: `Net cash position (£${netPosition.toLocaleString()}) is below £${ALERT_THRESHOLDS.LOW_CASH.toLocaleString()} threshold.`,
      action: 'Review upcoming expenses and consider delaying non-essential payments.',
    });
  }

  // Critical: Negative projection
  if (runway.projectedBalance.week4 < 0) {
    alerts.push({
      type: 'critical',
      title: 'Negative Balance Projected',
      message: 'At current burn rate, cash position will go negative within 4 weeks.',
      action: 'Urgent action required: reduce costs or accelerate receivables.',
    });
  }

  // Warning: Low runway
  if (runway.weeksRemaining !== null && runway.weeksRemaining < ALERT_THRESHOLDS.RUNWAY_WARNING) {
    alerts.push({
      type: 'warning',
      title: 'Runway Warning',
      message: `Only ${runway.weeksRemaining} weeks of runway remaining at current burn rate.`,
      action: 'Consider cost reduction measures or revenue acceleration.',
    });
  }

  // Info: Large upcoming payments
  upcomingLargePayments
    .filter(p => Math.abs(p.amount) >= ALERT_THRESHOLDS.LARGE_PAYMENT)
    .slice(0, 3)  // Max 3 alerts
    .forEach(payment => {
      alerts.push({
        type: 'info',
        title: 'Large Payment Due',
        message: `£${Math.abs(payment.amount).toLocaleString()} due on ${format(new Date(payment.date), 'dd MMM')} for ${payment.description}.`,
      });
    });

  return alerts;
}

// ============================================
// Receivables Probability
// ============================================

/**
 * Calculate probability of receiving payment based on invoice age
 */
export function getReceivableProbability(dueDate: Date, today: Date = new Date()): number {
  const daysOverdue = differenceInDays(today, dueDate);

  if (daysOverdue < 0) return 0.95;      // Not yet due
  if (daysOverdue <= 30) return 0.85;    // 1-30 days late
  if (daysOverdue <= 60) return 0.70;    // 31-60 days late
  if (daysOverdue <= 90) return 0.50;    // 61-90 days late
  return 0.30;                            // 90+ days late
}

// ============================================
// Cash Flow Summary
// ============================================

/**
 * Summarize cash flows by category
 */
export function summarizeCashFlows(
  events: {
    event_type: string;
    amount: number;
    status: string;
  }[]
): CashFlowSummary {
  const summary: CashFlowSummary = {
    totalInflows: 0,
    totalOutflows: 0,
    netFlow: 0,
    inflowsBySource: {
      platformPayouts: 0,
      b2bReceivables: 0,
      other: 0,
    },
    outflowsByCategory: {
      supplierPayments: 0,
      opex: 0,
      adPlatforms: 0,
      vat: 0,
      other: 0,
    },
  };

  // Only count forecast and confirmed events (not paid or cancelled)
  const activeEvents = events.filter(e =>
    e.status === 'forecast' || e.status === 'confirmed'
  );

  for (const event of activeEvents) {
    const amount = event.amount;

    if (amount > 0) {
      // Inflows
      summary.totalInflows += amount;
      switch (event.event_type) {
        case 'platform_payout':
          summary.inflowsBySource.platformPayouts += amount;
          break;
        case 'b2b_receivable':
          summary.inflowsBySource.b2bReceivables += amount;
          break;
        default:
          summary.inflowsBySource.other += amount;
      }
    } else {
      // Outflows (amount is negative)
      summary.totalOutflows += Math.abs(amount);
      switch (event.event_type) {
        case 'supplier_payment':
          summary.outflowsByCategory.supplierPayments += Math.abs(amount);
          break;
        case 'opex_payment':
          summary.outflowsByCategory.opex += Math.abs(amount);
          break;
        case 'ad_platform_invoice':
          summary.outflowsByCategory.adPlatforms += Math.abs(amount);
          break;
        case 'vat_payment':
          summary.outflowsByCategory.vat += Math.abs(amount);
          break;
        default:
          summary.outflowsByCategory.other += Math.abs(amount);
      }
    }
  }

  summary.netFlow = summary.totalInflows - summary.totalOutflows;

  return summary;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format currency with sign
 */
export function formatCashAmount(amount: number, showSign: boolean = true): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);

  if (!showSign) return formatted;
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Get status color class based on cash position health
 */
export function getPositionStatusColor(
  netPosition: number,
  runway: RunwayMetrics
): 'green' | 'yellow' | 'red' {
  if (netPosition < ALERT_THRESHOLDS.LOW_CASH) return 'red';
  if (runway.weeksRemaining !== null && runway.weeksRemaining < ALERT_THRESHOLDS.RUNWAY_WARNING) {
    return 'yellow';
  }
  return 'green';
}

/**
 * Get runway display text
 */
export function getRunwayText(runway: RunwayMetrics): string {
  if (runway.weeksRemaining === null) {
    return 'Sustainable';
  }
  if (runway.weeksRemaining > 52) {
    return `${runway.monthsRemaining}+ months`;
  }
  if (runway.weeksRemaining > 12) {
    return `${runway.monthsRemaining} months`;
  }
  return `${runway.weeksRemaining} weeks`;
}
