import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET: List B2B orders that might be inter-company transactions
// These are orders where the customer name suggests an IC transaction (e.g., "Bright Ivy", "Display Champ")
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify authentication
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get brands for reference
    const { data: brands } = await supabase.from('brands').select('id, name, code');
    const brandMap = new Map(brands?.map(b => [b.id, b]) || []);

    // Patterns that suggest inter-company transactions
    // These are customer names that match the other brand
    const icPatterns = [
      'bright ivy',
      'brightivy',
      'display champ',
      'displaychamp',
      'valhalla',
    ];

    // Get B2B orders that might be IC transactions
    // Looking at b2b_customer_name and customer_name fields
    const { data: b2bOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, brand_id, order_date, order_number, customer_name, b2b_customer_name, subtotal, total, is_b2b, excluded_at, raw_data')
      .eq('is_b2b', true)
      .is('excluded_at', null)  // Only non-excluded orders
      .order('order_date', { ascending: false });

    if (ordersError) throw ordersError;

    // Also get B2B revenue records
    const { data: b2bRevenue, error: revenueError } = await supabase
      .from('b2b_revenue')
      .select('id, brand_id, date, customer_name, subtotal, total, notes')
      .order('date', { ascending: false });

    if (revenueError) throw revenueError;

    // Filter to potential IC candidates
    const candidateOrders = (b2bOrders || []).filter(order => {
      const customerName = (order.b2b_customer_name || order.customer_name || '').toLowerCase();
      return icPatterns.some(pattern => customerName.includes(pattern));
    }).map(order => ({
      ...order,
      brand: brandMap.get(order.brand_id),
      source: 'orders' as const,
    }));

    const candidateRevenue = (b2bRevenue || []).filter(revenue => {
      const customerName = (revenue.customer_name || '').toLowerCase();
      return icPatterns.some(pattern => customerName.includes(pattern));
    }).map(revenue => ({
      ...revenue,
      brand: brandMap.get(revenue.brand_id),
      source: 'b2b_revenue' as const,
    }));

    // Get existing IC transactions to show what's already been migrated
    const { data: existingIC } = await supabase
      .from('inter_company_transactions')
      .select('transaction_date, subtotal, description, status')
      .order('transaction_date', { ascending: false });

    return NextResponse.json({
      candidateOrders,
      candidateRevenue,
      existingIC: existingIC || [],
      brands: brands || [],
      summary: {
        ordersCount: candidateOrders.length,
        revenueCount: candidateRevenue.length,
        ordersTotal: candidateOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0),
        revenueTotal: candidateRevenue.reduce((sum, r) => sum + Number(r.subtotal || 0), 0),
      },
    });
  } catch (error) {
    console.error('Error fetching IC candidates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Convert a B2B order/revenue to an IC transaction
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify authentication and admin role
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const {
      source,           // 'orders' or 'b2b_revenue'
      source_id,        // ID of the order or b2b_revenue record
      from_brand_id,    // Service provider
      to_brand_id,      // Service receiver
      category,
      description,
      exclude_original, // Whether to exclude the original B2B order
    } = body as {
      source: 'orders' | 'b2b_revenue';
      source_id: string;
      from_brand_id: string;
      to_brand_id: string;
      category: string;
      description?: string;
      exclude_original?: boolean;
    };

    if (!source || !source_id || !from_brand_id || !to_brand_id || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the source record
    let sourceRecord: { date: string; subtotal: number; customer_name?: string } | null = null;

    if (source === 'orders') {
      const { data } = await supabase
        .from('orders')
        .select('order_date, subtotal, b2b_customer_name, customer_name')
        .eq('id', source_id)
        .single();
      if (data) {
        sourceRecord = {
          date: data.order_date.split('T')[0],
          subtotal: Number(data.subtotal),
          customer_name: data.b2b_customer_name || data.customer_name,
        };
      }
    } else if (source === 'b2b_revenue') {
      const { data } = await supabase
        .from('b2b_revenue')
        .select('date, subtotal, customer_name')
        .eq('id', source_id)
        .single();
      if (data) {
        sourceRecord = {
          date: data.date,
          subtotal: Number(data.subtotal),
          customer_name: data.customer_name,
        };
      }
    }

    if (!sourceRecord) {
      return NextResponse.json({ error: 'Source record not found' }, { status: 404 });
    }

    // Create the IC transaction
    const { data: icTransaction, error: insertError } = await supabase
      .from('inter_company_transactions')
      .insert({
        from_brand_id,
        to_brand_id,
        transaction_date: sourceRecord.date,
        description: description || `Migrated from ${source}: ${sourceRecord.customer_name}`,
        category,
        subtotal: sourceRecord.subtotal,
        tax: 0,
        total: sourceRecord.subtotal,
        status: 'pending',
        notes: `Migrated from ${source} ID: ${source_id}`,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Optionally exclude the original order
    if (exclude_original && source === 'orders') {
      const { error: excludeError } = await supabase
        .from('orders')
        .update({
          excluded_at: new Date().toISOString(),
          exclusion_reason: `Converted to IC transaction: ${icTransaction.id}`,
        } as never)
        .eq('id', source_id);

      if (excludeError) {
        console.error('Error excluding order:', excludeError);
        // Don't fail the whole operation, just log
      }
    }

    return NextResponse.json({
      success: true,
      icTransaction,
      message: `IC transaction created${exclude_original ? ' and original excluded' : ''}`,
    });
  } catch (error) {
    console.error('Error converting to IC:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
