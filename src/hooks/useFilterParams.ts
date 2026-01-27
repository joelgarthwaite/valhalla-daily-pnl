'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parse, subDays, isValid } from 'date-fns';
import type { BrandFilter, PeriodType, DateRange, DateSelectionMode } from '@/types';

interface FilterState {
  brandFilter: BrandFilter;
  dateRange: DateRange;
  periodType: PeriodType;
  showYoY: boolean;
  selectionMode: DateSelectionMode;
}

interface UseFilterParamsReturn extends FilterState {
  updateFilters: (changes: Partial<FilterState>) => void;
  setDateRange: (range: DateRange) => void;
  setBrandFilter: (brand: BrandFilter) => void;
  setPeriodType: (period: PeriodType) => void;
  setShowYoY: (show: boolean) => void;
  setSelectionMode: (mode: DateSelectionMode) => void;
}

// Default values
const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return {
    from: subDays(now, 29),
    to: now,
  };
};

const DEFAULT_BRAND: BrandFilter = 'all';
const DEFAULT_PERIOD: PeriodType = 'daily';
const DEFAULT_YOY = false;
const DEFAULT_MODE: DateSelectionMode = 'range';

/**
 * Hook to persist filter state in URL query parameters.
 * Enables shareable/bookmarkable filtered views and persistence across navigation.
 *
 * URL Schema:
 * ?brand=DC&from=2025-01-01&to=2025-01-31&period=daily&yoy=false&mode=range
 */
export function useFilterParams(): UseFilterParamsReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current filter state from URL
  const filterState = useMemo((): FilterState => {
    const defaultRange = getDefaultDateRange();

    // Parse brand
    const brandParam = searchParams.get('brand');
    const brandFilter: BrandFilter =
      brandParam === 'DC' || brandParam === 'BI' || brandParam === 'all'
        ? brandParam
        : DEFAULT_BRAND;

    // Parse dates
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let fromDate = defaultRange.from;
    let toDate = defaultRange.to;

    if (fromParam) {
      const parsed = parse(fromParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        fromDate = parsed;
      }
    }

    if (toParam) {
      const parsed = parse(toParam, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        toDate = parsed;
      }
    }

    // Ensure from is before or equal to to
    if (fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }

    // Parse period type
    const periodParam = searchParams.get('period');
    const periodType: PeriodType =
      periodParam === 'daily' || periodParam === 'weekly' ||
      periodParam === 'monthly' || periodParam === 'quarterly' || periodParam === 'yearly'
        ? periodParam
        : DEFAULT_PERIOD;

    // Parse YoY toggle
    const yoyParam = searchParams.get('yoy');
    const showYoY = yoyParam === 'true';

    // Parse selection mode
    const modeParam = searchParams.get('mode');
    const selectionMode: DateSelectionMode =
      modeParam === 'single' || modeParam === 'range' || modeParam === 'week'
        ? modeParam
        : DEFAULT_MODE;

    return {
      brandFilter,
      dateRange: { from: fromDate, to: toDate },
      periodType,
      showYoY,
      selectionMode,
    };
  }, [searchParams]);

  // Update URL with new filter values
  const updateFilters = useCallback((changes: Partial<FilterState>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (changes.brandFilter !== undefined) {
      if (changes.brandFilter === DEFAULT_BRAND) {
        params.delete('brand');
      } else {
        params.set('brand', changes.brandFilter);
      }
    }

    if (changes.dateRange !== undefined) {
      params.set('from', format(changes.dateRange.from, 'yyyy-MM-dd'));
      params.set('to', format(changes.dateRange.to, 'yyyy-MM-dd'));
    }

    if (changes.periodType !== undefined) {
      if (changes.periodType === DEFAULT_PERIOD) {
        params.delete('period');
      } else {
        params.set('period', changes.periodType);
      }
    }

    if (changes.showYoY !== undefined) {
      if (changes.showYoY === DEFAULT_YOY) {
        params.delete('yoy');
      } else {
        params.set('yoy', String(changes.showYoY));
      }
    }

    if (changes.selectionMode !== undefined) {
      if (changes.selectionMode === DEFAULT_MODE) {
        params.delete('mode');
      } else {
        params.set('mode', changes.selectionMode);
      }
    }

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  // Convenience setters
  const setDateRange = useCallback((range: DateRange) => {
    updateFilters({ dateRange: range });
  }, [updateFilters]);

  const setBrandFilter = useCallback((brand: BrandFilter) => {
    updateFilters({ brandFilter: brand });
  }, [updateFilters]);

  const setPeriodType = useCallback((period: PeriodType) => {
    updateFilters({ periodType: period });
  }, [updateFilters]);

  const setShowYoY = useCallback((show: boolean) => {
    updateFilters({ showYoY: show });
  }, [updateFilters]);

  const setSelectionMode = useCallback((mode: DateSelectionMode) => {
    updateFilters({ selectionMode: mode });
  }, [updateFilters]);

  return {
    ...filterState,
    updateFilters,
    setDateRange,
    setBrandFilter,
    setPeriodType,
    setShowYoY,
    setSelectionMode,
  };
}
