// Column detection and mapping for invoice files

import type { ColumnMapping, RawRow, ParsedInvoice } from './types';

// Keywords for detecting columns (ordered by priority - first match wins for equal scores)
const COLUMN_KEYWORDS = {
  tracking: [
    'shipment number',  // DHL specific - exact match
    'awb number',
    'tracking number',
    'awb',
    'waybill',
    'tracking',
    'shipment',
    'reference',
    'barcode',
    'item id',
  ],
  cost: [
    'total amount',      // DHL "Total amount (excl. VAT)" - high priority
    'net amount',
    'total charge',
    'total cost',
    'total price',
    'postage',
    'total',
    'amount',
    'cost',
    'price',
    'net',
    'fee',
    // 'charge' removed - too generic, matches XC1 Charge, Weight Charge, etc.
  ],
  date: ['shipment date', 'ship date', 'date', 'ship', 'pickup', 'despatch', 'post'],
  service: ['product name', 'service', 'product', 'type', 'mail class', 'service code'],
  weight: ['weight (kg)', 'weight', 'kg', 'gram', 'mass'],
  currency: ['currency', 'curr', 'ccy'],
};

// Columns to explicitly exclude from cost detection (partial charges, not totals)
const COST_COLUMN_EXCLUSIONS = [
  'xc1', 'xc2', 'xc3', 'xc4', 'xc5', 'xc6', 'xc7', 'xc8', 'xc9',  // DHL extra charges
  'total extra charges',  // DHL "Total Extra Charges (XC)" - this is a subtotal, not the total
  'extra charges',
  'weight charge',
  'other charges',
  'discount',
  'invoice fee',  // DHL invoice fee - separate from shipping cost
  'incl. vat',    // Exclude VAT-inclusive columns, prefer excl. VAT
  'incl vat',
];

// High-priority cost columns - if found, use immediately (exact matches)
const COST_COLUMN_PRIORITIES = [
  'total amount (excl. vat)',  // DHL primary cost column
  'total amount excl vat',
  'net total',
  'net amount',
  'total charge',
  'shipping cost',
  'postage cost',
];

interface DetectionResult {
  mapping: ColumnMapping;
  confidence: Record<keyof ColumnMapping, number>;
  unmappedRequired: string[];
}

/**
 * Detect columns from header names
 */
export function detectColumns(headers: string[]): DetectionResult {
  const mapping: ColumnMapping = {
    tracking: null,
    cost: null,
    date: null,
    service: null,
    weight: null,
    currency: null,
  };

  const confidence: Record<keyof ColumnMapping, number> = {
    tracking: 0,
    cost: 0,
    date: 0,
    service: 0,
    weight: 0,
    currency: 0,
  };

  // First pass: Check for high-priority cost columns (exact matches)
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();

    for (const priorityCol of COST_COLUMN_PRIORITIES) {
      if (normalizedHeader === priorityCol || normalizedHeader.includes(priorityCol)) {
        // Found a priority cost column - use it with maximum confidence
        mapping.cost = index;
        confidence.cost = 10; // Very high score to prevent override
        break;
      }
    }
  });

  // Score each header against each field type
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();

    for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
      // Check exclusions for cost field
      if (field === 'cost') {
        // Skip if we already found a priority cost column
        if (confidence.cost >= 10) continue;

        const isExcluded = COST_COLUMN_EXCLUSIONS.some(exclusion =>
          normalizedHeader.includes(exclusion)
        );
        if (isExcluded) continue;
      }

      for (let keywordIndex = 0; keywordIndex < keywords.length; keywordIndex++) {
        const keyword = keywords[keywordIndex];
        if (normalizedHeader.includes(keyword)) {
          // Score based on:
          // 1. Keyword match ratio (longer keyword in shorter header = better)
          // 2. Keyword priority (earlier in list = higher priority bonus)
          const matchRatio = keyword.length / normalizedHeader.length;
          const priorityBonus = (keywords.length - keywordIndex) / keywords.length; // 1.0 for first, decreasing
          const score = matchRatio + priorityBonus;

          if (score > confidence[field as keyof ColumnMapping]) {
            confidence[field as keyof ColumnMapping] = score;
            mapping[field as keyof ColumnMapping] = index;
          }
        }
      }
    }
  });

  // Required fields check
  const unmappedRequired: string[] = [];
  if (mapping.tracking === null) unmappedRequired.push('Tracking Number');
  if (mapping.cost === null) unmappedRequired.push('Cost/Amount');

  return { mapping, confidence, unmappedRequired };
}

