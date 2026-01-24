'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
import type { BrandFilter, PeriodType, DateRange } from '@/types';

interface DashboardFiltersProps {
  brandFilter: BrandFilter;
  onBrandFilterChange: (brand: BrandFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (period: PeriodType) => void;
  showYoY: boolean;
  onShowYoYChange: (show: boolean) => void;
}

export function DashboardFilters({
  brandFilter,
  onBrandFilterChange,
  dateRange,
  onDateRangeChange,
  periodType,
  onPeriodTypeChange,
  showYoY,
  onShowYoYChange,
}: DashboardFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg">
      {/* Brand Filter */}
      <div className="flex items-center gap-2">
        <Label htmlFor="brand-filter" className="text-sm font-medium text-muted-foreground">
          Brand
        </Label>
        <Select value={brandFilter} onValueChange={(v) => onBrandFilterChange(v as BrandFilter)}>
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

      {/* Date Range Picker */}
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
                dateRange.to ? (
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
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to });
                  setIsCalendarOpen(false);
                } else if (range?.from) {
                  onDateRangeChange({ from: range.from, to: range.from });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Period Type */}
      <div className="flex items-center gap-2">
        <Label htmlFor="period-type" className="text-sm font-medium text-muted-foreground">
          View
        </Label>
        <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as PeriodType)}>
          <SelectTrigger id="period-type" className="w-[130px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
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
  );
}
