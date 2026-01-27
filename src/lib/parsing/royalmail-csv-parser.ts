/**
 * Royal Mail CSV Parser
 *
 * Parses Royal Mail invoice CSVs and allocates costs to shipments by date + product type.
 * Royal Mail CSVs contain aggregated costs per manifest, not individual tracking numbers.
 */

export interface RoyalMailRow {
  date: string; // YYYY-MM-DD format
  salesOrderNo: string;
  productCode: string;
  productDescription: string;
  destinationCountry: string;
  quantity: number;
  netValue: number;
  grossValue: number;
  vatAmount: number;
}

export interface RoyalMailDailyCost {
  date: string;
  productCode: string;
  serviceType: string; // Our internal service type
  totalQuantity: number;
  totalNetCost: number;
  averageCostPerItem: number;
}

export interface RoyalMailParseResult {
  rows: RoyalMailRow[];
  dailyCosts: RoyalMailDailyCost[];
  summary: {
    dateRange: { start: string; end: string };
    totalRows: number;
    totalNetValue: number;
    productBreakdown: Record<string, { quantity: number; cost: number }>;
  };
}

// Map Royal Mail product codes to our internal service types
const PRODUCT_CODE_MAP: Record<string, string> = {
  'TPS': 'rm_tracked_48',           // Royal Mail Tracked 48
  'TPM': 'rm_tracked_24',           // Royal Mail Tracked 24
  'SD1': 'special_delivery_1pm',    // Special Delivery Guaranteed by 1pm
  'SD9': 'special_delivery_9am',    // Special Delivery Guaranteed by 9am
  'MPR': 'intl_tracked_ddp',        // International Business Parcels Tracked DDP
  'MP7': 'intl_tracked_packet',     // International Business NPC Tracked Packet
  'IBB': 'intl_adjustment',         // International adjustment
  'IFB': 'intl_admin_charge',       // International administration charge
  'RXA': 'admin_charge',            // Sales Order Admin Charge
};

/**
 * Parse date from DD.MM.YYYY format to YYYY-MM-DD
 */
function parseDate(dateStr: string): string {
  const parts = dateStr.split('.');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

/**
 * Parse a numeric value, handling UK format (comma as thousands separator, period as decimal)
 */
function parseNumber(value: string): number {
  if (!value || value === '#') return 0;
  // Remove thousands separator (comma) and keep decimal point
  const cleaned = value.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Get our internal service type from Royal Mail product code
 */
export function getServiceType(productCode: string): string {
  return PRODUCT_CODE_MAP[productCode] || `rm_${productCode.toLowerCase()}`;
}

/**
 * Parse Royal Mail CSV content
 */
export function parseRoyalMailCSV(csvContent: string): RoyalMailParseResult {
  const lines = csvContent.split('\n');
  const rows: RoyalMailRow[] = [];

  // Skip header rows (first 3 lines are headers)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('"Overall Result"')) continue;

    // Parse CSV line (handling quoted fields)
    const fields = parseCSVLine(line);
    if (fields.length < 35) continue;

    const date = fields[0];
    if (!date || date === 'Date' || !date.includes('.')) continue;

    const productCode = fields[11];
    const quantity = parseNumber(fields[20]); // Volume column
    const netValue = parseNumber(fields[32]); // Net Value column (index 32)
    const grossValue = parseNumber(fields[34]); // Gross Value column (index 34)

    // Skip rows with no quantity or value
    if (quantity === 0 && netValue === 0) continue;

    rows.push({
      date: parseDate(date),
      salesOrderNo: fields[1],
      productCode: productCode,
      productDescription: fields[12],
      destinationCountry: fields[9] || fields[10] || 'GB',
      quantity: quantity || 1, // Default to 1 if quantity is 0 but there's a cost
      netValue,
      grossValue,
      vatAmount: grossValue - netValue,
    });
  }

  // Aggregate by date + product code
  const dailyMap = new Map<string, RoyalMailDailyCost>();

  for (const row of rows) {
    // Skip admin charges and adjustments for cost allocation
    if (['IFB', 'RXA', 'IBB'].includes(row.productCode)) continue;

    const key = `${row.date}|${row.productCode}`;
    const existing = dailyMap.get(key);

    if (existing) {
      existing.totalQuantity += row.quantity;
      existing.totalNetCost += row.netValue;
      existing.averageCostPerItem = existing.totalNetCost / existing.totalQuantity;
    } else {
      dailyMap.set(key, {
        date: row.date,
        productCode: row.productCode,
        serviceType: getServiceType(row.productCode),
        totalQuantity: row.quantity,
        totalNetCost: row.netValue,
        averageCostPerItem: row.netValue / (row.quantity || 1),
      });
    }
  }

  const dailyCosts = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date) || a.productCode.localeCompare(b.productCode)
  );

  // Calculate summary
  const dates = rows.map(r => r.date).filter(d => d);
  const productBreakdown: Record<string, { quantity: number; cost: number }> = {};

  for (const row of rows) {
    if (!productBreakdown[row.productCode]) {
      productBreakdown[row.productCode] = { quantity: 0, cost: 0 };
    }
    productBreakdown[row.productCode].quantity += row.quantity;
    productBreakdown[row.productCode].cost += row.netValue;
  }

  return {
    rows,
    dailyCosts,
    summary: {
      dateRange: {
        start: dates.length > 0 ? dates.sort()[0] : '',
        end: dates.length > 0 ? dates.sort().reverse()[0] : '',
      },
      totalRows: rows.length,
      totalNetValue: rows.reduce((sum, r) => sum + r.netValue, 0),
      productBreakdown,
    },
  };
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Map our shipment service types to Royal Mail product codes for matching
 */
