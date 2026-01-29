import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UploadMode, AnalysisResult, AnalyzedRecord, RecordAction } from '@/types';

interface ParsedInvoice {
  tracking_number: string;
  shipping_cost: number;
  currency: string;
  service_type: string;
  weight_kg: number;
  shipping_date: string;
}

interface ExistingShipment {
  id: string;
  tracking_number: string;
  shipping_cost: number;
  carrier: string;
  cost_locked: boolean;
  raw_data: {
    cost_type?: 'actual' | 'estimated';
    [key: string]: unknown;
  } | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoices, carrier, uploadMode } = body as {
      invoices: ParsedInvoice[];
      carrier: 'dhl' | 'royalmail';
      uploadMode: UploadMode;
    };

    if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoice data provided' },
        { status: 400 }
      );
    }

    if (!carrier || !['dhl', 'royalmail'].includes(carrier)) {
      return NextResponse.json(
        { error: 'Invalid carrier' },
        { status: 400 }
      );
    }

    if (!uploadMode || !['add_only', 'overwrite_all', 'update_if_higher', 'update_if_lower', 'add_to_existing'].includes(uploadMode)) {
      return NextResponse.json(
        { error: 'Invalid upload mode' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Extract all tracking numbers from the invoices
    const trackingNumbers = invoices.map(inv => inv.tracking_number);

    // Query existing shipments by tracking numbers and carrier
    const { data: existingShipments, error: queryError } = await supabase
      .from('shipments')
      .select('id, tracking_number, shipping_cost, carrier, cost_locked, raw_data')
      .in('tracking_number', trackingNumbers)
      .eq('carrier', carrier);

    if (queryError) {
      console.error('Error querying shipments:', queryError);
      return NextResponse.json(
        { error: 'Failed to query existing shipments' },
        { status: 500 }
      );
    }

    // Create a map of existing shipments by tracking number
    const existingShipmentMap = new Map<string, ExistingShipment>();
    (existingShipments || []).forEach((shipment: ExistingShipment) => {
      if (shipment.tracking_number) {
        existingShipmentMap.set(shipment.tracking_number, shipment);
      }
    });

    // Also check for orders that have matching tracking numbers (for new shipment creation)
    interface OrderWithRawData {
      id: string;
      brand_id: string;
      raw_data: { tracking_numbers?: string[] } | null;
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('id, brand_id, raw_data')
      .not('raw_data->tracking_numbers', 'is', null) as { data: OrderWithRawData[] | null };

    // Create a map of tracking numbers to orders
    const trackingToOrderMap = new Map<string, { id: string; brand_id: string }>();
    if (orders) {
      for (const order of orders) {
        const trackingNums = order.raw_data?.tracking_numbers || [];
        for (const tn of trackingNums) {
          trackingToOrderMap.set(tn, { id: order.id, brand_id: order.brand_id });
        }
      }
    }

    // Determine the cost type for the upload carrier
    // DHL = actual costs, Royal Mail = estimated costs
    const uploadCostType = carrier === 'dhl' ? 'actual' : 'estimated';

    // Analyze each invoice record
    const analyzedRecords: AnalyzedRecord[] = [];
    const warnings: string[] = [];
    let toCreate = 0;
    let toUpdate = 0;
    let toSkip = 0;
    let toBlock = 0;
    let toAdd = 0;

    for (const invoice of invoices) {
      const existing = existingShipmentMap.get(invoice.tracking_number);
      const hasMatchingOrder = trackingToOrderMap.has(invoice.tracking_number);

      let action: RecordAction;
      let reason: string;

      if (existing) {
        // Record exists - determine action based on mode
        const existingCostType = existing.raw_data?.cost_type || 'estimated';
        const costDifference = invoice.shipping_cost - existing.shipping_cost;
        const isSameCost = Math.abs(costDifference) < 0.01;

        // FIRST CHECK: Block updates to manually locked costs
        if (existing.cost_locked) {
          action = 'blocked';
          reason = 'Cost is locked - manual override protected';
          toBlock++;

          if (!warnings.includes('Some records are blocked because they have manually locked costs')) {
            warnings.push('Some records are blocked because they have manually locked costs');
          }
        // STRICT PROTECTION: Block estimated costs from overwriting actual costs
        } else if (existingCostType === 'actual' && uploadCostType === 'estimated') {
          action = 'blocked';
          reason = 'Cannot overwrite verified actual cost with estimate';
          toBlock++;

          if (!warnings.includes('Some records are blocked because they would overwrite actual DHL costs with Royal Mail estimates')) {
            warnings.push('Some records are blocked because they would overwrite actual DHL costs with Royal Mail estimates');
          }
        } else {
          // Apply mode-specific logic
          switch (uploadMode) {
            case 'add_only':
              action = 'skip';
              reason = 'Record exists - add only mode';
              toSkip++;
              break;

            case 'overwrite_all':
              if (isSameCost) {
                action = 'skip';
                reason = 'Cost unchanged';
                toSkip++;
              } else {
                action = 'update';
                reason = `Cost ${costDifference > 0 ? 'increases' : 'decreases'} by £${Math.abs(costDifference).toFixed(2)}`;
                toUpdate++;
              }
              break;

            case 'update_if_higher':
              if (costDifference > 0.01) {
                action = 'update';
                reason = `Cost increases by £${costDifference.toFixed(2)}`;
                toUpdate++;
              } else {
                action = 'skip';
                reason = isSameCost ? 'Cost unchanged' : 'New cost is not higher';
                toSkip++;
              }
              break;

            case 'update_if_lower':
              if (costDifference < -0.01) {
                action = 'update';
                reason = `Cost decreases by £${Math.abs(costDifference).toFixed(2)}`;
                toUpdate++;
              } else {
                action = 'skip';
                reason = isSameCost ? 'Cost unchanged' : 'New cost is not lower';
                toSkip++;
              }
              break;

            case 'add_to_existing':
              // Add mode - always add to existing cost (for duties/taxes)
              action = 'add';
              const newTotal = existing.shipping_cost + invoice.shipping_cost;
              reason = `Add £${invoice.shipping_cost.toFixed(2)} to existing £${existing.shipping_cost.toFixed(2)} = £${newTotal.toFixed(2)}`;
              toAdd++;
              break;

            default:
              action = 'skip';
              reason = 'Unknown mode';
              toSkip++;
          }
        }

        analyzedRecords.push({
          ...invoice,
          action,
          reason,
          existing_cost: existing.shipping_cost,
          existing_cost_type: existingCostType as 'actual' | 'estimated',
          cost_difference: costDifference,
        });
      } else if (uploadMode === 'add_to_existing') {
        // Add mode requires existing shipment - skip if not found
        action = 'skip';
        reason = 'No existing shipment to add to';
        toSkip++;

        analyzedRecords.push({
          ...invoice,
          action,
          reason,
        });
      } else if (hasMatchingOrder) {
        // No existing shipment but there's a matching order - will create new shipment
        action = 'create';
        reason = 'New shipment linked to order';
        toCreate++;

        analyzedRecords.push({
          ...invoice,
          action,
          reason,
        });
      } else {
        // No existing shipment and no matching order
        action = 'skip';
        reason = 'No matching order found';
        toSkip++;

        analyzedRecords.push({
          ...invoice,
          action,
          reason,
        });
      }
    }

    // Add warning for Royal Mail uploads
    if (carrier === 'royalmail') {
      warnings.unshift('Royal Mail costs are estimates based on country averages, not actual invoice costs');
    }

    const result: AnalysisResult = {
      total: invoices.length,
      toCreate,
      toUpdate,
      toSkip,
      toBlock,
      toAdd,
      records: analyzedRecords,
      warnings,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
