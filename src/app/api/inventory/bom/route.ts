import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/inventory/bom
 * List BOM entries with optional filtering
 *
 * Query params:
 * - product_sku: Filter to a specific product SKU
 * - brand: Filter by brand ID
 * - status: Filter by product status (active, historic, discontinued)
 *
 * If product_sku is provided: Returns all BOM entries for that product with joined component data
 * If no product_sku: Returns all BOM entries grouped by product SKU with summary counts
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productSku = searchParams.get('product_sku');
  const brand = searchParams.get('brand');
  const status = searchParams.get('status');

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
    // Fetch BOM entries with component and category data
    let query = supabase
      .from('bom')
      .select(`
        *,
        component:components(
          id,
          sku,
          name,
          material,
          variant,
          is_active,
          category:component_categories(id, name)
        ),
        brand:brands(id, name, code)
      `)
      .order('product_sku', { ascending: true });

    if (productSku) {
      query = query.eq('product_sku', productSku);
    }

    if (brand && brand !== 'all') {
      query = query.eq('brand_id', brand);
    }

    const { data: bomEntries, error: bomError } = await query;
    if (bomError) throw bomError;

    // Fetch product SKUs for the products list
    let productQuery = supabase
      .from('product_skus')
      .select(`
        *,
        brand:brands(id, name, code)
      `)
      .order('sku', { ascending: true });

    if (status && status !== 'all') {
      productQuery = productQuery.eq('status', status);
    }

    const { data: productSkus, error: productError } = await productQuery;
    if (productError) throw productError;

    // Get counts for all statuses (unfiltered)
    const { data: allProductSkus } = await supabase
      .from('product_skus')
      .select('status');

    const statusCounts = {
      active: 0,
      historic: 0,
      discontinued: 0,
      total: allProductSkus?.length || 0,
    };

    (allProductSkus || []).forEach((p) => {
      if (p.status in statusCounts) {
        statusCounts[p.status as keyof typeof statusCounts]++;
      }
    });

    // Fetch all components for the "Add Component" dropdown
    const { data: components, error: componentsError } = await supabase
      .from('components')
      .select(`
        id,
        sku,
        name,
        material,
        variant,
        is_active,
        category:component_categories(id, name),
        stock:stock_levels(on_hand, available)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (componentsError) throw componentsError;

    // Fetch brands for filter dropdown
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });
    if (brandsError) throw brandsError;

    // Create a summary by product SKU
    const productBomCounts: Record<string, number> = {};
    (bomEntries || []).forEach((entry) => {
      productBomCounts[entry.product_sku] = (productBomCounts[entry.product_sku] || 0) + 1;
    });

    // Enhance product SKUs with BOM count
    const productsWithBom = (productSkus || []).map((product) => ({
      ...product,
      bomCount: productBomCounts[product.sku] || 0,
    }));

    // Calculate summary stats
    const totalProducts = productsWithBom.length;
    const productsWithBomCount = productsWithBom.filter((p) => p.bomCount > 0).length;
    const productsWithoutBom = totalProducts - productsWithBomCount;
    const totalBomEntries = bomEntries?.length || 0;

    return NextResponse.json({
      bomEntries: bomEntries || [],
      products: productsWithBom,
      components: components || [],
      brands: brands || [],
      summary: {
        totalProducts,
        productsWithBom: productsWithBomCount,
        productsWithoutBom,
        totalBomEntries,
      },
      statusCounts,
    });
  } catch (error) {
    console.error('Error fetching BOM data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BOM data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/bom
 * Create a new BOM entry
 *
 * Body: { product_sku, brand_id?, component_id, quantity, notes? }
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
    const { product_sku, brand_id, component_id, quantity, notes } = body;

    // Validate required fields
    if (!product_sku || !component_id) {
      return NextResponse.json(
        { error: 'Product SKU and Component ID are required' },
        { status: 400 }
      );
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Check for duplicate (product_sku + component_id must be unique)
    const { data: existing } = await supabase
      .from('bom')
      .select('id')
      .eq('product_sku', product_sku)
      .eq('component_id', component_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'This component is already in the BOM for this product' },
        { status: 400 }
      );
    }

    // Insert BOM entry
    const { data: bomEntry, error: insertError } = await supabase
      .from('bom')
      .insert({
        product_sku,
        brand_id: brand_id || null,
        component_id,
        quantity,
        notes: notes || null,
      })
      .select(`
        *,
        component:components(
          id,
          sku,
          name,
          material,
          variant,
          category:component_categories(id, name)
        )
      `)
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      bomEntry,
    });
  } catch (error) {
    console.error('Error creating BOM entry:', error);
    return NextResponse.json(
      { error: 'Failed to create BOM entry' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/bom
 * Update an existing BOM entry
 *
 * Body: { id, quantity?, notes? }
 */
export async function PATCH(request: NextRequest) {
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
    const { id, quantity, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'BOM entry ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (quantity !== undefined) {
      if (quantity < 1) {
        return NextResponse.json(
          { error: 'Quantity must be at least 1' },
          { status: 400 }
        );
      }
      updates.quantity = quantity;
    }
    if (notes !== undefined) {
      updates.notes = notes || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: bomEntry, error: updateError } = await supabase
      .from('bom')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        component:components(
          id,
          sku,
          name,
          material,
          variant,
          category:component_categories(id, name)
        )
      `)
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      bomEntry,
    });
  } catch (error) {
    console.error('Error updating BOM entry:', error);
    return NextResponse.json(
      { error: 'Failed to update BOM entry' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/bom?id=uuid
 * Delete a BOM entry
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'BOM entry ID is required' },
      { status: 400 }
    );
  }

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
    const { error: deleteError } = await supabase
      .from('bom')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting BOM entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete BOM entry' },
      { status: 500 }
    );
  }
}
