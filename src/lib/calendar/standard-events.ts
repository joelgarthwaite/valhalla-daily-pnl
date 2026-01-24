// Standard eCommerce Calendar Events
// Date calculation library for holidays and important retail dates

import {
  format,
  addDays,
  setMonth,
  setDate,
  getDay,
  startOfMonth,
  addWeeks,
  previousSunday,
  nextMonday,
} from 'date-fns';

export type StandardEventCategory = 'holiday' | 'promotion' | 'golf_tournament';

export interface StandardEvent {
  title: string;
  category: StandardEventCategory;
  color: string;
  country?: string; // ISO country code or null for universal
  description?: string;
  getDate: (year: number) => Date;
}

// ============================================
// Date Calculation Helpers
// ============================================

/**
 * Get the Nth occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (0-indexed)
 * @param weekday - The day of the week (0 = Sunday, 1 = Monday, etc.)
 * @param n - Which occurrence (1 = first, 2 = second, etc.)
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstOfMonth = startOfMonth(new Date(year, month, 1));
  const firstWeekday = getDay(firstOfMonth);

  // Calculate days until the first occurrence of the weekday
  let daysUntilFirst = weekday - firstWeekday;
  if (daysUntilFirst < 0) daysUntilFirst += 7;

  // Calculate the Nth occurrence
  const nthDate = 1 + daysUntilFirst + (n - 1) * 7;

  return new Date(year, month, nthDate);
}

/**
 * Get the last occurrence of a weekday in a month
 */
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const nextMonth = new Date(year, month + 1, 1);
  const lastDayPrevMonth = addDays(nextMonth, -1);
  const lastWeekday = getDay(lastDayPrevMonth);

  let daysBack = lastWeekday - weekday;
  if (daysBack < 0) daysBack += 7;

  return addDays(lastDayPrevMonth, -daysBack);
}

/**
 * Calculate Easter Sunday using the Anonymous Gregorian algorithm
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

/**
 * Calculate UK Mothering Sunday (4th Sunday in Lent)
 * Mothering Sunday is 3 weeks before Easter Sunday
 */
function calculateUKMotheringSunday(year: number): Date {
  const easter = calculateEasterSunday(year);
  return addDays(easter, -21);
}

/**
 * Calculate German Ascension Day (39 days after Easter Sunday)
 */
function calculateAscensionDay(year: number): Date {
  const easter = calculateEasterSunday(year);
  return addDays(easter, 39);
}

// ============================================
// Standard Events Library
// ============================================

