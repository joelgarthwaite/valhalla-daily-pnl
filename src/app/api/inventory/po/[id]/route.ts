import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PurchaseOrderStatus } from '@/types';

/**
 * GET /api/inventory/po/[id]
 * Get a single purchase order with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: purchaseOrder, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(*),
        brand:brands(*),
        items:purchase_order_items(
          *,
          component:components(
            id,
            sku,
            name,
            category:component_categories(name)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Purchase order not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ purchaseOrder });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/po/[id]
 * Update a purchase order (status changes, receiving stock, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();

    // Get current PO state
    const { data: currentPO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_order_items(
          id,
          component_id,
          quantity_ordered,
          quantity_received
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Purchase order not found' },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    // Handle status transitions
    if (body.status && body.status !== currentPO.status) {
      const transition = await handleStatusTransition(
        supabase,
        currentPO,
        body.status as PurchaseOrderStatus
      );
      if (!transition.allowed) {
        return NextResponse.json(
          { error: transition.reason },
          { status: 400 }
        );
      }
    }

    // Handle receiving items
    if (body.receiveItems) {
      for (const item of body.receiveItems) {
        await receiveItem(supabase, item.itemId, item.quantityReceived);
      }

      // Check if all items are complete
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('is_complete')
        .eq('purchase_order_id', id);

      const allComplete = items?.every(i => i.is_complete);
      const anyReceived = items?.some(i => !i.is_complete);

      // Auto-update status based on receiving
      if (allComplete && body.status !== 'received') {
        body.status = 'received';
        body.received_date = new Date().toISOString().split('T')[0];
      } else if (anyReceived && !['partial', 'received'].includes(currentPO.status)) {
        body.status = 'partial';
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updates.status = body.status;
    if (body.ordered_date !== undefined) updates.ordered_date = body.ordered_date;
    if (body.expected_date !== undefined) updates.expected_date = body.expected_date;
    if (body.received_date !== undefined) updates.received_date = body.received_date;
    if (body.shipping_cost !== undefined) {
      updates.shipping_cost = body.shipping_cost;
      updates.total = currentPO.subtotal + body.shipping_cost + (body.tax ?? currentPO.tax);
    }
    if (body.tax !== undefined) {
      updates.tax = body.tax;
      updates.total = currentPO.subtotal + (body.shipping_cost ?? currentPO.shipping_cost) + body.tax;
    }
    if (body.shipping_address !== undefined) updates.shipping_address = body.shipping_address;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data: purchaseOrder, error: updateError } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      purchaseOrder,
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/po/[id]
 * Delete a purchase order (only if draft or cancelled)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check current status
    const { data: po, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Purchase order not found' },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (!['draft', 'cancelled'].includes(po.status)) {
      return NextResponse.json(
        { error: 'Can only delete draft or cancelled purchase orders' },
        { status: 400 }
      );
    }

    // Delete items first (cascade should handle this, but being explicit)
    await supabase
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', id);

    // Delete PO
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Purchase order deleted',
    });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    );
  }
}

// Helper: Handle status transitions
interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

async function handleStatusTransition(
  supabase: SupabaseClient,
  currentPO: { id: string; status: string; items: Array<{ component_id: string; quantity_ordered: number; quantity_received: number }> },
  newStatus: PurchaseOrderStatus
): Promise<TransitionResult> {
  const validTransitions: Record<string, PurchaseOrderStatus[]> = {
    draft: ['pending', 'sent', 'cancelled'],
    pending: ['approved', 'sent', 'cancelled'],
    approved: ['sent', 'cancelled'],
    sent: ['confirmed', 'partial', 'received', 'cancelled'],
    confirmed: ['partial', 'received', 'cancelled'],
    partial: ['received', 'cancelled'],
    received: [], // Terminal state
    cancelled: ['draft'], // Can re-open as draft
  };

  const allowed = validTransitions[currentPO.status]?.includes(newStatus) ?? false;

  if (!allowed) {
    return {
      allowed: false,
      reason: `Cannot transition from ${currentPO.status} to ${newStatus}`,
    };
  }

  // Handle stock updates on certain transitions
  if (['sent', 'confirmed'].includes(newStatus) && !['sent', 'confirmed', 'partial', 'received'].includes(currentPO.status)) {
    // Moving to "on order" - update stock levels
    for (const item of currentPO.items) {
      await updateOnOrderStock(supabase, item.component_id, item.quantity_ordered);
    }
  }

  if (newStatus === 'cancelled' && ['sent', 'confirmed', 'partial'].includes(currentPO.status)) {
    // Cancelling - remove from on_order, but don't touch received stock
    for (const item of currentPO.items) {
      const remaining = item.quantity_ordered - item.quantity_received;
      if (remaining > 0) {
        await updateOnOrderStock(supabase, item.component_id, -remaining);
      }
    }
  }

  return { allowed: true };
}

// Helper: Update on_order stock
async function updateOnOrderStock(
  supabase: SupabaseClient,
  componentId: string,
  quantity: number
) {
  const { data: stock } = await supabase
    .from('stock_levels')
    .select('id, on_order')
    .eq('component_id', componentId)
    .single();

  if (stock) {
    await supabase
      .from('stock_levels')
      .update({
        on_order: Math.max(0, stock.on_order + quantity),
        updated_at: new Date().toISOString(),
      })
      .eq('id', stock.id);
  } else if (quantity > 0) {
    await supabase
      .from('stock_levels')
      .insert({
        component_id: componentId,
        on_order: quantity,
      });
  }
}

// Helper: Receive an item
async function receiveItem(
  supabase: SupabaseClient,
  itemId: string,
  quantityReceived: number
) {
  // Get the item
  const { data: item, error: itemError } = await supabase
    .from('purchase_order_items')
    .select('component_id, quantity_ordered, quantity_received')
    .eq('id', itemId)
    .single();

  if (itemError || !item) throw itemError || new Error('Item not found');

  const newReceived = item.quantity_received + quantityReceived;
  const remaining = item.quantity_ordered - newReceived;

  // Update item
  await supabase
    .from('purchase_order_items')
    .update({
      quantity_received: newReceived,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId);

  // Update stock levels
  const { data: stock } = await supabase
    .from('stock_levels')
    .select('id, on_hand, on_order')
    .eq('component_id', item.component_id)
    .single();

  if (stock) {
    await supabase
      .from('stock_levels')
      .update({
        on_hand: stock.on_hand + quantityReceived,
        on_order: Math.max(0, stock.on_order - quantityReceived),
        last_movement_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', stock.id);
  } else {
    await supabase
      .from('stock_levels')
      .insert({
        component_id: item.component_id,
        on_hand: quantityReceived,
        last_movement_at: new Date().toISOString(),
      });
  }

  // Create stock transaction
  await supabase.from('stock_transactions').insert({
    component_id: item.component_id,
    transaction_type: 'receive',
    quantity: quantityReceived,
    quantity_before: stock?.on_hand || 0,
    quantity_after: (stock?.on_hand || 0) + quantityReceived,
    reference_type: 'purchase_order',
    reference_id: itemId,
    notes: `Received from PO`,
  });
}
