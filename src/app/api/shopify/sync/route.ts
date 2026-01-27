import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchShopifyOrders,
  transformShopifyOrder,
  verifyShopifyCredentials,
  getShopifyStoresFromDb,
  ShopifyStoreCredentials,
} from '@/lib/shopify/client';

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

    // Get Shopify stores from database (OAuth credentials from Valhalla Dashboard)
    const dbStores = await getShopifyStoresFromDb(supabase);

    if (dbStores.length === 0) {
      return NextResponse.json(
        { error: 'No Shopify stores connected. Connect stores via the Valhalla Dashboard at /admin/connections' },
        { status: 400 }
      );
    }

    // Filter stores by brand code if specified
    const storesToSync = brandCode && brandCode !== 'all'
      ? dbStores.filter((s) => s.brandCode === brandCode)
      : dbStores;

    if (storesToSync.length === 0) {
      return NextResponse.json(
        { error: `No Shopify store connected for brand ${brandCode}` },
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

      try {
        // Verify credentials before fetching
        const verification = await verifyShopifyCredentials(store.domain, store.accessToken);
        if (!verification.valid) {
          errors.push(`Shopify credentials invalid: ${verification.error}`);
          results.push({
            brand: store.brandName,
            recordsSynced: 0,
            skippedExcluded: 0,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
          continue;
        }

        // Fetch orders from Shopify
        const orders = await fetchShopifyOrders(
          store.domain,
          store.accessToken,
          start,
          end
        );

        // Get list of excluded order IDs for this platform
        const { data: excludedOrders } = await supabase
          .from('excluded_orders')
          .select('platform_order_id')
          .eq('platform', 'shopify');
        const excludedOrderIds = new Set(excludedOrders?.map(e => e.platform_order_id) || []);
        let skippedExcluded = 0;

        // Upsert orders to database
        for (const order of orders) {
          const transformed = transformShopifyOrder(order);

          // Skip if this order is in the exclusion list
          if (excludedOrderIds.has(transformed.platform_order_id)) {
            skippedExcluded++;
            continue;
          }

          const { error: upsertError } = await supabase.from('orders').upsert(
            {
              store_id: store.storeId,
              brand_id: store.brandId,
              platform: 'shopify',
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
            errors.push(`Order ${transformed.order_number}: ${upsertError.message}`);
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
      message: `Shopify sync complete: ${totalSynced} orders synced${totalErrors > 0 ? `, ${totalErrors} errors` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error syncing Shopify orders:', error);
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
        platform: 'shopify',
        configuredStores: 0,
        stores: [],
        error: 'Missing Supabase credentials',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const dbStores = await getShopifyStoresFromDb(supabase);

    const storeStatus: Array<{
      brand: string;
      configured: boolean;
      domain?: string;
      status?: string;
      error?: string;
      lastSyncAt?: string | null;
    }> = [];

    for (const store of dbStores) {
      const verification = await verifyShopifyCredentials(store.domain, store.accessToken);
      storeStatus.push({
        brand: store.brandCode,
        configured: true,
        domain: store.domain,
        status: verification.valid ? 'connected' : 'invalid',
        error: verification.error,
        lastSyncAt: store.lastSyncAt,
      });
    }

    // Check for brands without Shopify stores
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
      platform: 'shopify',
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
    console.error('Error checking Shopify status:', error);
    return NextResponse.json({
      platform: 'shopify',
      configuredStores: 0,
      stores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
