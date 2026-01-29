import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ComponentFormData } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/inventory/components/[id]
 * Get a single component with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { data: component, error } = await supabase
      .from('components')
      .select(`
        *,
        category:component_categories(*),
        brand:brands(*),
        stock:stock_levels(*),
        suppliers:component_suppliers(
          *,
          supplier:suppliers(*)
        ),
        bom:bom(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Component not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ component });
  } catch (error) {
    console.error('Error fetching component:', error);
    return NextResponse.json(
      { error: 'Failed to fetch component' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/components/[id]
 * Update a component
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const body: Partial<ComponentFormData> = await request.json();

    // If SKU is being changed, check for duplicates
    if (body.sku) {
      const { data: existing } = await supabase
        .from('components')
        .select('id, brand_id')
        .eq('sku', body.sku)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        // Check if same brand
        const { data: current } = await supabase
          .from('components')
          .select('brand_id')
          .eq('id', id)
          .single();

        if (current && existing.brand_id === current.brand_id) {
          return NextResponse.json(
            { error: 'A component with this SKU already exists for this brand' },
            { status: 400 }
          );
        }
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.brand_id !== undefined) updateData.brand_id = body.brand_id || null;
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.category_id !== undefined) updateData.category_id = body.category_id || null;
    if (body.material !== undefined) updateData.material = body.material || null;
    if (body.variant !== undefined) updateData.variant = body.variant || null;
    if (body.safety_stock_days !== undefined) updateData.safety_stock_days = body.safety_stock_days;
    if (body.min_order_qty !== undefined) updateData.min_order_qty = body.min_order_qty;
    if (body.lead_time_days !== undefined) updateData.lead_time_days = body.lead_time_days || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: component, error } = await supabase
      .from('components')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      component,
    });
  } catch (error) {
    console.error('Error updating component:', error);
    return NextResponse.json(
      { error: 'Failed to update component' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/components/[id]
 * Delete a component
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    // Check for BOM references
    const { data: bomRefs } = await supabase
      .from('bom')
      .select('id')
      .eq('component_id', id)
      .limit(1);

    if (bomRefs && bomRefs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete component that is used in Bill of Materials. Remove BOM entries first.' },
        { status: 400 }
      );
    }

    // Check for pending PO items
    const { data: poItems } = await supabase
      .from('purchase_order_items')
      .select('id, purchase_orders!inner(status)')
      .eq('component_id', id)
      .in('purchase_orders.status', ['draft', 'pending', 'approved', 'sent', 'confirmed', 'partial'])
      .limit(1);

    if (poItems && poItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete component with pending purchase orders' },
        { status: 400 }
      );
    }

    // Delete stock levels first (cascade should handle this, but being explicit)
    await supabase
      .from('stock_levels')
      .delete()
      .eq('component_id', id);

    // Delete the component
    const { error } = await supabase
      .from('components')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting component:', error);
    return NextResponse.json(
      { error: 'Failed to delete component' },
      { status: 500 }
    );
  }
}
