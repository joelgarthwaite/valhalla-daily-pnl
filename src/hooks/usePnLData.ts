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
  alignYoYPeriods,
  type AggregatedPnLWithYoY,
} from '@/lib/pnl/aggregations';
import { calculateQuarterlyProgress } from '@/lib/pnl/targets';
import { format, subDays } from 'date-fns';

interface UsePnLDataResult {
  brands: Brand[];
  dailyData: DailyPnL[];
  aggregatedDataWithYoY: AggregatedPnLWithYoY[];
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
  const [yoyData, setYoyData] = useState<DailyPnL[]>([]);
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

      // Add YoY date params if YoY comparison is enabled
      if (showYoY) {
        const yoyRange = getYoYDateRange(dateRange);
        params.set('from_yoy', format(yoyRange.from, 'yyyy-MM-dd'));
        params.set('to_yoy', format(yoyRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/pnl/data?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      setBrands(data.brands || []);
      setDailyData(data.dailyPnl || []);
      setYoyData(data.dailyPnlYoY || []);
      setAdSpendData(data.adSpend || []);
      setQuarterlyGoal(data.quarterlyGoal);
      setOpexData(data.opex || null);

    } catch (err) {
      console.error('Error fetching P&L data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [brandFilter, dateRange, showYoY]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate derived data
  const aggregatedData = aggregatePnLByPeriod(dailyData, periodType);

  // Aggregate YoY data and align with current data
  const aggregatedYoYData = showYoY && yoyData.length > 0
    ? aggregatePnLByPeriod(yoyData, periodType)
    : [];

  // Create aligned data with YoY comparisons
  const aggregatedDataWithYoY: AggregatedPnLWithYoY[] = showYoY && aggregatedYoYData.length > 0
    ? alignYoYPeriods(aggregatedData, aggregatedYoYData, periodType)
    : aggregatedData.map(d => ({ ...d, periodKey: d.period }));

  // Calculate summary with comparison (including OPEX)
  const summary = dailyData.length > 0
    ? calculatePnLSummaryWithComparison(
        dailyData,
        showYoY ? yoyData : dailyData, // Compare to YoY data if enabled
        opexData?.periodTotal || 0,
        opexData?.summary.byCategory || {}
      )
    : null;

  // Format trend data
  const trendData = formatTrendData(
    dailyData,
    showYoY ? yoyData : undefined
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
    aggregatedDataWithYoY,
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
