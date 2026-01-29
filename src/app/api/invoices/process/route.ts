import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { UploadMode, UploadResultExtended, AnalyzedRecord } from '@/types';

interface ProcessRequest {
  records: AnalyzedRecord[];
  carrier: 'dhl' | 'royalmail';
  uploadMode: UploadMode;
  fileName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
}

interface UnmatchedRecordData {
  tracking_number: string;
  carrier: string;
  shipping_cost: number;
  currency: string;
  service_type: string | null;
  weight_kg: number | null;
  shipping_date: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  file_name: string | null;
  destination_country: string | null;
  destination_city: string | null;
  receiver_name: string | null;
  raw_data: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ProcessRequest;
    const { records, carrier, uploadMode, fileName, invoiceNumber, invoiceDate } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'No records provided' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for writes
    const supabase = await createServiceClient();

    // Cost type based on carrier
    const costType = carrier === 'dhl' ? 'actual' : 'estimated';

    // Create upload history record first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: uploadHistory, error: historyError } = await (supabase as any)
      .from('upload_history')
      .insert({
        carrier,
        upload_mode: uploadMode,
        file_name: fileName || null,
        total_records: records.length,
        created_count: 0,
        updated_count: 0,
        skipped_count: 0,
        error_count: 0,
        blocked_count: 0,
      })
      .select('id')
      .single() as { data: { id: string } | null; error: Error | null };

    if (historyError) {
      console.error('Error creating upload history:', historyError);
      // Continue without upload history tracking
    }

    const uploadHistoryId = uploadHistory?.id;

    // Get carrier account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: carrierAccount } = await (supabase as any)
      .from('carrier_accounts')
      .select('id')
      .eq('carrier', carrier)
      .single() as { data: { id: string } | null };

