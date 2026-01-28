'use client';

import { useCallback, useMemo, useEffect } from 'react';
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

// localStorage key for persisting filter preferences
const STORAGE_KEY = 'valhalla_pnl_filters';

// Default values - "yesterday" as single date
const getDefaultDateRange = (): DateRange => {
  const yesterday = subDays(new Date(), 1);
  yesterday.setHours(0, 0, 0, 0);
  return {
    from: yesterday,
    to: yesterday,
  };
};

const DEFAULT_BRAND: BrandFilter = 'all';
const DEFAULT_PERIOD: PeriodType = 'daily';
const DEFAULT_YOY = false;
const DEFAULT_MODE: DateSelectionMode = 'single';

// Get stored preferences from localStorage
const getStoredPreferences = (): Partial<FilterState> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Parse dates if they exist
    if (parsed.dateRange) {
      parsed.dateRange = {
        from: new Date(parsed.dateRange.from),
        to: new Date(parsed.dateRange.to),
      };
    }
    return parsed;
  } catch {
    return null;
  }
};

// Save preferences to localStorage
const savePreferences = (state: FilterState) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      brandFilter: state.brandFilter,
      dateRange: {
        from: state.dateRange.from.toISOString(),
        to: state.dateRange.to.toISOString(),
      },
      periodType: state.periodType,
      showYoY: state.showYoY,
      selectionMode: state.selectionMode,
    }));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Hook to persist filter state in URL query parameters and localStorage.
 * - URL params take priority (for shareable links)
 * - Falls back to localStorage (for user preferences)
 * - Defaults to "yesterday" with single date mode
 *
 * URL Schema:
 * ?brand=DC&from=2025-01-01&to=2025-01-31&period=daily&yoy=false&mode=single
 */
export function useFilterParams(): UseFilterParamsReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current filter state from URL, falling back to localStorage, then defaults
  const filterState = useMemo((): FilterState => {
    const defaultRange = getDefaultDateRange();
    const stored = getStoredPreferences();

    // Check if URL has any filter params
    const hasUrlParams = searchParams.has('from') || searchParams.has('to') ||
                         searchParams.has('brand') || searchParams.has('mode');

    // Parse brand - URL > localStorage > default
    const brandParam = searchParams.get('brand');
    let brandFilter: BrandFilter;
    if (brandParam === 'DC' || brandParam === 'BI' || brandParam === 'all') {
      brandFilter = brandParam;
    } else if (hasUrlParams) {
      // URL has params but no valid brand - default to 'all'
      brandFilter = DEFAULT_BRAND;
    } else {
      // No URL params - use stored preference or default
      brandFilter = stored?.brandFilter ?? DEFAULT_BRAND;
    }

    // Parse dates - URL > localStorage > default (yesterday)
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    let fromDate = hasUrlParams ? defaultRange.from : (stored?.dateRange?.from ?? defaultRange.from);
    let toDate = hasUrlParams ? defaultRange.to : (stored?.dateRange?.to ?? defaultRange.to);

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

    // Parse period type - URL > localStorage > default
    const periodParam = searchParams.get('period');
    const periodType: PeriodType =
      periodParam === 'daily' || periodParam === 'weekly' ||
      periodParam === 'monthly' || periodParam === 'quarterly' || periodParam === 'yearly'
        ? periodParam
        : (hasUrlParams ? DEFAULT_PERIOD : (stored?.periodType ?? DEFAULT_PERIOD));

    // Parse YoY toggle - URL > localStorage > default
    const yoyParam = searchParams.get('yoy');
    const showYoY = yoyParam !== null
      ? yoyParam === 'true'
      : (hasUrlParams ? DEFAULT_YOY : (stored?.showYoY ?? DEFAULT_YOY));

    // Parse selection mode - URL > localStorage > default (single)
    const modeParam = searchParams.get('mode');
    const selectionMode: DateSelectionMode =
      modeParam === 'single' || modeParam === 'range' || modeParam === 'week'
        ? modeParam
        : (hasUrlParams ? DEFAULT_MODE : (stored?.selectionMode ?? DEFAULT_MODE));

    return {
      brandFilter,
      dateRange: { from: fromDate, to: toDate },
      periodType,
      showYoY,
      selectionMode,
    };
  }, [searchParams]);

  // Save to localStorage whenever filter state changes
  useEffect(() => {
    savePreferences(filterState);
  }, [filterState]);

  // Update URL with new filter values
  const updateFilters = useCallback((changes: Partial<FilterState>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (changes.brandFilter !== undefined) {
      // Always set brand param explicitly (including 'all') to avoid confusion
      params.set('brand', changes.brandFilter);
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
