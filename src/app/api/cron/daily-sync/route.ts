import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAllMetaAdSpend, verifyMetaToken } from '@/lib/meta/client';

/**
 * Daily Cron Job - Syncs all data and refreshes P&L
 *
 * Runs automatically via Vercel Cron at configured time
 * Can also be triggered manually with the correct CRON_SECRET
 *
 * Order of operations:
 * 1. Sync orders from Shopify (all brands)
 * 2. Sync orders from Etsy (all brands)
 * 3. Sync ad spend from Meta (all brands)
 * 4. Refresh P&L calculations
 */

const BRAND_AD_ACCOUNTS: Record<string, string> = {
  DC: process.env.META_AD_ACCOUNT_DC || '',
  BI: process.env.META_AD_ACCOUNT_BI || '',
};

interface SyncResult {
  step: string;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: SyncResult[] = [];

  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel cron (no auth needed) or manual trigger with secret
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid CRON_SECRET in Authorization header.' },
      { status: 401 }
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

  // Date range: last 7 days (covers any missed syncs)
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`[Daily Sync] Starting sync for ${startDate} to ${endDate}`);

  // Step 1: Sync Shopify Orders
  try {
    const shopifyResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(request.url).origin : 'http://localhost:3000'}/api/shopify/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
      }
    );
    const shopifyData = await shopifyResponse.json();

    results.push({
      step: 'Shopify Sync',
      success: shopifyResponse.ok,
      message: shopifyResponse.ok ? 'Orders synced successfully' : shopifyData.error,
      details: shopifyData,
    });
  } catch (error) {
    results.push({
      step: 'Shopify Sync',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Step 2: Sync Etsy Orders
  try {
    const etsyResponse = await fetch(
      `${new URL(request.url).origin}/api/etsy/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
      }
    );
    const etsyData = await etsyResponse.json();

    results.push({
      step: 'Etsy Sync',
      success: etsyResponse.ok,
      message: etsyResponse.ok ? 'Orders synced successfully' : etsyData.error,
      details: etsyData,
    });
  } catch (error) {
    results.push({
      step: 'Etsy Sync',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Step 3: Sync Meta Ad Spend
  const metaAccessToken = process.env.META_ACCESS_TOKEN;
  if (metaAccessToken) {
    try {
      const tokenStatus = await verifyMetaToken(metaAccessToken);

      if (!tokenStatus.valid) {
        results.push({
          step: 'Meta Ad Sync',
          success: false,
          message: `Token invalid: ${tokenStatus.error}`,
        });
      } else {
        // Get brands
        const { data: brands } = await supabase
          .from('brands')
          .select('id, code, name');

        let totalMetaRecords = 0;

        for (const brand of brands || []) {
          const adAccountId = BRAND_AD_ACCOUNTS[brand.code];
          if (!adAccountId) continue;

          try {
            const adSpendData = await fetchAllMetaAdSpend(
              adAccountId,
              metaAccessToken,
              startDate,
              endDate
            );

            if (adSpendData.length > 0) {
              const records = adSpendData.map((data) => ({
                brand_id: brand.id,
                date: data.date,
                platform: 'meta' as const,
                spend: data.spend,
                impressions: data.impressions,
                clicks: data.clicks,
                conversions: data.conversions,
                revenue_attributed: data.revenueAttributed,
                notes: 'Auto-synced via daily cron',
                updated_at: new Date().toISOString(),
              }));

              await supabase
                .from('ad_spend')
                .upsert(records, {
                  onConflict: 'brand_id,date,platform',
                  ignoreDuplicates: false,
                });

              totalMetaRecords += records.length;
            }
          } catch (error) {
            console.error(`Error syncing Meta for ${brand.name}:`, error);
          }
        }

        results.push({
          step: 'Meta Ad Sync',
          success: true,
          message: `Synced ${totalMetaRecords} ad spend records`,
          details: {
            recordsSynced: totalMetaRecords,
            tokenExpiresAt: tokenStatus.expiresAt?.toISOString(),
          },
        });
      }
    } catch (error) {
      results.push({
        step: 'Meta Ad Sync',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    results.push({
      step: 'Meta Ad Sync',
      success: false,
      message: 'META_ACCESS_TOKEN not configured',
    });
  }

  // Step 4: Refresh P&L Calculations
  try {
    const pnlResponse = await fetch(
      `${new URL(request.url).origin}/api/pnl/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      }
    );
    const pnlData = await pnlResponse.json();

    results.push({
      step: 'P&L Refresh',
      success: pnlResponse.ok,
      message: pnlResponse.ok ? 'P&L calculations refreshed' : pnlData.error,
      details: pnlData,
    });
  } catch (error) {
    results.push({
      step: 'P&L Refresh',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const duration = Date.now() - startTime;
  const allSuccessful = results.every((r) => r.success);

  console.log(`[Daily Sync] Completed in ${duration}ms. Success: ${allSuccessful}`);

  return NextResponse.json({
    success: allSuccessful,
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    dateRange: { startDate, endDate },
    results,
  });
}
