// Operating Expenses (OPEX) Calculations
// Utilities for calculating and allocating operating expenses to P&L periods

import type { OperatingExpense, OpexCategory, OpexSummary } from '@/types';
import { OPEX_CATEGORY_LABELS } from '@/types';
import { differenceInDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

/**
 * Convert any frequency amount to a monthly equivalent
 */
export function toMonthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'annual':
      return amount / 12;
    case 'one_time':
      return 0; // One-time expenses don't have a monthly equivalent
    default:
      return amount;
  }
}

/**
 * Convert any frequency amount to an annual equivalent
 */
export function toAnnualAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'annual':
      return amount;
    case 'one_time':
      return amount;
    default:
      return amount;
  }
}

/**
 * Calculate the daily allocation of a recurring expense
 */
export function toDailyAmount(amount: number, frequency: string): number {
  const monthlyAmount = toMonthlyAmount(amount, frequency);
  return monthlyAmount / 30.44; // Average days per month
}

/**
 * Check if an expense is active for a given date
 */
export function isExpenseActiveOnDate(expense: OperatingExpense, date: Date): boolean {
  if (!expense.is_active) return false;

  const startDate = startOfDay(parseISO(expense.start_date));
  const endDate = expense.end_date ? endOfDay(parseISO(expense.end_date)) : null;

  // For one-time expenses, only count on the expense date
  if (expense.frequency === 'one_time') {
    if (!expense.expense_date) return false;
    const expenseDate = startOfDay(parseISO(expense.expense_date));
    return expenseDate.getTime() === startOfDay(date).getTime();
  }

  // For recurring expenses, check if date is within the active period
  if (date < startDate) return false;
  if (endDate && date > endDate) return false;

  return true;
}

/**
 * Calculate total OPEX for a date range
 * Returns the pro-rated OPEX allocation for the specified period
 */
export function calculateOpexForPeriod(
  expenses: OperatingExpense[],
  startDate: Date,
  endDate: Date,
  brandId?: string
): number {
  const days = differenceInDays(endDate, startDate) + 1;
  let totalOpex = 0;

  for (const expense of expenses) {
    // Filter by brand if specified
    if (brandId && expense.brand_id && expense.brand_id !== brandId) {
      continue;
    }

    // For one-time expenses, check if it falls within the period
    if (expense.frequency === 'one_time') {
      if (expense.expense_date) {
        const expenseDate = parseISO(expense.expense_date);
        if (
          isWithinInterval(expenseDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate),
          })
        ) {
          totalOpex += expense.amount;
        }
      }
      continue;
    }

    // For recurring expenses, calculate daily allocation and multiply by days in range
    if (!expense.is_active) continue;

    const expenseStart = startOfDay(parseISO(expense.start_date));
    const expenseEnd = expense.end_date ? endOfDay(parseISO(expense.end_date)) : null;

    // Calculate overlap between expense period and query period
    const overlapStart = expenseStart > startDate ? expenseStart : startDate;
    const overlapEnd = expenseEnd && expenseEnd < endDate ? expenseEnd : endDate;

    if (overlapStart > overlapEnd) continue; // No overlap

    const overlapDays = differenceInDays(overlapEnd, overlapStart) + 1;
    const dailyAmount = toDailyAmount(expense.amount, expense.frequency);

    totalOpex += dailyAmount * overlapDays;
  }

  return totalOpex;
}

/**
 * Calculate OPEX for a single day
 */
export function calculateDailyOpex(
  expenses: OperatingExpense[],
  date: Date,
  brandId?: string
): number {
  return calculateOpexForPeriod(expenses, date, date, brandId);
}

/**
 * Get a summary of all OPEX (monthly equivalents by category)
 */
export function getOpexSummary(expenses: OperatingExpense[], brandId?: string): OpexSummary {
  const activeExpenses = expenses.filter((e) => {
    if (!e.is_active) return false;
    if (brandId && e.brand_id && e.brand_id !== brandId) return false;
    return true;
  });

  const categories: OpexCategory[] = [
    'staff',
    'premises',
    'software',
    'professional',
    'marketing_other',
    'insurance',
    'equipment',
    'travel',
    'banking',
    'other',
  ];

  const byCategory = categories.reduce(
    (acc, category) => {
      acc[category] = activeExpenses
        .filter((e) => e.category === category && e.frequency !== 'one_time')
        .reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);
      return acc;
    },
    {} as Record<OpexCategory, number>
  );

  const totalMonthly = Object.values(byCategory).reduce((sum, v) => sum + v, 0);
  const totalAnnual = totalMonthly * 12;
  const dailyAllocation = totalMonthly / 30.44;

  return {
    totalMonthly,
    totalAnnual,
    byCategory,
    dailyAllocation,
  };
}

/**
 * Format OPEX breakdown for display
 */
export function formatOpexBreakdown(
  byCategory: Record<OpexCategory, number>,
  formatCurrency: (n: number) => string
): { category: string; label: string; amount: string; value: number }[] {
  return Object.entries(byCategory)
    .filter(([, value]) => value > 0)
    .map(([category, value]) => ({
      category,
      label: OPEX_CATEGORY_LABELS[category as OpexCategory],
      amount: formatCurrency(value),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}
