import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseRoyalMailCSV,
  mapServiceTypeToProductCodes,
  inferServiceTypeFromTracking,
  inferProductCode,
  type RoyalMailDailyCost,
} from '@/lib/parsing/royalmail-csv-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ShipmentUpdate {
  id: string;
  tracking_number: string;
  shipping_date: string;
  service_type: string;
  old_cost: number | null;
  new_cost: number;
  cost_source: string;
}

/**
 * POST /api/invoices/royalmail
 *
 * Process a Royal Mail CSV and allocate costs to shipments by date + product type.
 *
 * Body: {
 *   csvContent: string,
 *   dryRun?: boolean,
 *   startDate?: string (YYYY-MM-DD) - optional filter to process only shipments from this date
 *   endDate?: string (YYYY-MM-DD) - optional filter to process only shipments to this date
 *   batchSize?: number - how many updates to apply at once (default 50)
 *   applyAverageToOld?: boolean - if true, apply average costs to unmatched shipments older than minDaysForAverage
 *   minDaysForAverage?: number - minimum age in days before applying average (default 14)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      csvContent,
      dryRun = false,
      startDate: filterStartDate,
      endDate: filterEndDate,
      batchSize = 50,
      applyAverageToOld = false,
      minDaysForAverage = 14,
    } = body;

    if (!csvContent) {
      return NextResponse.json(
        { error: 'csvContent is required' },
        { status: 400 }
      );
    }

    // Parse the CSV
    const parseResult = parseRoyalMailCSV(csvContent);

    if (parseResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found in CSV' },
        { status: 400 }
      );
    }

    // Use filter dates if provided, otherwise use CSV date range
    const csvDateRange = parseResult.summary.dateRange;
    const startDate = filterStartDate || csvDateRange.start;
    const endDate = filterEndDate || csvDateRange.end;

    // Fetch Royal Mail shipments in the date range
    // Use pagination to handle large datasets
    let allShipments: Array<{
      id: string;
      tracking_number: string;
      shipping_date: string;
      service_type: string | null;
      shipping_cost: number | null;
    }> = [];

    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: shipmentPage, error: fetchError } = await supabase
        .from('shipments')
        .select('id, tracking_number, shipping_date, service_type, shipping_cost')
        .eq('carrier', 'royalmail')
        .gte('shipping_date', startDate)
        .lte('shipping_date', endDate + 'T23:59:59')
        .order('shipping_date')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (fetchError) {
        console.error('Error fetching shipments:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch shipments', details: fetchError.message },
          { status: 500 }
        );
      }

      if (shipmentPage && shipmentPage.length > 0) {
        allShipments = allShipments.concat(shipmentPage);
        page++;
        hasMore = shipmentPage.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const shipments = allShipments;

    // Build a map of date+serviceType -> cost for quick lookup
    const costMap = new Map<string, RoyalMailDailyCost>();
    for (const dailyCost of parseResult.dailyCosts) {
      const key = `${dailyCost.date}|${dailyCost.serviceType}`;
      costMap.set(key, dailyCost);
    }

    // Match shipments to costs
    const updates: ShipmentUpdate[] = [];
    const unmatched: { id: string; tracking_number: string; date: string; service_type: string; inferred?: boolean }[] = [];

    for (const shipment of shipments || []) {
      const shipDate = shipment.shipping_date?.split('T')[0];
      if (!shipDate) continue;

      // Determine service type - use existing or infer from tracking number
      let serviceType = shipment.service_type;
      if (!serviceType) {
        serviceType = inferServiceTypeFromTracking(shipment.tracking_number);
      }

      // Try to find matching cost data
      let matchedCost: RoyalMailDailyCost | undefined;

      // Normalize service type: map ShipStation's long service names to our CSV service types
      const normalizeServiceType = (st: string | null): string[] => {
        if (!st) return [];

        // Direct mappings from CSV parser
        const directMappings: Record<string, string[]> = {
          'rm_tracked_48': ['rm_tracked_48'],
          'rm_tracked_24': ['rm_tracked_24'],
          'special_delivery_1pm': ['special_delivery_1pm'],
          'special_delivery_9am': ['special_delivery_9am'],
          'intl_tracked_ddp': ['intl_tracked_ddp'],
          'intl_tracked_packet': ['intl_tracked_packet'],
        };

        if (directMappings[st]) return directMappings[st];

        // Map ShipStation service type names to CSV service types
        const stLower = st.toLowerCase();

        // UK Domestic
        if (stLower.includes('tracked_48') || stLower.includes('tps')) {
          return ['rm_tracked_48'];
        }
        if (stLower.includes('tracked_24') || stLower.includes('tpm')) {
          return ['rm_tracked_24'];
        }
        if (stLower.includes('special_delivery')) {
          return ['special_delivery_1pm', 'special_delivery_9am'];
        }

        // International - ShipStation uses various long names
        // rm_intl_business_parcels_tracked_box_lovol_country -> MPR (intl_tracked_ddp)
        // rm_intl_business_parcels_tracked_country -> could be MPR or MP7
        if (stLower.includes('intl') && stLower.includes('parcel')) {
          return ['intl_tracked_ddp', 'intl_tracked_packet']; // Try MPR first, then MP7
        }
        if (stLower.includes('intl') && stLower.includes('packet')) {
          return ['intl_tracked_packet', 'intl_tracked_ddp']; // Try MP7 first, then MPR
        }
        if (stLower.includes('intl')) {
          return ['intl_tracked_ddp', 'intl_tracked_packet']; // Generic international
        }

        return [st]; // Fall back to original
      };

      const serviceTypesToTry = normalizeServiceType(serviceType);

      // Helper to get adjacent dates (±1 day)
      const getAdjacentDates = (dateStr: string): string[] => {
        const date = new Date(dateStr);
        const prevDay = new Date(date);
        prevDay.setDate(date.getDate() - 1);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        return [
          prevDay.toISOString().split('T')[0],
          nextDay.toISOString().split('T')[0],
        ];
      };

      // Helper to try matching with a list of dates and service types
      const tryMatch = (dates: string[], serviceTypes: string[]): RoyalMailDailyCost | undefined => {
        for (const date of dates) {
          for (const st of serviceTypes) {
            const key = `${date}|${st}`;
            const cost = costMap.get(key);
            if (cost) return cost;
          }
        }
        return undefined;
      };

      // 1. Try exact date match first
      matchedCost = tryMatch([shipDate], serviceTypesToTry);

      // 2. If no match, try inferring service type from tracking number
      if (!matchedCost) {
        const inferredType = inferServiceTypeFromTracking(shipment.tracking_number);
        if (inferredType && inferredType !== serviceType) {
          const inferredTypes = normalizeServiceType(inferredType);
          matchedCost = tryMatch([shipDate], inferredTypes);
        }
      }

      // 3. If still no match, try ±1 day with all service types
      // (Royal Mail invoice date can differ from ShipStation ship date by 1-2 days)
      let usedAdjacentDate = false;
      if (!matchedCost) {
        const adjacentDates = getAdjacentDates(shipDate);
        matchedCost = tryMatch(adjacentDates, serviceTypesToTry);

        // Also try inferred types on adjacent dates
        if (!matchedCost) {
          const inferredType = inferServiceTypeFromTracking(shipment.tracking_number);
          if (inferredType) {
            const inferredTypes = normalizeServiceType(inferredType);
            matchedCost = tryMatch(adjacentDates, inferredTypes);
          }
        }

        if (matchedCost) usedAdjacentDate = true;
      }

      if (matchedCost && matchedCost.averageCostPerItem > 0) {
        const dateNote = usedAdjacentDate ? ` (±1 day from ${matchedCost.date})` : '';
        updates.push({
          id: shipment.id,
          tracking_number: shipment.tracking_number,
          shipping_date: shipDate,
          service_type: serviceType || shipment.service_type,
          old_cost: shipment.shipping_cost,
          new_cost: Math.round(matchedCost.averageCostPerItem * 100) / 100,
          cost_source: `Royal Mail CSV: ${matchedCost.productCode} avg £${matchedCost.averageCostPerItem.toFixed(2)}/item${dateNote}`,
        });
      } else {
        unmatched.push({
          id: shipment.id,
          tracking_number: shipment.tracking_number,
          date: shipDate,
          service_type: serviceType || shipment.service_type || '(unknown)',
          inferred: serviceType && !shipment.service_type,
        });
      }
    }

    // Calculate averages by service type from matched shipments (for fallback)
    const serviceTypeAverages: Record<string, { total: number; count: number; avg: number }> = {};
    for (const update of updates) {
      const st = update.service_type || 'unknown';
      if (!serviceTypeAverages[st]) {
        serviceTypeAverages[st] = { total: 0, count: 0, avg: 0 };
      }
      serviceTypeAverages[st].total += update.new_cost;
      serviceTypeAverages[st].count++;
    }
    // Calculate averages
    for (const st of Object.keys(serviceTypeAverages)) {
      const data = serviceTypeAverages[st];
      data.avg = Math.round((data.total / data.count) * 100) / 100;
    }

    // Global average as ultimate fallback
    const globalAverage = updates.length > 0
      ? Math.round((updates.reduce((sum, u) => sum + u.new_cost, 0) / updates.length) * 100) / 100
      : 3.05; // Default fallback

    // Identify old unmatched shipments (older than minDaysForAverage)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minDaysForAverage);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const oldUnmatched = unmatched.filter(u => u.date < cutoffDateStr);
    const recentUnmatched = unmatched.filter(u => u.date >= cutoffDateStr);

    // Prepare average updates for old unmatched (only if user opted in)
    const averageUpdates: ShipmentUpdate[] = [];
    if (applyAverageToOld && oldUnmatched.length > 0) {
      for (const item of oldUnmatched) {
        const stAvg = serviceTypeAverages[item.service_type];
        const avgCost = stAvg ? stAvg.avg : globalAverage;
        const source = stAvg
          ? `Average from ${stAvg.count} ${item.service_type} shipments`
          : `Global average (no ${item.service_type} data)`;

        averageUpdates.push({
          id: item.id,
          tracking_number: item.tracking_number,
          shipping_date: item.date,
          service_type: item.service_type,
          old_cost: null,
          new_cost: avgCost,
          cost_source: source,
        });
      }
    }

    // If not dry run, apply the updates in batches
    let applied = 0;
    let errors = 0;

    if (!dryRun && updates.length > 0) {
      // Process updates in batches for better performance
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        // Use Promise.all to run batch updates in parallel
        const batchResults = await Promise.all(
          batch.map(async (update) => {
            const { error: updateError } = await supabase
              .from('shipments')
              .update({
                shipping_cost: update.new_cost,
                cost_confidence: 'estimated_date_country',
                match_method: 'royalmail_csv_date_average',
                cost_updated_at: new Date().toISOString(),
              })
              .eq('id', update.id);

            return { success: !updateError, error: updateError };
          })
        );

        // Count successes and failures
        for (const result of batchResults) {
          if (result.success) {
            applied++;
          } else {
            console.error('Batch update error:', result.error);
            errors++;
          }
        }
      }
    }

    // Apply average updates to old unmatched shipments (if opted in)
    let averageApplied = 0;
    let averageErrors = 0;

    if (!dryRun && applyAverageToOld && averageUpdates.length > 0) {
      for (let i = 0; i < averageUpdates.length; i += batchSize) {
        const batch = averageUpdates.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (update) => {
            const { error: updateError } = await supabase
              .from('shipments')
              .update({
                shipping_cost: update.new_cost,
                cost_confidence: 'estimated_country_only', // Lower confidence for average-based
                match_method: 'royalmail_service_average',
                cost_updated_at: new Date().toISOString(),
              })
              .eq('id', update.id);

            return { success: !updateError, error: updateError };
          })
        );

        for (const result of batchResults) {
          if (result.success) {
            averageApplied++;
          } else {
            console.error('Average update error:', result.error);
            averageErrors++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      processedDateRange: { start: startDate, end: endDate },
      csvSummary: {
        dateRange: csvDateRange,
        totalRows: parseResult.summary.totalRows,
        totalNetValue: parseResult.summary.totalNetValue,
        productBreakdown: parseResult.summary.productBreakdown,
      },
      // Only include dailyCosts for small date ranges to avoid huge responses
      dailyCosts: (filterStartDate && filterEndDate)
        ? parseResult.dailyCosts
            .filter(dc => dc.date >= startDate && dc.date <= endDate)
            .map(dc => ({
              date: dc.date,
              productCode: dc.productCode,
              serviceType: dc.serviceType,
              quantity: dc.totalQuantity,
              totalCost: dc.totalNetCost,
              avgCostPerItem: Math.round(dc.averageCostPerItem * 100) / 100,
            }))
        : `${parseResult.dailyCosts.length} daily cost records (use startDate/endDate filters to see details)`,
      shipments: {
        found: shipments?.length || 0,
        matched: updates.length,
        unmatched: unmatched.length,
      },
      updates: dryRun ? { preview: updates.length, sample: updates.slice(0, 10) } : { applied, errors },
      // Average fallback for old unmatched shipments
      unmatchedBreakdown: {
        total: unmatched.length,
        olderThan14Days: oldUnmatched.length,
        within14Days: recentUnmatched.length,
        cutoffDate: cutoffDateStr,
      },
      serviceTypeAverages: Object.entries(serviceTypeAverages).map(([st, data]) => ({
        serviceType: st,
        count: data.count,
        averageCost: data.avg,
      })),
      globalAverage,
      averageUpdates: applyAverageToOld
        ? (dryRun
            ? { preview: averageUpdates.length, sample: averageUpdates.slice(0, 10) }
            : { applied: averageApplied, errors: averageErrors })
        : {
            available: oldUnmatched.length,
            message: oldUnmatched.length > 0
              ? `${oldUnmatched.length} shipments older than ${minDaysForAverage} days can have averages applied. Set applyAverageToOld=true to apply.`
              : 'No old unmatched shipments to process',
          },
      unmatchedSample: recentUnmatched.slice(0, 10),
    });

  } catch (error) {
    console.error('Royal Mail CSV processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process Royal Mail CSV', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invoices/royalmail
 *
 * Get information about the Royal Mail CSV processor
 */
