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
  // Headline metrics
  ttmRevenue: number;          // Trailing 12 months
  ttmGP1: number;
  ttmGP3: number;
  ttmTrueNetProfit: number;
  annualRunRate: number;       // Based on last 3 months
  revenueGrowthYoY: number;

  // Margins
  grossMarginPct: number;      // GP1 / Revenue
  contributionMarginPct: number; // GP3 / Revenue
  netMarginPct: number;        // True Net Profit / Revenue

  // Customer metrics
  totalCustomers: number;
  repeatPurchaseRate: number;
  avgOrdersPerCustomer: number;
  avgCustomerLifetimeValue: number;
  customerAcquisitionCost: number;
  ltvCacRatio: number;

  // Efficiency
  ttmAdSpend: number;
  blendedCac: number;          // Ad spend / new customers
  mer: number;                 // Marketing efficiency ratio
  paybackPeriodMonths: number;

  // Monthly data
  monthlyMetrics: MonthlyMetrics[];

  // Cohort data
  cohorts: CustomerCohort[];

  // Data quality
  dataStartDate: string;
  dataEndDate: string;
  monthsOfData: number;
}

function getMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get('brand') || 'all';

    // Get the date range - we need at least 24 months for YoY comparisons
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);

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

    // Fetch all orders for customer analysis
    let ordersQuery = supabase
      .from('orders')
      .select('id, customer_email, order_date, subtotal, brand_id')
      .gte('order_date', startDate.toISOString().split('T')[0])
      .lte('order_date', endDate.toISOString().split('T')[0])
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

    // Fetch daily P&L data for financial metrics
    let pnlQuery = supabase
      .from('daily_pnl')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
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
          case 'one_time': return total; // One-time not included in monthly
          default: return total;
        }
      }, 0);
    };

    const monthlyOpex = calculateMonthlyOpex();

    // Build customer first order map
    const customerFirstOrder: Record<string, { date: string; month: string }> = {};
    const customerOrders: Record<string, { count: number; totalRevenue: number }> = {};

    (orders || []).forEach((order) => {
      const email = order.customer_email?.toLowerCase();
      if (!email) return;

      const orderMonth = order.order_date.substring(0, 7);

      if (!customerFirstOrder[email] || order.order_date < customerFirstOrder[email].date) {
        customerFirstOrder[email] = { date: order.order_date, month: orderMonth };
      }

      if (!customerOrders[email]) {
        customerOrders[email] = { count: 0, totalRevenue: 0 };
      }
      customerOrders[email].count++;
      customerOrders[email].totalRevenue += order.subtotal || 0;
    });

    // Aggregate P&L by month
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

    // Aggregate customers by month
    const monthlyCustomers: Record<string, Set<string>> = {};
    const monthlyNewCustomers: Record<string, Set<string>> = {};

    (orders || []).forEach((order) => {
      const email = order.customer_email?.toLowerCase();
      if (!email) return;

      const orderMonth = order.order_date.substring(0, 7);

      if (!monthlyCustomers[orderMonth]) {
        monthlyCustomers[orderMonth] = new Set();
      }
      monthlyCustomers[orderMonth].add(email);

      // Check if this is a new customer (first order in this month)
      if (customerFirstOrder[email]?.month === orderMonth) {
        if (!monthlyNewCustomers[orderMonth]) {
          monthlyNewCustomers[orderMonth] = new Set();
        }
        monthlyNewCustomers[orderMonth].add(email);
      }
    });

    // Build monthly metrics array
    const months = Object.keys(monthlyPnL).sort();
    const monthlyMetrics: MonthlyMetrics[] = months.map((month, index) => {
      const pnl = monthlyPnL[month];
      const uniqueCustomers = monthlyCustomers[month]?.size || 0;
      const newCustomers = monthlyNewCustomers[month]?.size || 0;
      const repeatCustomers = uniqueCustomers - newCustomers;
      const trueNetProfit = pnl.gp3 - monthlyOpex;

      // Calculate MoM growth
      let revenueGrowthMoM: number | null = null;
      if (index > 0) {
        const prevMonth = months[index - 1];
        const prevRevenue = monthlyPnL[prevMonth]?.revenue || 0;
        if (prevRevenue > 0) {
          revenueGrowthMoM = ((pnl.revenue - prevRevenue) / prevRevenue) * 100;
        }
      }

      // Calculate YoY growth
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

    // Get trailing 12 months data
    const last12Months = monthlyMetrics.slice(-12);
    const last3Months = monthlyMetrics.slice(-3);

    // Calculate TTM totals
    const ttmRevenue = last12Months.reduce((sum, m) => sum + m.revenue, 0);
    const ttmGP1 = last12Months.reduce((sum, m) => sum + m.gp1, 0);
    const ttmGP3 = last12Months.reduce((sum, m) => sum + m.gp3, 0);
    const ttmOpex = monthlyOpex * 12;
    const ttmTrueNetProfit = ttmGP3 - ttmOpex;
    const ttmAdSpend = last12Months.reduce((sum, m) => sum + m.adSpend, 0);

    // Annual run rate based on last 3 months
    const last3Revenue = last3Months.reduce((sum, m) => sum + m.revenue, 0);
    const annualRunRate = (last3Revenue / 3) * 12;

    // YoY revenue growth (compare last 12 months to prior 12 months)
    const prior12Months = monthlyMetrics.slice(-24, -12);
    const prior12Revenue = prior12Months.reduce((sum, m) => sum + m.revenue, 0);
    const revenueGrowthYoY = prior12Revenue > 0
      ? ((ttmRevenue - prior12Revenue) / prior12Revenue) * 100
      : 0;

    // Customer metrics
    const totalCustomers = Object.keys(customerOrders).length;
    const customersWithRepeat = Object.values(customerOrders).filter(c => c.count > 1).length;
    const repeatPurchaseRate = totalCustomers > 0 ? (customersWithRepeat / totalCustomers) * 100 : 0;
    const totalOrdersFromCustomers = Object.values(customerOrders).reduce((sum, c) => sum + c.count, 0);
    const avgOrdersPerCustomer = totalCustomers > 0 ? totalOrdersFromCustomers / totalCustomers : 0;
    const totalRevenueFromCustomers = Object.values(customerOrders).reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgCustomerLifetimeValue = totalCustomers > 0 ? totalRevenueFromCustomers / totalCustomers : 0;

    // CAC calculation (last 12 months ad spend / new customers acquired)
    const ttmNewCustomers = last12Months.reduce((sum, m) => sum + m.newCustomers, 0);
    const customerAcquisitionCost = ttmNewCustomers > 0 ? ttmAdSpend / ttmNewCustomers : 0;
    const ltvCacRatio = customerAcquisitionCost > 0 ? avgCustomerLifetimeValue / customerAcquisitionCost : 0;

    // Marketing efficiency
    const mer = ttmAdSpend > 0 ? ttmRevenue / ttmAdSpend : 0;

    // Payback period (months to recover CAC)
    // Monthly revenue per customer = LTV / avg customer lifespan in months
    // Simplified: assume 12 month average lifespan
    const monthlyRevenuePerCustomer = avgCustomerLifetimeValue / 12;
    const grossMarginPct = ttmRevenue > 0 ? (ttmGP1 / ttmRevenue) * 100 : 0;
    const monthlyGPPerCustomer = monthlyRevenuePerCustomer * (grossMarginPct / 100);
    const paybackPeriodMonths = monthlyGPPerCustomer > 0 ? customerAcquisitionCost / monthlyGPPerCustomer : 0;

    // Build cohort data
    const cohortMap: Record<string, {
      customers: Set<string>;
      totalRevenue: number;
      totalOrders: number;
    }> = {};

    Object.entries(customerFirstOrder).forEach(([email, { month }]) => {
      if (!cohortMap[month]) {
        cohortMap[month] = { customers: new Set(), totalRevenue: 0, totalOrders: 0 };
      }
      cohortMap[month].customers.add(email);
      cohortMap[month].totalRevenue += customerOrders[email]?.totalRevenue || 0;
      cohortMap[month].totalOrders += customerOrders[email]?.count || 0;
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
      .sort((a, b) => a.firstOrderMonth.localeCompare(b.firstOrderMonth))
      .slice(-12); // Last 12 cohorts

    const metrics: InvestorMetrics = {
      ttmRevenue,
      ttmGP1,
      ttmGP3,
      ttmTrueNetProfit,
      annualRunRate,
      revenueGrowthYoY,

      grossMarginPct,
      contributionMarginPct: ttmRevenue > 0 ? (ttmGP3 / ttmRevenue) * 100 : 0,
      netMarginPct: ttmRevenue > 0 ? (ttmTrueNetProfit / ttmRevenue) * 100 : 0,

      totalCustomers,
      repeatPurchaseRate,
      avgOrdersPerCustomer,
      avgCustomerLifetimeValue,
      customerAcquisitionCost,
      ltvCacRatio,

      ttmAdSpend,
      blendedCac: customerAcquisitionCost,
      mer,
      paybackPeriodMonths,

      monthlyMetrics,
      cohorts,

      dataStartDate: months[0] || '',
      dataEndDate: months[months.length - 1] || '',
      monthsOfData: months.length,
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
