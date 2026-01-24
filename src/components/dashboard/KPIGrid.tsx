'use client';

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
  Target,
  Info,
  Layers,
  TrendingUp as GrowthIcon,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PnLSummaryWithComparison } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';

// KPI Definitions for tooltips
const KPI_DEFINITIONS: Record<string, string> = {
  'Total Revenue': 'Sum of all Shopify, Etsy, and B2B sales (excluding refunds)',
  'Total Orders': 'Count of completed orders across all platforms',
  'Gross AOV': 'Gross Average Order Value: Total paid by customer (product + shipping) per order',
  'Net AOV': 'Net Average Order Value: Product revenue after discounts per order (excludes shipping)',
  'GP1': 'Gross Profit 1: Revenue minus Cost of Goods Sold (30% of revenue)',
  'GP2': 'Gross Profit 2: GP1 minus operational costs (pick/pack, payment fees, logistics)',
  'GP3': 'Gross Profit 3: GP2 minus advertising spend - your true profit after all costs',
  'Gross Margin': 'Gross profit as a percentage of net revenue',
  'Net Margin': 'Net profit (GP3) as a percentage of net revenue',
  'Gross Profit': 'Revenue minus Cost of Goods Sold (same as GP1)',
  'Net Profit': 'Final profit after all costs including ads (same as GP3)',
  'POAS': 'Profit on Ad Spend: Profit generated per unit of ad spend. 200% = £2 profit per £1 spent',
  'CoP': 'Cost of Profit: Total costs incurred per unit of profit generated',
  'MER': 'Marketing Efficiency Ratio: Total revenue generated per £1 of ad spend',
  'Blended ROAS': 'Return on Ad Spend: Total revenue divided by total ad spend',
  'Marketing Cost': 'Advertising spend as a percentage of total revenue',
  'Refunds': 'Total refund amount and count for the period',
};

interface KPIGridProps {
  summary: PnLSummaryWithComparison | null;
  isLoading?: boolean;
}

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  invertColors?: boolean;
  tooltip?: string;
}