export async function GET() {
  return NextResponse.json({
    description: 'Royal Mail CSV Processor',
    usage: 'POST with { csvContent, dryRun?, startDate?, endDate?, batchSize?, applyAverageToOld?, minDaysForAverage? }',
    parameters: {
      csvContent: 'string (required) - Royal Mail CSV file content',
      dryRun: 'boolean (optional, default: false) - Preview changes without applying',
      startDate: 'string (optional, YYYY-MM-DD) - Only process shipments from this date',
      endDate: 'string (optional, YYYY-MM-DD) - Only process shipments to this date',
      batchSize: 'number (optional, default: 50) - How many updates to run in parallel',
      applyAverageToOld: 'boolean (optional, default: false) - Apply average costs to unmatched shipments older than minDaysForAverage',
      minDaysForAverage: 'number (optional, default: 14) - Minimum age in days before applying averages (to avoid overwriting pending invoices)',
    },
    notes: [
      'Parses Royal Mail CSV exports (aggregated by manifest/date)',
      'Allocates costs to shipments by date + product type',
      'Tries ±1 day matching if exact date not found',
      'Set dryRun=true to preview changes without applying',
      'For large historical imports, use startDate/endDate to process in monthly batches',
      'Unmatched shipments older than 14 days can have service-type averages applied (opt-in)',
    ],
    productCodes: {
      'TPS': 'Royal Mail Tracked 48 (UK domestic)',
      'TPM': 'Royal Mail Tracked 24 (UK domestic)',
      'SD1': 'Special Delivery Guaranteed by 1pm',
      'MPR': 'International Business Parcels Tracked DDP',
      'MP7': 'International Business NPC Tracked Packet',
    },
    costConfidenceLevels: {
      'estimated_date_country': 'Matched from CSV by date and service type',
      'estimated_country_only': 'Applied service-type average (no exact match)',
    },
  });
}
