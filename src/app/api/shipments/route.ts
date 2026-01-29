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
 *   carrier: 'dhl' | 'royalmail' | 'deutschepost' - Filter by carrier
 *   limit: number (default: 100)
 *   offset: number (default: 0)
 *   search: string - Search by tracking number
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unlinked = searchParams.get('unlinked') === 'true';
    const carrier = searchParams.get('carrier');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('shipments')
      .select('id, tracking_number, carrier, shipping_cost, service_type, shipping_date, order_id, brand_id', { count: 'exact' })
      .order('shipping_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter for unlinked shipments (no order_id)
    if (unlinked) {
      query = query.is('order_id', null);
    }

    // Filter by carrier
    if (carrier) {
      query = query.eq('carrier', carrier);
    }

    // Search by tracking number
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

    return NextResponse.json({
      shipments: data || [],
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