function KPICard({
  title,
  value,
  change,
  changeLabel = 'vs previous period',
  icon,
  isLoading,
  invertColors = false,
  tooltip,
}: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  // For costs, we invert the color logic (decrease is good)
  const showGreen = invertColors ? isNegative : isPositive;
  const showRed = invertColors ? isPositive : isNegative;

  return (
    <Card className={cn(isLoading && 'animate-pulse')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <div className="h-8 w-24 bg-muted rounded" />
          ) : (
            value
          )}
        </div>
        {change !== undefined && !isLoading && (
          <p className={cn(
            'text-xs mt-1 flex items-center gap-1',
            showGreen && 'text-green-600',
            showRed && 'text-red-600',
            !showGreen && !showRed && 'text-muted-foreground'
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : isNegative ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            <span>
              {isPositive ? '+' : ''}{change.toFixed(1)}% {changeLabel}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function KPIGrid({ summary, isLoading = false }: KPIGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Revenue"
        value={summary ? formatCurrency(summary.totalRevenue) : '£0'}
        change={summary?.changes.totalRevenue}
        icon={<DollarSign className="h-4 w-4 text-primary" />}
        isLoading={isLoading}
        tooltip={KPI_DEFINITIONS['Total Revenue']}
      />
      <KPICard
        title="Total Orders"
        value={summary ? summary.totalOrders.toLocaleString() : '0'}
        change={summary?.changes.totalOrders}
        icon={<ShoppingCart className="h-4 w-4 text-primary" />}
        isLoading={isLoading}
        tooltip={KPI_DEFINITIONS['Total Orders']}
      />
      <KPICard
        title="Gross Margin"
        value={summary ? formatPercentage(summary.grossMarginPct) : '0%'}
        change={summary?.changes.grossMarginPct}
        changeLabel="pts vs previous"
        icon={<Percent className="h-4 w-4 text-primary" />}
        isLoading={isLoading}
        tooltip={KPI_DEFINITIONS['Gross Margin']}
      />
      <KPICard
        title="GP3 (True Profit)"
        value={summary ? formatCurrency(summary.gp3) : '£0'}
        change={summary?.changes.gp3}
        icon={<Target className="h-4 w-4 text-primary" />}
        isLoading={isLoading}
        tooltip={KPI_DEFINITIONS['GP3']}
      />
    </div>
  );
}

export function ExtendedKPIGrid({ summary, isLoading = false }: KPIGridProps) {
  return (
    <div className="space-y-4">
      {/* Row 1: Revenue & Orders (Top of P&L) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={summary ? formatCurrency(summary.totalRevenue) : '£0'}
          change={summary?.changes.totalRevenue}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Total Revenue']}
        />
        <KPICard
          title="Total Orders"
          value={summary ? summary.totalOrders.toLocaleString() : '0'}
          change={summary?.changes.totalOrders}
          icon={<ShoppingCart className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Total Orders']}
        />
        <KPICard
          title="Gross AOV"
          value={summary ? formatCurrency(summary.grossAOV) : '£0'}
          icon={<ShoppingCart className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Gross AOV']}
        />
        <KPICard
          title="Net AOV"
          value={summary ? formatCurrency(summary.netAOV) : '£0'}
          icon={<ShoppingCart className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Net AOV']}
        />
      </div>

      {/* Row 2: Profit Tiers (Core P&L Flow: Revenue → GP1 → GP2 → GP3) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="GP1 (After COGS)"
          value={summary ? formatCurrency(summary.gp1) : '£0'}
          change={summary?.changes.gp1}
          icon={<Layers className="h-4 w-4 text-green-600" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['GP1']}
        />
        <KPICard
          title="GP2 (After Ops)"
          value={summary ? formatCurrency(summary.gp2) : '£0'}
          change={summary?.changes.gp2}
          icon={<Layers className="h-4 w-4 text-yellow-600" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['GP2']}
        />
        <KPICard
          title="GP3 (True Profit)"
          value={summary ? formatCurrency(summary.gp3) : '£0'}
          change={summary?.changes.gp3}
          icon={<Target className="h-4 w-4 text-blue-600" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['GP3']}
        />
        <KPICard
          title="Net Margin"
          value={summary ? formatPercentage(summary.netMarginPct) : '0%'}
          change={summary?.changes.netMarginPct}
          changeLabel="pts vs previous"
          icon={<Percent className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Net Margin']}
        />
      </div>

      {/* Row 3: Margins & Efficiency */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Gross Margin"
          value={summary ? formatPercentage(summary.grossMarginPct) : '0%'}
          change={summary?.changes.grossMarginPct}
          changeLabel="pts vs previous"
          icon={<Percent className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Gross Margin']}
        />
        <KPICard
          title="Blended ROAS"
          value={summary ? `${summary.blendedRoas.toFixed(2)}x` : '0x'}
          icon={<Target className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['Blended ROAS']}
        />
        <KPICard
          title="MER"
          value={summary ? `${summary.mer.toFixed(2)}x` : '0x'}
          change={summary?.changes.mer}
          icon={<Calculator className="h-4 w-4 text-primary" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['MER']}
        />
        <KPICard
          title="POAS"
          value={summary ? `${summary.poas.toFixed(0)}%` : '0%'}
          change={summary?.changes.poas}
          changeLabel="pts vs previous"
          icon={<GrowthIcon className="h-4 w-4 text-green-600" />}
          isLoading={isLoading}
          tooltip={KPI_DEFINITIONS['POAS']}
        />
      </div>

      {/* Row 4: Cost Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <KPICard
          title="Marketing Cost %"
          value={summary ? `${summary.marketingCostRatio.toFixed(1)}%` : '0%'}
          icon={<Percent className="h-4 w-4 text-orange-500" />}
          isLoading={isLoading}
          invertColors={true}
          tooltip={KPI_DEFINITIONS['Marketing Cost']}
        />
        <KPICard
          title="Cost of Profit"
          value={summary ? `${summary.cop.toFixed(2)}` : '0'}
          icon={<Calculator className="h-4 w-4 text-red-500" />}
          isLoading={isLoading}
          invertColors={true}
          tooltip={KPI_DEFINITIONS['CoP']}
        />
      </div>
    </div>
  );
}
