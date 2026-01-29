import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ProductSkuFormData } from '@/types';

/**
 * GET /api/inventory/product-skus
 * List all product SKUs with optional filtering
 *
 * Query params:
 * - brand: Brand ID to filter by
 * - status: 'active' | 'historic' | 'discontinued' | 'all'
 * - search: Search term for SKU or name
 * - platform: Filter by platform availability
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brand = searchParams.get('brand');
  const status = searchParams.get('status') || 'all';
  const search = searchParams.get('search');
  const platform = searchParams.get('platform');

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
    let query = supabase
      .from('product_skus')
      .select(`
        *,
        brand:brands(*)
      `)
      .order('sku', { ascending: true });

    // Apply filters
    if (brand && brand !== 'all') {
      query = query.eq('brand_id', brand);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (platform && platform !== 'all') {
      query = query.contains('platforms', [platform]);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch brands for filter dropdown
    const { data: brands } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });

    // Get counts by status
    const { data: statusCounts } = await supabase
      .from('product_skus')
      .select('status')
      .then(result => {
        const counts = { active: 0, historic: 0, discontinued: 0, total: 0 };
        if (result.data) {
          result.data.forEach(row => {
            counts[row.status as keyof typeof counts]++;
            counts.total++;
          });
        }
        return { data: counts };
      });

    return NextResponse.json({
      productSkus: data || [],
      brands: brands || [],
      statusCounts: statusCounts || { active: 0, historic: 0, discontinued: 0, total: 0 },
    });
  } catch (error) {
    console.error('Error fetching product SKUs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product SKUs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/product-skus
 * Create a new product SKU
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
    const body: ProductSkuFormData = await request.json();

    // Validate required fields
    if (!body.sku || !body.name) {
      return NextResponse.json(
        { error: 'SKU and name are required' },
        { status: 400 }
      );
    }

    // Check for duplicate SKU within the same brand
    const { data: existing } = await supabase
      .from('product_skus')
      .select('id')
      .eq('sku', body.sku)
      .eq('brand_id', body.brand_id || null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A product SKU with this code already exists for this brand' },
        { status: 400 }
      );
    }

    // Insert product SKU
    const { data: productSku, error: insertError } = await supabase
      .from('product_skus')
      .insert({
        brand_id: body.brand_id || null,
        sku: body.sku,
        name: body.name,
        description: body.description || null,
        status: body.status || 'active',
        platforms: body.platforms || [],
        notes: body.notes || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      productSku,
    });
  } catch (error) {
    console.error('Error creating product SKU:', error);
    return NextResponse.json(
      { error: 'Failed to create product SKU' },
      { status: 500 }
    );
  }
}
