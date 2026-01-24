import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAllMetaAdSpend, verifyMetaToken } from '@/lib/meta/client';

// Brand to Ad Account mapping
const BRAND_AD_ACCOUNTS: Record<string, string> = {
  DC: process.env.META_AD_ACCOUNT_DC || '',
  BI: process.env.META_AD_ACCOUNT_BI || '',
};

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const metaAccessToken = process.env.META_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    if (!metaAccessToken) {
      return NextResponse.json(
        { error: 'Missing Meta access token' },
        { status: 500 }
      );
    }

    // Verify token first
    const tokenStatus = await verifyMetaToken(metaAccessToken);
    if (!tokenStatus.valid) {
      return NextResponse.json(
        { error: `Meta token invalid: ${tokenStatus.error}` },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await request.json();
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
    const end = endDate || new Date().toISOString().split('T')[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get brands to sync
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, code, name');

    if (brandsError) throw brandsError;
    if (!brands || brands.length === 0) {
      return NextResponse.json({ error: 'No brands found' }, { status: 404 });
    }

    const results: Array<{
      brand: string;
      recordsSynced: number;
      dateRange: { start: string; end: string };
    }> = [];

    for (const brand of brands) {
      // Skip if filtering by brand and this isn't the one
      if (brandCode && brandCode !== 'all' && brand.code !== brandCode) {
        continue;
      }

      const adAccountId = BRAND_AD_ACCOUNTS[brand.code];
      if (!adAccountId) {
        console.log(`No Meta ad account configured for brand ${brand.code}`);
        continue;
      }

      try {
        // Fetch ad spend from Meta
        const adSpendData = await fetchAllMetaAdSpend(
          adAccountId,
          metaAccessToken,
          start,
          end
        );

        if (adSpendData.length === 0) {
          results.push({
            brand: brand.name,
            recordsSynced: 0,
            dateRange: { start, end },
          });
          continue;
        }

        // Prepare records for upsert
        const records = adSpendData.map((data) => ({
          brand_id: brand.id,
          date: data.date,
          platform: 'meta' as const,
          spend: data.spend,
          impressions: data.impressions,
          clicks: data.clicks,
          conversions: data.conversions,
          revenue_attributed: data.revenueAttributed,
          notes: 'Auto-synced from Meta API',
          updated_at: new Date().toISOString(),
        }));

        // Upsert to ad_spend table
        const { error: upsertError } = await supabase
          .from('ad_spend')
          .upsert(records, {
            onConflict: 'brand_id,date,platform',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`Error upserting ad spend for ${brand.name}:`, upsertError);
          throw upsertError;
        }

        results.push({
          brand: brand.name,
          recordsSynced: records.length,
          dateRange: { start, end },
        });
      } catch (error) {
        console.error(`Error syncing Meta data for ${brand.name}:`, error);
        results.push({
          brand: brand.name,
          recordsSynced: 0,
          dateRange: { start, end },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Meta ad spend synced successfully',
      tokenExpiresAt: tokenStatus.expiresAt?.toISOString(),
      results,
    });
  } catch (error) {
    console.error('Error syncing Meta ad spend:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const metaAccessToken = process.env.META_ACCESS_TOKEN;

  if (!metaAccessToken) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Meta access token not configured',
    });
  }

  const tokenStatus = await verifyMetaToken(metaAccessToken);

  return NextResponse.json({
    status: tokenStatus.valid ? 'active' : 'invalid',
    expiresAt: tokenStatus.expiresAt?.toISOString(),
    error: tokenStatus.error,
    usage: {
      method: 'POST',
      body: {
        startDate: '2025-01-01 (optional, defaults to 30 days ago)',
        endDate: '2025-01-24 (optional, defaults to today)',
        brandCode: 'DC | BI | all (optional, defaults to all)',
      },
    },
  });
}
