/**
 * Manufacturing Overhead Calculation
 *
 * Allocates premises, labor, and equipment costs to COGS based on configuration.
 * This replaces the old "Pick & Pack" and "Logistics" percentage-based costs.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ManufacturingOverheadConfig {
  id: string;
  production_premises_pct: number;
  staff_allocations: Record<string, { direct_labor_pct?: number; overhead_pct?: number }>;
  equipment_allocations: Record<string, number>;
  notes?: string;
}

export interface ManufacturingOverheadResult {
  // Total amounts allocated to COGS
  directLabor: number;
  manufacturingOverhead: number;
  totalAllocatedToCOGS: number;

  // Per-order allocation (for applying to individual orders)
  perOrderDirectLabor: number;
  perOrderOverhead: number;
  perOrderTotal: number;

  // Breakdown for transparency
  breakdown: {
    premises: { total: number; allocated: number; pct: number };
    staff: Array<{ description: string; total: number; directLabor: number; overhead: number }>;
    equipment: Array<{ description: string; total: number; allocated: number }>;
  };

  // Amount to EXCLUDE from OPEX (to avoid double-counting)
  excludeFromOPEX: number;
}

/**
 * Load manufacturing overhead configuration
 */
export async function loadManufacturingConfig(
  supabase: SupabaseClient
): Promise<ManufacturingOverheadConfig | null> {
  const { data, error } = await supabase
    .from('manufacturing_overhead_config')
    .select('*')
    .single();

  if (error) {
    console.error('Error loading manufacturing config:', error);
    return null;
  }

  return data;
}

/**
 * Calculate manufacturing overhead for a date range
 *
 * @param supabase - Supabase client
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param orderCount - Total orders in the period (for per-order allocation)
 * @returns Manufacturing overhead breakdown and allocations
 */
export async function calculateManufacturingOverhead(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  orderCount: number
): Promise<ManufacturingOverheadResult | null> {
  // Load config
  const config = await loadManufacturingConfig(supabase);
  if (!config) {
    console.warn('No manufacturing overhead config found, using defaults');
    return null;
  }

  // Load OPEX for the period
  const { data: opexData, error: opexError } = await supabase
    .from('operating_expenses')
    .select('*')
    .or(`end_date.is.null,end_date.gte.${startDate}`)
    .lte('start_date', endDate);

  if (opexError) {
    console.error('Error loading OPEX for manufacturing overhead:', opexError);
    return null;
  }

  // Calculate the number of days in the period
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Initialize breakdown
  const breakdown = {
    premises: { total: 0, allocated: 0, pct: config.production_premises_pct },
    staff: [] as Array<{ description: string; total: number; directLabor: number; overhead: number }>,
    equipment: [] as Array<{ description: string; total: number; allocated: number }>,
  };

  let totalDirectLabor = 0;
  let totalManufacturingOverhead = 0;
  let totalExcludeFromOPEX = 0;

  // Process each OPEX entry
  for (const expense of opexData || []) {
    // Calculate daily amount based on frequency
    let dailyAmount = 0;
    switch (expense.frequency) {
      case 'monthly':
        dailyAmount = expense.amount / 30.44; // Average days per month
        break;
      case 'quarterly':
        dailyAmount = expense.amount / 91.31; // Average days per quarter
        break;
      case 'annual':
        dailyAmount = expense.amount / 365;
        break;
      case 'one-time':
        // For one-time, spread across the entire period if it falls within
        dailyAmount = expense.amount / periodDays;
        break;
      default:
        dailyAmount = expense.amount / 30.44;
    }

    // Calculate overlap with our period
    const expenseStart = new Date(expense.start_date);
    const expenseEnd = expense.end_date ? new Date(expense.end_date) : end;

    const overlapStart = expenseStart > start ? expenseStart : start;
    const overlapEnd = expenseEnd < end ? expenseEnd : end;
    const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const periodAmount = dailyAmount * overlapDays;

    // Check category and description for allocation
    const description = expense.description?.trim() || '';
    const category = expense.category?.toLowerCase() || '';

    // PREMISES: Allocate production_premises_pct to overhead
    if (category === 'premises') {
      breakdown.premises.total += periodAmount;
      const allocated = periodAmount * (config.production_premises_pct / 100);
      breakdown.premises.allocated += allocated;
      totalManufacturingOverhead += allocated;
      totalExcludeFromOPEX += allocated;
    }

    // STAFF: Check if this person is in staff_allocations
    if (category === 'staff') {
      // Try to match by checking if any configured name is contained in the description
      for (const [staffName, allocation] of Object.entries(config.staff_allocations)) {
        if (description.toLowerCase().includes(staffName.toLowerCase())) {
          const directLaborPct = allocation.direct_labor_pct || 0;
          const overheadPct = allocation.overhead_pct || 0;

          const directLabor = periodAmount * (directLaborPct / 100);
          const overhead = periodAmount * (overheadPct / 100);

          breakdown.staff.push({
            description,
            total: periodAmount,
            directLabor,
            overhead,
          });

          totalDirectLabor += directLabor;
          totalManufacturingOverhead += overhead;
          totalExcludeFromOPEX += directLabor + overhead;
          break; // Only match once
        }
      }
    }

    // EQUIPMENT: Check if this equipment is in equipment_allocations
    if (category === 'equipment') {
      for (const [equipmentName, allocationPct] of Object.entries(config.equipment_allocations)) {
        if (description.toLowerCase().includes(equipmentName.toLowerCase())) {
          const allocated = periodAmount * (allocationPct / 100);

          breakdown.equipment.push({
            description,
            total: periodAmount,
            allocated,
          });

          totalManufacturingOverhead += allocated;
          totalExcludeFromOPEX += allocated;
          break;
        }
      }
    }
  }

  const totalAllocatedToCOGS = totalDirectLabor + totalManufacturingOverhead;

  // Calculate per-order amounts
  const perOrderDirectLabor = orderCount > 0 ? totalDirectLabor / orderCount : 0;
  const perOrderOverhead = orderCount > 0 ? totalManufacturingOverhead / orderCount : 0;
  const perOrderTotal = orderCount > 0 ? totalAllocatedToCOGS / orderCount : 0;

  return {
    directLabor: totalDirectLabor,
    manufacturingOverhead: totalManufacturingOverhead,
    totalAllocatedToCOGS,
    perOrderDirectLabor,
    perOrderOverhead,
    perOrderTotal,
    breakdown,
    excludeFromOPEX: totalExcludeFromOPEX,
  };
}

/**
 * Get a summary of manufacturing overhead config for display
 */
export async function getManufacturingConfigSummary(
  supabase: SupabaseClient
): Promise<{
  premisesPct: number;
  staffCount: number;
  equipmentCount: number;
  staffNames: string[];
  equipmentNames: string[];
} | null> {
  const config = await loadManufacturingConfig(supabase);
  if (!config) return null;

  return {
    premisesPct: config.production_premises_pct,
    staffCount: Object.keys(config.staff_allocations).length,
    equipmentCount: Object.keys(config.equipment_allocations).length,
    staffNames: Object.keys(config.staff_allocations),
    equipmentNames: Object.keys(config.equipment_allocations),
  };
}
