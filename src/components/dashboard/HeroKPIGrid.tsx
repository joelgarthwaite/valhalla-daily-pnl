'use client';

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
  Target,
  BarChart3,
  Calculator,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PnLSummaryWithComparison, QuarterlyProgress, PnLTrendPoint } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';

// KPI Definitions for tooltips
const KPI_DEFINITIONS: Record<string, string> = {
  'True Net Profit': 'Your actual bottom line after ALL costs: COGS, operational costs, ad spend, AND operating expenses (staff, rent, software, etc.).',
  'GP3 (Contribution)': 'Contribution margin after ads. GP3 = GP2 - Ad Spend. Does NOT include OPEX.',
  'Product Revenue': 'Sum of product subtotals across all platforms (excludes shipping). This is the primary P&L revenue metric.',
  'Net Revenue': 'Product revenue minus refunds. Used for margin calculations.',
  'Net Margin': 'True Net Profit as a percentage of net revenue. Includes OPEX. Target: >15%',
  'Quarterly Progress': 'Progress toward your quarterly revenue target.',
  'MER': 'Marketing Efficiency Ratio: Revenue generated per £1 of ad spend. Target: >3x',
  'Orders': 'Total order count across all platforms.',
  'Blended ROAS': 'Return on Ad Spend: Revenue divided by ad spend across all channels.',
};

// Threshold definitions for traffic light status
// Note: Net Margin thresholds lowered since they now include OPEX
const THRESHOLDS = {
  netMargin: { green: 15, amber: 10 }, // >=15 green, 10-15 amber, <10 red (includes OPEX)
  mer: { green: 3, amber: 2 }, // >=3 green, 2-3 amber, <2 red
  quarterlyProgress: { green: 90, amber: 75 }, // Based on expected pace
};

type StatusColor = 'green' | 'amber' | 'red' | 'neutral';

interface HeroKPIGridProps {
  summary: PnLSummaryWithComparison | null;
  quarterlyProgress: QuarterlyProgress | null;
  trendData?: PnLTrendPoint[];
  isLoading?: boolean;
}

interface HeroKPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  invertColors?: boolean;
  tooltip?: string;
  status?: StatusColor;
  sparklineData?: number[];
  size?: 'normal' | 'large';
}

