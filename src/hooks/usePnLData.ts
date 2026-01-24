'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .returns<Brand[]>();

      if (brandsError) throw brandsError;
      setBrands(brandsData || []);

      // Determine brand ID filter
      let brandId: string | null = null;
      if (brandFilter !== 'all' && brandsData) {
        const brand = brandsData.find((b) => b.code === brandFilter);
        brandId = brand?.id || null;
      }

      // Fetch daily P&L data
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Build and execute daily P&L query
      const dailyQueryBuilder = supabase
        .from('daily_pnl')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      const dailyQuery = brandId
        ? dailyQueryBuilder.eq('brand_id', brandId)
        : dailyQueryBuilder;

      const { data: dailyPnLData, error: dailyError } = await dailyQuery.returns<DailyPnL[]>();

      if (dailyError) throw dailyError;
      setDailyData(dailyPnLData || []);

      // Fetch ad spend data for ROAS
      const adSpendQueryBuilder = supabase
        .from('ad_spend')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate);

      const adSpendQuery = brandId
        ? adSpendQueryBuilder.eq('brand_id', brandId)
        : adSpendQueryBuilder;

      const { data: adSpend, error: adSpendError } = await adSpendQuery.returns<AdSpend[]>();

      if (adSpendError) throw adSpendError;
      setAdSpendData(adSpend || []);

      // Fetch current quarterly goal
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);

      const goalQueryBuilder = supabase
        .from('quarterly_goals')
        .select('*')
        .eq('year', currentYear)
        .eq('quarter', currentQuarter);

      const goalQuery = brandId
        ? goalQueryBuilder.eq('brand_id', brandId)
        : goalQueryBuilder;

      const { data: goalData, error: goalError } = await goalQuery
        .returns<QuarterlyGoal[]>()
        .maybeSingle();

      if (goalError && goalError.code !== 'PGRST116') throw goalError;
      setQuarterlyGoal(goalData);

    } catch (err) {
      console.error('Error fetching P&L data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, brandFilter, dateRange]);

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

  // Calculate summary with comparison
  const summary = dailyData.length > 0
    ? calculatePnLSummaryWithComparison(
        dailyData,
        showYoY ? previousYearData : dailyData // Compare to self if no YoY
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

// Default date range: last 30 days
export function getDefaultDateRange(): DateRange {
  return {
    from: subDays(new Date(), 30),
    to: new Date(),
  };
}
