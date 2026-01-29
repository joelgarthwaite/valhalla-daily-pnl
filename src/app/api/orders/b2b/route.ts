import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Create Supabase admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateB2BOrderBody {
  brand_id: string;
  order_date: string;
  customer_name: string;
  order_number?: string;  // Can be tracking number for shipment linking
  subtotal: number;
  shipping_charged?: number;
  tax?: number;
  total?: number;
  shipping_address?: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    country_code?: string;
    zip?: string;
  };
  notes?: string;
}

/**
 * POST /api/orders/b2b
 * Create a new B2B order in the orders table
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateB2BOrderBody = await request.json();

    // Validate required fields
    if (!body.brand_id) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    if (!body.order_date) {
      return NextResponse.json({ error: 'Order date is required' }, { status: 400 });
    }
    if (!body.customer_name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (body.subtotal === undefined || body.subtotal === null) {
      return NextResponse.json({ error: 'Subtotal is required' }, { status: 400 });
    }

    // Calculate total if not provided
    const subtotal = Number(body.subtotal) || 0;
    const shippingCharged = Number(body.shipping_charged) || 0;
    const tax = Number(body.tax) || 0;
    const total = body.total !== undefined ? Number(body.total) : subtotal + shippingCharged + tax;

    // Generate a unique platform_order_id for B2B orders
    const platformOrderId = `B2B-${randomBytes(4).toString('hex').toUpperCase()}`;

    // Create the order
    const orderData = {
      brand_id: body.brand_id,
      store_id: null,  // B2B orders don't come from a store
      platform: 'b2b',
      platform_order_id: platformOrderId,
      order_number: body.order_number || null,  // Can be tracking number
      order_date: body.order_date,
      customer_name: body.customer_name,
      customer_email: null,
      shipping_address: body.shipping_address || null,
      subtotal,
      shipping_charged: shippingCharged,
      tax,
      total,
      currency: 'GBP',
      status: 'completed',
      fulfillment_status: 'fulfilled',
      line_items: null,
      raw_data: body.notes ? { notes: body.notes } : null,
      is_b2b: true,
      b2b_customer_name: body.customer_name,
    };

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating B2B order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order,
      message: 'B2B order created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/orders/b2b:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/b2b
 * List B2B orders
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brand = searchParams.get('brand');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    // Get brands for mapping
    const { data: brands } = await supabaseAdmin.from('brands').select('id, code, name');
    const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);

    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('platform', 'b2b')
      .is('excluded_at', null)
      .order('order_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (brand && brand !== 'all') {
      const brandId = brandMap.get(brand);
      if (brandId) {
        query = query.eq('brand_id', brandId);
      }
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching B2B orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Error in GET /api/orders/b2b:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
