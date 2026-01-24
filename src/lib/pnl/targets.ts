// P&L Target Calculations
// Functions for calculating progress against quarterly goals

import type { QuarterlyGoal, QuarterlyProgress, DailyPnL } from '@/types';
import {
  startOfQuarter,
  endOfQuarter,
  differenceInDays,
  isWithinInterval,
  getQuarter,
  getYear,
} from 'date-fns';

// ============================================
// Constants
// ============================================

export const WEEKS_PER_QUARTER = 13;
export const DAYS_PER_WEEK = 7;

// ============================================
// Target Calculations
// ============================================

/**
 * Calculate weekly revenue target from quarterly goal
 */
export function calculateWeeklyTarget(quarterlyTarget: number): number {
  return quarterlyTarget / WEEKS_PER_QUARTER;
}

/**
 * Calculate daily revenue target from quarterly goal
 */
export function calculateDailyTarget(quarterlyTarget: number): number {
  return quarterlyTarget / (WEEKS_PER_QUARTER * DAYS_PER_WEEK);
}

/**
 * Get current quarter info
 */
export function getCurrentQuarterInfo(date: Date = new Date()): {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  startDate: Date;
  endDate: Date;
  daysTotal: number;
  daysPassed: number;
  daysRemaining: number;
} {
  const year = getYear(date);
  const quarter = getQuarter(date) as 1 | 2 | 3 | 4;
  const startDate = startOfQuarter(date);
  const endDate = endOfQuarter(date);
  const daysTotal = differenceInDays(endDate, startDate) + 1;
  const daysPassed = differenceInDays(date, startDate) + 1;
  const daysRemaining = daysTotal - daysPassed;

  return {
    year,
    quarter,
    startDate,
    endDate,
    daysTotal,
    daysPassed,
    daysRemaining,
  };
}

/**
 * Calculate quarterly progress
 */
export function calculateQuarterlyProgress(
  goal: QuarterlyGoal | null,
  dailyData: DailyPnL[],
  referenceDate: Date = new Date()
): QuarterlyProgress | null {
  const quarterInfo = getCurrentQuarterInfo(referenceDate);

  // If no goal set, return null
  if (!goal) {
    return null;
  }

  // Verify goal matches current quarter
  if (goal.year !== quarterInfo.year || goal.quarter !== quarterInfo.quarter) {
    return null;
  }

  // Filter daily data to current quarter
  const quarterData = dailyData.filter((d) =>
    isWithinInterval(new Date(d.date), {
      start: quarterInfo.startDate,
      end: quarterInfo.endDate,
    })
  );

  // Calculate actual revenue
  const actualRevenue = quarterData.reduce((sum, d) => sum + d.total_revenue, 0);

  // Calculate progress
  const progressPct = goal.revenue_target > 0
    ? (actualRevenue / goal.revenue_target) * 100
    : 0;

  // Calculate targets
  const weeklyTarget = calculateWeeklyTarget(goal.revenue_target);
  const dailyTarget = calculateDailyTarget(goal.revenue_target);

  // Determine if on track
  // Calculate expected revenue based on days passed
  const expectedRevenue = dailyTarget * quarterInfo.daysPassed;
  const onTrack = actualRevenue >= expectedRevenue * 0.95; // Within 5% of expected

  return {
    year: quarterInfo.year,
    quarter: quarterInfo.quarter,
    targetRevenue: goal.revenue_target,
    actualRevenue,
    progressPct,
    weeklyTarget,
    dailyTarget,
    daysRemaining: quarterInfo.daysRemaining,
    onTrack,
  };
}

/**
 * Calculate required daily run rate to hit quarterly goal
 */
export function calculateRequiredRunRate(
  targetRevenue: number,
  actualRevenue: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) return 0;
  const remainingTarget = targetRevenue - actualRevenue;
  if (remainingTarget <= 0) return 0;
  return remainingTarget / daysRemaining;
}

/**
 * Get margin status compared to target
 */
export function getMarginStatus(
  actualMarginPct: number,
  targetMarginPct: number
): {
  status: 'above' | 'on-track' | 'below';
  difference: number;
} {
  const difference = actualMarginPct - targetMarginPct;

  if (difference >= 0) {
    return { status: 'above', difference };
  } else if (difference >= -2) {
    // Within 2 percentage points
    return { status: 'on-track', difference };
  } else {
    return { status: 'below', difference };
  }
}

/**
 * Calculate projected quarterly revenue based on current run rate
 */
export function calculateProjectedQuarterlyRevenue(
  actualRevenue: number,
  daysPassed: number,
  daysTotal: number
): number {
  if (daysPassed <= 0) return 0;
  const dailyRunRate = actualRevenue / daysPassed;
  return dailyRunRate * daysTotal;
}

/**
 * Get all quarters for a year (for goal setting UI)
 */
export function getQuartersForYear(year: number): Array<{
  year: number;
  quarter: 1 | 2 | 3 | 4;
  label: string;
  startDate: Date;
  endDate: Date;
}> {
  return [1, 2, 3, 4].map((q) => {
    const quarterNum = q as 1 | 2 | 3 | 4;
    const startMonth = (quarterNum - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = endOfQuarter(startDate);

    return {
      year,
      quarter: quarterNum,
      label: `Q${quarterNum} ${year}`,
      startDate,
      endDate,
    };
  });
}

/**
 * Format currency for display
 */
export function formatCurrency(
  value: number,
  currency = 'GBP',
  compact = false
): string {
  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return formatter.format(value);
  }

  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
