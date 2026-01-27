import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAllMetaAdSpend, verifyMetaToken } from '@/lib/meta/client';

/**
 * Unified Sync Endpoint - Syncs all data sources and refreshes P&L
 *
 * This is the ONE endpoint to rule them all. It:
 * 1. Syncs orders from Shopify (all connected stores)
 * 2. Syncs orders from Etsy (all connected stores)
 * 3. Syncs Etsy fees from Payment Ledger (actual fees, not estimates)
 * 4. Syncs ad spend from Meta (all configured accounts)
 * 5. Refreshes P&L calculations
 *
 * Call this from the dashboard "Sync & Update" button.
 */

const BRAND_AD_ACCOUNTS: Record<string, string> = {
  DC: process.env.META_AD_ACCOUNT_DC || '',
  BI: process.env.META_AD_ACCOUNT_BI || '',
};

interface SyncStep {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  recordsAffected?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const steps: SyncStep[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const baseUrl = new URL(request.url).origin;

  // Parse optional date range from body, default to last 7 days
  let startDate: string;
  let endDate: string;

  try {
    const body = await request.json().catch(() => ({}));
    endDate = body.endDate || new Date().toISOString().split('T')[0];
    startDate = body.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  } catch {
    endDate = new Date().toISOString().split('T')[0];
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  console.log(`[Sync All] Starting unified sync for ${startDate} to ${endDate}`);

  // ============================================
  // STEP 1: Sync Shopify Orders
  // ============================================
  try {
    const response = await fetch(`${baseUrl}/api/shopify/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
    });
    const data = await response.json();

    if (response.ok) {
      const totalOrders = data.results?.reduce((sum: number, r: { recordsSynced?: number }) => sum + (r.recordsSynced || 0), 0) || 0;
      steps.push({
        name: 'Shopify Orders',
        status: 'success',
        message: `Synced ${totalOrders} orders`,
        recordsAffected: totalOrders,
      });
    } else {
      steps.push({
        name: 'Shopify Orders',
        status: 'error',
        message: data.error || 'Sync failed',
      });
    }
  } catch (error) {
    steps.push({
      name: 'Shopify Orders',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // ============================================
  // STEP 2: Sync Etsy Orders
  // ============================================
  try {
    const response = await fetch(`${baseUrl}/api/etsy/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
    });
    const data = await response.json();

    if (response.ok) {
      const totalOrders = data.results?.reduce((sum: number, r: { recordsSynced?: number }) => sum + (r.recordsSynced || 0), 0) || 0;
      steps.push({
        name: 'Etsy Orders',
        status: 'success',
        message: `Synced ${totalOrders} orders`,
        recordsAffected: totalOrders,
      });
    } else {
      steps.push({
        name: 'Etsy Orders',
        status: 'error',
        message: data.error || 'Sync failed',
      });
    }
  } catch (error) {
    steps.push({
      name: 'Etsy Orders',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // ============================================
  // STEP 3: Sync Etsy Fees (from Payment Ledger)
  // ============================================
  try {
    const response = await fetch(`${baseUrl}/api/etsy/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, brandCode: 'all' }),
    });
    const data = await response.json();

    if (response.ok) {
      const totalDays = data.results?.reduce((sum: number, r: { daysProcessed?: number }) => sum + (r.daysProcessed || 0), 0) || 0;
      const totalFees = data.results?.reduce((sum: number, r: { totalFees?: number }) => sum + (r.totalFees || 0), 0) || 0;
      steps.push({
        name: 'Etsy Fees',
        status: 'success',
        message: `Synced ${totalDays} days (£${totalFees.toFixed(2)} in fees)`,
        recordsAffected: totalDays,
      });
    } else {
      steps.push({
        name: 'Etsy Fees',
        status: 'error',
        message: data.error || 'Sync failed',
      });
    }
  } catch (error) {
    steps.push({
      name: 'Etsy Fees',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // ============================================
  // STEP 4: Sync Meta Ad Spend
  // ============================================
  const metaAccessToken = process.env.META_ACCESS_TOKEN;
  if (metaAccessToken) {
    try {
      const tokenStatus = await verifyMetaToken(metaAccessToken);

      if (!tokenStatus.valid) {
        steps.push({
          name: 'Meta Ads',
          status: 'error',
          message: `Token expired or invalid`,
        });
      } else {
        const { data: brands } = await supabase
          .from('brands')
          .select('id, code, name');

        let totalRecords = 0;

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
                notes: 'Auto-synced',
                updated_at: new Date().toISOString(),
              }));

              await supabase
                .from('ad_spend')
                .upsert(records, {
                  onConflict: 'brand_id,date,platform',
                  ignoreDuplicates: false,
                });

              totalRecords += records.length;
            }
          } catch (error) {
            console.error(`Error syncing Meta for ${brand.name}:`, error);
          }
        }

        steps.push({
          name: 'Meta Ads',
          status: 'success',
          message: `Synced ${totalRecords} days of ad spend`,
          recordsAffected: totalRecords,
        });
      }
    } catch (error) {
      steps.push({
        name: 'Meta Ads',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    steps.push({
      name: 'Meta Ads',
      status: 'skipped',
      message: 'Not configured',
    });
  }

  // ============================================
  // STEP 5: Refresh P&L Calculations
  // ============================================
  try {
    const response = await fetch(`${baseUrl}/api/pnl/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate }),
    });
    const data = await response.json();

    if (response.ok) {
      steps.push({
        name: 'P&L Calculations',
        status: 'success',
        message: `Updated ${data.recordsCreated || 0} daily records`,
        recordsAffected: data.recordsCreated,
      });
    } else {
      steps.push({
        name: 'P&L Calculations',
        status: 'error',
        message: data.error || 'Refresh failed',
      });
    }
  } catch (error) {
    steps.push({
      name: 'P&L Calculations',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const duration = Date.now() - startTime;
  const hasErrors = steps.some((s) => s.status === 'error');

  console.log(`[Sync All] Completed in ${duration}ms. Errors: ${hasErrors}`);

  return NextResponse.json({
    success: !hasErrors,
    duration: `${(duration / 1000).toFixed(1)}s`,
    dateRange: { startDate, endDate },
    steps,
  });
}

// GET endpoint to check sync status/configuration
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/sync-all',
    description: 'Unified sync endpoint - syncs orders, ad spend, and refreshes P&L',
    method: 'POST',
    body: {
      startDate: 'optional, defaults to 7 days ago',
      endDate: 'optional, defaults to today',
    },
    steps: [
      '1. Sync Shopify orders',
      '2. Sync Etsy orders',
      '3. Sync Meta ad spend',
      '4. Refresh P&L calculations',
    ],
  });
}
