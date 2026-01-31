'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subDays,
  subWeeks,
  subMonths,
  getWeek,
  getYear,
} from 'date-fns';
import { CalendarIcon, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { WeekPicker, getWeekDateRange } from './WeekPicker';
import type { BrandFilter, PeriodType, DateRange, DateSelectionMode, WeekSelection } from '@/types';

interface DashboardFiltersProps {
  brandFilter: BrandFilter;
  onBrandFilterChange: (brand: BrandFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (period: PeriodType) => void;
  showYoY: boolean;
  onShowYoYChange: (show: boolean) => void;
  selectionMode?: DateSelectionMode;
  onSelectionModeChange?: (mode: DateSelectionMode) => void;
}

// Preset date ranges
type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'ytd' | 'allTime';

interface Preset {
  label: string;
  getRange: () => DateRange;
}

const presets: Record<PresetKey, Preset> = {
  today: {
    label: 'Today',
    getRange: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { from: today, to: today };
    },
  },
  yesterday: {
    label: 'Yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      yesterday.setHours(0, 0, 0, 0);
      return { from: yesterday, to: yesterday };
    },
  },
  thisWeek: {
    label: 'This Week',
    getRange: () => {
      const now = new Date();
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      };
    },
  },
  lastWeek: {
    label: 'Last Week',
    getRange: () => {
      const lastWeek = subWeeks(new Date(), 1);
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    },
  },
  thisMonth: {
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    },
  },
  lastMonth: {
    label: 'Last Month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  last30: {
    label: 'Last 30 Days',
    getRange: () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return {
        from: subDays(now, 29),
        to: now,
      };
    },
  },
  last90: {
    label: 'Last 90 Days',
    getRange: () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return {
        from: subDays(now, 89),
        to: now,
      };
    },
  },
  ytd: {
    label: 'Year to Date',
    getRange: () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return {
        from: startOfYear(now),
        to: now,
      };
    },
  },
  allTime: {
    label: 'All Time',
    getRange: () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      // Start from Jan 1, 2024 when data collection began
      const allTimeStart = new Date(2024, 0, 1);
      return {
        from: allTimeStart,
        to: now,
      };
    },
  },
};

