import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/inventory/stock
 * List all stock levels with component details and velocity data
 *
 * Query params:
 * - brand: Brand ID to filter by
 * - category: Category ID to filter by
 * - status: 'ok' | 'warning' | 'critical' | 'out_of_stock' | 'all'
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brand = searchParams.get('brand');
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'all';

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
    // Get all active components with stock levels
    let componentQuery = supabase
      .from('components')
      .select(`
        *,
        category:component_categories(*),
        brand:brands(*),
        stock:stock_levels(*),
        suppliers:component_suppliers(
          *,
          supplier:suppliers(*)
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (brand && brand !== 'all') {
      componentQuery = componentQuery.eq('brand_id', brand);
    }

    if (category && category !== 'all') {
      componentQuery = componentQuery.eq('category_id', category);
    }

    const { data: components, error: componentError } = await componentQuery;

    if (componentError) throw componentError;

    // Calculate velocity for each component (from last 30 days of orders)
    // For Phase A, we'll use a simple approach - this will be enhanced with BOM in Phase B
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // For now, return components with basic stock info
    // Velocity calculation will be added when BOM is set up
    const stockData = (components || []).map((component) => {
      // Handle both array (legacy) and object (one-to-one) stock responses
      // Supabase returns an object for one-to-one relationships (UNIQUE constraint)
      const rawStock = component.stock;
      const stock = (Array.isArray(rawStock) ? rawStock[0] : rawStock) || {
        on_hand: 0,
        reserved: 0,
        on_order: 0,
        available: 0,
      };

      // Get lead time from component, preferred supplier, or default
      let leadTime = component.lead_time_days || 14;
      const preferredSupplier = component.suppliers?.find(
        (s: { is_preferred: boolean }) => s.is_preferred
      );
      if (!component.lead_time_days && preferredSupplier) {
        leadTime = preferredSupplier.lead_time_days || preferredSupplier.supplier?.default_lead_time_days || 14;
      }

      // Calculate status (placeholder velocity = 0 until BOM is set up)
      const velocity = 0; // TODO: Calculate from BOM + orders
      const safetyDays = component.safety_stock_days || 14;
      const reorderPoint = Math.ceil(velocity * (leadTime + safetyDays));

      let stockStatus: 'ok' | 'warning' | 'critical' | 'out_of_stock' = 'ok';
      let daysRemaining: number | null = null;

      if (stock.available <= 0) {
        stockStatus = 'out_of_stock';
        daysRemaining = 0;
      } else if (velocity > 0) {
        daysRemaining = Math.floor(stock.available / velocity);
        if (daysRemaining <= leadTime + safetyDays) {
          stockStatus = 'critical';
        } else if (daysRemaining <= leadTime + safetyDays + 7) {
          stockStatus = 'warning';
        }
      }

      return {
        ...component,
        stock: stock,
        statusInfo: {
          status: stockStatus,
          daysRemaining,
          velocity,
          reorderPoint,
          leadTime,
          safetyDays,
        },
      };
    });

    // Filter by status if specified
    let filteredData = stockData;
    if (status !== 'all') {
      filteredData = stockData.filter((item) => item.statusInfo.status === status);
    }

    // Calculate summary stats
    const summary = {
      total: stockData.length,
      ok: stockData.filter((s) => s.statusInfo.status === 'ok').length,
      warning: stockData.filter((s) => s.statusInfo.status === 'warning').length,
      critical: stockData.filter((s) => s.statusInfo.status === 'critical').length,
      outOfStock: stockData.filter((s) => s.statusInfo.status === 'out_of_stock').length,
      onOrder: stockData.filter((s) => s.stock.on_order > 0).length,
    };

    // Fetch categories and brands for filters
    const [{ data: categories }, { data: brands }] = await Promise.all([
      supabase
        .from('component_categories')
        .select('*')
        .order('display_order', { ascending: true }),
      supabase.from('brands').select('*').order('name', { ascending: true }),
    ]);

    return NextResponse.json({
      stock: filteredData,
      summary,
      categories: categories || [],
      brands: brands || [],
    });
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock levels' },
      { status: 500 }
    );
  }
}