export const STANDARD_EVENTS: StandardEvent[] = [
  // ============================================
  // Universal Fixed Dates
  // ============================================
  {
    title: "New Year's Day",
    category: 'holiday',
    color: '#ef4444',
    description: 'Start of the new year - key retail reset date',
    getDate: (year) => new Date(year, 0, 1),
  },
  {
    title: "Valentine's Day",
    category: 'promotion',
    color: '#ec4899',
    description: 'Major gifting holiday for couples',
    getDate: (year) => new Date(year, 1, 14),
  },
  {
    title: 'Christmas Day',
    category: 'holiday',
    color: '#22c55e',
    description: 'Major gift-giving holiday',
    getDate: (year) => new Date(year, 11, 25),
  },
  {
    title: 'Boxing Day',
    category: 'promotion',
    color: '#22c55e',
    description: 'Major sales day in UK/Commonwealth',
    getDate: (year) => new Date(year, 11, 26),
  },

  // ============================================
  // US Dates
  // ============================================
  {
    title: "Mother's Day (US)",
    category: 'promotion',
    color: '#f472b6',
    country: 'US',
    description: '2nd Sunday in May - major gifting holiday',
    getDate: (year) => getNthWeekdayOfMonth(year, 4, 0, 2), // 2nd Sunday in May
  },
  {
    title: "Father's Day (US)",
    category: 'promotion',
    color: '#3b82f6',
    country: 'US',
    description: '3rd Sunday in June - major gifting holiday',
    getDate: (year) => getNthWeekdayOfMonth(year, 5, 0, 3), // 3rd Sunday in June
  },
  {
    title: 'Memorial Day (US)',
    category: 'holiday',
    color: '#ef4444',
    country: 'US',
    description: 'Last Monday in May - sales weekend',
    getDate: (year) => getLastWeekdayOfMonth(year, 4, 1), // Last Monday in May
  },
  {
    title: 'Labor Day (US)',
    category: 'holiday',
    color: '#ef4444',
    country: 'US',
    description: '1st Monday in September - back to school sales',
    getDate: (year) => getNthWeekdayOfMonth(year, 8, 1, 1), // 1st Monday in September
  },
  {
    title: 'Thanksgiving (US)',
    category: 'holiday',
    color: '#f59e0b',
    country: 'US',
    description: '4th Thursday in November - precedes Black Friday',
    getDate: (year) => getNthWeekdayOfMonth(year, 10, 4, 4), // 4th Thursday in November
  },

  // ============================================
  // UK Dates
  // ============================================
  {
    title: "Mother's Day (UK)",
    category: 'promotion',
    color: '#f472b6',
    country: 'UK',
    description: 'Mothering Sunday - 4th Sunday in Lent (3 weeks before Easter)',
    getDate: (year) => calculateUKMotheringSunday(year),
  },
  {
    title: "Father's Day (UK)",
    category: 'promotion',
    color: '#3b82f6',
    country: 'UK',
    description: '3rd Sunday in June',
    getDate: (year) => getNthWeekdayOfMonth(year, 5, 0, 3), // 3rd Sunday in June
  },
  {
    title: 'Easter Sunday (UK)',
    category: 'holiday',
    color: '#a855f7',
    country: 'UK',
    description: 'Major holiday weekend',
    getDate: (year) => calculateEasterSunday(year),
  },
  {
    title: 'Easter Monday (UK)',
    category: 'holiday',
    color: '#a855f7',
    country: 'UK',
    description: 'Bank holiday - retail spike',
    getDate: (year) => addDays(calculateEasterSunday(year), 1),
  },
  {
    title: 'Spring Bank Holiday (UK)',
    category: 'holiday',
    color: '#22c55e',
    country: 'UK',
    description: 'Last Monday in May',
    getDate: (year) => getLastWeekdayOfMonth(year, 4, 1), // Last Monday in May
  },

  // ============================================
  // Australia Dates
  // ============================================
  {
    title: "Mother's Day (AU)",
    category: 'promotion',
    color: '#f472b6',
    country: 'AU',
    description: '2nd Sunday in May',
    getDate: (year) => getNthWeekdayOfMonth(year, 4, 0, 2), // 2nd Sunday in May
  },
  {
    title: "Father's Day (AU)",
    category: 'promotion',
    color: '#3b82f6',
    country: 'AU',
    description: '1st Sunday in September',
    getDate: (year) => getNthWeekdayOfMonth(year, 8, 0, 1), // 1st Sunday in September
  },

  // ============================================
  // Germany Dates
  // ============================================
  {
    title: "Mother's Day (DE)",
    category: 'promotion',
    color: '#f472b6',
    country: 'DE',
    description: '2nd Sunday in May',
    getDate: (year) => getNthWeekdayOfMonth(year, 4, 0, 2), // 2nd Sunday in May
  },
  {
    title: "Father's Day (DE)",
    category: 'promotion',
    color: '#3b82f6',
    country: 'DE',
    description: 'Ascension Day - 39 days after Easter',
    getDate: (year) => calculateAscensionDay(year),
  },

  // ============================================
  // France Dates
  // ============================================
  {
    title: "Mother's Day (FR)",
    category: 'promotion',
    color: '#f472b6',
    country: 'FR',
    description: 'Last Sunday in May (or first Sunday in June if Pentecost)',
    getDate: (year) => {
      const lastSundayMay = getLastWeekdayOfMonth(year, 4, 0);
      const pentecost = addDays(calculateEasterSunday(year), 49);
      // If last Sunday coincides with Pentecost, use first Sunday in June
      if (lastSundayMay.getTime() === pentecost.getTime()) {
        return getNthWeekdayOfMonth(year, 5, 0, 1);
      }
      return lastSundayMay;
    },
  },

  // ============================================
  // Black Friday / Cyber Monday (Universal)
  // ============================================
  {
    title: 'Black Friday',
    category: 'promotion',
    color: '#000000',
    description: 'Day after US Thanksgiving - biggest sales day of the year',
    getDate: (year) => {
      const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4);
      return addDays(thanksgiving, 1);
    },
  },
  {
    title: 'Cyber Monday',
    category: 'promotion',
    color: '#3b82f6',
    description: 'Monday after Black Friday - major online sales day',
    getDate: (year) => {
      const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4);
      return addDays(thanksgiving, 4);
    },
  },

  // ============================================
  // Major Golf Tournaments (for Display Champ)
  // ============================================
  {
    title: 'The Masters',
    category: 'golf_tournament',
    color: '#22c55e',
    description: 'Augusta National - 2nd week of April (Thursday start)',
    getDate: (year) => {
      // Masters starts on the Thursday that falls between April 7-13
      const april1 = new Date(year, 3, 1);
      const april1Day = getDay(april1);
      // Find first Thursday in April
      let daysUntilThursday = 4 - april1Day;
      if (daysUntilThursday < 0) daysUntilThursday += 7;
      const firstThursday = addDays(april1, daysUntilThursday);
      // If first Thursday is before April 7, use second Thursday
      if (firstThursday.getDate() < 7) {
        return addDays(firstThursday, 7);
      }
      return firstThursday;
    },
  },
  {
    title: 'PGA Championship',
    category: 'golf_tournament',
    color: '#0ea5e9',
    description: '3rd week of May (Thursday start)',
    getDate: (year) => getNthWeekdayOfMonth(year, 4, 4, 3), // 3rd Thursday in May
  },
  {
    title: 'US Open (Golf)',
    category: 'golf_tournament',
    color: '#ef4444',
    description: '3rd week of June (Thursday start)',
    getDate: (year) => getNthWeekdayOfMonth(year, 5, 4, 3), // 3rd Thursday in June
  },
  {
    title: 'The Open Championship',
    category: 'golf_tournament',
    color: '#eab308',
    description: '3rd week of July (Thursday start)',
    getDate: (year) => getNthWeekdayOfMonth(year, 6, 4, 3), // 3rd Thursday in July
  },
  {
    title: 'Ryder Cup',
    category: 'golf_tournament',
    color: '#8b5cf6',
    description: 'Biennial event (odd years in Europe, even years in US)',
    getDate: (year) => {
      // Ryder Cup is typically the last weekend of September
      const lastFridaySept = getLastWeekdayOfMonth(year, 8, 5);
      return lastFridaySept;
    },
  },
];

/**
 * Generate calendar events for a specific year
 */
export function generateEventsForYear(year: number, countries: string[] = ['UK', 'US']): Array<{
  title: string;
  date: string;
  category: StandardEventCategory;
  color: string;
  country: string | null;
  description: string | null;
  is_recurring: boolean;
}> {
  const events: Array<{
    title: string;
    date: string;
    category: StandardEventCategory;
    color: string;
    country: string | null;
    description: string | null;
    is_recurring: boolean;
  }> = [];

  for (const event of STANDARD_EVENTS) {
    // Skip country-specific events not in the selected countries
    if (event.country && !countries.includes(event.country)) {
      continue;
    }

    const eventDate = event.getDate(year);
    events.push({
      title: event.title,
      date: format(eventDate, 'yyyy-MM-dd'),
      category: event.category,
      color: event.color,
      country: event.country || null,
      description: event.description || null,
      is_recurring: true,
    });
  }

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  return events;
}

/**
 * Get available countries for filtering
 */
export const AVAILABLE_COUNTRIES = [
  { code: 'UK', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];
