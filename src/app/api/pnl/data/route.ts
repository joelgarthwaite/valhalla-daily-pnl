import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side P&L data fetch that bypasses slow RLS
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const brandCode = searchParams.get('brand');

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Missing from/to date parameters' },
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

    // Verify the user is authenticated using the cookie-based client
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role for fast queries (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get brand ID if filtering by brand
    let brandId: string | null = null;
    if (brandCode && brandCode !== 'all') {
      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('code', brandCode)
        .single();

      brandId = brand?.id || null;
    }

    // Fetch all data in parallel
    const [brandsResult, dailyPnlResult, adSpendResult, goalsResult] = await Promise.all([
      // Brands
      supabase.from('brands').select('*'),

      // Daily P&L data
      brandId
        ? supabase
            .from('daily_pnl')
            .select('*')
            .gte('date', fromDate)
            .lte('date', toDate)
            .eq('brand_id', brandId)
            .order('date', { ascending: true })
        : supabase
            .from('daily_pnl')
            .select('*')
            .gte('date', fromDate)
            .lte('date', toDate)
            .order('date', { ascending: true }),

      // Ad spend data
      brandId
        ? supabase
            .from('ad_spend')
            .select('*')
            .gte('date', fromDate)
            .lte('date', toDate)
            .eq('brand_id', brandId)
        : supabase
            .from('ad_spend')
            .select('*')
            .gte('date', fromDate)
            .lte('date', toDate),

      // Current quarterly goal
      (() => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);

        const query = supabase
          .from('quarterly_goals')
          .select('*')
          .eq('year', currentYear)
          .eq('quarter', currentQuarter);

        return brandId ? query.eq('brand_id', brandId).maybeSingle() : query.maybeSingle();
      })(),
    ]);

    if (brandsResult.error) throw brandsResult.error;
    if (dailyPnlResult.error) throw dailyPnlResult.error;
    if (adSpendResult.error) throw adSpendResult.error;

    return NextResponse.json({
      brands: brandsResult.data || [],
      dailyPnl: dailyPnlResult.data || [],
      adSpend: adSpendResult.data || [],
      quarterlyGoal: goalsResult.data || null,
    });
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
