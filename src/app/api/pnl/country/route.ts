import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  aggregateOrdersByCountry,
  calculateAllCountryPnL,
  calculateCountrySummary,
  type CountryPnL,
  type CountrySummary,
  type CountryAdSpendData,
} from '@/lib/pnl/country-calculations';

interface CountryApiResponse {
  countries: CountryPnL[];
  summary: CountrySummary;
  dateRange: {
    from: string;
    to: string;
  };
  brandFilter: string;
  hasAdSpendData: boolean;
}

/**
 * GET /api/pnl/country
 *
 * Fetches P&L data broken down by shipping country.
 * Returns GP2 metrics (before ad spend) since ad spend cannot be attributed to countries.
 *
 * Query params:
 * - from: Start date (YYYY-MM-DD)
 * - to: End date (YYYY-MM-DD)
 * - brand: Brand code ('DC', 'BI', or 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const brandCode = searchParams.get('brand') || 'all';

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

    // Fetch orders with shipping address for the date range
    // We need: platform, subtotal, shipping_address
    // Exclude orders that have been manually excluded
    let ordersQuery = supabase
      .from('orders')
      .select('platform, subtotal, shipping_address')
      .is('excluded_at', null)  // Only include non-excluded orders
      .gte('order_date', fromDate)
      .lte('order_date', toDate);

    if (brandId) {
      ordersQuery = ordersQuery.eq('brand_id', brandId);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    // Also fetch cost config if available
    let costConfigQuery = supabase.from('cost_config').select('*');
    if (brandId) {
      costConfigQuery = costConfigQuery.eq('brand_id', brandId);
    }
    const { data: costConfigData } = await costConfigQuery.maybeSingle();

    // Transform cost config
    const costConfig = costConfigData
      ? {
          cogsPct: (costConfigData.cogs_pct || 30) / 100,
          pickPackPct: (costConfigData.pick_pack_pct || 5) / 100,
          logisticsPct: (costConfigData.logistics_pct || 3) / 100,
        }
      : undefined;

    // Fetch country ad spend data if available
    let countryAdSpendQuery = supabase
      .from('country_ad_spend')
      .select('country_code, spend, impressions, clicks, conversions, revenue_attributed')
      .gte('date', fromDate)
      .lte('date', toDate);

    if (brandId) {
      countryAdSpendQuery = countryAdSpendQuery.eq('brand_id', brandId);
    }

    const { data: countryAdSpendData, error: adSpendError } = await countryAdSpendQuery;

    // Don't fail if table doesn't exist yet - just proceed without ad data
    let adSpendByCountry: Map<string, CountryAdSpendData> | undefined;
    let hasAdSpendData = false;

    if (!adSpendError && countryAdSpendData && countryAdSpendData.length > 0) {
      hasAdSpendData = true;
      // Aggregate ad spend by country
      const adSpendMap = new Map<string, CountryAdSpendData>();

      for (const row of countryAdSpendData) {
        const countryCode = row.country_code.toUpperCase();
        const existing = adSpendMap.get(countryCode);

        if (existing) {
          existing.spend += Number(row.spend) || 0;
          existing.impressions += row.impressions || 0;
          existing.clicks += row.clicks || 0;
          existing.conversions += row.conversions || 0;
          existing.revenueAttributed += Number(row.revenue_attributed) || 0;
        } else {
          adSpendMap.set(countryCode, {
            countryCode,
            spend: Number(row.spend) || 0,
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
            conversions: row.conversions || 0,
            revenueAttributed: Number(row.revenue_attributed) || 0,
          });
        }
      }

      adSpendByCountry = adSpendMap;
    }

    // Aggregate orders by country
    const rawCountryData = aggregateOrdersByCountry(
      (orders || []).map((o) => ({
        platform: o.platform as 'shopify' | 'etsy',
        subtotal: Number(o.subtotal) || 0,
        shipping_address: o.shipping_address as { country_code?: string } | null,
      }))
    );

    // Calculate P&L for each country (including GP3 if ad spend data exists)
    const countryPnLs = calculateAllCountryPnL(rawCountryData, costConfig, adSpendByCountry);

    // Calculate summary statistics
    const summary = calculateCountrySummary(countryPnLs, 'GB');

    const response: CountryApiResponse = {
      countries: countryPnLs,
      summary,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
      brandFilter: brandCode,
      hasAdSpendData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching country P&L data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
