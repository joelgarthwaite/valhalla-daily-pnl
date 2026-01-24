'use client';

import { useState, useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  setWeek,
  getWeek,
  getYear,
  format,
  getISOWeeksInYear,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { WeekSelection, DateRange } from '@/types';

interface WeekPickerProps {
  value?: WeekSelection;
  onChange: (selection: WeekSelection, dateRange: DateRange) => void;
  className?: string;
}

// Get date range for a specific ISO week
function getWeekDateRange(year: number, week: number): DateRange {
  // Create a date in the middle of January to avoid year boundary issues
  const baseDate = new Date(year, 0, 10);
  // Set to the target week
  const weekDate = setWeek(baseDate, week, { weekStartsOn: 1, firstWeekContainsDate: 4 });

  return {
    from: startOfWeek(weekDate, { weekStartsOn: 1 }),
    to: endOfWeek(weekDate, { weekStartsOn: 1 }),
  };
}

// Get current ISO week
function getCurrentWeek(): WeekSelection {
  const now = new Date();
  return {
    year: getYear(now),
    week: getWeek(now, { weekStartsOn: 1, firstWeekContainsDate: 4 }),
  };
}

export function WeekPicker({ value, onChange, className }: WeekPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentDate = new Date();
  const currentYear = getYear(currentDate);

  // Use provided value or current week
  const selection = value || getCurrentWeek();

  // Available years (past 2 years and next year)
  const years = useMemo(() => {
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, [currentYear]);

  // Number of weeks in selected year
  const weeksInYear = useMemo(() => {
    return getISOWeeksInYear(new Date(selection.year, 0, 1));
  }, [selection.year]);

  // Generate week options
  const weeks = useMemo(() => {
    return Array.from({ length: weeksInYear }, (_, i) => i + 1);
  }, [weeksInYear]);

  // Current date range for display
  const dateRange = useMemo(() => {
    return getWeekDateRange(selection.year, selection.week);
  }, [selection.year, selection.week]);

  const handleYearChange = (yearStr: string) => {
    const newYear = parseInt(yearStr);
    const maxWeek = getISOWeeksInYear(new Date(newYear, 0, 1));
    const newWeek = Math.min(selection.week, maxWeek);
    const newSelection = { year: newYear, week: newWeek };
    onChange(newSelection, getWeekDateRange(newYear, newWeek));
  };

  const handleWeekChange = (week: number) => {
    const newSelection = { year: selection.year, week };
    onChange(newSelection, getWeekDateRange(selection.year, week));
    setIsOpen(false);
  };

  const handlePrevWeek = () => {
    let newYear = selection.year;
    let newWeek = selection.week - 1;

    if (newWeek < 1) {
      newYear -= 1;
      newWeek = getISOWeeksInYear(new Date(newYear, 0, 1));
    }

    const newSelection = { year: newYear, week: newWeek };
    onChange(newSelection, getWeekDateRange(newYear, newWeek));
  };

  const handleNextWeek = () => {
    let newYear = selection.year;
    let newWeek = selection.week + 1;

    const maxWeek = getISOWeeksInYear(new Date(newYear, 0, 1));

    if (newWeek > maxWeek) {
      newYear += 1;
      newWeek = 1;
    }

    const newSelection = { year: newYear, week: newWeek };
    onChange(newSelection, getWeekDateRange(newYear, newWeek));
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handlePrevWeek}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[280px] justify-start text-left font-normal"
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>
              Week {selection.week} ({selection.year})
              <span className="text-muted-foreground ml-2 text-xs">
                {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
              </span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-4" align="start">
          <div className="space-y-4">
            {/* Year Selector */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Year</span>
              <Select
                value={selection.year.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Week Grid */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Week</span>
              <div className="grid grid-cols-7 gap-1">
                {weeks.map((week) => {
                  const isSelected = week === selection.week;
                  const weekRange = getWeekDateRange(selection.year, week);
                  const isCurrentWeek =
                    week === getCurrentWeek().week &&
                    selection.year === getCurrentWeek().year;

                  return (
                    <Button
                      key={week}
                      variant={isSelected ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 w-full text-xs',
                        isCurrentWeek && !isSelected && 'border border-primary'
                      )}
                      onClick={() => handleWeekChange(week)}
                      title={`${format(weekRange.from, 'MMM d')} - ${format(weekRange.to, 'MMM d')}`}
                    >
                      {week}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Selected Week Info */}
            <div className="border-t pt-3 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Selected:</span>
                <span className="font-medium text-foreground">
                  {format(dateRange.from, 'MMM d, yyyy')} -{' '}
                  {format(dateRange.to, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={handleNextWeek}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Export the helper function for use in other components
export { getWeekDateRange, getCurrentWeek };