/**
 * Parse a cost value from various formats
 */
function parseCost(value: string | number | null): number {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') return value;

  // Remove currency symbols and thousands separators
  const cleaned = value
    .replace(/[£$€¥]/g, '')
    .replace(/,/g, '')
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a weight value (convert grams to kg if needed)
 */
function parseWeight(
  value: string | number | null,
  header: string
): number {
  if (value === null || value === undefined || value === '') return 0;

  const numValue =
    typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));

  if (isNaN(numValue)) return 0;

  // Check if the header indicates grams
  const headerLower = header.toLowerCase();
  if (headerLower.includes('(g)') || headerLower.includes('gram')) {
    return numValue / 1000; // Convert grams to kg
  }

  return numValue;
}

/**
 * Parse a date value
 */
function parseDate(value: string | number | null): string {
  if (value === null || value === undefined || value === '') return '';

  const strValue = String(value);

  // Try parsing as ISO date
  const isoDate = new Date(strValue);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split('T')[0];
  }

  // Try parsing DD/MM/YYYY format
  const dmyMatch = strValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try parsing DD-MM-YYYY format
  const dmyDashMatch = strValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDashMatch) {
    const [, day, month, year] = dmyDashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return '';
}

/**
 * Apply column mapping to raw rows to extract parsed invoices
 */
export function applyMapping(
  rawRows: RawRow[],
  headers: string[],
  mapping: ColumnMapping
): { data: ParsedInvoice[]; warnings: string[] } {
  const data: ParsedInvoice[] = [];
  const warnings: string[] = [];

  let skippedNoTracking = 0;
  let skippedNoCost = 0;

  for (const row of rawRows) {
    // Get tracking number
    const trackingHeader =
      mapping.tracking !== null ? headers[mapping.tracking] : '';
    const trackingValue =
      mapping.tracking !== null ? row[trackingHeader] : null;
    const tracking = trackingValue
      ? String(trackingValue).trim().toUpperCase()
      : '';

    if (!tracking) {
      skippedNoTracking++;
      continue;
    }

    // Get cost
    const costHeader = mapping.cost !== null ? headers[mapping.cost] : '';
    const costValue = mapping.cost !== null ? row[costHeader] : null;
    const cost = parseCost(costValue);

    if (cost === 0) {
      skippedNoCost++;
      continue;
    }

    // Get optional fields
    const dateHeader = mapping.date !== null ? headers[mapping.date] : '';
    const dateValue = mapping.date !== null ? row[dateHeader] : null;

    const serviceHeader =
      mapping.service !== null ? headers[mapping.service] : '';
    const serviceValue = mapping.service !== null ? row[serviceHeader] : null;

    const weightHeader =
      mapping.weight !== null ? headers[mapping.weight] : '';
    const weightValue = mapping.weight !== null ? row[weightHeader] : null;

    const currencyHeader =
      mapping.currency !== null ? headers[mapping.currency] : '';
    const currencyValue =
      mapping.currency !== null ? row[currencyHeader] : null;

    data.push({
      tracking_number: tracking,
      shipping_cost: cost,
      shipping_date: parseDate(dateValue),
      service_type: serviceValue ? String(serviceValue).trim() : '',
      weight_kg: parseWeight(weightValue, weightHeader),
      currency: currencyValue ? String(currencyValue).trim().toUpperCase() : 'GBP',
    });
  }

  if (skippedNoTracking > 0) {
    warnings.push(`${skippedNoTracking} rows skipped: missing tracking number`);
  }

  if (skippedNoCost > 0) {
    warnings.push(`${skippedNoCost} rows skipped: missing or zero cost`);
  }

  return { data, warnings };
}
