'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import type { BrandFilter } from '@/types';

type PeriodFilter = 'all' | 'ttm' | 'ytd' | 'year';

interface InvestorMetricsData {
  ttmRevenue: number;
  ttmGP1: number;
  ttmGP3: number;
  ttmTrueNetProfit: number;
  annualRunRate: number;
  revenueGrowthYoY: number;
  grossMarginPct: number;
  contributionMarginPct: number;
  netMarginPct: number;
  totalCustomers: number;
  repeatPurchaseRate: number;
  avgOrdersPerCustomer: number;
  avgCustomerLifetimeValue: number;
  customerAcquisitionCost: number;
  ltvCacRatio: number;
  ttmAdSpend: number;
  blendedCac: number;
  mer: number;
  paybackPeriodMonths: number;
  monthlyMetrics: Array<{
    month: string;
    monthLabel: string;
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
  }>;
  cohorts: Array<{
    firstOrderMonth: string;
    customersAcquired: number;
    totalRevenue: number;
    totalOrders: number;
    avgOrdersPerCustomer: number;
    avgRevenuePerCustomer: number;
  }>;
  firstSaleDate: string;
  lastSaleDate: string;
  availableYears: number[];
  filterPeriod: string;
  filterStartDate: string;
  filterEndDate: string;
  monthsInFilter: number;
}

function formatCurrency(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (compact && Math.abs(value) >= 1000) {
    return `£${(value / 1000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

function formatNumber(value: number, decimals = 1): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(decimals)}k`;
  }
  return value.toFixed(decimals);
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number | null;
  changeLabel?: string;
  icon: React.ElementType;
  tooltip?: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}

