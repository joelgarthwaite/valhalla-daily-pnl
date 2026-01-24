'use client';

import { useState } from 'react';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DashboardFilters,
  ExtendedKPIGrid,
  PnLTable,
} from '@/components/dashboard';
import {
  RevenueTrendChart,
  MultiMetricTrendChart,
  WaterfallChart,
  ROASChart,
} from '@/components/charts';
import { usePnLData, getDefaultDateRange } from '@/hooks/usePnLData';
import { generateWaterfallData } from '@/lib/pnl/calculations';
import { aggregatePnLByPeriod } from '@/lib/pnl/aggregations';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';
import type { BrandFilter, PeriodType, DateRange } from '@/types';

// Additional KPIs section component
function AdditionalKPIs({ summary, isLoading }: { summary: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const additionalMetrics = [
    {
      title: 'Shipping Charged',
      value: summary ? formatCurrency(summary.shippingCharged || 0) : '£0',
      description: 'Total shipping charged to customers',
    },
    {
      title: 'Shipping Cost',
      value: summary ? formatCurrency(summary.shippingCost) : '£0',
      description: 'Actual shipping costs incurred',
    },
    {
      title: 'Shipping Margin',
      value: summary ? formatCurrency(summary.shippingMargin) : '£0',
      description: 'Shipping charged minus shipping cost',
    },
    {
      title: 'Refund Amount',
      value: summary ? formatCurrency(summary.totalRefunds) : '£0',
      description: `${summary?.refundCount || 0} refunds processed`,
    },
    {
      title: 'Refund Rate',
      value: summary && summary.totalRevenue > 0
        ? formatPercentage((summary.totalRefunds / (summary.totalRevenue + summary.totalRefunds)) * 100, 1)
        : '0%',
      description: 'Refunds as percentage of product revenue',
    },
    {
      title: 'COGS',
      value: summary ? formatCurrency(summary.cogs) : '£0',
      description: 'Cost of goods sold (estimated 30%)',
    },
    {
      title: 'Platform Fees',
      value: summary ? formatCurrency(summary.platformFees) : '£0',
      description: 'Shopify + Etsy transaction fees',
    },
    {
      title: 'Total Ad Spend',
      value: summary ? formatCurrency(summary.totalAdSpend) : '£0',
      description: 'Meta + Google + Microsoft + Etsy Ads',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {additionalMetrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Revenue breakdown section
function RevenueBreakdown({ summary, isLoading }: { summary: any; isLoading: boolean }) {
  if (isLoading || !summary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const productRevenue = summary.totalRevenue || 0;
  const shippingRevenue = summary.shippingCharged || 0;
  const grossRevenue = summary.grossRevenue || (productRevenue + shippingRevenue);

  const channels = [
    {
      name: 'Shopify',
      revenue: summary.shopifyRevenue,
      percent: productRevenue > 0 ? (summary.shopifyRevenue / productRevenue) * 100 : 0,
      color: 'bg-green-500',
    },
    {
      name: 'Etsy',
      revenue: summary.etsyRevenue,
      percent: productRevenue > 0 ? (summary.etsyRevenue / productRevenue) * 100 : 0,
      color: 'bg-orange-500',
    },
    {
      name: 'B2B',
      revenue: summary.b2bRevenue,
      percent: productRevenue > 0 ? (summary.b2bRevenue / productRevenue) * 100 : 0,
      color: 'bg-blue-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Revenue Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Product Revenue</p>
            <p className="text-xl font-bold">{formatCurrency(productRevenue)}</p>
            <p className="text-xs text-muted-foreground">Subtotals only</p>
          </div>
          <div className="text-center border-x">
            <p className="text-xs text-muted-foreground mb-1">+ Shipping Charged</p>
            <p className="text-xl font-bold">{formatCurrency(shippingRevenue)}</p>
            <p className="text-xs text-muted-foreground">Customer paid</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">= Gross Revenue</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(grossRevenue)}</p>
            <p className="text-xs text-muted-foreground">Total received</p>
          </div>
        </div>

        {/* Channel Progress bar */}
        <div>
          <p className="text-sm font-medium mb-2">Product Revenue by Channel</p>
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {channels.map((channel) => (
              <div
                key={channel.name}
                className={channel.color}
                style={{ width: `${channel.percent}%` }}
                title={`${channel.name}: ${formatPercentage(channel.percent, 1)}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-4">
            {channels.map((channel) => (
              <div key={channel.name} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full ${channel.color}`} />
                  <span className="font-medium">{channel.name}</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(channel.revenue)}</p>
                <p className="text-xs text-muted-foreground">{formatPercentage(channel.percent, 1)}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Profit tier breakdown
function ProfitTierBreakdown({ summary, isLoading }: { summary: any; isLoading: boolean }) {
  if (isLoading || !summary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const tiers = [
    {
      name: 'Net Revenue',
      value: summary.netRevenue,
      description: 'After refunds',
    },
    {
      name: 'GP1',
      value: summary.gp1,
      description: 'After COGS (30%)',
      deduction: summary.cogs,
    },
    {
      name: 'GP2',
      value: summary.gp2,
      description: 'After Operations',
      deduction: summary.pickPackCost + summary.platformFees + summary.logisticsCost,
    },
    {
      name: 'GP3',
      value: summary.gp3,
      description: 'True Profit',
      deduction: summary.totalAdSpend,
      highlight: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Tier Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <div key={tier.name}>
              {tier.deduction !== undefined && index > 0 && (
                <div className="flex justify-between text-sm text-red-600 mb-1 pl-4">
                  <span>- Deductions</span>
                  <span>{formatCurrency(tier.deduction)}</span>
                </div>
              )}
              <div className={`flex justify-between items-center p-3 rounded-lg ${
                tier.highlight ? 'bg-primary/10' : 'bg-muted/50'
              }`}>
                <div>
                  <span className="font-semibold">{tier.name}</span>
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                </div>
                <span className={`text-lg font-bold ${tier.highlight ? 'text-primary' : ''}`}>
                  {formatCurrency(tier.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DetailedAnalyticsPage() {
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [showYoY, setShowYoY] = useState(false);

  const {
    dailyData,
    summary,
    trendData,
    roasData,
    isLoading,
    error,
    refetch,
  } = usePnLData({
    brandFilter,
    dateRange,
    periodType,
    showYoY,
  });

  // Generate waterfall data from summary
  const waterfallData = summary ? generateWaterfallData(summary) : [];

  // Get aggregated data for table
  const aggregatedData = aggregatePnLByPeriod(dailyData as never[], periodType);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Detailed Analytics</h1>
                <p className="text-sm text-muted-foreground">
                  Full P&L breakdown and metrics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Filters */}
        <DashboardFilters
          brandFilter={brandFilter}
          onBrandFilterChange={setBrandFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          periodType={periodType}
          onPeriodTypeChange={setPeriodType}
          showYoY={showYoY}
          onShowYoYChange={setShowYoY}
        />

        {/* Section 1: All KPI Metrics */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Core Metrics</h2>
          <ExtendedKPIGrid summary={summary} isLoading={isLoading} />
        </section>

        {/* Section 2: Additional Metrics */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Shipping, Refunds & Costs</h2>
          <AdditionalKPIs summary={summary} isLoading={isLoading} />
        </section>

        {/* Section 3: Breakdowns */}
        <section className="grid gap-6 lg:grid-cols-2">
          <RevenueBreakdown summary={summary} isLoading={isLoading} />
          <ProfitTierBreakdown summary={summary} isLoading={isLoading} />
        </section>

        {/* Section 4: Charts */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Trends & Analysis</h2>
          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
              <TabsTrigger value="profit">Profit Trend</TabsTrigger>
              <TabsTrigger value="waterfall">P&L Waterfall</TabsTrigger>
              <TabsTrigger value="roas">ROAS by Channel</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue">
              <RevenueTrendChart
                data={trendData}
                showYoY={showYoY}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="profit">
              <MultiMetricTrendChart data={trendData} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="waterfall">
              <WaterfallChart data={waterfallData} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="roas">
              <ROASChart data={roasData} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </section>

        {/* Section 5: Full P&L Table */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Detailed P&L Table</h2>
          <PnLTable data={aggregatedData} isLoading={isLoading} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Valhalla Daily P&L &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
