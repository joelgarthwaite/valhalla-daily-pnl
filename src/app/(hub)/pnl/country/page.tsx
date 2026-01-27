'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { RefreshCw, Download, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CountrySummaryCards,
  CountryTable,
  CountryRevenueChart,
} from '@/components/country';
import { useFilterParams } from '@/hooks/useFilterParams';
import type { CountryPnL, CountrySummary } from '@/lib/pnl/country-calculations';
import type { BrandFilter } from '@/types';

interface CountryApiResponse {
  countries: CountryPnL[];
  summary: CountrySummary;
  dateRange: {
    from: string;
    to: string;
  };
  brandFilter: string;
  hasAdSpendData: boolean;
}

// Preset date ranges
const getPresetRange = {
  thisWeek: () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return { from: monday, to: new Date() };
  },
  lastWeek: () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) - 7;
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: monday, to: sunday };
  },
  thisMonth: () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfMonth, to: now };
  },
  last30: () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from, to: now };
  },
  last90: () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const from = new Date(now);
    from.setDate(from.getDate() - 89);
    return { from, to: now };
  },
  ytd: () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return { from: startOfYear, to: now };
  },
};

const presetLabels = {
  thisWeek: 'This Week',
  lastWeek: 'Last Week',
  thisMonth: 'This Month',
  last30: 'Last 30 Days',
  last90: 'Last 90 Days',
  ytd: 'Year to Date',
};

function CountryAnalysisContent() {
  const {
    brandFilter,
    dateRange,
    setBrandFilter,
    setDateRange,
  } = useFilterParams();

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [countries, setCountries] = useState<CountryPnL[]>([]);
  const [summary, setSummary] = useState<CountrySummary | null>(null);
  const [hasAdSpendData, setHasAdSpendData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        brand: brandFilter,
      });

      const response = await fetch(`/api/pnl/country?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: CountryApiResponse = await response.json();

      setCountries(data.countries);
      setSummary(data.summary);
      setHasAdSpendData(data.hasAdSpendData);
    } catch (err) {
      console.error('Error fetching country data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [brandFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePresetClick = (presetKey: keyof typeof getPresetRange) => {
    const range = getPresetRange[presetKey]();
    setDateRange(range);
    setIsCalendarOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Country Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            P&L breakdown by shipping destination
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Brand Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="brand-filter" className="text-sm font-medium text-muted-foreground">
                Brand
              </Label>
              <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as BrandFilter)}>
                <SelectTrigger id="brand-filter" className="w-[160px]">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="DC">Display Champ</SelectItem>
                  <SelectItem value="BI">Bright Ivy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Date Range
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[280px] justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} -{' '}
                          {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex">
                    {/* Presets sidebar */}
                    <div className="border-r p-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Quick Select</p>
                      {(Object.keys(getPresetRange) as (keyof typeof getPresetRange)[]).map((key) => (
                        <Button
                          key={key}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7"
                          onClick={() => handlePresetClick(key)}
                        >
                          {presetLabels[key]}
                        </Button>
                      ))}
                    </div>

                    {/* Calendar */}
                    <div className="p-3">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setDateRange({ from: range.from, to: range.to });
                            setIsCalendarOpen(false);
                          } else if (range?.from) {
                            setDateRange({ from: range.from, to: range.from });
                          }
                        }}
                        numberOfMonths={2}
                        weekStartsOn={1}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quick:</span>
              {(['thisWeek', 'lastWeek', 'thisMonth', 'last30', 'ytd'] as const).map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handlePresetClick(key)}
                >
                  {presetLabels[key]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className={`border rounded-lg p-4 ${hasAdSpendData ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        <p className={`text-sm ${hasAdSpendData ? 'text-green-700' : 'text-blue-700'}`}>
          {hasAdSpendData ? (
            <>
              <strong>Ad Spend Data Available:</strong> This view includes GP3 metrics using Meta ad delivery
              location data. Note: Ad delivery location (where the ad was shown) may differ from shipping
              destination (where the order was delivered).
            </>
          ) : (
            <>
              <strong>Note:</strong> Country analysis shows P&L metrics up to GP2 (Gross Profit 2)
              because ad spend cannot be attributed to specific countries. GP2 includes:
              Revenue - COGS - Platform Fees - Pick & Pack - Logistics.
            </>
          )}
        </p>
      </div>

      {/* Summary Cards */}
      <CountrySummaryCards summary={summary} isLoading={isLoading} />

      {/* Revenue Chart */}
      <CountryRevenueChart data={countries} isLoading={isLoading} />

      {/* Country Table */}
      <Card>
        <CardHeader>
          <CardTitle>Country Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <CountryTable data={countries} isLoading={isLoading} hasAdSpendData={hasAdSpendData} />
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function CountryAnalysisLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading country analysis...</p>
      </div>
    </div>
  );
}

export default function CountryAnalysisPage() {
  return (
    <Suspense fallback={<CountryAnalysisLoading />}>
      <CountryAnalysisContent />
    </Suspense>
  );
}
