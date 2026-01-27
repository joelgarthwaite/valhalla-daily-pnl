import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExcludeOrderBody {
  orderId: string;
  reason?: string;
  excludedBy?: string;
}

interface RestoreOrderBody {
  platform: string;
  platformOrderId: string;
}

/**
 * POST /api/orders/exclude
 * Exclude an order from P&L calculations and future syncs
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExcludeOrderBody = await request.json();

    if (!body.orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get the order details first
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, platform, platform_order_id, order_number, customer_name, order_date, total, brand_id')
      .eq('id', body.orderId)
      .single();

    if (fetchError || !order) {
      console.error('Error fetching order:', fetchError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Mark the order as excluded in the orders table
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        excluded_at: now,
        exclusion_reason: body.reason || 'Manually excluded',
      })
      .eq('id', body.orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Add to excluded_orders table (permanent exclusion list)
    const { error: insertError } = await supabaseAdmin
      .from('excluded_orders')
      .upsert({
        platform: order.platform,
        platform_order_id: order.platform_order_id,
        brand_id: order.brand_id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        order_date: order.order_date,
        total: order.total,
        exclusion_reason: body.reason || 'Manually excluded',
        excluded_at: now,
        excluded_by: body.excludedBy || 'admin',
      }, {
        onConflict: 'platform,platform_order_id',
      });

    if (insertError) {
      console.error('Error inserting to excluded_orders:', insertError);
      // Don't fail - the order is already marked as excluded
    }

    return NextResponse.json({
      success: true,
      message: `Order ${order.order_number} has been excluded`,
      order: {
        id: order.id,
        platform: order.platform,
        platform_order_id: order.platform_order_id,
        order_number: order.order_number,
        excluded_at: now,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/orders/exclude:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/exclude
 * Restore an excluded order (remove exclusion)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body: RestoreOrderBody = await request.json();

    if (!body.platform || !body.platformOrderId) {
      return NextResponse.json(
        { error: 'Platform and platformOrderId are required' },
        { status: 400 }
      );
    }

    // 1. Remove from excluded_orders table
    const { error: deleteError } = await supabaseAdmin
      .from('excluded_orders')
      .delete()
      .eq('platform', body.platform)
      .eq('platform_order_id', body.platformOrderId);

    if (deleteError) {
      console.error('Error deleting from excluded_orders:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 2. Clear exclusion from orders table (if order exists)
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        excluded_at: null,
        exclusion_reason: null,
      })
      .eq('platform', body.platform)
      .eq('platform_order_id', body.platformOrderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      // Don't fail - the exclusion record is already deleted
    }

    return NextResponse.json({
      success: true,
      message: 'Order exclusion has been removed. Order will be included in future syncs.',
    });
  } catch (error) {
    console.error('Error in DELETE /api/orders/exclude:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/exclude
 * List all excluded orders
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brand = searchParams.get('brand');

  try {
    // Get brands for mapping
    const { data: brands } = await supabaseAdmin.from('brands').select('id, code, name');
    const brandMap = new Map(brands?.map(b => [b.id, b]) || []);

    let query = supabaseAdmin
      .from('excluded_orders')
      .select('*')
      .order('excluded_at', { ascending: false });

    if (brand && brand !== 'all') {
      const brandRecord = brands?.find(b => b.code === brand);
      if (brandRecord) {
        query = query.eq('brand_id', brandRecord.id);
      }
    }

    const { data: excludedOrders, error } = await query;

    if (error) {
      console.error('Error fetching excluded orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with brand info
    const enrichedOrders = excludedOrders?.map(order => ({
      ...order,
      brand: brandMap.get(order.brand_id) || null,
    }));

    return NextResponse.json({
      excludedOrders: enrichedOrders || [],
      total: excludedOrders?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/orders/exclude:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
