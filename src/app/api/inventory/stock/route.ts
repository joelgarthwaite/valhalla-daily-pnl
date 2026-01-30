import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateVelocityFromData, type VelocityData, type VelocityResult } from '@/lib/inventory/forecast';

/**
 * GET /api/inventory/stock
 * List all stock levels with component details and velocity data
 *
 * Query params:
 * - brand: Brand ID to filter by
 * - category: Category ID to filter by
 * - status: 'ok' | 'warning' | 'critical' | 'out_of_stock' | 'all'
 * - days: Number of days for velocity calculation (default 30)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brand = searchParams.get('brand');
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'all';
  const velocityDays = parseInt(searchParams.get('days') || '30', 10);

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

    // ====================================
    // VELOCITY CALCULATION (Phase B)
    // ====================================

    // Get component IDs
    const componentIds = (components || []).map(c => c.id);

    // Fetch all BOM entries for these components
    const { data: allBomEntries, error: bomError } = await supabase
      .from('bom')
      .select('component_id, product_sku, quantity')
      .in('component_id', componentIds.length > 0 ? componentIds : ['__none__']);

    if (bomError) throw bomError;

    // Get unique product SKUs from BOM
    const productSkus = [...new Set((allBomEntries || []).map(b => b.product_sku.toUpperCase()))];

    // Fetch SKU mappings (old SKUs that map to these product SKUs)
    let skuMappings: Array<{ old_sku: string; current_sku: string }> = [];
    if (productSkus.length > 0) {
      const { data: mappings, error: mappingError } = await supabase
        .from('sku_mapping')
        .select('old_sku, current_sku')
        .in('current_sku', productSkus);

      if (mappingError) throw mappingError;
      skuMappings = mappings || [];
    }

    // Build set of all SKUs to look for (current + mapped old SKUs)
    const allSkusToFind = new Set(productSkus);
    for (const mapping of skuMappings) {
      allSkusToFind.add(mapping.old_sku.toUpperCase());
    }

    // Fetch orders with line items from the velocity period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - velocityDays);
    const startDateStr = startDate.toISOString().split('T')[0];

    interface OrderLineItem {
      sku: string;
      quantity: number;
      order_date: string;
    }

    const orderLineItems: OrderLineItem[] = [];

    if (allSkusToFind.size > 0) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_date, line_items')
        .gte('order_date', startDateStr)
        .is('excluded_at', null)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      // Extract relevant line items
      for (const order of orders || []) {
        const lineItems = order.line_items as Array<{ sku?: string; quantity?: number }> | null;
        if (!lineItems || !Array.isArray(lineItems)) continue;

        for (const item of lineItems) {
          if (item.sku && allSkusToFind.has(item.sku.toUpperCase())) {
            orderLineItems.push({
              sku: item.sku,
              quantity: item.quantity || 1,
              order_date: order.order_date,
            });
          }
        }
      }
    }

    // Group BOM entries by component
    const bomByComponent = new Map<string, Array<{ product_sku: string; quantity: number }>>();
    for (const bom of allBomEntries || []) {
      const existing = bomByComponent.get(bom.component_id) || [];
      existing.push({ product_sku: bom.product_sku, quantity: bom.quantity });
      bomByComponent.set(bom.component_id, existing);
    }

    // Calculate velocity for each component
    const velocities = new Map<string, VelocityResult>();
    for (const component of components || []) {
      const componentBom = bomByComponent.get(component.id) || [];

      if (componentBom.length === 0) {
        velocities.set(component.id, {
          unitsPerDay: 0,
          periodDays: velocityDays,
          totalUnitsSold: 0,
          ordersCount: 0,
        });
        continue;
      }

      const velocityData: VelocityData = {
        bomEntries: componentBom,
        skuMappings,
        orderLineItems,
      };

      velocities.set(component.id, calculateVelocityFromData(velocityData, velocityDays));
    }

    // ====================================
    // BUILD STOCK DATA WITH VELOCITY
    // ====================================

    const stockData = (components || []).map((component) => {
      // Handle both array (legacy) and object (one-to-one) stock responses
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

      // Get velocity for this component
      const velocityResult = velocities.get(component.id) || {
        unitsPerDay: 0,
        periodDays: velocityDays,
        totalUnitsSold: 0,
        ordersCount: 0,
      };
      const velocity = velocityResult.unitsPerDay;

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
          totalUnitsSold: velocityResult.totalUnitsSold,
          ordersCount: velocityResult.ordersCount,
          velocityPeriodDays: velocityResult.periodDays,
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
      velocityPeriod: velocityDays,
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
