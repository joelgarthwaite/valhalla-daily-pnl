import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ProductSkuFormData } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/inventory/product-skus/[id]
 * Get a single product SKU with full details
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
    const { data: productSku, error } = await supabase
      .from('product_skus')
      .select(`
        *,
        brand:brands(*),
        sku_mappings:sku_mapping(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product SKU not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ productSku });
  } catch (error) {
    console.error('Error fetching product SKU:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product SKU' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/product-skus/[id]
 * Update a product SKU
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
    const body: Partial<ProductSkuFormData> = await request.json();

    // If SKU is being changed, check for duplicates
    if (body.sku) {
      const { data: existing } = await supabase
        .from('product_skus')
        .select('id, brand_id')
        .eq('sku', body.sku)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        // Check if same brand
        const { data: current } = await supabase
          .from('product_skus')
          .select('brand_id')
          .eq('id', id)
          .single();

        if (current && existing.brand_id === current.brand_id) {
          return NextResponse.json(
            { error: 'A product SKU with this code already exists for this brand' },
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
    if (body.status !== undefined) updateData.status = body.status;
    if (body.platforms !== undefined) updateData.platforms = body.platforms;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    const { data: productSku, error } = await supabase
      .from('product_skus')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      productSku,
    });
  } catch (error) {
    console.error('Error updating product SKU:', error);
    return NextResponse.json(
      { error: 'Failed to update product SKU' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/product-skus/[id]
 * Delete a product SKU
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
      .eq('product_sku_id', id)
      .limit(1);

    if (bomRefs && bomRefs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product SKU that has Bill of Materials entries. Remove BOM entries first.' },
        { status: 400 }
      );
    }

    // Check for SKU mapping references
    const { data: mappingRefs } = await supabase
      .from('sku_mapping')
      .select('id')
      .eq('product_sku_id', id)
      .limit(1);

    if (mappingRefs && mappingRefs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product SKU that has SKU mappings. Remove mappings first.' },
        { status: 400 }
      );
    }

    // Delete the product SKU
    const { error } = await supabase
      .from('product_skus')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product SKU:', error);
    return NextResponse.json(
      { error: 'Failed to delete product SKU' },
      { status: 500 }
    );
  }
}