function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  tooltip,
  highlight = 'neutral',
}: MetricCardProps) {
  const highlightColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          {title}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {change !== undefined && change !== null && (
          <div className={`flex items-center text-xs mt-2 ${highlightColors[highlight]}`}>
            {change >= 0 ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            )}
            {formatPercent(change)} {changeLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvestorMetricsContent() {
  const [metrics, setMetrics] = useState<InvestorMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Refs for debouncing and request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/investor/metrics?brand=${brandFilter}&period=${periodFilter}`;
      if (periodFilter === 'year' && selectedYear) {
        url += `&year=${selectedYear}`;
      }
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data);

      // Set default year if not set and years are available
      if (!selectedYear && data.availableYears?.length > 0) {
        setSelectedYear(data.availableYears[0]);
      }
    } catch (err) {
      // Ignore abort errors (these are expected when cancelling requests)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [brandFilter, periodFilter, selectedYear]);

  useEffect(() => {
    // Cancel any pending debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce the fetch by 300ms to prevent rapid fire requests
    debounceTimeoutRef.current = setTimeout(() => {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      fetchMetrics(abortControllerRef.current.signal);
    }, 300);

    // Cleanup on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [brandFilter, periodFilter, selectedYear, fetchMetrics]);

  const handleExport = () => {
    if (!metrics) return;

    // Create CSV content
    const monthlyHeaders = [
      'Month',
      'Revenue',
      'Orders',
      'Unique Customers',
      'New Customers',
      'Repeat Customers',
      'GP1',
      'GP3',
      'True Net Profit',
      'Ad Spend',
      'Gross Margin %',
      'Net Margin %',
      'AOV',
      'MoM Growth %',
      'YoY Growth %',
    ].join(',');

    const monthlyRows = metrics.monthlyMetrics
      .map((m) =>
        [
          m.monthLabel,
          m.revenue.toFixed(2),
          m.orders,
          m.uniqueCustomers,
          m.newCustomers,
          m.repeatCustomers,
          m.gp1.toFixed(2),
          m.gp3.toFixed(2),
          m.trueNetProfit.toFixed(2),
          m.adSpend.toFixed(2),
          m.grossMarginPct.toFixed(1),
          m.netMarginPct.toFixed(1),
          m.avgOrderValue.toFixed(2),
          m.revenueGrowthMoM?.toFixed(1) ?? '',
          m.revenueGrowthYoY?.toFixed(1) ?? '',
        ].join(',')
      )
      .join('\n');

    const csvContent = `Investor Metrics Export - ${brandFilter === 'all' ? 'All Brands' : brandFilter}\n\nSUMMARY METRICS\nTTM Revenue,${metrics.ttmRevenue.toFixed(2)}\nAnnual Run Rate,${metrics.annualRunRate.toFixed(2)}\nYoY Growth %,${metrics.revenueGrowthYoY.toFixed(1)}\nGross Margin %,${metrics.grossMarginPct.toFixed(1)}\nNet Margin %,${metrics.netMarginPct.toFixed(1)}\n\nCUSTOMER METRICS\nTotal Customers,${metrics.totalCustomers}\nRepeat Purchase Rate %,${metrics.repeatPurchaseRate.toFixed(1)}\nLTV,${metrics.avgCustomerLifetimeValue.toFixed(2)}\nCAC,${metrics.customerAcquisitionCost.toFixed(2)}\nLTV:CAC Ratio,${metrics.ltvCacRatio.toFixed(1)}\n\nMONTHLY BREAKDOWN\n${monthlyHeaders}\n${monthlyRows}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investor-metrics-${brandFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error loading metrics</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Prepare chart data (use filtered data, max 24 months for readability)
  const chartData = metrics?.monthlyMetrics.slice(-24).map((m) => ({
    month: m.monthLabel.replace(' 20', "'"),
    revenue: m.revenue,
    gp3: m.gp3,
    trueNetProfit: m.trueNetProfit,
    grossMargin: m.grossMarginPct,
    netMargin: m.netMarginPct,
    newCustomers: m.newCustomers,
    repeatCustomers: m.repeatCustomers,
  })) || [];

  // Get filter label for display
  const getFilterLabel = () => {
    if (!metrics) return '';
    switch (periodFilter) {
      case 'all':
        return `All Time (${metrics.firstSaleDate} to ${metrics.lastSaleDate})`;
      case 'ttm':
        return 'Trailing 12 Months';
      case 'ytd':
        return `Year to Date (${new Date().getFullYear()})`;
      case 'year':
        return selectedYear?.toString() || '';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investor Metrics</h1>
          <p className="text-sm text-muted-foreground">
            M&A data room metrics - TTM performance and unit economics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Filter Buttons */}
          <div className={`flex rounded-lg border bg-muted p-1 ${isLoading ? 'opacity-50' : ''}`}>
            {[
              { value: 'all', label: 'All Time' },
              { value: 'ttm', label: 'TTM' },
              { value: 'ytd', label: 'YTD' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value as PeriodFilter)}
                disabled={isLoading}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  periodFilter === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                } ${isLoading ? 'cursor-not-allowed' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Year Selector */}
          <Select
            value={periodFilter === 'year' ? selectedYear?.toString() : ''}
            onValueChange={(value) => {
              setPeriodFilter('year');
              setSelectedYear(parseInt(value));
            }}
            disabled={isLoading}
          >
            <SelectTrigger className={`w-[100px] ${isLoading ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {metrics?.availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Brand Filter */}
          <Select
            value={brandFilter}
            onValueChange={(value) => setBrandFilter(value as BrandFilter)}
            disabled={isLoading}
          >
            <SelectTrigger className={`w-[150px] ${isLoading ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="DC">Display Champ</SelectItem>
              <SelectItem value="BI">Bright Ivy</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!metrics || isLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Cancel any pending request and fetch immediately
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
              }
              abortControllerRef.current = new AbortController();
              fetchMetrics(abortControllerRef.current.signal);
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Filter Banner */}
      {metrics && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            <strong>{getFilterLabel()}</strong> — {metrics.filterStartDate} to {metrics.filterEndDate} ({metrics.monthsInFilter} months of data)
          </span>
        </div>
      )}

      {/* Hero Metrics - Financial */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="TTM Revenue"
          value={formatCurrency(metrics?.ttmRevenue || 0, true)}
          subtitle="Trailing 12 months"
          change={metrics?.revenueGrowthYoY}
          changeLabel="YoY"
          icon={DollarSign}
          tooltip="Total revenue over the last 12 months"
          highlight={metrics?.revenueGrowthYoY && metrics.revenueGrowthYoY > 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          title="Annual Run Rate"
          value={formatCurrency(metrics?.annualRunRate || 0, true)}
          subtitle="Based on last 3 months"
          icon={TrendingUp}
          tooltip="Annualized revenue based on recent performance"
        />
        <MetricCard
          title="Gross Margin"
          value={`${metrics?.grossMarginPct.toFixed(1) || 0}%`}
          subtitle="GP1 / Revenue"
          icon={Target}
          tooltip="Gross profit after COGS as % of revenue"
          highlight={metrics?.grossMarginPct && metrics.grossMarginPct > 60 ? 'positive' : 'neutral'}
        />
        <MetricCard
          title="Net Margin"
          value={`${metrics?.netMarginPct.toFixed(1) || 0}%`}
          subtitle="True Net / Revenue"
          icon={Target}
          tooltip="True net profit after all costs including OPEX"
          highlight={metrics?.netMarginPct && metrics.netMarginPct > 10 ? 'positive' : metrics?.netMarginPct && metrics.netMarginPct < 0 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Customer Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Customers"
          value={formatNumber(metrics?.totalCustomers || 0, 0)}
          subtitle="Unique customers"
          icon={Users}
          tooltip="Total unique customers who have ordered"
        />
        <MetricCard
          title="Repeat Rate"
          value={`${metrics?.repeatPurchaseRate.toFixed(1) || 0}%`}
          subtitle="Ordered more than once"
          icon={Repeat}
          tooltip="% of customers who have placed 2+ orders"
          highlight={metrics?.repeatPurchaseRate && metrics.repeatPurchaseRate > 30 ? 'positive' : 'neutral'}
        />
        <MetricCard
          title="LTV"
          value={formatCurrency(metrics?.avgCustomerLifetimeValue || 0)}
          subtitle="Avg lifetime value"
          icon={DollarSign}
          tooltip="Average revenue per customer over their lifetime"
        />
        <MetricCard
          title="CAC"
          value={formatCurrency(metrics?.customerAcquisitionCost || 0)}
          subtitle="Acquisition cost"
          icon={DollarSign}
          tooltip="Ad spend divided by new customers acquired"
        />
        <MetricCard
          title="LTV:CAC"
          value={`${metrics?.ltvCacRatio.toFixed(1) || 0}x`}
          subtitle="Ratio"
          icon={TrendingUp}
          tooltip="Target >3x for healthy unit economics"
          highlight={metrics?.ltvCacRatio && metrics.ltvCacRatio > 3 ? 'positive' : metrics?.ltvCacRatio && metrics.ltvCacRatio < 1 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Marketing Efficiency */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="TTM Ad Spend"
          value={formatCurrency(metrics?.ttmAdSpend || 0, true)}
          subtitle="Total marketing investment"
          icon={DollarSign}
        />
        <MetricCard
          title="MER"
          value={`${metrics?.mer.toFixed(1) || 0}x`}
          subtitle="Marketing Efficiency"
          icon={TrendingUp}
          tooltip="Revenue / Ad Spend - higher is better"
          highlight={metrics?.mer && metrics.mer > 5 ? 'positive' : metrics?.mer && metrics.mer < 2 ? 'negative' : 'neutral'}
        />
        <MetricCard
          title="CAC Payback"
          value={`${metrics?.paybackPeriodMonths.toFixed(1) || 0} mo`}
          subtitle="Months to recover CAC"
          icon={Target}
          tooltip="Based on gross margin contribution"
          highlight={metrics?.paybackPeriodMonths && metrics.paybackPeriodMonths < 6 ? 'positive' : metrics?.paybackPeriodMonths && metrics.paybackPeriodMonths > 12 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue & Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
            <CardDescription>Monthly performance (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      formatCurrency(value as number),
                      name === 'revenue' ? 'Revenue' : name === 'gp3' ? 'GP3' : 'True Net',
                    ]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill="hsl(var(--chart-1))"
                    name="Revenue"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="gp3"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="GP3"
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="trueNetProfit"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    name="True Net"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Margin Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Margin Trend</CardTitle>
            <CardDescription>Gross and net margins (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={['auto', 'auto']}
                  />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      `${(value as number).toFixed(1)}%`,
                      name === 'grossMargin' ? 'Gross Margin' : 'Net Margin',
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="grossMargin"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="Gross Margin"
                  />
                  <Line
                    type="monotone"
                    dataKey="netMargin"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Net Margin"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Acquisition Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Acquisition</CardTitle>
          <CardDescription>New vs repeat customers per month</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip />
                <Legend />
                <Bar
                  dataKey="newCustomers"
                  stackId="a"
                  fill="hsl(var(--chart-1))"
                  name="New Customers"
                />
                <Bar
                  dataKey="repeatCustomers"
                  stackId="a"
                  fill="hsl(var(--chart-2))"
                  name="Repeat Customers"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>Detailed breakdown by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">MoM</TableHead>
                  <TableHead className="text-right">YoY</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">AOV</TableHead>
                  <TableHead className="text-right">GM %</TableHead>
                  <TableHead className="text-right">Ad Spend</TableHead>
                  <TableHead className="text-right">GP3</TableHead>
                  <TableHead className="text-right">Net %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics?.monthlyMetrics.slice(-12).reverse().map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">{m.monthLabel}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.revenue)}</TableCell>
                      <TableCell className={`text-right ${m.revenueGrowthMoM !== null && m.revenueGrowthMoM >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.revenueGrowthMoM !== null ? formatPercent(m.revenueGrowthMoM) : '-'}
                      </TableCell>
                      <TableCell className={`text-right ${m.revenueGrowthYoY !== null && m.revenueGrowthYoY >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.revenueGrowthYoY !== null ? formatPercent(m.revenueGrowthYoY) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{m.orders.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.avgOrderValue)}</TableCell>
                      <TableCell className="text-right">{m.grossMarginPct.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.adSpend)}</TableCell>
                      <TableCell className={`text-right ${m.gp3 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(m.gp3)}
                      </TableCell>
                      <TableCell className={`text-right ${m.netMarginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.netMarginPct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Analysis</CardTitle>
          <CardDescription>Customer behavior by acquisition month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acquisition Month</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Orders/Customer</TableHead>
                  <TableHead className="text-right">Revenue/Customer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics?.cohorts.slice(-12).reverse().map((c) => (
                    <TableRow key={c.firstOrderMonth}>
                      <TableCell className="font-medium">
                        {new Date(c.firstOrderMonth + '-01').toLocaleDateString('en-GB', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">{c.customersAcquired.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.totalRevenue)}</TableCell>
                      <TableCell className="text-right">{c.totalOrders.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{c.avgOrdersPerCustomer.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.avgRevenuePerCustomer)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading investor metrics...</p>
      </div>
    </div>
  );
}

export default function InvestorMetricsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InvestorMetricsContent />
    </Suspense>
  );
}
