import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, subDays } from 'date-fns';
import { sendDailySummaryEmail, type DailySummaryData } from '@/lib/email/daily-summary';
import { calculatePnLSummary } from '@/lib/pnl/calculations';
import { calculateOpexForPeriod, getOpexSummary } from '@/lib/pnl/opex';
import type { OperatingExpense } from '@/types';

// Recipients for the daily summary email
const EMAIL_RECIPIENTS = [
  'joel@displaychamp.com',
  'lee@displaychamp.com',
];

/**
 * POST /api/email/daily-summary
 * Send daily P&L summary email
 *
 * Can be triggered by:
 * 1. Cron job at 6pm
 * 2. Manual trigger with Authorization header
 *
 * Query params:
 * - date: Optional date override (YYYY-MM-DD), defaults to today
 * - test: If "true", only logs the email, doesn't send
 */
export async function POST(request: NextRequest) {
  // Verify authorization for manual triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel cron (no auth header) or manual trigger with secret
  if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get('date');
  const isTest = searchParams.get('test') === 'true';

  // Use provided date or today
  const targetDate = dateParam || format(new Date(), 'yyyy-MM-dd');
  const previousDate = format(subDays(new Date(targetDate), 1), 'yyyy-MM-dd');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch today's and yesterday's P&L data
    const [todayResult, yesterdayResult, opexResult] = await Promise.all([
      supabase
        .from('daily_pnl')
        .select('*')
        .eq('date', targetDate),
      supabase
        .from('daily_pnl')
        .select('*')
        .eq('date', previousDate),
      supabase
        .from('operating_expenses')
        .select('*')
        .eq('is_active', true),
    ]);

    if (todayResult.error) throw todayResult.error;

    const todayData = todayResult.data || [];
    const yesterdayData = yesterdayResult.data || [];
    const opexData = (opexResult.data || []) as OperatingExpense[];

    // If no data for today, send a "no data" notification
    if (todayData.length === 0) {
      console.log(`No P&L data for ${targetDate}`);
      return NextResponse.json({
        success: true,
        message: `No P&L data for ${targetDate}`,
        emailSent: false,
      });
    }

    // Calculate OPEX for today
    const todayOpex = calculateOpexForPeriod(
      opexData,
      new Date(targetDate),
      new Date(targetDate)
    );
    const opexSummary = getOpexSummary(opexData);

    // Calculate summaries
    const todaySummary = calculatePnLSummary(todayData as never[], todayOpex, opexSummary.byCategory);
    const yesterdaySummary = yesterdayData.length > 0
      ? calculatePnLSummary(yesterdayData as never[])
      : null;

    // Prepare email data
    const emailData: DailySummaryData = {
      date: targetDate,
      // Revenue
      totalRevenue: todaySummary.totalRevenue,
      shopifyRevenue: todaySummary.shopifyRevenue,
      etsyRevenue: todaySummary.etsyRevenue,
      b2bRevenue: todaySummary.b2bRevenue,
      // Orders
      totalOrders: todaySummary.totalOrders,
      // Profit tiers
      gp1: todaySummary.gp1,
      gp2: todaySummary.gp2,
      gp3: todaySummary.gp3,
      totalOpex: todaySummary.totalOpex,
      trueNetProfit: todaySummary.trueNetProfit,
      // Margins
      grossMarginPct: todaySummary.grossMarginPct,
      netMarginPct: todaySummary.netMarginPct,
      // Ad spend
      totalAdSpend: todaySummary.totalAdSpend,
      mer: todaySummary.mer,
      poas: todaySummary.poas,
      // Comparison
      previousDay: yesterdaySummary ? {
        totalRevenue: yesterdaySummary.totalRevenue,
        trueNetProfit: yesterdaySummary.trueNetProfit,
        totalOrders: yesterdaySummary.totalOrders,
      } : undefined,
    };

    // Log for debugging
    console.log('Daily Summary Data:', {
      date: targetDate,
      revenue: emailData.totalRevenue,
      netProfit: emailData.trueNetProfit,
      isProfitable: emailData.trueNetProfit > 0,
    });

    if (isTest) {
      // Test mode - don't actually send
      return NextResponse.json({
        success: true,
        message: 'Test mode - email not sent',
        data: emailData,
        recipients: EMAIL_RECIPIENTS,
      });
    }

    // Send the email
    const result = await sendDailySummaryEmail(emailData, EMAIL_RECIPIENTS);

    if (!result.success) {
      console.error('Failed to send daily summary email:', result.error);
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Daily summary email sent to ${EMAIL_RECIPIENTS.join(', ')}`,
      data: {
        date: targetDate,
        revenue: emailData.totalRevenue,
        netProfit: emailData.trueNetProfit,
        isProfitable: emailData.trueNetProfit > 0,
      },
    });

  } catch (error) {
    console.error('Error generating daily summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing in browser
export async function GET(request: NextRequest) {
  return POST(request);
}
