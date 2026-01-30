import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/inventory/suppliers/[id]
 * Get a single supplier with related data
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
    // Get supplier with related components
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        components:component_suppliers(
          id,
          supplier_sku,
          unit_cost,
          lead_time_days,
          min_order_qty,
          priority,
          is_preferred,
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
          { error: 'Supplier not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Get active POs for this supplier
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status, total, ordered_date, expected_date')
      .eq('supplier_id', id)
      .not('status', 'in', '("received","cancelled")')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      supplier,
      purchaseOrders: purchaseOrders || [],
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/suppliers/[id]
 * Update a supplier
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

    // Check for duplicate code if changing
    if (body.code) {
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .eq('code', body.code)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'A supplier with this code already exists' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that were provided
    if (body.name !== undefined) updates.name = body.name;
    if (body.code !== undefined) updates.code = body.code || null;
    if (body.contact_name !== undefined) updates.contact_name = body.contact_name || null;
    if (body.contact_email !== undefined) updates.contact_email = body.contact_email || null;
    if (body.contact_phone !== undefined) updates.contact_phone = body.contact_phone || null;
    if (body.address !== undefined) updates.address = body.address || null;
    if (body.country !== undefined) updates.country = body.country || null;
    if (body.default_lead_time_days !== undefined) updates.default_lead_time_days = body.default_lead_time_days;
    if (body.min_order_qty !== undefined) updates.min_order_qty = body.min_order_qty;
    if (body.min_order_value !== undefined) updates.min_order_value = body.min_order_value || null;
    if (body.payment_terms !== undefined) updates.payment_terms = body.payment_terms || null;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.notes !== undefined) updates.notes = body.notes || null;

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Supplier not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/suppliers/[id]
 * Delete a supplier (soft delete by setting inactive, or hard delete if no relations)
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
    // Check for related purchase orders
    const { data: pos } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);

    if (pos && pos.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with purchase order history. Mark as inactive instead.' },
        { status: 400 }
      );
    }

    // Check for component relationships
    const { data: components } = await supabase
      .from('component_suppliers')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);

    if (components && components.length > 0) {
      // Soft delete - mark as inactive
      const { error: updateError } = await supabase
        .from('suppliers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Supplier marked as inactive (has component relationships)',
        softDelete: true,
      });
    }

    // Hard delete if no relationships
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted',
      softDelete: false,
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
