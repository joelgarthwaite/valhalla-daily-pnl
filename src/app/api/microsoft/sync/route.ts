/**
 * Microsoft Advertising Sync
 * GET /api/microsoft/sync - Check connection status
 * POST /api/microsoft/sync - Sync ad spend from Microsoft Advertising
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAccessToken,
  fetchMicrosoftAdSpend,
  verifyMicrosoftToken,
} from '@/lib/microsoft/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const refreshToken = process.env.MICROSOFT_REFRESH_TOKEN;
  const developerToken = process.env.MICROSOFT_DEVELOPER_TOKEN;
  const accountId = process.env.MICROSOFT_ACCOUNT_ID_DC;
  const customerId = process.env.MICROSOFT_CUSTOMER_ID;

  const missingVars = [];
  if (!clientId) missingVars.push('MICROSOFT_CLIENT_ID');
  if (!clientSecret) missingVars.push('MICROSOFT_CLIENT_SECRET');
  if (!refreshToken) missingVars.push('MICROSOFT_REFRESH_TOKEN');
  if (!developerToken) missingVars.push('MICROSOFT_DEVELOPER_TOKEN');
  if (!accountId) missingVars.push('MICROSOFT_ACCOUNT_ID_DC');
  if (!customerId) missingVars.push('MICROSOFT_CUSTOMER_ID');

  if (missingVars.length > 0) {
    return NextResponse.json({
      connected: false,
      message: `Missing environment variables: ${missingVars.join(', ')}`,
    });
  }

  // Verify the token is valid
  const verification = await verifyMicrosoftToken(clientId!, clientSecret!, refreshToken!);

  return NextResponse.json({
    connected: verification.valid,
    message: verification.valid
      ? 'Microsoft Advertising connected and ready to sync'
      : `Connection issue: ${verification.error}`,
    accountId,
    customerId,
  });
}

export async function POST(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const refreshToken = process.env.MICROSOFT_REFRESH_TOKEN;
  const developerToken = process.env.MICROSOFT_DEVELOPER_TOKEN;
  const customerId = process.env.MICROSOFT_CUSTOMER_ID;

  // Account IDs for each brand
  const accountIdDC = process.env.MICROSOFT_ACCOUNT_ID_DC;
  const accountIdBI = process.env.MICROSOFT_ACCOUNT_ID_BI;

  if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
    return NextResponse.json(
      { error: 'Microsoft Advertising not fully configured' },
      { status: 500 }
    );
  }

  let body: { brandCode?: string; startDate?: string; endDate?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine
  }

  const {
    brandCode = 'all',
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate = new Date().toISOString().split('T')[0],
  } = body;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get brands from database
  const { data: brands, error: brandsError } = await supabase
    .from('brands')
    .select('id, code, name');

  if (brandsError || !brands) {
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }

  // Get access token
  let accessToken: string;
  try {
    const tokenResult = await getAccessToken(clientId, clientSecret, refreshToken);
    accessToken = tokenResult.accessToken;
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }

  const results: Record<string, { synced: number; errors: string[] }> = {};

  // Process each brand
  for (const brand of brands) {
    if (brandCode !== 'all' && brand.code !== brandCode) continue;

    const accountId = brand.code === 'DC' ? accountIdDC : accountIdBI;
    if (!accountId) {
      results[brand.code] = { synced: 0, errors: [`No account ID configured for ${brand.code}`] };
      continue;
    }

    results[brand.code] = { synced: 0, errors: [] };

    try {
      const adSpendData = await fetchMicrosoftAdSpend(
        accountId,
        accessToken,
        developerToken,
        customerId,
        startDate,
        endDate
      );

      // Upsert ad spend data
      for (const day of adSpendData) {
        const { error: upsertError } = await supabase
          .from('ad_spend')
          .upsert(
            {
              brand_id: brand.id,
              date: day.date,
              platform: 'microsoft',
              spend: day.spend,
              impressions: day.impressions,
              clicks: day.clicks,
              conversions: day.conversions,
              revenue_attributed: day.conversionValue,
            },
            {
              onConflict: 'brand_id,date,platform',
            }
          );

        if (upsertError) {
          results[brand.code].errors.push(`${day.date}: ${upsertError.message}`);
        } else {
          results[brand.code].synced++;
        }
      }
    } catch (error) {
      results[brand.code].errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);

  return NextResponse.json({
    success: totalErrors === 0,
    message: `Synced ${totalSynced} days of Microsoft Ads data`,
    dateRange: { startDate, endDate },
    results,
  });
}