export function DashboardFilters({
  brandFilter,
  onBrandFilterChange,
  dateRange,
  onDateRangeChange,
  periodType,
  onPeriodTypeChange,
  showYoY,
  onShowYoYChange,
  selectionMode: selectionModeProp,
  onSelectionModeChange,
}: DashboardFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // Use prop if provided, otherwise fall back to local state (for backward compatibility)
  const [localSelectionMode, setLocalSelectionMode] = useState<DateSelectionMode>(selectionModeProp || 'single');
  const selectionMode = selectionModeProp ?? localSelectionMode;
  const setSelectionMode = onSelectionModeChange ?? setLocalSelectionMode;

  // Week selection state derived from date range
  const weekSelection = useMemo((): WeekSelection => {
    return {
      year: getYear(dateRange.from),
      week: getWeek(dateRange.from, { weekStartsOn: 1, firstWeekContainsDate: 4 }),
    };
  }, [dateRange.from]);

  const handleModeChange = (mode: DateSelectionMode) => {
    setSelectionMode(mode);
    // When switching to week mode, adjust date range to full week
    if (mode === 'week') {
      const weekRange = getWeekDateRange(weekSelection.year, weekSelection.week);
      onDateRangeChange(weekRange);
    }
  };

  const handleWeekChange = (selection: WeekSelection, range: DateRange) => {
    onDateRangeChange(range);
  };

  const handlePresetClick = (presetKey: PresetKey) => {
    const range = presets[presetKey].getRange();
    onDateRangeChange(range);
    setIsCalendarOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Main filter row */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg">
        {/* Brand Filter */}
        <div className="flex items-center gap-2">
          <Label htmlFor="brand-filter" className="text-sm font-medium text-muted-foreground hidden sm:inline">
            Brand
          </Label>
          <Select value={brandFilter} onValueChange={(v) => onBrandFilterChange(v as BrandFilter)}>
            <SelectTrigger id="brand-filter" className="w-[140px] sm:w-[160px] h-9 sm:h-10">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="h-10 sm:h-8">All Brands</SelectItem>
              <SelectItem value="DC" className="h-10 sm:h-8">Display Champ</SelectItem>
              <SelectItem value="BI" className="h-10 sm:h-8">Bright Ivy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selection Mode Toggle */}
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-muted-foreground hidden sm:inline">
            Select
          </Label>
          <div className="flex rounded-lg border bg-muted p-0.5">
            <Button
              variant={selectionMode === 'single' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 sm:h-7 px-3 sm:px-3 text-xs"
              onClick={() => handleModeChange('single')}
            >
              Date
            </Button>
            <Button
              variant={selectionMode === 'range' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 sm:h-7 px-3 sm:px-3 text-xs"
              onClick={() => handleModeChange('range')}
            >
              Range
            </Button>
            <Button
              variant={selectionMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 sm:h-7 px-3 sm:px-3 text-xs"
              onClick={() => handleModeChange('week')}
            >
              Week
            </Button>
          </div>
        </div>

        {/* Date Selection - depends on mode */}
        {selectionMode === 'week' ? (
          <WeekPicker
            value={weekSelection}
            onChange={handleWeekChange}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-muted-foreground">
              {selectionMode === 'single' ? 'Date' : 'Date Range'}
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'min-w-[280px] justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {selectionMode === 'single' ? (
                    format(dateRange.from, 'MMM d, yyyy')
                  ) : dateRange?.from ? (
                    dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() ? (
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{format(dateRange.from, 'MMM d, yyyy')}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="font-medium">{format(dateRange.to, 'MMM d, yyyy')}</span>
                      </span>
                    ) : (
                      format(dateRange.from, 'MMM d, yyyy')
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
                    {Object.entries(presets).map(([key, preset]) => (
                      <Button
                        key={key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7"
                        onClick={() => handlePresetClick(key as PresetKey)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  {/* Calendar */}
                  <div className="p-3">
                    {selectionMode === 'range' && (
                      <div className="flex gap-4 mb-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Start:</span>
                          <span>{dateRange.from ? format(dateRange.from, 'MMM d, y') : 'Select'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">End:</span>
                          <span>{dateRange.to ? format(dateRange.to, 'MMM d, y') : 'Select'}</span>
                        </div>
                      </div>
                    )}
                    {selectionMode === 'single' ? (
                      <Calendar
                        initialFocus
                        mode="single"
                        defaultMonth={dateRange?.from}
                        selected={dateRange.from}
                        onSelect={(date) => {
                          if (date) {
                            onDateRangeChange({ from: date, to: date });
                            setIsCalendarOpen(false);
                          }
                        }}
                        numberOfMonths={2}
                        weekStartsOn={1}
                      />
                    ) : (
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            onDateRangeChange({ from: range.from, to: range.to });
                            setIsCalendarOpen(false);
                          } else if (range?.from) {
                            onDateRangeChange({ from: range.from, to: range.from });
                          }
                        }}
                        numberOfMonths={2}
                        weekStartsOn={1}
                      />
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Period Type */}
        <div className="flex items-center gap-2">
          <Label htmlFor="period-type" className="text-sm font-medium text-muted-foreground hidden sm:inline">
            View
          </Label>
          <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as PeriodType)}>
            <SelectTrigger id="period-type" className="w-[110px] sm:w-[130px] h-9 sm:h-10">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily" className="h-10 sm:h-8">Daily</SelectItem>
              <SelectItem value="weekly" className="h-10 sm:h-8">Weekly</SelectItem>
              <SelectItem value="monthly" className="h-10 sm:h-8">Monthly</SelectItem>
              <SelectItem value="quarterly" className="h-10 sm:h-8">Quarterly</SelectItem>
              <SelectItem value="yearly" className="h-10 sm:h-8">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* YoY Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="yoy-toggle" className="text-sm font-medium text-muted-foreground">
            Compare YoY
          </Label>
          <Switch
            id="yoy-toggle"
            checked={showYoY}
            onCheckedChange={onShowYoYChange}
          />
        </div>
      </div>

      {/* Quick presets row - shown for range mode only */}
      {selectionMode === 'range' && (
        <div className="flex flex-wrap gap-2 px-1">
          <span className="text-xs text-muted-foreground py-1 hidden sm:inline">Quick:</span>
          {(['thisWeek', 'lastWeek', 'thisMonth', 'last30', 'ytd', 'allTime'] as PresetKey[]).map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              className="h-9 sm:h-7 text-xs"
              onClick={() => handlePresetClick(key)}
            >
              {presets[key].label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
