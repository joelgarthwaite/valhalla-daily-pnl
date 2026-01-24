'use client';

import { useState } from 'react';
import { Download, RefreshCw, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  TargetGauge,
} from '@/components/charts';
import { usePnLData, getDefaultDateRange } from '@/hooks/usePnLData';
import { generateWaterfallData } from '@/lib/pnl/calculations';
import { aggregatePnLByPeriod } from '@/lib/pnl/aggregations';
import type { BrandFilter, PeriodType, DateRange } from '@/types';

export default function DashboardPage() {
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [showYoY, setShowYoY] = useState(false);

  const {
    dailyData,
    summary,
    trendData,
    roasData,
    quarterlyProgress,
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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Daily P&L Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Display Champ & Bright Ivy
              </p>
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
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
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

        {/* KPIs */}
        <ExtendedKPIGrid summary={summary} isLoading={isLoading} />

        {/* Charts & Gauge Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueTrendChart
              data={trendData}
              showYoY={showYoY}
              isLoading={isLoading}
            />
          </div>
          <div>
            <TargetGauge progress={quarterlyProgress} isLoading={isLoading} />
          </div>
        </div>

        {/* Secondary Charts */}
        <Tabs defaultValue="waterfall" className="space-y-4">
          <TabsList>
            <TabsTrigger value="waterfall">P&L Waterfall</TabsTrigger>
            <TabsTrigger value="profit">Profit Trend</TabsTrigger>
            <TabsTrigger value="roas">ROAS by Channel</TabsTrigger>
          </TabsList>

          <TabsContent value="waterfall">
            <WaterfallChart data={waterfallData} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="profit">
            <MultiMetricTrendChart data={trendData} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="roas">
            <ROASChart data={roasData} isLoading={isLoading} />
          </TabsContent>
        </Tabs>

        {/* P&L Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Detailed P&L</h2>
          <PnLTable data={aggregatedData} isLoading={isLoading} />
        </div>
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
