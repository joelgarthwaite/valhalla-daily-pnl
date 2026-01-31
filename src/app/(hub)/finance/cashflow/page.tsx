'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, AlertTriangle, Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { toast } from 'sonner';

import {
  NetPositionHero,
  CashflowKPICards,
  BalanceHistoryChart,
  InflowsCard,
  OutflowsCard,
  ProjectionChart,
  CashEventsTimeline,
  CashAlertBanner,
} from '@/components/cashflow';

import type { BrandFilter } from '@/types';
import type {
  CashPosition,
  CashHistory,
  BurnMetrics,
  RunwayMetrics,
  CashFlowSummary,
  CashAlert,
} from '@/lib/cashflow/calculations';
import type { CashEvent } from '@/lib/cashflow/events';
import type {
  ScenarioProjection,
  ScenarioChartPoint,
  ScenarioComparison,
} from '@/lib/cashflow/scenarios';

interface CashFlowData {
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

function CashFlowPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-based state
  const brandFilter = (searchParams.get('brand') as BrandFilter) || 'all';
  const historyDays = parseInt(searchParams.get('history') || '30', 10);
  const forecastDays = parseInt(searchParams.get('forecast') || '30', 10);

  // Data state
  const [data, setData] = useState<CashFlowData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update URL params
  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        brand: brandFilter,
        historyDays: historyDays.toString(),
        forecastDays: forecastDays.toString(),
      });

      const response = await fetch(`/api/cashflow?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch cash flow data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast.error('Failed to load cash flow data');
    } finally {
      setIsLoading(false);
    }
  }, [brandFilter, historyDays, forecastDays]);

  // Initial fetch and refetch on param change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler for history days toggle
  const handleHistoryDaysChange = (days: number) => {
    updateParams({ history: days.toString() });
  };

  // Handler for brand filter
  const handleBrandChange = (value: string) => {
    updateParams({ brand: value });
  };

  // Empty state when no Xero connection
  const hasNoData = !isLoading && data && data.currentPosition.accounts.length === 0;

  return (
    <PullToRefresh onRefresh={fetchData}>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              Cash Flow
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time cash position, forecasting, and runway analysis
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={brandFilter} onValueChange={handleBrandChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                <SelectItem value="DC">Display Champ</SelectItem>
                <SelectItem value="BI">Bright Ivy</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchData()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => fetchData()} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State - No Xero Connection */}
        {hasNoData && (
          <div className="bg-muted/50 border rounded-lg p-8 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Bank Data Available</h2>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Connect your Xero account to start tracking cash balances, or wait for the daily
              balance snapshot to run.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.push('/admin/xero')}>
                Connect Xero
              </Button>
              <Button onClick={() => fetchData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!hasNoData && (
          <>
            {/* Alerts Banner */}
            {data && data.alerts.length > 0 && (
              <CashAlertBanner alerts={data.alerts} />
            )}

            {/* Net Position Hero */}
            <NetPositionHero
              position={data?.currentPosition || { totalCash: 0, totalCredit: 0, netPosition: 0, accounts: [] }}
              runway={data?.runway || { daysRemaining: null, weeksRemaining: null, monthsRemaining: null, projectedBalance: { week4: 0, week8: 0, week12: 0 } }}
              isLoading={isLoading}
            />

            {/* KPI Cards */}
            <CashflowKPICards
              position={data?.currentPosition || { totalCash: 0, totalCredit: 0, netPosition: 0, accounts: [] }}
              burnMetrics={data?.burnMetrics || { burnRateDaily: 0, burnRateWeekly: 0, burnRateMonthly: 0, isAccumulating: false }}
              runway={data?.runway || { daysRemaining: null, weeksRemaining: null, monthsRemaining: null, projectedBalance: { week4: 0, week8: 0, week12: 0 } }}
              isLoading={isLoading}
            />

            {/* Balance History Chart */}
            <BalanceHistoryChart
              history={data?.history || { dates: [], balances: [], trend: 'stable', changePercent: 0 }}
              historyDays={historyDays}
              onHistoryDaysChange={handleHistoryDaysChange}
              isLoading={isLoading}
            />

            {/* Inflows & Outflows */}
            <div className="grid md:grid-cols-2 gap-6">
              <InflowsCard
                total={data?.inflows.total || 0}
                bySource={data?.inflows.bySource || { platformPayouts: 0, b2bReceivables: 0, other: 0 }}
                events={data?.inflows.events || []}
                forecastDays={forecastDays}
                isLoading={isLoading}
              />
              <OutflowsCard
                total={data?.outflows.total || 0}
                byCategory={data?.outflows.byCategory || { supplierPayments: 0, opex: 0, adPlatforms: 0, vat: 0, other: 0 }}
                events={data?.outflows.events || []}
                forecastDays={forecastDays}
                isLoading={isLoading}
              />
            </div>

            {/* 12-Week Projection */}
            <ProjectionChart
              chartData={data?.projections.chartData || []}
              comparison={data?.projections.comparison || {
                baselineEndBalance: 0,
                optimisticEndBalance: 0,
                pessimisticEndBalance: 0,
                baselineGoesNegative: false,
                pessimisticGoesNegative: false,
                riskAssessment: 'low',
                recommendation: '',
              }}
              isLoading={isLoading}
            />

            {/* Upcoming Events Timeline */}
            <CashEventsTimeline
              inflows={data?.inflows.events || []}
              outflows={data?.outflows.events || []}
              isLoading={isLoading}
            />
          </>
        )}

        {/* Last Updated */}
        {data?.metadata.lastUpdated && (
          <div className="text-xs text-center text-muted-foreground">
            Last updated: {new Date(data.metadata.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

// Loading fallback component
function CashFlowPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading cash flow data...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function CashFlowPage() {
  return (
    <Suspense fallback={<CashFlowPageLoading />}>
      <CashFlowPageContent />
    </Suspense>
  );
}
