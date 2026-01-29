import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { StockAdjustmentRequest } from '@/types';

/**
 * POST /api/inventory/stock/adjust
 * Adjust stock levels for a component
 *
 * Body:
 * - component_id: UUID of the component
 * - adjustment_type: 'count' | 'add' | 'remove'
 * - quantity: Number (for count: the exact value; for add/remove: the delta)
 * - notes: Optional notes explaining the adjustment
 */
export async function POST(request: NextRequest) {
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
    const body: StockAdjustmentRequest = await request.json();

    // Validate required fields
    if (!body.component_id || body.quantity === undefined || !body.adjustment_type) {
      return NextResponse.json(
        { error: 'component_id, adjustment_type, and quantity are required' },
        { status: 400 }
      );
    }

    // For count adjustments, notes should be required
    if (body.adjustment_type === 'count' && !body.notes) {
      return NextResponse.json(
        { error: 'Notes are required for stock count adjustments' },
        { status: 400 }
      );
    }

    // Get current stock level
    const { data: stockLevel, error: stockError } = await supabase
      .from('stock_levels')
      .select('*')
      .eq('component_id', body.component_id)
      .maybeSingle();

    if (stockError) throw stockError;

    // If no stock record exists, create one
    let currentOnHand = 0;
    if (stockLevel) {
      currentOnHand = stockLevel.on_hand;
    } else {
      // Create stock level record
      const { error: createError } = await supabase
        .from('stock_levels')
        .insert({
          component_id: body.component_id,
          on_hand: 0,
          reserved: 0,
          on_order: 0,
        });

      if (createError) throw createError;
    }

    // Calculate new on_hand value
    let newOnHand: number;
    let transactionQty: number;
    let transactionType: string;

    switch (body.adjustment_type) {
      case 'count':
        // Set exact value
        newOnHand = body.quantity;
        transactionQty = body.quantity - currentOnHand;
        transactionType = 'count';
        break;

      case 'add':
        // Add to current
        newOnHand = currentOnHand + body.quantity;
        transactionQty = body.quantity;
        transactionType = 'adjust';
        break;

      case 'remove':
        // Remove from current
        newOnHand = currentOnHand - body.quantity;
        transactionQty = -body.quantity;
        transactionType = 'adjust';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid adjustment_type' },
          { status: 400 }
        );
    }

    // Validate new value
    if (newOnHand < 0) {
      return NextResponse.json(
        { error: `Cannot reduce stock below 0. Current: ${currentOnHand}, Requested reduction: ${body.quantity}` },
        { status: 400 }
      );
    }

    // Update stock level
    // Build update object - only include last_count_date for count adjustments
    const updateData: {
      on_hand: number;
      last_movement_at: string;
      updated_at: string;
      last_count_date?: string;
    } = {
      on_hand: newOnHand,
      last_movement_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (body.adjustment_type === 'count') {
      updateData.last_count_date = new Date().toISOString().split('T')[0];
    }

    const { data: updateResult, error: updateError } = await supabase
      .from('stock_levels')
      .update(updateData)
      .eq('component_id', body.component_id)
      .select();

    if (updateError) {
      console.error('Stock update error:', updateError);
      throw updateError;
    }

    console.log('Stock update result:', updateResult);

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('stock_transactions')
      .insert({
        component_id: body.component_id,
        transaction_type: transactionType,
        quantity: transactionQty,
        quantity_before: currentOnHand,
        quantity_after: newOnHand,
        reference_type: 'manual',
        notes: body.notes || `${body.adjustment_type} adjustment`,
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      // Don't fail the whole request, just log it
    }

    // Fetch updated stock level to return
    const { data: updatedStock } = await supabase
      .from('stock_levels')
      .select('*')
      .eq('component_id', body.component_id)
      .single();

    return NextResponse.json({
      success: true,
      previousOnHand: currentOnHand,
      newOnHand,
      adjustment: transactionQty,
      stock: updatedStock,
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inventory/stock/adjust
 * Get stock transaction history for a component
 *
 * Query params:
 * - component_id: UUID of the component
 * - limit: Number of records (default 50)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const componentId = searchParams.get('component_id');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!componentId) {
    return NextResponse.json(
      { error: 'component_id is required' },
      { status: 400 }
    );
  }

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
    const { data: transactions, error } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('component_id', componentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      transactions: transactions || [],
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}
