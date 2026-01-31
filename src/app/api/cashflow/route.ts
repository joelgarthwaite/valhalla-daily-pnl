import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { subDays, format, addDays, startOfDay } from 'date-fns';
import {
  calculateBurnRate,
  analyzeBalanceTrend,
  calculateRunway,
  generateAlerts,
  summarizeCashFlows,
  type CashPosition,
  type BrandBalance,
  type BalanceSnapshot,
  type CashHistory,
  type BurnMetrics,
  type RunwayMetrics,
  type CashAlert,
  type CashFlowSummary,
} from '@/lib/cashflow/calculations';
import {
  estimatePlatformPayouts,
  generateOpexEvents,
  generatePOPaymentEvents,
  estimateAdPlatformInvoices,
  sortEventsByDate,
  getUpcomingEvents,
  separateEventsByFlow,
  type CashEvent,
} from '@/lib/cashflow/events';
import {
  DEFAULT_SCENARIOS,
  calculateAllScenarios,
  getScenarioChartData,
  compareScenarios,
  type ScenarioProjection,
  type ScenarioChartPoint,
  type ScenarioComparison,
} from '@/lib/cashflow/scenarios';

export const maxDuration = 60;

// Response type
interface CashFlowResponse {
  currentPosition: CashPosition;
  history: CashHistory;
  burnMetrics: BurnMetrics;
  runway: RunwayMetrics;
  inflows: {
    total: number;
    bySource: CashFlowSummary['inflowsBySource'];
    events: CashEvent[];
  };
  outflows: {
    total: number;
    byCategory: CashFlowSummary['outflowsByCategory'];
    events: CashEvent[];
  };
  projections: {
    scenarios: ScenarioProjection[];
    chartData: ScenarioChartPoint[];
    comparison: ScenarioComparison;
  };
  alerts: CashAlert[];
  metadata: {
    lastUpdated: string;
    historyDays: number;
    forecastDays: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandCode = searchParams.get('brand') || 'all';
    const forecastDays = parseInt(searchParams.get('forecastDays') || '30', 10);
    const historyDays = parseInt(searchParams.get('historyDays') || '30', 10);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Verify the user is authenticated
    const cookieStore = await cookies();
    const authClient = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role for fast queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get brand ID if filtering
    let brandId: string | null = null;
    if (brandCode && brandCode !== 'all') {
      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('code', brandCode)
        .single();
      brandId = brand?.id || null;
    }

    const today = startOfDay(new Date());
    const historyStartDate = format(subDays(today, historyDays), 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    // Fetch all data in parallel
    const [
      xeroBalancesResult,
      balanceSnapshotsResult,
      dailyPnlResult,
      opexResult,
      purchaseOrdersResult,
      adSpendResult,
      payoutSchedulesResult,
      brandsResult,
      cashEventsResult,
    ] = await Promise.all([
      // Current Xero balances (from xero_connections -> fetch live, or use cached)
      // For now, we'll use a placeholder since live Xero API call is expensive
      // In production, this would come from daily snapshot or live API
      supabase
        .from('cash_balance_snapshots')
        .select('*')
        .eq('snapshot_date', todayStr)
        .order('account_name'),

      // Historical balance snapshots
      supabase
        .from('cash_balance_snapshots')
        .select('snapshot_date, balance')
        .gte('snapshot_date', historyStartDate)
        .lte('snapshot_date', todayStr)
        .order('snapshot_date', { ascending: true }),

      // Recent daily P&L for revenue estimates
      supabase
        .from('daily_pnl')
        .select('date, revenue, shopify_revenue, etsy_revenue')
        .gte('date', historyStartDate)
        .lte('date', todayStr)
        .order('date', { ascending: true }),

      // Operating expenses
      supabase
        .from('operating_expenses')
        .select('*')
        .eq('is_active', true),

      // Unpaid purchase orders
      supabase
        .from('purchase_orders')
        .select('id, brand_id, po_number, total_amount, payment_due_date, payment_status, status, suppliers(name)')
        .in('status', ['sent', 'confirmed', 'partial'])
        .neq('payment_status', 'paid'),

      // Recent ad spend for estimates
      supabase
        .from('ad_spend')
        .select('date, platform, spend')
        .gte('date', historyStartDate)
        .lte('date', todayStr),

      // Platform payout schedules
      supabase
        .from('platform_payout_schedules')
        .select('*'),

      // Brands
      supabase
        .from('brands')
        .select('id, name, code'),

      // Manual cash events
      supabase
        .from('cash_events')
        .select('*')
        .gte('event_date', todayStr)
        .lte('event_date', format(addDays(today, forecastDays), 'yyyy-MM-dd'))
        .in('status', ['forecast', 'confirmed']),
    ]);

    // Process current position from snapshots or placeholder
    const todaySnapshots = xeroBalancesResult.data || [];
    let currentPosition: CashPosition;

    if (todaySnapshots.length > 0) {
      // Build position from today's snapshots
      const accounts: BrandBalance[] = todaySnapshots.map(s => ({
        brand: s.brand_id || 'SHARED',
        brandName: brandsResult.data?.find(b => b.id === s.brand_id)?.name || 'Shared',
        accountName: s.account_name,
        accountType: s.account_type as 'BANK' | 'CREDITCARD',
        balance: parseFloat(s.balance),
        currency: s.currency || 'GBP',
      }));

      const totalCash = accounts
        .filter(a => a.accountType === 'BANK')
        .reduce((sum, a) => sum + a.balance, 0);
      const totalCredit = accounts
        .filter(a => a.accountType === 'CREDITCARD')
        .reduce((sum, a) => sum + Math.abs(a.balance), 0);

      currentPosition = {
        totalCash,
        totalCredit,
        netPosition: totalCash - totalCredit,
        accounts,
      };
    } else {
      // Placeholder data - in production, this would trigger a Xero sync
      currentPosition = {
        totalCash: 0,
        totalCredit: 0,
        netPosition: 0,
        accounts: [],
      };
    }

    // Process balance history
    const balanceSnapshots: BalanceSnapshot[] = (balanceSnapshotsResult.data || [])
      .reduce((acc: BalanceSnapshot[], snap) => {
        // Aggregate all accounts per date
        const existing = acc.find(s => s.date === snap.snapshot_date);
        if (existing) {
          existing.balance += parseFloat(snap.balance);
        } else {
          acc.push({
            date: snap.snapshot_date,
            balance: parseFloat(snap.balance),
          });
        }
        return acc;
      }, []);

    const history = analyzeBalanceTrend(balanceSnapshots);

    // Calculate burn rate and runway
    const burnMetrics = calculateBurnRate(balanceSnapshots, historyDays);
    const runway = calculateRunway(currentPosition.netPosition, burnMetrics);

    // Generate cash events from various sources
    const allEvents: CashEvent[] = [];

    // Daily revenue for payout estimates
    const dailyRevenue = (dailyPnlResult.data || []).map(d => ({
      date: d.date,
      shopify: parseFloat(d.shopify_revenue) || 0,
      etsy: parseFloat(d.etsy_revenue) || 0,
    }));

    // Platform payouts
    const payoutSchedules = (payoutSchedulesResult.data || []).map(s => ({
      platform: s.platform as 'shopify' | 'etsy',
      frequency: s.payout_frequency as 'daily' | 'weekly' | 'biweekly' | 'monthly',
      delayDays: s.payout_delay_days || 2,
    }));
    allEvents.push(...estimatePlatformPayouts(dailyRevenue, payoutSchedules, forecastDays));

    // OPEX payments
    const opexExpenses = (opexResult.data || []).map(e => ({
      id: e.id,
      brand_id: e.brand_id,
      name: e.name,
      category: e.category,
      amount: parseFloat(e.amount),
      frequency: e.frequency as 'monthly' | 'quarterly' | 'annual' | 'one_time',
      payment_day: e.payment_day,
      start_date: e.start_date,
      end_date: e.end_date,
      expense_date: e.expense_date,
    }));
    allEvents.push(...generateOpexEvents(opexExpenses, forecastDays));

    // PO payments
    const purchaseOrders = (purchaseOrdersResult.data || []).map(po => {
      // Supabase join can return object or array depending on relationship
      const supplierData = po.suppliers as unknown;
      let supplierName = 'Unknown Supplier';
      if (Array.isArray(supplierData) && supplierData.length > 0) {
        supplierName = (supplierData[0] as { name?: string })?.name || 'Unknown Supplier';
      } else if (supplierData && typeof supplierData === 'object') {
        supplierName = (supplierData as { name?: string })?.name || 'Unknown Supplier';
      }

      return {
        id: po.id,
        brand_id: po.brand_id,
        po_number: po.po_number,
        supplier_name: supplierName,
        total_amount: parseFloat(po.total_amount),
        payment_due_date: po.payment_due_date,
        payment_status: po.payment_status as 'unpaid' | 'partial' | 'paid',
        status: po.status,
      };
    });
    allEvents.push(...generatePOPaymentEvents(purchaseOrders));

    // Ad platform invoices
    const adSpendByPlatform = (adSpendResult.data || []).reduce((acc, s) => {
      const date = s.date;
      if (!acc[date]) acc[date] = { date, meta: 0, google: 0, microsoft: 0 };
      if (s.platform === 'meta') acc[date].meta += parseFloat(s.spend);
      if (s.platform === 'google') acc[date].google += parseFloat(s.spend);
      if (s.platform === 'microsoft') acc[date].microsoft += parseFloat(s.spend);
      return acc;
    }, {} as Record<string, { date: string; meta: number; google: number; microsoft: number }>);
    allEvents.push(...estimateAdPlatformInvoices(Object.values(adSpendByPlatform), 3));

    // Add manual events
    const manualEvents: CashEvent[] = (cashEventsResult.data || []).map(e => ({
      id: e.id,
      brand_id: e.brand_id,
      event_date: e.event_date,
      event_type: e.event_type,
      amount: parseFloat(e.amount),
      description: e.description || '',
      reference_type: e.reference_type,
      reference_id: e.reference_id,
      probability_pct: parseFloat(e.probability_pct) || 100,
      status: e.status,
      is_recurring: e.is_recurring || false,
      notes: e.notes,
    }));
    allEvents.push(...manualEvents);

    // Build brand lookup map
    const brandMap = new Map<string, string>();
    (brandsResult.data || []).forEach(b => {
      brandMap.set(b.id, b.code);
    });

    // Add brand_code to all events
    const eventsWithBrandCode = allEvents.map(event => ({
      ...event,
      brand_code: event.brand_id ? brandMap.get(event.brand_id) || null : null,
    }));

    // Sort and separate events
    const sortedEvents = sortEventsByDate(eventsWithBrandCode);
    const upcomingEvents = getUpcomingEvents(sortedEvents, forecastDays);
    const { inflows, outflows } = separateEventsByFlow(upcomingEvents);

    // Summarize cash flows
    const flowSummary = summarizeCashFlows(upcomingEvents);

    // Calculate weekly averages for scenario projections
    const weeklyInflows = (flowSummary.totalInflows / forecastDays) * 7;
    const weeklyOutflows = (flowSummary.totalOutflows / forecastDays) * 7;

    // Generate scenario projections
    const scenarioProjections = calculateAllScenarios(
      DEFAULT_SCENARIOS,
      currentPosition.netPosition,
      weeklyInflows,
      weeklyOutflows,
      12  // 12 weeks
    );
    const chartData = getScenarioChartData(scenarioProjections);
    const comparison = compareScenarios(scenarioProjections);

    // Generate alerts
    const largePayments = outflows
      .filter(e => Math.abs(e.amount) >= 2000)
      .slice(0, 5)
      .map(e => ({
        amount: e.amount,
        date: e.event_date,
        description: e.description,
      }));
    const alerts = generateAlerts(currentPosition.netPosition, runway, largePayments);

    const response: CashFlowResponse = {
      currentPosition,
      history,
      burnMetrics,
      runway,
      inflows: {
        total: flowSummary.totalInflows,
        bySource: flowSummary.inflowsBySource,
        events: inflows.slice(0, 20),  // Limit to 20 events
      },
      outflows: {
        total: flowSummary.totalOutflows,
        byCategory: flowSummary.outflowsByCategory,
        events: outflows.slice(0, 20),
      },
      projections: {
        scenarios: scenarioProjections,
        chartData,
        comparison,
      },
      alerts,
      metadata: {
        lastUpdated: new Date().toISOString(),
        historyDays,
        forecastDays,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Cash flow API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
