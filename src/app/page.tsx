'use client';

import { useState } from 'react';
import { Download, RefreshCw, Settings, BarChart3, ChevronDown, ChevronUp, HelpCircle, Globe, CloudDownload } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DashboardFilters,
  HeroKPIGrid,
  AlertBanner,
  PnLTable,
} from '@/components/dashboard';
import {
  RevenueTrendChart,
  WaterfallChart,
  TargetGauge,
} from '@/components/charts';
import { usePnLData, getDefaultDateRange } from '@/hooks/usePnLData';
import { generateWaterfallData } from '@/lib/pnl/calculations';
import { aggregatePnLByPeriod } from '@/lib/pnl/aggregations';
import type { BrandFilter, PeriodType, DateRange, DailyPnL } from '@/types';

export default function DashboardPage() {
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [showYoY, setShowYoY] = useState(false);
  const [showQuickSummary, setShowQuickSummary] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

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

  // Unified sync function - syncs all data sources and refreshes P&L
  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing...');

    try {
      const response = await fetch('/api/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        setSyncStatus(`Done! (${data.duration})`);
        // Refresh dashboard data after sync
        await refetch();
      } else {
        const errorSteps = data.steps?.filter((s: { status: string }) => s.status === 'error') || [];
        setSyncStatus(`Completed with ${errorSteps.length} error(s)`);
      }

      // Clear status after 3 seconds
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err) {
      setSyncStatus('Sync failed');
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate waterfall data from summary
  const waterfallData = summary ? generateWaterfallData(summary) : [];

  // Get aggregated data for table (limited to recent periods for quick summary)
  const aggregatedData = aggregatePnLByPeriod(dailyData as never[], periodType);
  const quickSummaryData = aggregatedData.slice(0, 7); // Last 7 periods

  // Get raw daily data for alert calculations
  const rawDailyData = dailyData as unknown as DailyPnL[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
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
                variant="default"
                size="sm"
                onClick={handleSyncAll}
                disabled={isSyncing}
                title="Pulls latest orders from Shopify & Etsy, syncs ad spend from Meta, and updates P&L calculations"
              >
                <CloudDownload className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-pulse' : ''}`} />
                {isSyncing ? 'Syncing...' : syncStatus || 'Sync & Update'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isSyncing}
                title="Reload dashboard data from database (no external sync)"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Link href="/detailed">
                <Button variant="default" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Detailed Analytics
                </Button>
              </Link>
              <Link href="/country">
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Country Analysis
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Link href="/help">
                <Button variant="outline" size="sm">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </Button>
              </Link>
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

        {/* Hero KPIs (7 metrics) */}
        <HeroKPIGrid
          summary={summary}
          quarterlyProgress={quarterlyProgress}
          trendData={trendData}
          isLoading={isLoading}
        />

        {/* Alert Banner */}
        <AlertBanner
          summary={summary}
          roasData={roasData}
          dailyData={rawDailyData}
          isLoading={isLoading}
        />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-2">
            <RevenueTrendChart
              data={trendData}
              showYoY={showYoY}
              isLoading={isLoading}
            />
          </div>

          {/* Quarterly Target Gauge */}
          <div>
            <TargetGauge progress={quarterlyProgress} isLoading={isLoading} />
          </div>
        </div>

        {/* P&L Waterfall (always visible) */}
        <WaterfallChart data={waterfallData} isLoading={isLoading} />

        {/* Quick P&L Summary (collapsible) */}
        <Collapsible open={showQuickSummary} onOpenChange={setShowQuickSummary}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Quick P&L Summary
                    <span className="text-sm font-normal text-muted-foreground">
                      (Last {quickSummaryData.length} periods)
                    </span>
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    {showQuickSummary ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <PnLTable data={quickSummaryData} isLoading={isLoading} />
                <div className="mt-4 text-center">
                  <Link href="/detailed">
                    <Button variant="outline" size="sm">
                      View Full P&L Table
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
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
