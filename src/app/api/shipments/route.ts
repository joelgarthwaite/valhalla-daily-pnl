import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/shipments
 *
 * List shipments with optional filters
 *
 * Query params:
 *   unlinked: 'true' - Only return shipments without an order_id
 *   linked: 'true' - Only return shipments WITH an order_id (includes order details)
 *   tracking: string - Exact match on tracking number
 *   carrier: 'dhl' | 'royalmail' | 'deutschepost' - Filter by carrier
 *   limit: number (default: 100)
 *   offset: number (default: 0)
 *   search: string - Search by tracking number (partial match)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unlinked = searchParams.get('unlinked') === 'true';
    const linked = searchParams.get('linked') === 'true';
    const tracking = searchParams.get('tracking'); // Exact match
    const carrier = searchParams.get('carrier');
    const search = searchParams.get('search'); // Partial match
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Determine select fields - include order details if linked filter is used
    const selectFields = linked || tracking
      ? 'id, tracking_number, carrier, shipping_cost, service_type, shipping_date, order_id, brand_id, orders(id, order_number, customer_name, b2b_customer_name, subtotal, total)'
      : 'id, tracking_number, carrier, shipping_cost, service_type, shipping_date, order_id, brand_id';

    let query = supabaseAdmin
      .from('shipments')
      .select(selectFields, { count: 'exact' })
      .order('shipping_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter for unlinked shipments (no order_id)
    if (unlinked) {
      query = query.is('order_id', null);
    }

    // Filter for linked shipments (has order_id)
    if (linked) {
      query = query.not('order_id', 'is', null);
    }

    // Exact match on tracking number
    if (tracking) {
      query = query.eq('tracking_number', tracking);
    }

    // Filter by carrier
    if (carrier) {
      query = query.eq('carrier', carrier);
    }

    // Search by tracking number (partial match)
    if (search) {
      query = query.ilike('tracking_number', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching shipments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shipments' },
        { status: 500 }
      );
    }

    // Transform data to include order details at top level if available
    // Cast to unknown[] first to handle dynamic Supabase query types with joins
    const shipments = ((data || []) as unknown[]).map((shipment) => {
      const s = shipment as Record<string, unknown>;
      return {
        ...s,
        order: s.orders || null,
        orders: undefined, // Remove nested key
      };
    });

    return NextResponse.json({
      shipments,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in shipments GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
