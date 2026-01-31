import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAllMetaAdSpend, verifyMetaToken } from '@/lib/meta/client';

// Allow up to 120 seconds for the cron job (Pro plan allows up to 300s)
// This is needed because syncing Shopify, Etsy, Meta, and refreshing P&L takes ~30-40 seconds
export const maxDuration = 120;

/**
 * Daily Cron Job - Syncs all data and refreshes P&L
 *
 * Runs automatically via Vercel Cron at configured times:
 * - 7:00 AM UTC (type=morning): Full sync + Yesterday's P&L summary email + Low stock alert
 * - 7:00 PM UTC (type=evening): Full sync + Today's "so far" P&L email
 *
 * Can also be triggered manually with the correct CRON_SECRET
 *
 * Order of operations:
 * 1. Sync orders from Shopify (all brands)
 * 2. Sync orders from Etsy (all brands)
 * 3. Sync ad spend from Meta (all brands)
 * 4. Sync country-level ad spend from Meta (for Country Analysis GP3)
 * 5. Take cash balance snapshot (morning only, for cash flow tracking)
 * 6. Refresh P&L calculations
 * 7. Send P&L summary email (morning=yesterday, evening=today so far)
 * 8. Send low stock alert email (morning only, when items need attention)
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

  // Allow Vercel cron or manual trigger with secret
  // Vercel cron sets 'x-vercel-cron' header (check existence, not specific value)
  // Also check for CRON_SECRET in Authorization header (Vercel sends this if CRON_SECRET env var is set)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  const isVercelCron = vercelCronHeader !== null;
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  console.log('[Cron Auth] x-vercel-cron header:', vercelCronHeader, '| Auth header present:', !!authHeader);

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

  // Use production URL for internal API calls to avoid Vercel Deployment Protection
  // The request.url gives the Vercel function URL which has protection enabled
  const baseUrl = process.env.VERCEL_ENV === 'production'
    ? 'https://pnl.displaychamp.com'
    : new URL(request.url).origin;

  console.log(`[Daily Sync] Starting sync for ${startDate} to ${endDate} (baseUrl: ${baseUrl})`);

  // Step 1: Sync Shopify Orders
  try {
    const shopifyResponse = await fetch(
      `${baseUrl}/api/shopify/sync`,
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
      `${baseUrl}/api/etsy/sync`,
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

  // Step 4: Sync Meta Country Ad Spend
  if (metaAccessToken) {
    try {
      const countryResponse = await fetch(
        `${baseUrl}/api/meta/country-sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
        }
      );
      const countryData = await countryResponse.json();

      results.push({
        step: 'Meta Country Ad Sync',
        success: countryResponse.ok,
        message: countryResponse.ok
          ? `Synced ${countryData.results?.reduce((sum: number, r: { recordsSynced: number }) => sum + r.recordsSynced, 0) || 0} country ad records`
          : countryData.error,
        details: countryData,
      });
    } catch (error) {
      results.push({
        step: 'Meta Country Ad Sync',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    results.push({
      step: 'Meta Country Ad Sync',
      success: false,
      message: 'META_ACCESS_TOKEN not configured',
    });
  }

  // Determine sync type from query param or time of day
  const syncType = request.nextUrl.searchParams.get('type') ||
    (new Date().getUTCHours() < 12 ? 'morning' : 'evening');

  // Step 5: Take Cash Balance Snapshot (morning only - for cash flow tracking)
  if (syncType === 'morning') {
    try {
      const snapshotResponse = await fetch(
        `${baseUrl}/api/cashflow/snapshot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
          },
        }
      );
      const snapshotData = await snapshotResponse.json();

      results.push({
        step: 'Cash Balance Snapshot',
        success: snapshotResponse.ok,
        message: snapshotResponse.ok
          ? snapshotData.message
          : snapshotData.error,
        details: snapshotData,
      });
    } catch (error) {
      results.push({
        step: 'Cash Balance Snapshot',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    results.push({
      step: 'Cash Balance Snapshot',
      success: true,
      message: 'Skipped - only runs on morning sync',
    });
  }

  // Step 6: Refresh P&L Calculations
  try {
    const pnlResponse = await fetch(
      `${baseUrl}/api/pnl/refresh`,
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

  // Step 7: Send Daily Summary Email
  // Only send email if critical syncs succeeded (at least P&L refresh must work)
  // This prevents sending emails with stale/incomplete data
  const pnlRefreshResult = results.find(r => r.step === 'P&L Refresh');
  const shopifySyncResult = results.find(r => r.step === 'Shopify Sync');
  const etsySyncResult = results.find(r => r.step === 'Etsy Sync');

  const criticalSyncsSucceeded = pnlRefreshResult?.success &&
    (shopifySyncResult?.success || etsySyncResult?.success);

  if (!criticalSyncsSucceeded) {
    results.push({
      step: 'Daily Summary Email',
      success: false,
      message: 'Skipped - critical syncs failed (P&L refresh or all order syncs failed)',
      details: {
        pnlRefresh: pnlRefreshResult?.success,
        shopifySync: shopifySyncResult?.success,
        etsySync: etsySyncResult?.success,
      },
    });
  } else {
    try {
      const emailResponse = await fetch(
        `${baseUrl}/api/email/daily-summary?type=${syncType}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
          },
        }
      );
      const emailData = await emailResponse.json();

      results.push({
        step: 'Daily Summary Email',
        success: emailResponse.ok,
        message: emailResponse.ok ? emailData.message : emailData.error,
        details: { ...emailData.data, syncType },
      });
    } catch (error) {
      results.push({
        step: 'Daily Summary Email',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Step 8: Send Low Stock Alert Email (morning sync only)
  // Only send on morning sync so operations team can action it during the day
  if (syncType === 'morning') {
    try {
      const stockAlertResponse = await fetch(
        `${baseUrl}/api/email/low-stock-alert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
          },
        }
      );
      const stockAlertData = await stockAlertResponse.json();

      results.push({
        step: 'Low Stock Alert',
        success: stockAlertResponse.ok,
        message: stockAlertResponse.ok
          ? stockAlertData.emailSent
            ? `Alert sent: ${stockAlertData.data?.total || 0} items need attention`
            : 'No low stock items - email not sent'
          : stockAlertData.error,
        details: stockAlertData.data,
      });
    } catch (error) {
      results.push({
        step: 'Low Stock Alert',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    results.push({
      step: 'Low Stock Alert',
      success: true,
      message: 'Skipped - only runs on morning sync',
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
