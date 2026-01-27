'use client';

import { useState, Suspense } from 'react';
import { Download, RefreshCw, ChevronDown, ChevronUp, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DashboardFilters,
  HeroKPIGrid,
  AlertBanner,
  PnLTable,
  CashPositionCard,
} from '@/components/dashboard';
import {
  RevenueTrendChart,
  WaterfallChart,
  TargetGauge,
} from '@/components/charts';
import { usePnLData } from '@/hooks/usePnLData';
import { useFilterParams } from '@/hooks/useFilterParams';
import { generateWaterfallData } from '@/lib/pnl/calculations';
import { aggregatePnLByPeriod } from '@/lib/pnl/aggregations';
import { exportToExcel, exportToPDF } from '@/lib/utils/export';
import type { DailyPnL } from '@/types';

function PnLDashboardContent() {
  const {
    brandFilter,
    dateRange,
    periodType,
    showYoY,
    selectionMode,
    setBrandFilter,
    setDateRange,
    setPeriodType,
    setShowYoY,
    setSelectionMode,
  } = useFilterParams();

  const [showQuickSummary, setShowQuickSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  // Get aggregated data for table (limited to recent periods for quick summary)
  const aggregatedData = aggregatePnLByPeriod(dailyData as never[], periodType);
  const quickSummaryData = aggregatedData.slice(0, 7); // Last 7 periods

  // Get raw daily data for alert calculations
  const rawDailyData = dailyData as unknown as DailyPnL[];

  // Get brand name for export
  const getBrandName = () => {
    switch (brandFilter) {
      case 'DC':
        return 'Display Champ';
      case 'BI':
        return 'Bright Ivy';
      default:
        return 'All Brands';
    }
  };

  // Export handlers
  const handleExportExcel = async () => {
    if (!summary || aggregatedData.length === 0) return;
    setIsExporting(true);
    try {
      await exportToExcel(aggregatedData, summary, dateRange, getBrandName());
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!summary || aggregatedData.length === 0) return;
    setIsExporting(true);
    try {
      await exportToPDF(aggregatedData, summary, dateRange, getBrandName());
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">P&L Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Daily profit & loss analysis for Display Champ & Bright Ivy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Reload data from database"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting || !summary}>
                <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
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

      {/* Cash Position (Bank Balances from Xero) */}
      <CashPositionCard />

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
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

// Loading fallback for Suspense
function PnLDashboardLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Loading P&L dashboard...</p>
      </div>
    </div>
  );
}

export default function PnLDashboardPage() {
  return (
    <Suspense fallback={<PnLDashboardLoading />}>
      <PnLDashboardContent />
    </Suspense>
  );
}