// Simple sparkline component
function Sparkline({ data, color = 'text-primary' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 60;
  const pointSpacing = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * pointSpacing;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={cn('opacity-60', color)}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Status indicator dot
function StatusDot({ status }: { status: StatusColor }) {
  const colorClass = {
    green: 'bg-green-500',
    amber: 'bg-yellow-500',
    red: 'bg-red-500',
    neutral: 'bg-gray-400',
  }[status];

  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', colorClass)} />
  );
}

function HeroKPICard({
  title,
  value,
  change,
  changeLabel = 'vs last week',
  icon,
  isLoading,
  invertColors = false,
  tooltip,
  status = 'neutral',
  sparklineData,
  size = 'normal',
}: HeroKPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  // For costs, we invert the color logic (decrease is good)
  const showGreen = invertColors ? isNegative : isPositive;
  const showRed = invertColors ? isPositive : isNegative;

  return (
    <Card className={cn(
      'relative overflow-hidden transition-shadow hover:shadow-md',
      isLoading && 'animate-pulse',
      size === 'large' && 'row-span-1'
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <StatusDot status={status} />
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {title}
          </CardTitle>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-muted-foreground/70 cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className={cn(
              'font-bold truncate',
              size === 'large' ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'
            )}>
              {isLoading ? (
                <div className="h-6 sm:h-8 w-20 sm:w-24 bg-muted rounded" />
              ) : (
                value
              )}
            </div>
            {change !== undefined && !isLoading && (
              <p className={cn(
                'text-[10px] sm:text-xs mt-0.5 sm:mt-1 flex items-center gap-0.5 sm:gap-1',
                showGreen && 'text-green-600',
                showRed && 'text-red-600',
                !showGreen && !showRed && 'text-muted-foreground'
              )}>
                {isPositive ? (
                  <TrendingUp className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                ) : isNegative ? (
                  <TrendingDown className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                ) : null}
                <span className="truncate">
                  {isPositive ? '+' : ''}{change.toFixed(1)}% {changeLabel}
                </span>
              </p>
            )}
          </div>
          {sparklineData && sparklineData.length > 1 && !isLoading && (
            <div className="hidden sm:block">
              <Sparkline
                data={sparklineData}
                color={status === 'green' ? 'text-green-500' : status === 'red' ? 'text-red-500' : 'text-primary'}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to determine status based on thresholds
function getMarginStatus(value: number): StatusColor {
  if (value >= THRESHOLDS.netMargin.green) return 'green';
  if (value >= THRESHOLDS.netMargin.amber) return 'amber';
  return 'red';
}

function getMERStatus(value: number): StatusColor {
  if (value >= THRESHOLDS.mer.green) return 'green';
  if (value >= THRESHOLDS.mer.amber) return 'amber';
  return 'red';
}

function getQuarterlyStatus(progress: QuarterlyProgress | null): StatusColor {
  if (!progress) return 'neutral';
  if (progress.progressPct >= 100) return 'green';
  if (progress.onTrack) return 'green';
  if (progress.progressPct >= THRESHOLDS.quarterlyProgress.amber) return 'amber';
  return 'red';
}

function getChangeStatus(change: number | undefined): StatusColor {
  if (change === undefined) return 'neutral';
  if (change > 5) return 'green';
  if (change > -5) return 'amber';
  return 'red';
}

export function HeroKPIGrid({
  summary,
  quarterlyProgress,
  trendData = [],
  isLoading = false
}: HeroKPIGridProps) {
  // Extract sparkline data from trend data
  const revenueSparkline = trendData.slice(-7).map(d => d.totalRevenue);
  const profitSparkline = trendData.slice(-7).map(d => d.netProfit);
  const ordersSparkline = trendData.slice(-7).map(d => d.totalOrders);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Row 1: Hero Metrics (4 cards) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <HeroKPICard
          title="True Net Profit"
          value={summary ? formatCurrency(summary.trueNetProfit) : '£0'}
          change={summary?.changes.netProfit}
          changeLabel="vs last week"
          icon={<Target className="h-4 w-4 text-blue-600" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['True Net Profit']}
          status={getChangeStatus(summary?.changes.netProfit)}
          sparklineData={profitSparkline}
          size="large"
        />
        <HeroKPICard
          title="Product Revenue"
          value={summary ? formatCurrency(summary.totalRevenue) : '£0'}
          change={summary?.changes.totalRevenue}
          changeLabel="vs last week"
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Product Revenue']}
          status={getChangeStatus(summary?.changes.totalRevenue)}
          sparklineData={revenueSparkline}
          size="large"
        />
        <HeroKPICard
          title="Net Margin"
          value={summary ? formatPercentage(summary.netMarginPct) : '0%'}
          change={summary?.changes.netMarginPct}
          changeLabel="pts vs last"
          icon={<Percent className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Net Margin']}
          status={summary ? getMarginStatus(summary.netMarginPct) : 'neutral'}
          size="large"
        />
        <HeroKPICard
          title="Quarterly Progress"
          value={quarterlyProgress ? formatPercentage(quarterlyProgress.progressPct, 0) : '--'}
          icon={<BarChart3 className="h-4 w-4 text-purple-600" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Quarterly Progress']}
          status={getQuarterlyStatus(quarterlyProgress)}
          size="large"
        />
      </div>

      {/* Row 2: Efficiency Metrics (3 cards) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <HeroKPICard
          title="MER"
          value={summary ? `${summary.mer.toFixed(2)}x` : '0x'}
          change={summary?.changes.mer}
          icon={<Calculator className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['MER']}
          status={summary ? getMERStatus(summary.mer) : 'neutral'}
        />
        <HeroKPICard
          title="Orders"
          value={summary ? summary.totalOrders.toLocaleString() : '0'}
          change={summary?.changes.totalOrders}
          changeLabel="vs last week"
          icon={<ShoppingCart className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Orders']}
          status={getChangeStatus(summary?.changes.totalOrders)}
          sparklineData={ordersSparkline}
        />
        <HeroKPICard
          title="Blended ROAS"
          value={summary ? `${summary.blendedRoas.toFixed(2)}x` : '0x'}
          icon={<Target className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Blended ROAS']}
          status={summary ? getMERStatus(summary.blendedRoas) : 'neutral'}
        />
      </div>
    </div>
  );
}
