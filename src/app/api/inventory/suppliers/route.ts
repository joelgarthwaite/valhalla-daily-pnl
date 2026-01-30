import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/inventory/suppliers
 * List all suppliers with optional filtering
 *
 * Query params:
 * - status: 'active' | 'inactive' | 'all' (default: 'active')
 * - search: Search term for name or code
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'active';
  const search = searchParams.get('search');

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
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    // Filter by status
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data: suppliers, error } = await query;

    if (error) throw error;

    // Get component counts per supplier
    const supplierIds = (suppliers || []).map(s => s.id);
    let componentCounts: Record<string, number> = {};

    if (supplierIds.length > 0) {
      const { data: counts, error: countError } = await supabase
        .from('component_suppliers')
        .select('supplier_id')
        .in('supplier_id', supplierIds);

      if (!countError && counts) {
        componentCounts = counts.reduce((acc, row) => {
          acc[row.supplier_id] = (acc[row.supplier_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Get active PO counts per supplier
    let poCounts: Record<string, number> = {};
    if (supplierIds.length > 0) {
      const { data: pos, error: poError } = await supabase
        .from('purchase_orders')
        .select('supplier_id')
        .in('supplier_id', supplierIds)
        .not('status', 'in', '("received","cancelled")');

      if (!poError && pos) {
        poCounts = pos.reduce((acc, row) => {
          acc[row.supplier_id] = (acc[row.supplier_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Enhance suppliers with counts
    const enhancedSuppliers = (suppliers || []).map(supplier => ({
      ...supplier,
      componentCount: componentCounts[supplier.id] || 0,
      activePOCount: poCounts[supplier.id] || 0,
    }));

    // Calculate summary stats
    const summary = {
      total: suppliers?.length || 0,
      active: (suppliers || []).filter(s => s.is_active).length,
      inactive: (suppliers || []).filter(s => !s.is_active).length,
      withComponents: Object.keys(componentCounts).length,
    };

    return NextResponse.json({
      suppliers: enhancedSuppliers,
      summary,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/suppliers
 * Create a new supplier
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
    if (!body.name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate code if provided
    if (body.code) {
      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .eq('code', body.code)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'A supplier with this code already exists' },
          { status: 400 }
        );
      }
    }

    // Insert supplier
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        name: body.name,
        code: body.code || null,
        contact_name: body.contact_name || null,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        address: body.address || null,
        country: body.country || null,
        default_lead_time_days: body.default_lead_time_days || 14,
        min_order_qty: body.min_order_qty || 1,
        min_order_value: body.min_order_value || null,
        payment_terms: body.payment_terms || null,
        currency: body.currency || 'GBP',
        is_active: body.is_active !== false,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
