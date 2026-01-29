import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { UnmatchedInvoiceRecord, UnmatchedRecordStatus } from '@/types';

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List unmatched records
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status'); // pending, matched, voided, resolved, all
    const carrier = searchParams.get('carrier'); // dhl, royalmail
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('unmatched_invoice_records')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (carrier) {
      query = query.eq('carrier', carrier);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching unmatched records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch unmatched records' },
        { status: 500 }
      );
    }

    // Get counts by status
    const { data: statusCounts } = await supabaseAdmin
      .from('unmatched_invoice_records')
      .select('status')
      .then(({ data: allRecords }: { data: { status: string }[] | null }) => {
        const counts = {
          pending: 0,
          matched: 0,
          voided: 0,
          resolved: 0,
          total: 0,
        };
        if (allRecords) {
          for (const record of allRecords) {
            counts.total++;
            if (record.status in counts) {
              counts[record.status as keyof typeof counts]++;
            }
          }
        }
        return { data: counts };
      });

    return NextResponse.json({
      records: data as UnmatchedInvoiceRecord[],
      total: count || 0,
      statusCounts: statusCounts || { pending: 0, matched: 0, voided: 0, resolved: 0, total: 0 },
    });
  } catch (error) {
    console.error('Error in unmatched records GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update record status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, resolution_notes, matched_order_id } = body as {
      id: string;
      status: UnmatchedRecordStatus;
      resolution_notes?: string;
      matched_order_id?: string;
    };

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      resolution_notes: resolution_notes || null,
      resolved_at: ['matched', 'voided', 'resolved'].includes(status) ? new Date().toISOString() : null,
    };

    // If matching to an order, we need to create a shipment
    if (status === 'matched' && matched_order_id) {
      // Get the unmatched record details
      const { data: unmatchedRecord, error: fetchError } = await supabaseAdmin
        .from('unmatched_invoice_records')
        .select('*')
        .eq('id', id)
        .single() as { data: UnmatchedInvoiceRecord | null; error: Error | null };

      if (fetchError || !unmatchedRecord) {
        return NextResponse.json(
          { error: 'Unmatched record not found' },
          { status: 404 }
        );
      }

      // Get the order details - search by ID, order_number, platform_order_id, or b2b_customer_name
      let order: { id: string; brand_id: string } | null = null;

      // First try exact UUID match
      const { data: orderById } = await supabaseAdmin
        .from('orders')
        .select('id, brand_id')
        .eq('id', matched_order_id)
        .single() as { data: { id: string; brand_id: string } | null };

      if (orderById) {
        order = orderById;
      } else {
        // Try order_number
        const { data: orderByNumber } = await supabaseAdmin
          .from('orders')
          .select('id, brand_id')
          .eq('order_number', matched_order_id)
          .single() as { data: { id: string; brand_id: string } | null };

        if (orderByNumber) {
          order = orderByNumber;
        } else {
          // Try platform_order_id
          const { data: orderByPlatformId } = await supabaseAdmin
            .from('orders')
            .select('id, brand_id')
            .eq('platform_order_id', matched_order_id)
            .single() as { data: { id: string; brand_id: string } | null };

          if (orderByPlatformId) {
            order = orderByPlatformId;
          } else {
            // Try b2b_customer_name (partial match for B2B orders)
            const { data: orderByB2BName } = await supabaseAdmin
              .from('orders')
              .select('id, brand_id')
              .eq('platform', 'b2b')
              .ilike('b2b_customer_name', `%${matched_order_id}%`)
              .single() as { data: { id: string; brand_id: string } | null };

            if (orderByB2BName) {
              order = orderByB2BName;
            }
          }
        }
      }

      if (!order) {
        return NextResponse.json(
          { error: 'Order not found. Try searching by order number, platform order ID, or B2B customer name.' },
          { status: 404 }
        );
      }

      // Get carrier account
      const { data: carrierAccount } = await supabaseAdmin
        .from('carrier_accounts')
        .select('id')
        .eq('carrier', unmatchedRecord.carrier)
        .single() as { data: { id: string } | null };

      // Create the shipment
      const { data: shipment, error: shipmentError } = await supabaseAdmin
        .from('shipments')
        .insert({
          order_id: order.id,
          brand_id: order.brand_id,
          carrier: unmatchedRecord.carrier,
          carrier_account_id: carrierAccount?.id || null,
          tracking_number: unmatchedRecord.tracking_number,
          service_type: unmatchedRecord.service_type,
          direction: 'outbound',
          weight_kg: unmatchedRecord.weight_kg,
          shipping_cost: unmatchedRecord.shipping_cost,
          shipping_date: unmatchedRecord.shipping_date,
          status: 'delivered',
          cost_updated_at: new Date().toISOString(),
          raw_data: {
            cost_type: unmatchedRecord.carrier === 'dhl' ? 'actual' : 'estimated',
            matched_from_unmatched: true,
            original_unmatched_id: id,
          },
        })
        .select('id')
        .single() as { data: { id: string } | null; error: Error | null };

      if (shipmentError) {
        console.error('Error creating shipment:', shipmentError);
        return NextResponse.json(
          { error: `Failed to create shipment: ${shipmentError.message || JSON.stringify(shipmentError)}` },
          { status: 500 }
        );
      }

      updateData.matched_order_id = order.id;
      updateData.matched_shipment_id = shipment?.id;
    }

    // Update the unmatched record
    const { data, error } = await supabaseAdmin
      .from('unmatched_invoice_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating unmatched record:', error);
      return NextResponse.json(
        { error: 'Failed to update record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error('Error in unmatched records PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Deduplicate records
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'dedupe') {
      return NextResponse.json(
        { error: 'Unknown action. Supported: dedupe' },
        { status: 400 }
      );
    }

    // Fetch all pending records
    const { data: allRecords, error: fetchError } = await supabaseAdmin
      .from('unmatched_invoice_records')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching records for deduplication:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    if (!allRecords || allRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending records to deduplicate',
        duplicatesRemoved: 0,
      });
    }

    // Group by tracking_number + invoice_number + shipping_cost
    const groups = new Map<string, typeof allRecords>();

    for (const record of allRecords) {
      const key = `${record.tracking_number}|${record.invoice_number || ''}|${record.shipping_cost}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    // Find duplicates (groups with more than 1 record)
    const idsToDelete: string[] = [];

    for (const [, records] of groups) {
      if (records.length > 1) {
        // Keep the first one (oldest by created_at), delete the rest
        for (let i = 1; i < records.length; i++) {
          idsToDelete.push(records[i].id);
        }
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duplicates found',
        duplicatesRemoved: 0,
      });
    }

    // Delete duplicates
    const { error: deleteError } = await supabaseAdmin
      .from('unmatched_invoice_records')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete duplicates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${idsToDelete.length} duplicate records`,
      duplicatesRemoved: idsToDelete.length,
    });
  } catch (error) {
    console.error('Error in unmatched records POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('unmatched_invoice_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting unmatched record:', error);
      return NextResponse.json(
        { error: 'Failed to delete record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unmatched records DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
