import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchShopifyOrders,
  transformShopifyOrder,
  getShopifyStoresFromDb,
} from '@/lib/shopify/client';
import {
  fetchEtsyReceipts,
  transformEtsyReceipt,
  getEtsyStoresFromDb,
} from '@/lib/etsy/client';

interface SyncResult {
  platform: 'shopify' | 'etsy';
  brand: string;
  recordsSynced: number;
  errors: string[];
  dateRange: { start: string; end: string };
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
      platforms,
    }: {
      startDate?: string;
      endDate?: string;
      brandCode?: 'DC' | 'BI' | 'all';
      platforms?: ('shopify' | 'etsy')[];
    } = body;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Default to all platforms
    const platformsToSync = platforms || ['shopify', 'etsy'];

    const results: SyncResult[] = [];

    // =========== SHOPIFY SYNC ===========
    if (platformsToSync.includes('shopify')) {
      const shopifyStores = await getShopifyStoresFromDb(supabase);

      const storesToSync = brandCode && brandCode !== 'all'
        ? shopifyStores.filter((s) => s.brandCode === brandCode)
        : shopifyStores;

      for (const store of storesToSync) {
        const errors: string[] = [];
        let syncedCount = 0;

        try {
          const orders = await fetchShopifyOrders(
            store.domain,
            store.accessToken,
            start,
            end
          );

          for (const order of orders) {
            const transformed = transformShopifyOrder(order);

            const { error } = await supabase.from('orders').upsert(
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
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'platform,platform_order_id' }
            );

            if (error) {
              errors.push(`Order ${transformed.order_number}: ${error.message}`);
            } else {
              syncedCount++;
            }
          }

          await supabase
            .from('stores')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', store.storeId);

          results.push({
            platform: 'shopify',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        } catch (error) {
          errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.push({
            platform: 'shopify',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        }
      }
    }

    // =========== ETSY SYNC ===========
    if (platformsToSync.includes('etsy')) {
      const etsyStores = await getEtsyStoresFromDb(supabase);

      const storesToSync = brandCode && brandCode !== 'all'
        ? etsyStores.filter((s) => s.brandCode === brandCode)
        : etsyStores;

      for (const store of storesToSync) {
        const errors: string[] = [];
        let syncedCount = 0;

        try {
          const receipts = await fetchEtsyReceipts(
            store.apiKey,
            store.shopId,
            store.accessToken,
            start,
            end
          );

          for (const receipt of receipts) {
            const transformed = transformEtsyReceipt(receipt);

            const { error } = await supabase.from('orders').upsert(
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
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'platform,platform_order_id' }
            );

            if (error) {
              errors.push(`Receipt ${transformed.order_number}: ${error.message}`);
            } else {
              syncedCount++;
            }
          }

          await supabase
            .from('stores')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', store.storeId);

          results.push({
            platform: 'etsy',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        } catch (error) {
          errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.push({
            platform: 'etsy',
            brand: store.brandName,
            recordsSynced: syncedCount,
            errors,
            dateRange: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
          });
        }
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + r.recordsSynced, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      success: totalErrors === 0,
      message: `Order sync complete: ${totalSynced} orders synced across ${platformsToSync.join(' and ')}${totalErrors > 0 ? `, ${totalErrors} errors` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Error syncing orders:', error);
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
        platforms: { shopify: { configured: 0 }, etsy: { configured: 0 } },
        error: 'Missing Supabase credentials',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [shopifyStores, etsyStores] = await Promise.all([
      getShopifyStoresFromDb(supabase),
      getEtsyStoresFromDb(supabase),
    ]);

    return NextResponse.json({
      platforms: {
        shopify: {
          configured: shopifyStores.length,
          stores: shopifyStores.map((s) => ({
            brand: s.brandCode,
            configured: true,
            domain: s.domain,
            lastSyncAt: s.lastSyncAt,
          })),
        },
        etsy: {
          configured: etsyStores.length,
          stores: etsyStores.map((s) => ({
            brand: s.brandCode,
            configured: true,
            shopId: s.shopId,
            lastSyncAt: s.lastSyncAt,
          })),
        },
      },
      usage: {
        method: 'POST',
        body: {
          startDate: '2025-01-01 (optional, defaults to 30 days ago)',
          endDate: '2025-01-24 (optional, defaults to today)',
          brandCode: 'DC | BI | all (optional, defaults to all)',
          platforms: "['shopify', 'etsy'] (optional, defaults to all platforms)",
        },
      },
      note: 'Credentials are loaded from database (connect stores via Valhalla Dashboard)',
    });
  } catch (error) {
    console.error('Error getting order sync status:', error);
    return NextResponse.json({
      platforms: { shopify: { configured: 0 }, etsy: { configured: 0 } },
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
