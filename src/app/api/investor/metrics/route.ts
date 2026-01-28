import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MonthlyMetrics {
  month: string; // YYYY-MM
  monthLabel: string; // "Jan 2025"
  revenue: number;
  orders: number;
  uniqueCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  cogs: number;
  gp1: number;
  gp2: number;
  gp3: number;
  trueNetProfit: number;
  adSpend: number;
  grossMarginPct: number;
  netMarginPct: number;
  avgOrderValue: number;
  revenueGrowthMoM: number | null;
  revenueGrowthYoY: number | null;
}

interface CustomerCohort {
  firstOrderMonth: string;
  customersAcquired: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrdersPerCustomer: number;
  avgRevenuePerCustomer: number;
}

interface InvestorMetrics {
  // Headline metrics (ALWAYS TTM - industry standard)
  ttmRevenue: number;
  ttmGP1: number;
  ttmGP3: number;
  ttmTrueNetProfit: number;
  annualRunRate: number;
  revenueGrowthYoY: number;

  // Margins (TTM)
  grossMarginPct: number;
  contributionMarginPct: number;
  netMarginPct: number;

  // Customer metrics (all time)
  totalCustomers: number;
  repeatPurchaseRate: number;
  avgOrdersPerCustomer: number;
  avgCustomerLifetimeValue: number;
  customerAcquisitionCost: number;
  ltvCacRatio: number;

  // Efficiency (TTM)
  ttmAdSpend: number;
  blendedCac: number;
  mer: number;
  paybackPeriodMonths: number;

  // Filtered data for charts/tables
  monthlyMetrics: MonthlyMetrics[];
  cohorts: CustomerCohort[];

  // Data range info
  firstSaleDate: string;
  lastSaleDate: string;
  availableYears: number[];

  // Current filter applied
  filterPeriod: string;
  filterStartDate: string;
  filterEndDate: string;
  monthsInFilter: number;
}

type PeriodFilter = 'all' | 'ttm' | 'ytd' | 'year';

function getMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function getDateRange(period: PeriodFilter, year?: number): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start: Date;

  switch (period) {
    case 'ttm':
      start = new Date(now);
      start.setMonth(start.getMonth() - 12);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'year':
      if (year) {
        start = new Date(year, 0, 1);
        return { start, end: new Date(year, 11, 31) };
      }
      start = new Date(2020, 0, 1); // Fallback to all
      break;
    case 'all':
    default:
      start = new Date(2020, 0, 1); // Far back date, will be overridden by actual first sale
      break;
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get('brand') || 'all';
    const period = (searchParams.get('period') || 'all') as PeriodFilter;
    const yearParam = searchParams.get('year');
    const selectedYear = yearParam ? parseInt(yearParam) : undefined;

    // Build brand filter
    let brandFilter = '';
    if (brand !== 'all') {
      const { data: brandData } = await supabase
        .from('brands')
        .select('id')
        .eq('code', brand)
        .single();

      if (brandData) {
        brandFilter = brandData.id;
      }
    }

    // First, get the date range of all data to find first sale
    let dateRangeQuery = supabase
      .from('daily_pnl')
      .select('date')
      .order('date', { ascending: true })
      .limit(1);

    if (brandFilter) {
      dateRangeQuery = dateRangeQuery.eq('brand_id', brandFilter);
    }

    const { data: firstDateData } = await dateRangeQuery;
    const firstSaleDate = firstDateData?.[0]?.date || new Date().toISOString().split('T')[0];

    // Get last sale date
    let lastDateQuery = supabase
      .from('daily_pnl')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);

    if (brandFilter) {
      lastDateQuery = lastDateQuery.eq('brand_id', brandFilter);
    }

    const { data: lastDateData } = await lastDateQuery;
    const lastSaleDate = lastDateData?.[0]?.date || new Date().toISOString().split('T')[0];

    // Calculate available years
    const firstYear = parseInt(firstSaleDate.substring(0, 4));
    const lastYear = parseInt(lastSaleDate.substring(0, 4));
    const availableYears: number[] = [];
    for (let y = lastYear; y >= firstYear; y--) {
      availableYears.push(y);
    }

    // For TTM headline calculations, always fetch last 24 months
    const ttmEnd = new Date();
    const ttmStart = new Date();
    ttmStart.setMonth(ttmStart.getMonth() - 24);

    // For filtered display data
    const filterRange = getDateRange(period, selectedYear);
    const filterStart = period === 'all' ? new Date(firstSaleDate) : filterRange.start;
    const filterEnd = filterRange.end;

    // Fetch ALL orders for customer analysis (need full history for LTV calc)
    let ordersQuery = supabase
      .from('orders')
      .select('id, customer_email, customer_name, order_date, subtotal, brand_id, raw_data')
      .gte('order_date', firstSaleDate)
      .is('excluded_at', null)
      .order('order_date', { ascending: true });

    if (brandFilter) {
      ordersQuery = ordersQuery.eq('brand_id', brandFilter);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Fetch ALL daily P&L data
    let pnlQuery = supabase
      .from('daily_pnl')
      .select('*')
      .gte('date', firstSaleDate)
      .order('date', { ascending: true });

    if (brandFilter) {
      pnlQuery = pnlQuery.eq('brand_id', brandFilter);
    }

    const { data: pnlData, error: pnlError } = await pnlQuery;

    if (pnlError) {
      console.error('P&L fetch error:', pnlError);
      return NextResponse.json({ error: 'Failed to fetch P&L data' }, { status: 500 });
    }

    // Fetch OPEX for true net profit calculations
    let opexQuery = supabase
      .from('operating_expenses')
      .select('*')
      .eq('is_active', true);

    if (brandFilter) {
      opexQuery = opexQuery.or(`brand_id.eq.${brandFilter},brand_id.is.null`);
    }

    const { data: opexData } = await opexQuery;

    // Calculate monthly OPEX
    const calculateMonthlyOpex = (): number => {
      if (!opexData || opexData.length === 0) return 0;

      return opexData.reduce((total, expense) => {
        const amount = expense.amount || 0;
        switch (expense.frequency) {
          case 'monthly': return total + amount;
          case 'quarterly': return total + (amount / 3);
          case 'annual': return total + (amount / 12);
          case 'one_time': return total;
          default: return total;
        }
      }, 0);
    };

    const monthlyOpex = calculateMonthlyOpex();

    // Helper to extract customer identifier from order
    const getCustomerIdentifier = (order: {
      customer_email?: string | null;
      customer_name?: string | null;
      raw_data?: Record<string, unknown> | null;
    }): string | null => {
      if (order.customer_email) {
        return order.customer_email.toLowerCase();
      }

      const rawData = order.raw_data;
      if (rawData) {
        if (typeof rawData.email === 'string') {
          return rawData.email.toLowerCase();
        }
        const customer = rawData.customer as Record<string, unknown> | undefined;
        if (customer && typeof customer.email === 'string') {
          return customer.email.toLowerCase();
        }
        if (typeof rawData.buyer_email === 'string') {
          return rawData.buyer_email.toLowerCase();
        }
      }

      if (order.customer_name) {
        return `name:${order.customer_name.toLowerCase().replace(/\s+/g, '_')}`;
      }

      return null;
    };

    // Build customer maps (ALL TIME for LTV calculations)
    const customerFirstOrder: Record<string, { date: string; month: string }> = {};
    const customerOrders: Record<string, { count: number; totalRevenue: number }> = {};

    (orders || []).forEach((order) => {
      const customerId = getCustomerIdentifier(order);
      if (!customerId) return;

      const orderMonth = order.order_date.substring(0, 7);

      if (!customerFirstOrder[customerId] || order.order_date < customerFirstOrder[customerId].date) {
        customerFirstOrder[customerId] = { date: order.order_date, month: orderMonth };
      }

      if (!customerOrders[customerId]) {
        customerOrders[customerId] = { count: 0, totalRevenue: 0 };
      }
      customerOrders[customerId].count++;
      customerOrders[customerId].totalRevenue += order.subtotal || 0;
    });

    // Aggregate P&L by month (ALL data)
    const monthlyPnL: Record<string, {
      revenue: number;
      orders: number;
      cogs: number;
      gp1: number;
      gp2: number;
      gp3: number;
      adSpend: number;
    }> = {};

    (pnlData || []).forEach((day) => {
      const month = day.date.substring(0, 7);

      if (!monthlyPnL[month]) {
        monthlyPnL[month] = {
          revenue: 0,
          orders: 0,
          cogs: 0,
          gp1: 0,
          gp2: 0,
          gp3: 0,
          adSpend: 0,
        };
      }

      monthlyPnL[month].revenue += day.total_revenue || 0;
      monthlyPnL[month].orders += day.total_orders || 0;
      monthlyPnL[month].cogs += day.cogs_estimated || 0;
      monthlyPnL[month].gp1 += day.gp1 || 0;
      monthlyPnL[month].gp2 += day.gp2 || 0;
      monthlyPnL[month].gp3 += day.gp3 || 0;
      monthlyPnL[month].adSpend += day.total_ad_spend || 0;
    });

    // Calculate GP1/GP2/GP3 from revenue and cogs if database values are 0
    Object.keys(monthlyPnL).forEach((month) => {
      const m = monthlyPnL[month];
      if (m.gp1 === 0 && m.revenue > 0) {
        m.gp1 = m.revenue - m.cogs;
      }
      if (m.gp2 === 0 && m.gp1 > 0) {
        const operationalCosts = m.revenue * 0.11;
        m.gp2 = m.gp1 - operationalCosts;
      }
      if (m.gp3 === 0 && m.gp2 > 0) {
        m.gp3 = m.gp2 - m.adSpend;
      }
    });

    // Aggregate customers by month
    const monthlyCustomers: Record<string, Set<string>> = {};
    const monthlyNewCustomers: Record<string, Set<string>> = {};

    (orders || []).forEach((order) => {
      const customerId = getCustomerIdentifier(order);
      if (!customerId) return;

      const orderMonth = order.order_date.substring(0, 7);

      if (!monthlyCustomers[orderMonth]) {
        monthlyCustomers[orderMonth] = new Set();
      }
      monthlyCustomers[orderMonth].add(customerId);

      if (customerFirstOrder[customerId]?.month === orderMonth) {
        if (!monthlyNewCustomers[orderMonth]) {
          monthlyNewCustomers[orderMonth] = new Set();
        }
        monthlyNewCustomers[orderMonth].add(customerId);
      }
    });

    // Build ALL monthly metrics
    const allMonths = Object.keys(monthlyPnL).sort();
    const allMonthlyMetrics: MonthlyMetrics[] = allMonths.map((month, index) => {
      const pnl = monthlyPnL[month];
      const uniqueCustomers = monthlyCustomers[month]?.size || 0;
      const newCustomers = monthlyNewCustomers[month]?.size || 0;
      const repeatCustomers = uniqueCustomers - newCustomers;
      const trueNetProfit = pnl.gp3 - monthlyOpex;

      let revenueGrowthMoM: number | null = null;
      if (index > 0) {
        const prevMonth = allMonths[index - 1];
        const prevRevenue = monthlyPnL[prevMonth]?.revenue || 0;
        if (prevRevenue > 0) {
          revenueGrowthMoM = ((pnl.revenue - prevRevenue) / prevRevenue) * 100;
        }
      }

      let revenueGrowthYoY: number | null = null;
      const [year, monthNum] = month.split('-');
      const lastYearMonth = `${parseInt(year) - 1}-${monthNum}`;
      if (monthlyPnL[lastYearMonth]) {
        const lastYearRevenue = monthlyPnL[lastYearMonth].revenue;
        if (lastYearRevenue > 0) {
          revenueGrowthYoY = ((pnl.revenue - lastYearRevenue) / lastYearRevenue) * 100;
        }
      }

      return {
        month,
        monthLabel: getMonthLabel(month),
        revenue: pnl.revenue,
        orders: pnl.orders,
        uniqueCustomers,
        newCustomers,
        repeatCustomers,
        cogs: pnl.cogs,
        gp1: pnl.gp1,
        gp2: pnl.gp2,
        gp3: pnl.gp3,
        trueNetProfit,
        adSpend: pnl.adSpend,
        grossMarginPct: pnl.revenue > 0 ? (pnl.gp1 / pnl.revenue) * 100 : 0,
        netMarginPct: pnl.revenue > 0 ? (trueNetProfit / pnl.revenue) * 100 : 0,
        avgOrderValue: pnl.orders > 0 ? pnl.revenue / pnl.orders : 0,
        revenueGrowthMoM,
        revenueGrowthYoY,
      };
    });

    // Filter monthly metrics based on period selection
    const filterStartStr = filterStart.toISOString().substring(0, 7);
    const filterEndStr = filterEnd.toISOString().substring(0, 7);

    const filteredMonthlyMetrics = allMonthlyMetrics.filter((m) => {
      return m.month >= filterStartStr && m.month <= filterEndStr;
    });

    // Get TTM data (always last 12 months for headline metrics)
    const last12Months = allMonthlyMetrics.slice(-12);
    const last3Months = allMonthlyMetrics.slice(-3);

    // Calculate TTM totals (ALWAYS for headline metrics)
    const ttmRevenue = last12Months.reduce((sum, m) => sum + m.revenue, 0);
    const ttmGP1 = last12Months.reduce((sum, m) => sum + m.gp1, 0);
    const ttmGP3 = last12Months.reduce((sum, m) => sum + m.gp3, 0);
    const ttmOpex = monthlyOpex * 12;
    const ttmTrueNetProfit = ttmGP3 - ttmOpex;
    const ttmAdSpend = last12Months.reduce((sum, m) => sum + m.adSpend, 0);

    // Annual run rate based on last 3 months
    const last3Revenue = last3Months.reduce((sum, m) => sum + m.revenue, 0);
    const annualRunRate = (last3Revenue / 3) * 12;

    // YoY revenue growth
    const prior12Months = allMonthlyMetrics.slice(-24, -12);
    const prior12Revenue = prior12Months.reduce((sum, m) => sum + m.revenue, 0);
    const revenueGrowthYoY = prior12Revenue > 0
      ? ((ttmRevenue - prior12Revenue) / prior12Revenue) * 100
      : 0;

    // Customer metrics (ALL TIME for accurate LTV)
    const totalCustomers = Object.keys(customerOrders).length;
    const customersWithRepeat = Object.values(customerOrders).filter(c => c.count > 1).length;
    const repeatPurchaseRate = totalCustomers > 0 ? (customersWithRepeat / totalCustomers) * 100 : 0;
    const totalOrdersFromCustomers = Object.values(customerOrders).reduce((sum, c) => sum + c.count, 0);
    const avgOrdersPerCustomer = totalCustomers > 0 ? totalOrdersFromCustomers / totalCustomers : 0;
    const totalRevenueFromCustomers = Object.values(customerOrders).reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgCustomerLifetimeValue = totalCustomers > 0 ? totalRevenueFromCustomers / totalCustomers : 0;

    // CAC calculation (TTM)
    const ttmNewCustomers = last12Months.reduce((sum, m) => sum + m.newCustomers, 0);
    const customerAcquisitionCost = ttmNewCustomers > 0 ? ttmAdSpend / ttmNewCustomers : 0;
    const ltvCacRatio = customerAcquisitionCost > 0 ? avgCustomerLifetimeValue / customerAcquisitionCost : 0;

    // Marketing efficiency (TTM)
    const mer = ttmAdSpend > 0 ? ttmRevenue / ttmAdSpend : 0;

    // Payback period
    const monthlyRevenuePerCustomer = avgCustomerLifetimeValue / 12;
    const grossMarginPct = ttmRevenue > 0 ? (ttmGP1 / ttmRevenue) * 100 : 0;
    const monthlyGPPerCustomer = monthlyRevenuePerCustomer * (grossMarginPct / 100);
    const paybackPeriodMonths = monthlyGPPerCustomer > 0 ? customerAcquisitionCost / monthlyGPPerCustomer : 0;

    // Build filtered cohort data
    const cohortMap: Record<string, {
      customers: Set<string>;
      totalRevenue: number;
      totalOrders: number;
    }> = {};

    Object.entries(customerFirstOrder).forEach(([customerId, { month }]) => {
      // Only include cohorts within filter range
      if (month >= filterStartStr && month <= filterEndStr) {
        if (!cohortMap[month]) {
          cohortMap[month] = { customers: new Set(), totalRevenue: 0, totalOrders: 0 };
        }
        cohortMap[month].customers.add(customerId);
        cohortMap[month].totalRevenue += customerOrders[customerId]?.totalRevenue || 0;
        cohortMap[month].totalOrders += customerOrders[customerId]?.count || 0;
      }
    });

    const cohorts: CustomerCohort[] = Object.entries(cohortMap)
      .map(([month, data]) => ({
        firstOrderMonth: month,
        customersAcquired: data.customers.size,
        totalRevenue: data.totalRevenue,
        totalOrders: data.totalOrders,
        avgOrdersPerCustomer: data.customers.size > 0 ? data.totalOrders / data.customers.size : 0,
        avgRevenuePerCustomer: data.customers.size > 0 ? data.totalRevenue / data.customers.size : 0,
      }))
      .sort((a, b) => a.firstOrderMonth.localeCompare(b.firstOrderMonth));

    const metrics: InvestorMetrics = {
      // Always TTM for headline metrics
      ttmRevenue,
      ttmGP1,
      ttmGP3,
      ttmTrueNetProfit,
      annualRunRate,
      revenueGrowthYoY,

      grossMarginPct,
      contributionMarginPct: ttmRevenue > 0 ? (ttmGP3 / ttmRevenue) * 100 : 0,
      netMarginPct: ttmRevenue > 0 ? (ttmTrueNetProfit / ttmRevenue) * 100 : 0,

      // All-time customer metrics
      totalCustomers,
      repeatPurchaseRate,
      avgOrdersPerCustomer,
      avgCustomerLifetimeValue,
      customerAcquisitionCost,
      ltvCacRatio,

      // TTM efficiency metrics
      ttmAdSpend,
      blendedCac: customerAcquisitionCost,
      mer,
      paybackPeriodMonths,

      // Filtered data for display
      monthlyMetrics: filteredMonthlyMetrics,
      cohorts,

      // Data info
      firstSaleDate,
      lastSaleDate,
      availableYears,

      // Current filter
      filterPeriod: period === 'year' && selectedYear ? `${selectedYear}` : period,
      filterStartDate: filterStartStr,
      filterEndDate: filterEndStr,
      monthsInFilter: filteredMonthlyMetrics.length,
    };

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Error calculating investor metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate metrics' },
      { status: 500 }
    );
  }
}
