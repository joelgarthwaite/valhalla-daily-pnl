import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

/**
 * GET /api/xero/invoices/[id]
 *
 * Get a single invoice by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: invoice, error } = await supabase
      .from('xero_invoices')
      .select('*, brands(code, name)')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/xero/invoices/[id]
 *
 * Approve or ignore an invoice
 *
 * Body:
 *   action: 'approve' | 'ignore' (required)
 *   tracking_number?: string (optional, for shipment linking)
 *   notes?: string (optional, reason for ignore or additional info)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const { action, tracking_number, notes } = body;

    if (!action || !['approve', 'ignore', 'link_existing'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve", "ignore", or "link_existing"' },
        { status: 400 }
      );
    }

    // Get the invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('xero_invoices')
      .select('*, brands(code, name)')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (invoice.approval_status !== 'pending') {
      return NextResponse.json(
        { error: `Invoice already ${invoice.approval_status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'ignore') {
      // Mark as ignored
      const { error: updateError } = await supabase
        .from('xero_invoices')
        .update({
          approval_status: 'ignored',
          notes: notes || null,
          approved_at: now,
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice ignored',
        invoice_number: invoice.invoice_number,
      });
    }

    // Action is 'link_existing' - link to an existing order without creating new
    if (action === 'link_existing') {
      const { existing_order_id } = body;

      if (!existing_order_id) {
        return NextResponse.json(
          { error: 'existing_order_id is required for link_existing action' },
          { status: 400 }
        );
      }

      // Verify the order exists
      const { data: existingOrder, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, order_number, subtotal, total')
        .eq('id', existing_order_id)
        .single();

      if (orderFetchError || !existingOrder) {
        return NextResponse.json(
          { error: 'Existing order not found' },
          { status: 404 }
        );
      }

      // Update the invoice as approved and linked
      const { error: updateError } = await supabase
        .from('xero_invoices')
        .update({
          approval_status: 'approved',
          matched_order_id: existingOrder.id,
          approved_at: now,
          notes: notes || `Linked to existing order ${existingOrder.order_number || existingOrder.id}`,
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Optionally update the order's raw_data to include this invoice
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('raw_data')
        .eq('id', existing_order_id)
        .single();

      if (currentOrder) {
        const rawData = (currentOrder.raw_data || {}) as Record<string, unknown>;
        const linkedInvoices = (rawData.linked_xero_invoices || []) as string[];
        linkedInvoices.push(invoice.invoice_number);

        await supabase
          .from('orders')
          .update({
            raw_data: {
              ...rawData,
              linked_xero_invoices: linkedInvoices,
            },
          })
          .eq('id', existing_order_id);
      }

      // If tracking number provided, link shipment to the existing order
      if (tracking_number) {
        const { data: shipment } = await supabase
          .from('shipments')
          .select('id')
          .eq('tracking_number', tracking_number)
          .single();

        if (shipment) {
          await supabase
            .from('shipments')
            .update({ order_id: existingOrder.id })
            .eq('id', shipment.id);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice linked to existing order',
        invoice_number: invoice.invoice_number,
        order: {
          id: existingOrder.id,
          order_number: existingOrder.order_number,
        },
      });
    }

    // Action is 'approve' - create B2B order
    const platformOrderId = `B2B-${randomBytes(4).toString('hex').toUpperCase()}`;

    const orderData = {
      brand_id: invoice.brand_id,
      store_id: null,
      platform: 'b2b',
      platform_order_id: platformOrderId,
      order_number: invoice.invoice_number, // Use Xero invoice number
      order_date: invoice.invoice_date,
      customer_name: invoice.contact_name,
      customer_email: invoice.contact_email,
      shipping_address: null,
      subtotal: invoice.subtotal,
      shipping_charged: 0,
      tax: invoice.tax_total || 0,
      total: invoice.total,
      currency: invoice.currency || 'GBP',
      status: 'completed',
      fulfillment_status: tracking_number ? 'fulfilled' : 'pending',
      line_items: invoice.line_items ? invoice.line_items.map((item: { Description: string; Quantity: number; UnitAmount: number; LineAmount: number }) => ({
        id: randomBytes(4).toString('hex'),
        title: item.Description,
        quantity: item.Quantity,
        price: item.UnitAmount,
      })) : null,
      raw_data: {
        source: 'xero_invoice',
        xero_invoice_id: invoice.xero_invoice_id,
        xero_invoice_number: invoice.invoice_number,
        contact_data: invoice.contact_data,
        notes: notes || null,
        tracking_number: tracking_number || null,
      },
      is_b2b: true,
      b2b_customer_name: invoice.contact_name,
    };

    // Create the B2B order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id, order_number')
      .single();

    if (orderError) {
      console.error('Error creating B2B order:', orderError);
      return NextResponse.json(
        { error: `Failed to create B2B order: ${orderError.message}` },
        { status: 500 }
      );
    }

    // Update the invoice as approved
    const { error: updateError } = await supabase
      .from('xero_invoices')
      .update({
        approval_status: 'approved',
        matched_order_id: order.id,
        approved_at: now,
        notes: notes || null,
      })
      .eq('id', id);

    if (updateError) {
      // Order was created but invoice update failed - log warning
      console.error('Failed to update invoice status:', updateError);
    }

    // Optionally link tracking number to shipment if provided
    if (tracking_number) {
      // Check if shipment exists in shipments table
      const { data: shipment } = await supabase
        .from('shipments')
        .select('id')
        .eq('tracking_number', tracking_number)
        .single();

      if (shipment) {
        // Link shipment to order
        await supabase
          .from('shipments')
          .update({ order_id: order.id })
          .eq('id', shipment.id);
      }

      // Also mark as matched in unmatched_invoice_records if it exists there
      const { data: unmatchedRecord } = await supabase
        .from('unmatched_invoice_records')
        .select('id')
        .eq('tracking_number', tracking_number)
        .eq('status', 'pending')
        .single();

      if (unmatchedRecord) {
        await supabase
          .from('unmatched_invoice_records')
          .update({
            status: 'matched',
            matched_order_id: order.id,
            resolution_notes: `Linked via Xero invoice ${invoice.invoice_number}`,
            resolved_at: now,
          })
          .eq('id', unmatchedRecord.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice approved and B2B order created',
      invoice_number: invoice.invoice_number,
      order: {
        id: order.id,
        order_number: order.order_number,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/xero/invoices/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/xero/invoices/[id]
 *
 * Delete a synced invoice (only if pending)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Check if pending
    const { data: invoice } = await supabase
      .from('xero_invoices')
      .select('approval_status, invoice_number')
      .eq('id', id)
      .single();

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.approval_status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending invoices' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('xero_invoices')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted',
      invoice_number: invoice.invoice_number,
    });
  } catch (error) {
    console.error('Error in DELETE /api/xero/invoices/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
