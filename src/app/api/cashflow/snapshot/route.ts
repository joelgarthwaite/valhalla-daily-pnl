import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, startOfDay } from 'date-fns';

export const maxDuration = 60;

/**
 * POST /api/cashflow/snapshot
 *
 * Creates a daily balance snapshot from Xero bank balances.
 * This should be called by the daily cron job to build balance history.
 *
 * Flow:
 * 1. Fetch current bank balances from Xero API
 * 2. Insert snapshot records into cash_balance_snapshots table
 * 3. Skip if today's snapshot already exists
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (cron secret or authenticated user)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const xVercelCron = request.headers.get('x-vercel-cron');

    const isAuthorized =
      (authHeader === `Bearer ${cronSecret}`) ||
      (xVercelCron !== null);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

    // Check if today's snapshot already exists
    const { data: existingSnapshots, error: checkError } = await supabase
      .from('cash_balance_snapshots')
      .select('id')
      .eq('snapshot_date', today)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing snapshots:', checkError);
    }

    if (existingSnapshots && existingSnapshots.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Snapshot already exists for today',
        date: today,
        created: 0,
      });
    }

    // Fetch Xero balances using the internal API
    // Note: We use the production URL to avoid Vercel deployment protection
    const baseUrl = process.env.VERCEL_ENV === 'production'
      ? 'https://pnl.displaychamp.com'
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    let balances: Array<{
      brand: string;
      brandName: string;
      accountName: string;
      accountType: string;
      balance: number;
      currency: string;
    }> = [];

    try {
      // Try to fetch from Xero API
      // Note: This might fail if no Xero tokens are available
      const xeroResponse = await fetch(`${baseUrl}/api/xero/balances?brand=all`, {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      });

      if (xeroResponse.ok) {
        const xeroData = await xeroResponse.json();
        if (xeroData.balances) {
          balances = xeroData.balances;
        }
      } else {
        console.log('Xero balances not available, will use cached data if exists');
      }
    } catch (xeroError) {
      console.log('Could not fetch Xero balances:', xeroError);
    }

    // If no balances from Xero, check for existing connections and log warning
    if (balances.length === 0) {
      const { data: connections } = await supabase
        .from('xero_connections')
        .select('brand_id')
        .not('access_token', 'is', null);

      if (connections && connections.length > 0) {
        console.warn('Xero connections exist but balance fetch failed');
      }

      return NextResponse.json({
        success: true,
        message: 'No Xero balances available',
        date: today,
        created: 0,
      });
    }

    // Get brand IDs
    const { data: brands } = await supabase
      .from('brands')
      .select('id, code');

    const brandMap = new Map(brands?.map(b => [b.code, b.id]) || []);

    // Create snapshot records
    const snapshots = balances.map(bal => ({
      snapshot_date: today,
      brand_id: bal.brand === 'SHARED' ? null : brandMap.get(bal.brand) || null,
      account_name: bal.accountName,
      account_type: bal.accountType,
      balance: bal.balance,
      currency: bal.currency || 'GBP',
    }));

    const { data: insertedSnapshots, error: insertError } = await supabase
      .from('cash_balance_snapshots')
      .insert(snapshots)
      .select();

    if (insertError) {
      console.error('Error inserting snapshots:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert snapshots', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Created ${insertedSnapshots?.length || 0} balance snapshots`,
      date: today,
      created: insertedSnapshots?.length || 0,
      accounts: balances.map(b => b.accountName),
    });
  } catch (error) {
    console.error('Snapshot API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cashflow/snapshot
 *
 * Returns the latest snapshot data for debugging/verification.
 */
export async function GET(request: NextRequest) {
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

    // Get latest snapshot date
    const { data: latestSnapshot } = await supabase
      .from('cash_balance_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (!latestSnapshot) {
      return NextResponse.json({
        success: true,
        message: 'No snapshots found',
        lastSnapshotDate: null,
        totalSnapshots: 0,
      });
    }

    // Get all snapshots for latest date
    const { data: snapshots, error } = await supabase
      .from('cash_balance_snapshots')
      .select('*')
      .eq('snapshot_date', latestSnapshot.snapshot_date);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch snapshots', details: error.message },
        { status: 500 }
      );
    }

    // Count total snapshots
    const { count } = await supabase
      .from('cash_balance_snapshots')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      lastSnapshotDate: latestSnapshot.snapshot_date,
      totalSnapshots: count || 0,
      latestSnapshots: snapshots,
    });
  } catch (error) {
    console.error('Snapshot GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