export function mapServiceTypeToProductCodes(serviceType: string): string[] {
  const reverseMap: Record<string, string[]> = {
    'rm_tracked_48': ['TPS'],
    'rm_tracked_24': ['TPM'],
    'special_delivery_1pm': ['SD1'],
    'special_delivery_9am': ['SD9'],
    'intl_tracked_ddp': ['MPR'],
    'intl_tracked_packet': ['MP7'],
  };

  return reverseMap[serviceType] || [];
}

/**
 * Infer Royal Mail service type from tracking number pattern
 *
 * Common patterns:
 * - VFxxxxxxxxGB = Tracked 48 (small packet)
 * - LAxxxxxxxxGB = Tracked 48 (large letter)
 * - ASxxxxxxxxGB = Tracked 24
 * - SDxxxxxxxxGB = Special Delivery
 * - LYxxxxxxxxDE = Deutsche Post (not Royal Mail)
 */
export function inferServiceTypeFromTracking(trackingNumber: string): string | null {
  if (!trackingNumber) return null;

  const upper = trackingNumber.toUpperCase();

  // Royal Mail UK domestic patterns
  if (upper.match(/^VF\d+GB$/)) return 'rm_tracked_48';
  if (upper.match(/^LA\d+GB$/)) return 'rm_tracked_48';
  if (upper.match(/^AS\d+GB$/)) return 'rm_tracked_24';
  if (upper.match(/^SD\d+GB$/)) return 'special_delivery_1pm';

  // International patterns (harder to determine exact service)
  // These typically need to be matched by destination country
  if (upper.match(/^[A-Z]{2}\d+GB$/)) {
    // Generic GB tracking - default to tracked 48 for UK domestic
    return 'rm_tracked_48';
  }

  return null;
}

/**
 * Determine product code based on tracking number and destination
 *
 * @param trackingNumber The shipment tracking number
 * @param destinationCountry ISO country code (e.g., 'GB', 'US', 'AU')
 */
export function inferProductCode(
  trackingNumber: string,
  destinationCountry?: string
): string | null {
  const serviceType = inferServiceTypeFromTracking(trackingNumber);
  if (!serviceType) return null;

  // If destination is international, might be MPR or MP7
  if (destinationCountry && destinationCountry !== 'GB') {
    // International shipments are typically MP7 (tracked packet) or MPR (parcel)
    return 'MP7'; // Default to tracked packet for international
  }

  // Map service type to product code
  const serviceToProduct: Record<string, string> = {
    'rm_tracked_48': 'TPS',
    'rm_tracked_24': 'TPM',
    'special_delivery_1pm': 'SD1',
    'special_delivery_9am': 'SD9',
  };

  return serviceToProduct[serviceType] || null;
}
