// Cash Flow Scenario Modeling
// Supports baseline, optimistic, and pessimistic projections

import { addDays, format, startOfDay } from 'date-fns';

// ============================================
// Types
// ============================================

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  revenueAdjustmentPct: number;  // +20 = 20% increase
  costAdjustmentPct: number;     // +10 = 10% increase
  isDefault: boolean;
}

export interface ScenarioProjection {
  scenario: Scenario;
  projections: WeeklyProjection[];
  summary: ScenarioSummary;
}

export interface WeeklyProjection {
  weekNumber: number;
  date: string;
  startingBalance: number;
  inflows: number;
  outflows: number;
  netChange: number;
  endingBalance: number;
}

export interface ScenarioSummary {
  endingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  lowestPoint: number;
  lowestPointWeek: number;
  goesNegative: boolean;
  weeksUntilNegative: number | null;
}

// ============================================
// Default Scenarios
// ============================================

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 'baseline',
    name: 'Baseline',
    description: 'Current trajectory based on actual data',
    revenueAdjustmentPct: 0,
    costAdjustmentPct: 0,
    isDefault: true,
  },
  {
    id: 'optimistic',
    name: 'Optimistic',
    description: 'Revenue up 20%, costs down 10%',
    revenueAdjustmentPct: 20,
    costAdjustmentPct: -10,
    isDefault: false,
  },
  {
    id: 'pessimistic',
    name: 'Pessimistic',
    description: 'Revenue down 20%, costs up 10%',
    revenueAdjustmentPct: -20,
    costAdjustmentPct: 10,
    isDefault: false,
  },
];

// ============================================
// Scenario Calculations
// ============================================

/**
 * Apply scenario adjustments to a base value
 */
export function applyScenarioAdjustment(
  baseValue: number,
  adjustmentPct: number
): number {
  return baseValue * (1 + adjustmentPct / 100);
}

/**
 * Calculate weekly projections for a scenario
 */
export function calculateScenarioProjection(
  scenario: Scenario,
  startingBalance: number,
  baselineWeeklyInflows: number,
  baselineWeeklyOutflows: number,
  weeks: number = 12
): ScenarioProjection {
  const projections: WeeklyProjection[] = [];
  const today = startOfDay(new Date());

  // Apply scenario adjustments
  // Revenue adjustment affects inflows (positive adjustment = more inflows)
  // Cost adjustment affects outflows (positive adjustment = more outflows)
  const adjustedInflows = applyScenarioAdjustment(baselineWeeklyInflows, scenario.revenueAdjustmentPct);
  const adjustedOutflows = applyScenarioAdjustment(baselineWeeklyOutflows, scenario.costAdjustmentPct);

  let currentBalance = startingBalance;
  let lowestPoint = startingBalance;
  let lowestPointWeek = 0;
  let goesNegative = false;
  let weeksUntilNegative: number | null = null;
  let totalInflows = 0;
  let totalOutflows = 0;

  for (let week = 1; week <= weeks; week++) {
    const weekDate = addDays(today, (week - 1) * 7);
    const weeklyNetChange = adjustedInflows - adjustedOutflows;
    const endingBalance = currentBalance + weeklyNetChange;

    projections.push({
      weekNumber: week,
      date: format(weekDate, 'yyyy-MM-dd'),
      startingBalance: Math.round(currentBalance),
      inflows: Math.round(adjustedInflows),
      outflows: Math.round(adjustedOutflows),
      netChange: Math.round(weeklyNetChange),
      endingBalance: Math.round(endingBalance),
    });

    totalInflows += adjustedInflows;
    totalOutflows += adjustedOutflows;

    if (endingBalance < lowestPoint) {
      lowestPoint = endingBalance;
      lowestPointWeek = week;
    }

    if (endingBalance < 0 && !goesNegative) {
      goesNegative = true;
      weeksUntilNegative = week;
    }

    currentBalance = endingBalance;
  }

  return {
    scenario,
    projections,
    summary: {
      endingBalance: Math.round(currentBalance),
      totalInflows: Math.round(totalInflows),
      totalOutflows: Math.round(totalOutflows),
      lowestPoint: Math.round(lowestPoint),
      lowestPointWeek,
      goesNegative,
      weeksUntilNegative,
    },
  };
}

/**
 * Calculate projections for all scenarios
 */
export function calculateAllScenarios(
  scenarios: Scenario[],
  startingBalance: number,
  baselineWeeklyInflows: number,
  baselineWeeklyOutflows: number,
  weeks: number = 12
): ScenarioProjection[] {
  return scenarios.map(scenario =>
    calculateScenarioProjection(
      scenario,
      startingBalance,
      baselineWeeklyInflows,
      baselineWeeklyOutflows,
      weeks
    )
  );
}

// ============================================
// Scenario Comparison
// ============================================

