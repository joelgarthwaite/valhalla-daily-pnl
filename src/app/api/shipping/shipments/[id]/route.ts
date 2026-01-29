import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/shipping/shipments/[id]
 * Update a shipment's cost fields
 *
 * Body:
 * - shipping_cost: number (optional) - The shipping cost
 * - cost_locked: boolean (optional) - Lock to prevent automated updates
 * - cost_confidence: string (optional) - Set to 'actual' for manual entries
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { shipping_cost, cost_locked } = body;

    // Build update payload
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (shipping_cost !== undefined) {
      updateData.shipping_cost = shipping_cost;
      updateData.cost_confidence = 'actual'; // Manual edits are considered 'actual'
      updateData.match_method = 'manual_override';
      updateData.cost_updated_at = new Date().toISOString();
    }

    if (cost_locked !== undefined) {
      updateData.cost_locked = cost_locked;
    }

    const { data: shipment, error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Shipment not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error('Error updating shipment:', error);
    return NextResponse.json(
      { error: 'Failed to update shipment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shipping/shipments/[id]
 * Get a single shipment
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Shipment not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({ shipment });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipment' },
      { status: 500 }
    );
  }
}
