import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateOpexForPeriod, getOpexSummary } from '@/lib/pnl/opex';
import type { OperatingExpense } from '@/types';

/**
 * GET /api/opex
 * Fetch OPEX data and calculate totals for a date range
 *
 * Query params:
 * - from: Start date (YYYY-MM-DD)
 * - to: End date (YYYY-MM-DD)
 * - brand: Brand ID or 'all' (optional)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const brandParam = searchParams.get('brand');

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
    // Fetch all active operating expenses
    const { data: expenses, error } = await supabase
      .from('operating_expenses')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    const opexData = (expenses || []) as OperatingExpense[];

    // Get brand ID if specified
    let brandId: string | undefined;
    if (brandParam && brandParam !== 'all') {
      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('code', brandParam)
        .single();
      brandId = brand?.id;
    }

    // Calculate summary (monthly equivalents)
    const summary = getOpexSummary(opexData, brandId);

    // Calculate period totals if date range provided
    let periodTotal = 0;
    if (from && to) {
      periodTotal = calculateOpexForPeriod(
        opexData,
        new Date(from),
        new Date(to),
        brandId
      );
    }

    return NextResponse.json({
      summary,
      periodTotal,
      expenseCount: opexData.filter((e) =>
        brandId ? !e.brand_id || e.brand_id === brandId : true
      ).length,
      dateRange: from && to ? { from, to } : null,
    });
  } catch (error) {
    console.error('Error fetching OPEX:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operating expenses' },
      { status: 500 }
    );
  }
}