export interface ScenarioComparison {
  baselineEndBalance: number;
  optimisticEndBalance: number;
  pessimisticEndBalance: number;
  baselineGoesNegative: boolean;
  pessimisticGoesNegative: boolean;
  riskAssessment: 'low' | 'medium' | 'high';
  recommendation: string;
}

/**
 * Compare scenarios and generate risk assessment
 */
export function compareScenarios(
  projections: ScenarioProjection[]
): ScenarioComparison {
  const baseline = projections.find(p => p.scenario.id === 'baseline' || p.scenario.isDefault);
  const optimistic = projections.find(p => p.scenario.id === 'optimistic' || p.scenario.revenueAdjustmentPct > 0);
  const pessimistic = projections.find(p => p.scenario.id === 'pessimistic' || p.scenario.revenueAdjustmentPct < 0);

  const baselineSummary = baseline?.summary || { endingBalance: 0, goesNegative: false };
  const optimisticSummary = optimistic?.summary || { endingBalance: 0, goesNegative: false };
  const pessimisticSummary = pessimistic?.summary || { endingBalance: 0, goesNegative: false };

  // Risk assessment logic
  let riskAssessment: 'low' | 'medium' | 'high' = 'low';
  let recommendation = 'Cash position is healthy across all scenarios.';

  if (pessimisticSummary.goesNegative) {
    if (baselineSummary.goesNegative) {
      riskAssessment = 'high';
      recommendation = 'Urgent action needed: cash position goes negative in baseline scenario. Reduce costs or accelerate revenue immediately.';
    } else {
      riskAssessment = 'medium';
      recommendation = 'Caution advised: cash position could go negative in adverse conditions. Build reserves or reduce discretionary spending.';
    }
  } else if (baselineSummary.endingBalance < 10000) {
    riskAssessment = 'medium';
    recommendation = 'Monitor closely: 12-week ending balance is relatively low. Consider building additional reserves.';
  }

  return {
    baselineEndBalance: baselineSummary.endingBalance,
    optimisticEndBalance: optimisticSummary.endingBalance,
    pessimisticEndBalance: pessimisticSummary.endingBalance,
    baselineGoesNegative: baselineSummary.goesNegative,
    pessimisticGoesNegative: pessimisticSummary.goesNegative,
    riskAssessment,
    recommendation,
  };
}

// ============================================
// Scenario Chart Data
// ============================================

export interface ScenarioChartPoint {
  week: number;
  date: string;
  baseline: number;
  optimistic: number;
  pessimistic: number;
}

/**
 * Transform scenario projections into chart-friendly format
 */
export function getScenarioChartData(
  projections: ScenarioProjection[]
): ScenarioChartPoint[] {
  const baseline = projections.find(p => p.scenario.id === 'baseline' || p.scenario.isDefault);
  const optimistic = projections.find(p => p.scenario.id === 'optimistic' || p.scenario.revenueAdjustmentPct > 0);
  const pessimistic = projections.find(p => p.scenario.id === 'pessimistic' || p.scenario.revenueAdjustmentPct < 0);

  if (!baseline) return [];

  return baseline.projections.map((bp, idx) => ({
    week: bp.weekNumber,
    date: bp.date,
    baseline: bp.endingBalance,
    optimistic: optimistic?.projections[idx]?.endingBalance || bp.endingBalance,
    pessimistic: pessimistic?.projections[idx]?.endingBalance || bp.endingBalance,
  }));
}

// ============================================
// Custom Scenario Creation
// ============================================

/**
 * Create a custom scenario with specific adjustments
 */
export function createCustomScenario(
  name: string,
  revenueAdjustmentPct: number,
  costAdjustmentPct: number,
  description?: string
): Scenario {
  return {
    id: `custom-${Date.now()}`,
    name,
    description: description || `Revenue ${revenueAdjustmentPct >= 0 ? '+' : ''}${revenueAdjustmentPct}%, Costs ${costAdjustmentPct >= 0 ? '+' : ''}${costAdjustmentPct}%`,
    revenueAdjustmentPct,
    costAdjustmentPct,
    isDefault: false,
  };
}

/**
 * Validate scenario adjustments
 */
export function validateScenarioAdjustments(
  revenueAdjustmentPct: number,
  costAdjustmentPct: number
): { valid: boolean; error?: string } {
  if (revenueAdjustmentPct < -100) {
    return { valid: false, error: 'Revenue cannot decrease by more than 100%' };
  }
  if (revenueAdjustmentPct > 200) {
    return { valid: false, error: 'Revenue increase capped at 200%' };
  }
  if (costAdjustmentPct < -100) {
    return { valid: false, error: 'Costs cannot decrease by more than 100%' };
  }
  if (costAdjustmentPct > 200) {
    return { valid: false, error: 'Cost increase capped at 200%' };
  }
  return { valid: true };
}
