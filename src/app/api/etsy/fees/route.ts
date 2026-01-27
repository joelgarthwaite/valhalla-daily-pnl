import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchEtsyLedgerEntries,
  aggregateDailyFees,
  getEtsyStoresFromDb,
  refreshEtsyToken,
  verifyEtsyCredentials,
  EtsyStoreCredentials,
} from '@/lib/etsy/client';

interface Brand {
  id: string;
  code: string;
  name: string;
}

/**
 * Get Etsy stores from environment variables (fallback when DB has no stores)
 */
async function getEtsyStoresFromEnv(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<EtsyStoreCredentials[]> {
  const stores: EtsyStoreCredentials[] = [];

  const { data: brands } = await supabase.from('brands').select('id, code, name');
  const brandMap = new Map<string, Brand>(
    (brands as Brand[] || []).map((b) => [b.code, b])
  );

  // Check BI environment variables
  const biApiKey = process.env.ETSY_BI_API_KEY;
  const biShopId = process.env.ETSY_BI_SHOP_ID;
  const biAccessToken = process.env.ETSY_BI_ACCESS_TOKEN;
  const biRefreshToken = process.env.ETSY_BI_REFRESH_TOKEN;
  const biBrand = brandMap.get('BI');

  if (biApiKey && biShopId && biAccessToken && biBrand) {
    stores.push({
      brandId: (biBrand as Brand).id,
      brandCode: 'BI',
      brandName: (biBrand as Brand).name,
      storeId: 'env-bi',
      storeName: 'Bright Ivy Etsy (env)',
      apiKey: biApiKey,
      shopId: biShopId,
      accessToken: biAccessToken,
      refreshToken: biRefreshToken || null,
      expiresAt: null,
      lastSyncAt: null,
    });
  }

  // Check DC environment variables
  const dcApiKey = process.env.ETSY_DC_API_KEY;
  const dcShopId = process.env.ETSY_DC_SHOP_ID;
  const dcAccessToken = process.env.ETSY_DC_ACCESS_TOKEN;
  const dcRefreshToken = process.env.ETSY_DC_REFRESH_TOKEN;
  const dcBrand = brandMap.get('DC');

  if (dcApiKey && dcShopId && dcAccessToken && dcBrand) {
    stores.push({
      brandId: (dcBrand as Brand).id,
      brandCode: 'DC',
      brandName: (dcBrand as Brand).name,
      storeId: 'env-dc',
      storeName: 'Display Champ Etsy (env)',
      apiKey: dcApiKey,
      shopId: dcShopId,
      accessToken: dcAccessToken,
      refreshToken: dcRefreshToken || null,
      expiresAt: null,
      lastSyncAt: null,
    });
  }

  return stores;
}

/**
 * POST /api/etsy/fees - Sync Etsy fees from Payment Account Ledger
 */
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      startDate,
      endDate,
      brandCode,
    }: {
      startDate?: string;
      endDate?: string;
      brandCode?: 'DC' | 'BI' | 'all';
    } = body;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get Etsy stores from database and env
    const dbStores = await getEtsyStoresFromDb(supabase);
    const envStores = await getEtsyStoresFromEnv(supabase);
    const dbBrandCodes = new Set(dbStores.map(s => s.brandCode));
    const allStores = [
      ...dbStores,
      ...envStores.filter(s => !dbBrandCodes.has(s.brandCode))
    ];

    if (allStores.length === 0) {
      return NextResponse.json(
        { error: 'No Etsy stores configured' },
        { status: 400 }
      );
    }

    // Filter stores by brand code if specified
    const storesToSync = brandCode && brandCode !== 'all'
      ? allStores.filter((s) => s.brandCode === brandCode)
      : allStores;

    const results: Array<{
      brand: string;
      daysProcessed: number;
      totalFees: number;
      errors: string[];
    }> = [];

    for (const store of storesToSync) {
      const errors: string[] = [];
      let currentAccessToken = store.accessToken;
      let daysProcessed = 0;
      let totalFees = 0;

      try {
        // Check if token is expired and refresh if needed
        const isExpired = store.expiresAt && new Date(store.expiresAt) < new Date();

        if (isExpired && store.refreshToken) {
          console.log(`Etsy token expired for ${store.brandName}, refreshing...`);
          const newTokens = await refreshEtsyToken(store.apiKey, store.refreshToken);

          if (newTokens) {
            currentAccessToken = newTokens.access_token;

            // Update tokens in database if it's a DB store
            if (!store.storeId.startsWith('env-')) {
              const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
              await supabase
                .from('stores')
                .update({
                  api_credentials: {
                    api_key: store.apiKey,
                    shop_id: store.shopId,
                    access_token: newTokens.access_token,
                    refresh_token: newTokens.refresh_token,
                    expires_at: expiresAt,
                  },
                })
                .eq('id', store.storeId);
            }
          } else {
            errors.push('Failed to refresh expired token');
            results.push({ brand: store.brandName, daysProcessed: 0, totalFees: 0, errors });
            continue;
          }
        }

        // Verify credentials
        const verification = await verifyEtsyCredentials(
          store.apiKey,
          store.shopId,
          currentAccessToken
        );

        if (!verification.valid) {
          errors.push(`Credentials invalid: ${verification.error}`);
          results.push({ brand: store.brandName, daysProcessed: 0, totalFees: 0, errors });
          continue;
        }

        // Fetch ledger entries
        console.log(`Fetching Etsy ledger entries for ${store.brandName}...`);
        const entries = await fetchEtsyLedgerEntries(
          store.apiKey,
          store.shopId,
          currentAccessToken,
          start,
          end
        );

        console.log(`Found ${entries.length} ledger entries for ${store.brandName}`);

        // Aggregate into daily fees
        const dailyFees = aggregateDailyFees(entries);

        // Upsert to database
        for (const daily of dailyFees) {
          const { error: upsertError } = await supabase.from('etsy_fees').upsert(
            {
              brand_id: store.brandId,
              store_id: store.storeId.startsWith('env-') ? null : store.storeId,
              date: daily.date,
              transaction_fees: daily.transaction_fees,
              processing_fees: daily.processing_fees,
              listing_fees: daily.listing_fees,
              shipping_transaction_fees: daily.shipping_transaction_fees,
              regulatory_operating_fees: daily.regulatory_operating_fees,
              offsite_ads_fees: daily.offsite_ads_fees,
              vat_on_fees: daily.vat_on_fees,
              other_fees: daily.other_fees,
              total_fees: daily.total_fees,
              currency: daily.currency,
              entry_count: daily.entry_count,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'brand_id,date' }
          );

          if (upsertError) {
            errors.push(`${daily.date}: ${upsertError.message}`);
          } else {
            daysProcessed++;
            totalFees += daily.total_fees;
          }
        }

        results.push({
          brand: store.brandName,
          daysProcessed,
          totalFees: Math.round(totalFees * 100) / 100,
          errors,
        });
      } catch (error) {
        errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({ brand: store.brandName, daysProcessed, totalFees, errors });
      }
    }

    const totalDays = results.reduce((sum, r) => sum + r.daysProcessed, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `Etsy fees sync complete: ${totalDays} days synced${totalErrors > 0 ? `, ${totalErrors} errors` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error syncing Etsy fees:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/etsy/fees - Check Etsy fees status and get summary
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('from');
    const endDate = searchParams.get('to');
    const brandCode = searchParams.get('brand');

    // Build query
    let query = supabase
      .from('etsy_fees')
      .select('*, brands!inner(code, name)')
      .order('date', { ascending: false });

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (brandCode && brandCode !== 'all') {
      query = query.eq('brands.code', brandCode);
    }

    const { data: fees, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate totals
    const totals = (fees || []).reduce(
      (acc, fee) => ({
        transaction_fees: acc.transaction_fees + Number(fee.transaction_fees),
        processing_fees: acc.processing_fees + Number(fee.processing_fees),
        listing_fees: acc.listing_fees + Number(fee.listing_fees),
        shipping_transaction_fees: acc.shipping_transaction_fees + Number(fee.shipping_transaction_fees),
        regulatory_operating_fees: acc.regulatory_operating_fees + Number(fee.regulatory_operating_fees),
        offsite_ads_fees: acc.offsite_ads_fees + Number(fee.offsite_ads_fees),
        vat_on_fees: acc.vat_on_fees + Number(fee.vat_on_fees),
        other_fees: acc.other_fees + Number(fee.other_fees),
        total_fees: acc.total_fees + Number(fee.total_fees),
      }),
      {
        transaction_fees: 0,
        processing_fees: 0,
        listing_fees: 0,
        shipping_transaction_fees: 0,
        regulatory_operating_fees: 0,
        offsite_ads_fees: 0,
        vat_on_fees: 0,
        other_fees: 0,
        total_fees: 0,
      }
    );

    return NextResponse.json({
      fees: fees || [],
      totals,
      count: fees?.length || 0,
      usage: {
        method: 'POST',
        body: {
          startDate: 'optional, defaults to 30 days ago',
          endDate: 'optional, defaults to today',
          brandCode: 'DC | BI | all (optional)',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching Etsy fees:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
