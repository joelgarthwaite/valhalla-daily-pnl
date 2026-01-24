import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchGoogleAdSpend,
  getAccessToken,
  verifyGoogleToken,
} from '@/lib/google/client';

// Brand to Google Ads Customer ID mapping
const BRAND_CUSTOMER_IDS: Record<string, string> = {
  DC: process.env.GOOGLE_CUSTOMER_ID_DC || '',
  // BI: process.env.GOOGLE_CUSTOMER_ID_BI || '', // Add when available
};

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const managerId = process.env.GOOGLE_MANAGER_ID;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    if (!clientId || !clientSecret || !developerToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing Google Ads API credentials. Please complete OAuth setup at /api/google/auth' },
        { status: 500 }
      );
    }

    // Verify token first
    const tokenStatus = await verifyGoogleToken(clientId, clientSecret, refreshToken);
    if (!tokenStatus.valid) {
      return NextResponse.json(
        { error: `Google token invalid: ${tokenStatus.error}` },
        { status: 401 }
      );
    }

    // Get fresh access token
    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

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

      const customerId = BRAND_CUSTOMER_IDS[brand.code];
      if (!customerId) {
        console.log(`No Google Ads customer ID configured for brand ${brand.code}`);
        continue;
      }

      try {
        // Fetch ad spend from Google Ads
        const adSpendData = await fetchGoogleAdSpend(
          customerId,
          accessToken,
          developerToken,
          start,
          end,
          managerId
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
          platform: 'google' as const,
          spend: data.spend,
          impressions: data.impressions,
          clicks: data.clicks,
          conversions: data.conversions,
          revenue_attributed: data.conversionValue,
          notes: 'Auto-synced from Google Ads API',
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
        console.error(`Error syncing Google data for ${brand.name}:`, error);
        results.push({
          brand: brand.name,
          recordsSynced: 0,
          dateRange: { start, end },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Google Ads spend synced successfully',
      results,
    });
  } catch (error) {
    console.error('Error syncing Google Ads spend:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Google Ads not connected. Visit /api/google/auth to authorize.',
      authUrl: '/api/google/auth',
    });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      status: 'missing_credentials',
      message: 'Google OAuth credentials not configured',
    });
  }

  const tokenStatus = await verifyGoogleToken(clientId, clientSecret, refreshToken);

  return NextResponse.json({
    status: tokenStatus.valid ? 'active' : 'invalid',
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
