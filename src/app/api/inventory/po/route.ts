import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * GET /api/inventory/po
 * List purchase orders with optional filtering
 *
 * Query params:
 * - status: Filter by status (draft, sent, partial, received, etc.)
 * - supplier: Filter by supplier ID
 * - limit: Max results (default 50)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const supplier = searchParams.get('supplier');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

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
    // Build query
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, code),
        brand:brands(id, name, code),
        items:purchase_order_items(
          id,
          quantity_ordered,
          quantity_received,
          unit_price,
          line_total,
          is_complete,
          component:components(id, sku, name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (supplier && supplier !== 'all') {
      query = query.eq('supplier_id', supplier);
    }

    const { data: purchaseOrders, error } = await query;

    if (error) throw error;

    // Calculate summary stats
    const allPOs = purchaseOrders || [];
    const summary = {
      total: allPOs.length,
      draft: allPOs.filter(po => po.status === 'draft').length,
      pending: allPOs.filter(po => po.status === 'pending').length,
      sent: allPOs.filter(po => po.status === 'sent' || po.status === 'confirmed').length,
      partial: allPOs.filter(po => po.status === 'partial').length,
      received: allPOs.filter(po => po.status === 'received').length,
      cancelled: allPOs.filter(po => po.status === 'cancelled').length,
      totalValue: allPOs
        .filter(po => po.status !== 'cancelled')
        .reduce((sum, po) => sum + (po.total || 0), 0),
      openValue: allPOs
        .filter(po => !['received', 'cancelled'].includes(po.status))
        .reduce((sum, po) => sum + (po.total || 0), 0),
    };

    // Fetch suppliers for filter dropdown
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name', { ascending: true });

    return NextResponse.json({
      purchaseOrders,
      summary,
      suppliers: suppliers || [],
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/po
 * Create a new purchase order
 */
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!body.supplier_id) {
      return NextResponse.json(
        { error: 'Supplier is required' },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Generate PO number
    const today = new Date();
    const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Get next sequence number for this month
    const { data: existingPOs } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .like('po_number', `${prefix}%`)
      .order('po_number', { ascending: false })
      .limit(1);

    let nextSeq = 1;
    if (existingPOs && existingPOs.length > 0) {
      const lastNum = parseInt(existingPOs[0].po_number.slice(-4), 10);
      nextSeq = lastNum + 1;
    }
    const poNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Calculate totals
    const subtotal = body.items.reduce(
      (sum: number, item: { quantity: number; unit_price: number }) =>
        sum + item.quantity * item.unit_price,
      0
    );
    const shippingCost = body.shipping_cost || 0;
    const tax = body.tax || 0;
    const total = subtotal + shippingCost + tax;

    // Create purchase order
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id: body.supplier_id,
        brand_id: body.brand_id || null,
        po_number: poNumber,
        status: body.status || 'draft',
        ordered_date: body.ordered_date || null,
        expected_date: body.expected_date || null,
        subtotal,
        shipping_cost: shippingCost,
        tax,
        total,
        currency: body.currency || 'GBP',
        shipping_address: body.shipping_address || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (poError) throw poError;

    // Create line items
    const items = body.items.map((item: { component_id: string; quantity: number; unit_price: number; notes?: string }) => ({
      purchase_order_id: purchaseOrder.id,
      component_id: item.component_id,
      quantity_ordered: item.quantity,
      unit_price: item.unit_price,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(items);

    if (itemsError) throw itemsError;

    // If status is sent/confirmed, update stock levels (on_order)
    if (['sent', 'confirmed'].includes(body.status || 'draft')) {
      for (const item of body.items) {
        await updateOnOrderStock(supabase, item.component_id, item.quantity);
      }
    }

    return NextResponse.json({
      success: true,
      purchaseOrder,
      poNumber,
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}

// Helper to update on_order stock
async function updateOnOrderStock(
  supabase: SupabaseClient,
  componentId: string,
  quantity: number
) {
  // Get current stock level
  const { data: stock } = await supabase
    .from('stock_levels')
    .select('id, on_order')
    .eq('component_id', componentId)
    .single();

  if (stock) {
    await supabase
      .from('stock_levels')
      .update({
        on_order: stock.on_order + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stock.id);
  } else {
    // Create stock level if it doesn't exist
    await supabase
      .from('stock_levels')
      .insert({
        component_id: componentId,
        on_order: quantity,
      });
  }
}
