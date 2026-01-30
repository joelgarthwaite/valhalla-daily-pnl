import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateVelocityFromData, type VelocityData, type VelocityResult } from '@/lib/inventory/forecast';

/**
 * GET /api/inventory/velocity
 * Calculate velocity for one or all components
 *
 * Query params:
 * - component_id: Optional component ID (calculates for all if not provided)
 * - days: Number of days to look back (default 30)
 *
 * Returns velocity data including:
 * - unitsPerDay: Daily consumption rate
 * - totalUnitsSold: Total units consumed in the period
 * - ordersCount: Number of orders that used this component
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const componentId = searchParams.get('component_id');
  const days = parseInt(searchParams.get('days') || '30', 10);

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
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch components (all or specific)
    let componentsQuery = supabase
      .from('components')
      .select('id, sku, name')
      .eq('is_active', true);

    if (componentId) {
      componentsQuery = componentsQuery.eq('id', componentId);
    }

    const { data: components, error: componentsError } = await componentsQuery;
    if (componentsError) throw componentsError;

    if (!components || components.length === 0) {
      return NextResponse.json({
        velocities: {},
        period: { days, startDate: startDateStr, endDate: endDate.toISOString().split('T')[0] },
      });
    }

    // Fetch all BOM entries for these components
    const componentIds = components.map(c => c.id);
    const { data: bomEntries, error: bomError } = await supabase
      .from('bom')
      .select('component_id, product_sku, quantity')
      .in('component_id', componentIds);

    if (bomError) throw bomError;

    // If no BOM entries, return empty velocities
    if (!bomEntries || bomEntries.length === 0) {
      const emptyVelocities: Record<string, VelocityResult> = {};
      for (const c of components) {
        emptyVelocities[c.id] = {
          unitsPerDay: 0,
          periodDays: days,
          totalUnitsSold: 0,
          ordersCount: 0,
        };
      }
      return NextResponse.json({
        velocities: emptyVelocities,
        period: { days, startDate: startDateStr, endDate: endDate.toISOString().split('T')[0] },
      });
    }

    // Get unique product SKUs from BOM
    const productSkus = [...new Set(bomEntries.map(b => b.product_sku.toUpperCase()))];

    // Fetch SKU mappings (old SKUs that map to these product SKUs)
    const { data: skuMappings, error: mappingError } = await supabase
      .from('sku_mapping')
      .select('old_sku, current_sku')
      .in('current_sku', productSkus.map(s => s.toUpperCase()));

    if (mappingError) throw mappingError;

    // Build set of all SKUs to look for (current + mapped old SKUs)
    const allSkusToFind = new Set(productSkus);
    const skuMappingList = skuMappings || [];
    for (const mapping of skuMappingList) {
      allSkusToFind.add(mapping.old_sku.toUpperCase());
    }

    // Fetch orders with line items from the period
    // Note: We need to extract line items from raw_data or line_items column
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_date, line_items')
      .gte('order_date', startDateStr)
      .is('excluded_at', null)
      .order('order_date', { ascending: false });

    if (ordersError) throw ordersError;

    // Extract relevant line items
    interface OrderLineItem {
      sku: string;
      quantity: number;
      order_date: string;
    }

    const orderLineItems: OrderLineItem[] = [];
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

    // Group BOM entries by component
    const bomByComponent = new Map<string, Array<{ product_sku: string; quantity: number }>>();
    for (const bom of bomEntries) {
      const existing = bomByComponent.get(bom.component_id) || [];
      existing.push({ product_sku: bom.product_sku, quantity: bom.quantity });
      bomByComponent.set(bom.component_id, existing);
    }

    // Calculate velocity for each component
    const velocities: Record<string, VelocityResult> = {};

    for (const component of components) {
      const componentBom = bomByComponent.get(component.id) || [];

      if (componentBom.length === 0) {
        // No BOM entries for this component
        velocities[component.id] = {
          unitsPerDay: 0,
          periodDays: days,
          totalUnitsSold: 0,
          ordersCount: 0,
        };
        continue;
      }

      const velocityData: VelocityData = {
        bomEntries: componentBom,
        skuMappings: skuMappingList,
        orderLineItems,
      };

      velocities[component.id] = calculateVelocityFromData(velocityData, days);
    }

    return NextResponse.json({
      velocities,
      period: {
        days,
        startDate: startDateStr,
        endDate: endDate.toISOString().split('T')[0],
      },
      debug: {
        componentCount: components.length,
        bomEntryCount: bomEntries.length,
        orderCount: orders?.length || 0,
        lineItemCount: orderLineItems.length,
        skuMappingCount: skuMappingList.length,
      },
    });
  } catch (error) {
    console.error('Error calculating velocity:', error);
    return NextResponse.json(
      { error: 'Failed to calculate velocity' },
      { status: 500 }
    );
  }
}