    // Process each record
    const results: UploadResultExtended[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let blockedCount = 0;
    let unmatchedCount = 0;
    const unmatchedRecords: UnmatchedRecordData[] = [];

    for (const record of records) {
      try {
        // Skip or blocked records
        if (record.action === 'skip') {
          // Check if this is a "no matching order" skip - capture for reconciliation
          if (record.reason?.toLowerCase().includes('no matching order')) {
            unmatchedRecords.push({
              tracking_number: record.tracking_number,
              carrier,
              shipping_cost: record.shipping_cost,
              currency: record.currency || 'GBP',
              service_type: record.service_type || null,
              weight_kg: record.weight_kg || null,
              shipping_date: record.shipping_date || null,
              invoice_number: invoiceNumber || null,
              invoice_date: invoiceDate || null,
              file_name: fileName || null,
              destination_country: null,
              destination_city: null,
              receiver_name: null,
              raw_data: record as unknown as Record<string, unknown>,
            });

            results.push({
              tracking_number: record.tracking_number,
              status: 'not_found',
              action: 'skipped',
              message: 'No matching order - saved for reconciliation',
            });
            unmatchedCount++;
            continue;
          }

          results.push({
            tracking_number: record.tracking_number,
            status: 'skipped',
            action: 'skipped',
            message: record.reason,
          });
          skippedCount++;
          continue;
        }

        if (record.action === 'blocked') {
          results.push({
            tracking_number: record.tracking_number,
            status: 'blocked',
            action: 'blocked',
            message: record.reason,
          });
          blockedCount++;
          continue;
        }

        if (record.action === 'update') {
          // Update existing shipment - but NOT if cost_locked is true (safety check)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: updateError } = await (supabase as any)
            .from('shipments')
            .update({
              shipping_cost: record.shipping_cost,
              weight_kg: record.weight_kg || null,
              service_type: record.service_type || null,
              cost_updated_at: new Date().toISOString(),
              upload_history_id: uploadHistoryId,
              raw_data: {
                cost_type: costType,
                previous_cost: record.existing_cost,
                updated_from_invoice: true,
              },
            })
            .eq('tracking_number', record.tracking_number)
            .eq('carrier', carrier)
            .eq('cost_locked', false) as { error: Error | null }; // Safety: only update if not locked

          if (updateError) {
            results.push({
              tracking_number: record.tracking_number,
              status: 'error',
              action: 'error',
              message: updateError.message,
            });
            errorCount++;
          } else {
            results.push({
              tracking_number: record.tracking_number,
              status: 'success',
              action: 'updated',
              message: `Cost updated from £${record.existing_cost?.toFixed(2)} to £${record.shipping_cost.toFixed(2)}`,
            });
            updatedCount++;
          }
        } else if (record.action === 'add') {
          // Add to existing shipment cost (for duties/taxes) - but NOT if cost_locked is true (safety check)
          const newCost = (record.existing_cost || 0) + record.shipping_cost;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: addError } = await (supabase as any)
            .from('shipments')
            .update({
              shipping_cost: newCost,
              cost_updated_at: new Date().toISOString(),
              upload_history_id: uploadHistoryId,
              raw_data: {
                cost_type: costType,
                previous_cost: record.existing_cost,
                duty_added: record.shipping_cost,
                added_from_invoice: true,
              },
            })
            .eq('tracking_number', record.tracking_number)
            .eq('carrier', carrier)
            .eq('cost_locked', false) as { error: Error | null }; // Safety: only update if not locked

          if (addError) {
            results.push({
              tracking_number: record.tracking_number,
              status: 'error',
              action: 'error',
              message: addError.message,
            });
            errorCount++;
          } else {
            results.push({
              tracking_number: record.tracking_number,
              status: 'success',
              action: 'added',
              message: `Added £${record.shipping_cost.toFixed(2)} duty to £${record.existing_cost?.toFixed(2)} = £${newCost.toFixed(2)} total`,
            });
            addedCount++;
          }
        } else if (record.action === 'create') {
          // Find the matching order
          interface OrderWithRawData {
            id: string;
            brand_id: string;
            raw_data: { tracking_numbers?: string[] } | null;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: orders } = await (supabase as any)
            .from('orders')
            .select('id, brand_id, raw_data')
            .not('raw_data->tracking_numbers', 'is', null) as { data: OrderWithRawData[] | null };

          let matchedOrder: { id: string; brand_id: string } | null = null;
          if (orders) {
            for (const order of orders) {
              const trackingNums = order.raw_data?.tracking_numbers || [];
              if (trackingNums.includes(record.tracking_number)) {
                matchedOrder = { id: order.id, brand_id: order.brand_id };
                break;
              }
            }
          }

          if (!matchedOrder) {
            // Save to unmatched records for reconciliation
            unmatchedRecords.push({
              tracking_number: record.tracking_number,
              carrier,
              shipping_cost: record.shipping_cost,
              currency: record.currency || 'GBP',
              service_type: record.service_type || null,
              weight_kg: record.weight_kg || null,
              shipping_date: record.shipping_date || null,
              invoice_number: invoiceNumber || null,
              invoice_date: invoiceDate || null,
              file_name: fileName || null,
              destination_country: null, // Will be extracted from raw_data if available
              destination_city: null,
              receiver_name: null,
              raw_data: record as unknown as Record<string, unknown>,
            });

            results.push({
              tracking_number: record.tracking_number,
              status: 'not_found',
              action: 'skipped',
              message: 'No matching order - saved for reconciliation',
            });
            unmatchedCount++;
            continue;
          }

          // Create new shipment
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertError } = await (supabase as any)
            .from('shipments')
            .insert({
              order_id: matchedOrder.id,
              brand_id: matchedOrder.brand_id,
              carrier: carrier,
              carrier_account_id: carrierAccount?.id,
              tracking_number: record.tracking_number,
              service_type: record.service_type || null,
              direction: 'outbound',
              weight_kg: record.weight_kg || null,
              shipping_cost: record.shipping_cost,
              shipping_date: record.shipping_date ? new Date(record.shipping_date).toISOString() : null,
              status: 'from_invoice',
              cost_updated_at: new Date().toISOString(),
              upload_history_id: uploadHistoryId,
              raw_data: {
                cost_type: costType,
                created_from_invoice: true,
              },
            }) as { error: Error | null };

          if (insertError) {
            results.push({
              tracking_number: record.tracking_number,
              status: 'error',
              action: 'error',
              message: insertError.message,
            });
            errorCount++;
          } else {
            results.push({
              tracking_number: record.tracking_number,
              status: 'success',
              action: 'created',
              message: `Created with cost £${record.shipping_cost.toFixed(2)}`,
            });
            createdCount++;
          }
        }
      } catch (error) {
        results.push({
          tracking_number: record.tracking_number,
          status: 'error',
          action: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    // Save unmatched records for reconciliation
    if (unmatchedRecords.length > 0) {
      // Insert each record individually to handle duplicates gracefully
      for (const unmatchedRecord of unmatchedRecords) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: unmatchedError } = await (supabase as any)
            .from('unmatched_invoice_records')
            .insert(unmatchedRecord)
            .select();

          if (unmatchedError) {
            // Ignore duplicate key errors (record already exists)
            if (!unmatchedError.message?.includes('duplicate') &&
                !unmatchedError.code?.includes('23505')) {
              console.error('Error saving unmatched record:', unmatchedError);
            }
          }
        } catch (err) {
          console.error('Exception inserting unmatched record:', err);
        }
      }
    }

    // Update upload history with final counts
    // Note: added count is tracked in updated_count for now since DB doesn't have added_count column
    if (uploadHistoryId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('upload_history')
        .update({
          created_count: createdCount,
          updated_count: updatedCount + addedCount,  // Include added in updated for history
          skipped_count: skippedCount,
          error_count: errorCount,
          blocked_count: blockedCount,
        })
        .eq('id', uploadHistoryId);
    }

    return NextResponse.json({
      results,
      summary: {
        total: records.length,
        created: createdCount,
        updated: updatedCount,
        added: addedCount,
        skipped: skippedCount,
        errors: errorCount,
        blocked: blockedCount,
        unmatched: unmatchedCount,
      },
      uploadHistoryId,
    });
  } catch (error) {
    console.error('Error processing invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
