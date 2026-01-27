'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Brand,
  DailyPnL,
  AdSpend,
  QuarterlyGoal,
  PnLSummaryWithComparison,
  PnLTrendPoint,
  ROASByChannel,
  QuarterlyProgress,
  DateRange,
  BrandFilter,
  PeriodType,
  OpexSummary,
} from '@/types';
import {
  calculatePnLSummaryWithComparison,
  calculateROASByChannel,
  formatTrendData,
} from '@/lib/pnl/calculations';
import {
  aggregatePnLByPeriod,
  getYoYDateRange,
  filterByDateRange,
} from '@/lib/pnl/aggregations';
import { calculateQuarterlyProgress } from '@/lib/pnl/targets';
import { format, subDays } from 'date-fns';

interface UsePnLDataResult {
  brands: Brand[];
  dailyData: DailyPnL[];
  summary: PnLSummaryWithComparison | null;
  trendData: PnLTrendPoint[];
  roasData: ROASByChannel[];
  quarterlyProgress: QuarterlyProgress | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePnLDataOptions {
  brandFilter: BrandFilter;
  dateRange: DateRange;
  periodType: PeriodType;
  showYoY: boolean;
}

export function usePnLData(options: UsePnLDataOptions): UsePnLDataResult {
  const { brandFilter, dateRange, periodType, showYoY } = options;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [dailyData, setDailyData] = useState<DailyPnL[]>([]);
  const [adSpendData, setAdSpendData] = useState<AdSpend[]>([]);
  const [quarterlyGoal, setQuarterlyGoal] = useState<QuarterlyGoal | null>(null);
  const [opexData, setOpexData] = useState<{ periodTotal: number; summary: OpexSummary } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use server-side API route to bypass slow RLS
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        brand: brandFilter,
      });

      const response = await fetch(`/api/pnl/data?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setBrands(data.brands || []);
      setDailyData(data.dailyPnl || []);
      setAdSpendData(data.adSpend || []);
      setQuarterlyGoal(data.quarterlyGoal);
      setOpexData(data.opex || null);

    } catch (err) {
      console.error('Error fetching P&L data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [brandFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate derived data
  const aggregatedData = aggregatePnLByPeriod(dailyData, periodType);

  // Get YoY comparison data if enabled
  let previousYearData: DailyPnL[] = [];
  if (showYoY) {
    const yoyRange = getYoYDateRange(dateRange);
    previousYearData = filterByDateRange(dailyData, yoyRange);
  }

  // Calculate summary with comparison (including OPEX)
  const summary = dailyData.length > 0
    ? calculatePnLSummaryWithComparison(
        dailyData,
        showYoY ? previousYearData : dailyData, // Compare to self if no YoY
        opexData?.periodTotal || 0,
        opexData?.summary.byCategory || {}
      )
    : null;

  // Format trend data
  const trendData = formatTrendData(
    dailyData,
    showYoY ? previousYearData : undefined
  );

  // Calculate ROAS by channel
  const roasData = calculateROASByChannel(adSpendData);

  // Calculate quarterly progress
  const quarterlyProgress = calculateQuarterlyProgress(
    quarterlyGoal,
    dailyData
  );

  return {
    brands,
    dailyData: aggregatedData as unknown as DailyPnL[], // Aggregated format
    summary,
    trendData,
    roasData,
    quarterlyProgress,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Default date range: yesterday (single day view)
export function getDefaultDateRange(): DateRange {
  const yesterday = subDays(new Date(), 1);
  return {
    from: yesterday,
    to: yesterday,
  };
}
