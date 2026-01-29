import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Component, ComponentFormData } from '@/types';

/**
 * GET /api/inventory/components
 * List all components with optional filtering
 *
 * Query params:
 * - brand: Brand ID to filter by
 * - category: Category ID to filter by
 * - search: Search term for SKU or name
 * - active: 'true' | 'false' | 'all' (default: 'true')
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brand = searchParams.get('brand');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const active = searchParams.get('active') || 'true';

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
      .from('components')
      .select(`
        *,
        category:component_categories(*),
        brand:brands(*),
        stock:stock_levels(*)
      `)
      .order('name', { ascending: true });

    // Apply filters
    if (brand && brand !== 'all') {
      query = query.eq('brand_id', brand);
    }

    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }

    if (search) {
      query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (active !== 'all') {
      query = query.eq('is_active', active === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch categories for filter dropdown
    const { data: categories } = await supabase
      .from('component_categories')
      .select('*')
      .order('display_order', { ascending: true });

    // Fetch brands for filter dropdown
    const { data: brands } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });

    return NextResponse.json({
      components: data || [],
      categories: categories || [],
      brands: brands || [],
    });
  } catch (error) {
    console.error('Error fetching components:', error);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/components
 * Create a new component
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
    const body: ComponentFormData = await request.json();

    // Validate required fields
    if (!body.sku || !body.name) {
      return NextResponse.json(
        { error: 'SKU and name are required' },
        { status: 400 }
      );
    }

    // Check for duplicate SKU within the same brand
    const { data: existing } = await supabase
      .from('components')
      .select('id')
      .eq('sku', body.sku)
      .eq('brand_id', body.brand_id || null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A component with this SKU already exists for this brand' },
        { status: 400 }
      );
    }

    // Insert component
    const { data: component, error: insertError } = await supabase
      .from('components')
      .insert({
        brand_id: body.brand_id || null,
        sku: body.sku,
        name: body.name,
        description: body.description || null,
        category_id: body.category_id || null,
        material: body.material || null,
        variant: body.variant || null,
        safety_stock_days: body.safety_stock_days ?? 14,
        min_order_qty: body.min_order_qty ?? 1,
        lead_time_days: body.lead_time_days || null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create initial stock level record
    const { error: stockError } = await supabase
      .from('stock_levels')
      .insert({
        component_id: component.id,
        on_hand: 0,
        reserved: 0,
        on_order: 0,
      });

    if (stockError) {
      console.error('Error creating stock level:', stockError);
      // Don't fail the whole request, just log it
    }

    return NextResponse.json({
      success: true,
      component,
    });
  } catch (error) {
    console.error('Error creating component:', error);
    return NextResponse.json(
      { error: 'Failed to create component' },
      { status: 500 }
    );
  }
}
