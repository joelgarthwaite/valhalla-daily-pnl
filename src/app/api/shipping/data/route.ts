import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { subDays } from 'date-fns';

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const brand = searchParams.get('brand') || 'all';

    // Default to last 30 days
    const fromDate = from ? new Date(from) : subDays(new Date(), 30);
    const toDate = to ? new Date(to) : new Date();

    // Fetch brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name, code');

    if (brandsError) {
      console.error('Error fetching brands:', brandsError);
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
    }

    // Calculate date range for comparison period
    const rangeDays = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const earliestDate = subDays(fromDate, rangeDays);

    // Build orders query
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .gte('order_date', earliestDate.toISOString())
      .lte('order_date', toDate.toISOString())
      .is('excluded_at', null)
      .order('order_date', { ascending: false });

    // Apply brand filter to orders
    if (brand !== 'all') {
      const brandRecord = brands?.find((b) => b.code === brand);
      if (brandRecord) {
        ordersQuery = ordersQuery.eq('brand_id', brandRecord.id);
      }
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Build shipments query
    let shipmentsQuery = supabase
      .from('shipments')
      .select('*');

    // Apply brand filter to shipments
    if (brand !== 'all') {
      const brandRecord = brands?.find((b) => b.code === brand);
      if (brandRecord) {
        shipmentsQuery = shipmentsQuery.eq('brand_id', brandRecord.id);
      }
    }

    const { data: shipments, error: shipmentsError } = await shipmentsQuery;

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError);
      return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
    }

    // Log some stats for debugging
    const shipmentsWithCost = shipments?.filter(s => Number(s.shipping_cost) > 0) || [];
    const shipmentsWithOrderId = shipments?.filter(s => s.order_id) || [];

    console.log('[Shipping Data API] Stats:', {
      totalOrders: orders?.length || 0,
      totalShipments: shipments?.length || 0,
      shipmentsWithCost: shipmentsWithCost.length,
      shipmentsWithOrderId: shipmentsWithOrderId.length,
      sampleShipments: shipments?.slice(0, 3).map(s => ({
        id: s.id,
        carrier: s.carrier,
        shipping_cost: s.shipping_cost,
        order_id: s.order_id,
      })),
    });

    return NextResponse.json({
      brands: brands || [],
      orders: orders || [],
      shipments: shipments || [],
      meta: {
        ordersCount: orders?.length || 0,
        shipmentsCount: shipments?.length || 0,
        shipmentsWithCost: shipmentsWithCost.length,
        shipmentsWithOrderId: shipmentsWithOrderId.length,
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Shipping data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
