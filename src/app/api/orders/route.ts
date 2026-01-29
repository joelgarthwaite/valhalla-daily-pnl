import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OrdersQueryParams {
  from?: string;
  to?: string;
  brand?: string;
  platform?: string;
  isB2B?: string;
  country?: string;
  limit?: string;
  offset?: string;
  includeExcluded?: string;
  excludedOnly?: string;
  search?: string;
}

/**
 * GET /api/orders
 * List orders with filters
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: OrdersQueryParams = {
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    brand: searchParams.get('brand') || undefined,
    platform: searchParams.get('platform') || undefined,
    isB2B: searchParams.get('isB2B') || undefined,
    country: searchParams.get('country') || undefined,
    limit: searchParams.get('limit') || '50',
    offset: searchParams.get('offset') || '0',
    includeExcluded: searchParams.get('includeExcluded') || undefined,
    excludedOnly: searchParams.get('excludedOnly') || undefined,
    search: searchParams.get('search') || undefined,
  };

  try {
    // First get brands for mapping
    const { data: brands } = await supabaseAdmin.from('brands').select('id, code, name');
    const brandMap = new Map(brands?.map(b => [b.id, b]) || []);

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select('id, platform, platform_order_id, order_number, order_date, customer_name, customer_email, brand_id, subtotal, total, is_b2b, b2b_customer_name, status, fulfillment_status, shipping_address, excluded_at, exclusion_reason', { count: 'exact' })
      .order('order_date', { ascending: false });

    // Filter excluded orders (by default, hide excluded orders)
    if (params.excludedOnly === 'true') {
      query = query.not('excluded_at', 'is', null);
    } else if (params.includeExcluded !== 'true') {
      query = query.is('excluded_at', null);
    }

    // Apply filters
    if (params.from) {
      query = query.gte('order_date', params.from);
    }
    if (params.to) {
      query = query.lte('order_date', params.to);
    }
    if (params.brand && params.brand !== 'all') {
      const brand = brands?.find(b => b.code === params.brand);
      if (brand) {
        query = query.eq('brand_id', brand.id);
      }
    }
    if (params.platform && params.platform !== 'all') {
      query = query.eq('platform', params.platform);
    }
    if (params.isB2B === 'true') {
      query = query.eq('is_b2b', true);
    } else if (params.isB2B === 'false') {
      query = query.eq('is_b2b', false);
    }
    if (params.country && params.country !== 'all') {
      // Filter by shipping address country code (JSONB field)
      query = query.filter('shipping_address->>country_code', 'ilike', params.country);
    }

    // Apply search filter (searches across multiple fields)
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.trim();
      // Use OR filter to search across multiple columns
      // Note: For JSONB fields we need separate filters
      query = query.or(
        `order_number.ilike.%${searchTerm}%,` +
        `platform_order_id.ilike.%${searchTerm}%,` +
        `customer_name.ilike.%${searchTerm}%,` +
        `customer_email.ilike.%${searchTerm}%,` +
        `b2b_customer_name.ilike.%${searchTerm}%,` +
        `shipping_address->>name.ilike.%${searchTerm}%,` +
        `shipping_address->>address1.ilike.%${searchTerm}%,` +
        `shipping_address->>city.ilike.%${searchTerm}%`
      );
    }

    // Apply pagination
    const limit = parseInt(params.limit || '50', 10);
    const offset = parseInt(params.offset || '0', 10);
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch shipments for these orders to calculate total shipping costs
    const orderIds = orders?.map(o => o.id) || [];
    let shipmentsByOrderId = new Map<string, { totalCost: number; count: number; carriers: string[] }>();

    if (orderIds.length > 0) {
      const { data: shipments } = await supabaseAdmin
        .from('shipments')
        .select('order_id, shipping_cost, carrier')
        .in('order_id', orderIds);

      if (shipments) {
        for (const shipment of shipments) {
          if (shipment.order_id) {
            const existing = shipmentsByOrderId.get(shipment.order_id) || { totalCost: 0, count: 0, carriers: [] };
            existing.totalCost += Number(shipment.shipping_cost || 0);
            existing.count += 1;
            if (shipment.carrier && !existing.carriers.includes(shipment.carrier)) {
              existing.carriers.push(shipment.carrier);
            }
            shipmentsByOrderId.set(shipment.order_id, existing);
          }
        }
      }
    }

    // Enrich with brand info and shipping data
    const enrichedOrders = orders?.map(order => {
      const shippingData = shipmentsByOrderId.get(order.id);
      return {
        ...order,
        brand: brandMap.get(order.brand_id) || null,
        shipping_cost: shippingData?.totalCost || 0,
        shipment_count: shippingData?.count || 0,
        carriers: shippingData?.carriers || [],
      };
    });

    return NextResponse.json({
      orders: enrichedOrders || [],
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

interface UpdateOrderBody {
  id: string;
  is_b2b?: boolean;
  b2b_customer_name?: string | null;
  order_number?: string | null;
}

/**
 * PATCH /api/orders
 * Update order B2B status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateOrderBody = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.is_b2b === 'boolean') {
      updateData.is_b2b = body.is_b2b;
      // Clear customer name if unmarking as B2B
      if (!body.is_b2b) {
        updateData.b2b_customer_name = null;
      }
    }

    if (body.b2b_customer_name !== undefined) {
      updateData.b2b_customer_name = body.b2b_customer_name;
    }

    if (body.order_number !== undefined) {
      updateData.order_number = body.order_number;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', body.id)
      .select('id, is_b2b, b2b_customer_name, order_number')
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error('Error in PATCH /api/orders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

interface BulkUpdateBody {
  orderIds: string[];
  is_b2b: boolean;
  b2b_customer_name?: string;
}

/**
 * POST /api/orders/bulk-update
 * Bulk update B2B status for multiple orders
 */
export async function POST(request: NextRequest) {
  try {
    const body: BulkUpdateBody = await request.json();

    if (!body.orderIds || !Array.isArray(body.orderIds) || body.orderIds.length === 0) {
      return NextResponse.json({ error: 'Order IDs array is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      is_b2b: body.is_b2b,
    };

    if (body.is_b2b && body.b2b_customer_name) {
      updateData.b2b_customer_name = body.b2b_customer_name;
    } else if (!body.is_b2b) {
      updateData.b2b_customer_name = null;
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .in('id', body.orderIds)
      .select('id, is_b2b, b2b_customer_name');

    if (error) {
      console.error('Error bulk updating orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: data?.length || 0,
      orders: data,
    });
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
