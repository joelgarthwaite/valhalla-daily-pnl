import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchMetaAdSpendByCountry } from '@/lib/meta/client';
import { format, subDays } from 'date-fns';

// Create Supabase admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ad account IDs from environment
const META_AD_ACCOUNTS: Record<string, string> = {
  DC: process.env.META_AD_ACCOUNT_DC || '',
  BI: process.env.META_AD_ACCOUNT_BI || '',
};

interface SyncResult {
  brandCode: string;
  recordsSynced: number;
  countriesFound: number;
  error?: string;
}

/**
 * POST /api/meta/country-sync
 * Sync country-level ad spend from Meta Marketing API
 *
 * Body:
 * {
 *   "startDate": "2025-01-01",  // Optional, defaults to 30 days ago
 *   "endDate": "2025-01-27",    // Optional, defaults to today
 *   "brandCode": "all" | "DC" | "BI"  // Optional, defaults to all
 * }
 */
export async function POST(request: NextRequest) {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Meta access token not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    const endDate = body.endDate || format(new Date(), 'yyyy-MM-dd');
    const startDate = body.startDate || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const brandCode = body.brandCode || 'all';

    // Get brands from database
    const { data: brands, error: brandsError } = await supabaseAdmin
      .from('brands')
      .select('id, code, name');

    if (brandsError) {
      throw new Error(`Failed to fetch brands: ${brandsError.message}`);
    }

    // Determine which brands to sync
    const brandsToSync = brandCode === 'all'
      ? brands?.filter(b => META_AD_ACCOUNTS[b.code])
      : brands?.filter(b => b.code === brandCode && META_AD_ACCOUNTS[b.code]);

    if (!brandsToSync || brandsToSync.length === 0) {
      return NextResponse.json({
        error: 'No brands configured for Meta sync',
        availableBrands: Object.keys(META_AD_ACCOUNTS).filter(k => META_AD_ACCOUNTS[k]),
      }, { status: 400 });
    }

    const results: SyncResult[] = [];

    for (const brand of brandsToSync) {
      const adAccountId = META_AD_ACCOUNTS[brand.code];

      if (!adAccountId) {
        results.push({
          brandCode: brand.code,
          recordsSynced: 0,
          countriesFound: 0,
          error: 'No ad account configured',
        });
        continue;
      }

      try {
        console.log(`[Country Sync] Fetching Meta country data for ${brand.code}...`);

        const countryData = await fetchMetaAdSpendByCountry(
          adAccountId,
          accessToken,
          startDate,
          endDate
        );

        console.log(`[Country Sync] Got ${countryData.length} country records for ${brand.code}`);

        if (countryData.length === 0) {
          results.push({
            brandCode: brand.code,
            recordsSynced: 0,
            countriesFound: 0,
          });
          continue;
        }

        // Get unique countries
        const uniqueCountries = new Set(countryData.map(d => d.countryCode));

        // Prepare records for upsert
        const records = countryData.map(d => ({
          brand_id: brand.id,
          date: d.date,
          country_code: d.countryCode,
          platform: 'meta',
          spend: d.spend,
          impressions: d.impressions,
          clicks: d.clicks,
          conversions: d.conversions,
          revenue_attributed: d.revenueAttributed,
          updated_at: new Date().toISOString(),
        }));

        // Upsert in batches
        const batchSize = 100;
        let totalUpserted = 0;

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);

          const { error: upsertError } = await supabaseAdmin
            .from('country_ad_spend')
            .upsert(batch, {
              onConflict: 'brand_id,date,country_code,platform',
            });

          if (upsertError) {
            console.error(`[Country Sync] Upsert error for ${brand.code}:`, upsertError);
            throw new Error(`Upsert failed: ${upsertError.message}`);
          }

          totalUpserted += batch.length;
        }

        results.push({
          brandCode: brand.code,
          recordsSynced: totalUpserted,
          countriesFound: uniqueCountries.size,
        });

        console.log(`[Country Sync] Synced ${totalUpserted} records for ${brand.code} across ${uniqueCountries.size} countries`);
      } catch (error) {
        console.error(`[Country Sync] Error syncing ${brand.code}:`, error);
        results.push({
          brandCode: brand.code,
          recordsSynced: 0,
          countriesFound: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + r.recordsSynced, 0);
    const hasErrors = results.some(r => r.error);

    return NextResponse.json({
      success: !hasErrors,
      message: `Synced ${totalRecords} country ad spend records`,
      dateRange: { startDate, endDate },
      results,
    });
  } catch (error) {
    console.error('[Country Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meta/country-sync
 * Check status of country ad spend data
 */
export async function GET() {
  try {
    // Get latest sync info
    const { data, error } = await supabaseAdmin
      .from('country_ad_spend')
      .select('brand_id, date, country_code, platform')
      .order('date', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to query country_ad_spend: ${error.message}`);
    }

    // Get counts by brand
    const { data: counts, error: countError } = await supabaseAdmin
      .from('country_ad_spend')
      .select('brand_id, country_code')
      .limit(10000);

    if (countError) {
      throw new Error(`Failed to count records: ${countError.message}`);
    }

    // Get brands
    const { data: brands } = await supabaseAdmin.from('brands').select('id, code');
    const brandMap = new Map(brands?.map(b => [b.id, b.code]));

    // Calculate stats
    const brandCounts: Record<string, { records: number; countries: Set<string> }> = {};

    for (const row of (counts || [])) {
      const brandCode = brandMap.get(row.brand_id) || 'unknown';
      if (!brandCounts[brandCode]) {
        brandCounts[brandCode] = { records: 0, countries: new Set() };
      }
      brandCounts[brandCode].records++;
      brandCounts[brandCode].countries.add(row.country_code);
    }

    const stats = Object.entries(brandCounts).map(([code, data]) => ({
      brandCode: code,
      totalRecords: data.records,
      uniqueCountries: data.countries.size,
    }));

    return NextResponse.json({
      hasData: (data?.length || 0) > 0,
      latestDate: data?.[0]?.date || null,
      stats,
      configuredAccounts: Object.keys(META_AD_ACCOUNTS).filter(k => META_AD_ACCOUNTS[k]),
    });
  } catch (error) {
    console.error('[Country Sync] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
