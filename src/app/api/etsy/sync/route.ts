import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchEtsyReceipts,
  transformEtsyReceipt,
  verifyEtsyCredentials,
  getEtsyStoresFromDb,
  refreshEtsyToken,
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

  // Get brand IDs from database
  const { data: brands } = await supabase.from('brands').select('id, code, name');
  const brandMap = new Map<string, Brand>(
    (brands as Brand[] || []).map((b) => [b.code, b])
  );

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
      storeId: 'env-dc', // Virtual store ID for env-based config
      storeName: 'Display Champ Etsy (env)',
      apiKey: dcApiKey,
      shopId: dcShopId,
      accessToken: dcAccessToken,
      refreshToken: dcRefreshToken || null,
      expiresAt: null,
      lastSyncAt: null,
    });
  }

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

  return stores;
}

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

    // Get Etsy stores from database
    const dbStores = await getEtsyStoresFromDb(supabase);

    // Get stores from environment variables
    const envStores = await getEtsyStoresFromEnv(supabase);

    // Merge: use DB stores, but add env stores for brands not in DB
    const dbBrandCodes = new Set(dbStores.map(s => s.brandCode));
    const allStores = [
      ...dbStores,
      ...envStores.filter(s => !dbBrandCodes.has(s.brandCode))
    ];

    console.log(`Etsy stores: ${dbStores.length} from DB, ${envStores.filter(s => !dbBrandCodes.has(s.brandCode)).length} from env vars`);

    if (allStores.length === 0) {
      return NextResponse.json(
        {
          error: 'No Etsy stores configured. Set ETSY_DC_* or ETSY_BI_* environment variables, or connect stores via Valhalla Dashboard.',
          required: {
            ETSY_DC_API_KEY: 'Your Etsy API keystring',
            ETSY_DC_SHOP_ID: 'Your Etsy shop ID (numeric)',
            ETSY_DC_ACCESS_TOKEN: 'OAuth access token',
            ETSY_DC_REFRESH_TOKEN: 'OAuth refresh token (optional)',
          }
        },
        { status: 400 }
      );
    }

    // Filter stores by brand code if specified
    const storesToSync = brandCode && brandCode !== 'all'
      ? allStores.filter((s) => s.brandCode === brandCode)
      : allStores;

    if (storesToSync.length === 0) {
      return NextResponse.json(
        { error: `No Etsy store configured for brand ${brandCode}` },
        { status: 400 }
      );
    }

    const results: Array<{
      brand: string;
      recordsSynced: number;
      skippedExcluded: number;
      errors: string[];
      dateRange: { start: string; end: string };
    }> = [];

    for (const store of storesToSync) {
      const errors: string[] = [];
      let syncedCount = 0;
      let currentAccessToken = store.accessToken;

      try {
        // Check if token is expired and refresh if needed
        const isExpired = store.expiresAt && new Date(store.expiresAt) < new Date();

        if (isExpired && store.refreshToken) {
          console.log(`Etsy token expired for ${store.brandName}, refreshing...`);
          const newTokens = await refreshEtsyToken(store.apiKey, store.refreshToken);

          if (newTokens) {
            currentAccessToken = newTokens.access_token;

            // Update tokens in database
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

            console.log(`Etsy token refreshed for ${store.brandName}, expires at ${expiresAt}`);
          } else {
            errors.push('Failed to refresh expired Etsy token. Please re-authenticate via the Valhalla Dashboard.');
            results.push({
              brand: store.brandName,
              recordsSynced: 0,
              skippedExcluded: 0,
              errors,
              dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
            });
            continue;
          }
        }

        // Verify credentials before fetching
        const verification = await verifyEtsyCredentials(
          store.apiKey,
          store.shopId,
          currentAccessToken
        );
        if (!verification.valid) {
          // If verification fails, try refreshing token one more time
          if (store.refreshToken) {
            const newTokens = await refreshEtsyToken(store.apiKey, store.refreshToken);
            if (newTokens) {
              currentAccessToken = newTokens.access_token;
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
            } else {
              errors.push(`Etsy credentials invalid: ${verification.error}. Token refresh failed.`);
              results.push({
                brand: store.brandName,
                recordsSynced: 0,
                skippedExcluded: 0,
                errors,
                dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
              });
              continue;
            }
          } else {
            errors.push(`Etsy credentials invalid: ${verification.error}`);
            results.push({
              brand: store.brandName,
              recordsSynced: 0,
              skippedExcluded: 0,
              errors,
              dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
            });
            continue;
          }
        }

        // Fetch receipts from Etsy
        const receipts = await fetchEtsyReceipts(
          store.apiKey,
          store.shopId,
          currentAccessToken,
          start,
          end
        );

        // Get list of excluded order IDs for this platform
        const { data: excludedOrders } = await supabase
          .from('excluded_orders')
          .select('platform_order_id')
          .eq('platform', 'etsy');
        const excludedOrderIds = new Set(excludedOrders?.map(e => e.platform_order_id) || []);
        let skippedExcluded = 0;

        // Upsert orders to database
        for (const receipt of receipts) {
          const transformed = transformEtsyReceipt(receipt);

          // Skip if this order is in the exclusion list
          if (excludedOrderIds.has(transformed.platform_order_id)) {
            skippedExcluded++;
            continue;
          }

          const { error: upsertError } = await supabase.from('orders').upsert(
            {
              store_id: store.storeId,
              brand_id: store.brandId,
              platform: 'etsy',
              platform_order_id: transformed.platform_order_id,
              order_number: transformed.order_number,
              order_date: transformed.order_date,
              customer_name: transformed.customer_name,
              customer_email: transformed.customer_email,
              shipping_address: transformed.shipping_address,
              subtotal: transformed.subtotal,
              shipping_charged: transformed.shipping_charged,
              tax: transformed.tax,
              total: transformed.total,
              currency: transformed.currency,
              status: transformed.status,
              fulfillment_status: transformed.fulfillment_status,
              line_items: transformed.line_items,
              raw_data: transformed.raw_data,
              // Note: refund_amount and refund_status stored in raw_data
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'platform,platform_order_id' }
          );

          if (upsertError) {
            errors.push(`Receipt ${transformed.order_number}: ${upsertError.message}`);
          } else {
            syncedCount++;
          }
        }

        // Update last sync timestamp
        await supabase
          .from('stores')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', store.storeId);

        results.push({
          brand: store.brandName,
          recordsSynced: syncedCount,
          skippedExcluded,
          errors,
          dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
        });
      } catch (error) {
        errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          brand: store.brandName,
          recordsSynced: syncedCount,
          skippedExcluded: 0,
          errors,
          dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
        });
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.recordsSynced, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `Etsy sync complete: ${totalSynced} orders synced${totalErrors > 0 ? `, ${totalErrors} errors` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error syncing Etsy orders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        platform: 'etsy',
        configuredStores: 0,
        stores: [],
        error: 'Missing Supabase credentials',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const dbStores = await getEtsyStoresFromDb(supabase);

    const storeStatus: Array<{
      brand: string;
      configured: boolean;
      shopId?: string;
      status?: string;
      error?: string;
      lastSyncAt?: string | null;
      expiresAt?: string | null;
    }> = [];

    for (const store of dbStores) {
      const verification = await verifyEtsyCredentials(
        store.apiKey,
        store.shopId,
        store.accessToken
      );
      storeStatus.push({
        brand: store.brandCode,
        configured: true,
        shopId: store.shopId,
        status: verification.valid ? 'connected' : 'invalid',
        error: verification.error,
        lastSyncAt: store.lastSyncAt,
        expiresAt: store.expiresAt,
      });
    }

    // Check for brands without Etsy stores
    const { data: allBrands } = await supabase.from('brands').select('code');
    const connectedBrands = new Set(dbStores.map((s) => s.brandCode));

    for (const brand of allBrands || []) {
      if (!connectedBrands.has(brand.code)) {
        storeStatus.push({
          brand: brand.code,
          configured: false,
        });
      }
    }

    return NextResponse.json({
      platform: 'etsy',
      configuredStores: dbStores.length,
      stores: storeStatus,
      usage: {
        method: 'POST',
        body: {
          startDate: '2025-01-01 (optional, defaults to 30 days ago)',
          endDate: '2025-01-24 (optional, defaults to today)',
          brandCode: 'DC | BI | all (optional, defaults to all)',
        },
      },
      note: 'Credentials are loaded from database (connect stores via Valhalla Dashboard)',
    });
  } catch (error) {
    console.error('Error checking Etsy status:', error);
    return NextResponse.json({
      platform: 'etsy',
      configuredStores: 0,
      stores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
