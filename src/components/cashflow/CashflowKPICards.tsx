'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Wallet,
  CreditCard,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { CashPosition, BurnMetrics, RunwayMetrics } from '@/lib/cashflow/calculations';

interface CashflowKPICardsProps {
  position: CashPosition;
  burnMetrics: BurnMetrics;
  runway: RunwayMetrics;
  isLoading?: boolean;
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  isLoading?: boolean;
  highlight?: 'positive' | 'negative' | 'warning' | 'neutral';
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  isLoading,
  highlight = 'neutral',
}: KPICardProps) {
  const highlightStyles = {
    positive: 'border-green-200 dark:border-green-800',
    negative: 'border-red-200 dark:border-red-800',
    warning: 'border-yellow-200 dark:border-yellow-800',
    neutral: '',
  };

  const trendStyles = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground',
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-muted rounded w-20 mb-3" />
          <div className="h-8 bg-muted rounded w-28 mb-2" />
          <div className="h-3 bg-muted rounded w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('transition-colors', highlightStyles[highlight])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && trend !== 'neutral' && (
              trend === 'up' ? (
                <ArrowUpRight className={cn('h-4 w-4', trendStyles[trend])} />
              ) : (
                <ArrowDownRight className={cn('h-4 w-4', trendStyles[trend])} />
              )
            )}
            <span className={cn('text-xs', trend ? trendStyles[trend] : 'text-muted-foreground')}>
              {trendLabel || subtitle}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CashflowKPICards({
  position,
  burnMetrics,
  runway,
  isLoading,
}: CashflowKPICardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Determine burn rate display
  const burnRateValue = burnMetrics.isAccumulating
    ? formatCurrency(Math.abs(burnMetrics.burnRateMonthly))
    : formatCurrency(burnMetrics.burnRateMonthly);

  const burnTrend = burnMetrics.isAccumulating ? 'up' : 'down';
  const burnLabel = burnMetrics.isAccumulating ? 'Accumulating' : 'per month';

  // Runway display
  const runwayValue = runway.weeksRemaining === null
    ? 'Sustainable'
    : runway.weeksRemaining > 52
    ? `${runway.monthsRemaining}+ mo`
    : `${runway.weeksRemaining} weeks`;

  // Highlights
  const cashHighlight = position.totalCash > 10000 ? 'positive' : position.totalCash < 5000 ? 'negative' : 'neutral';
  const runwayHighlight = runway.weeksRemaining === null
    ? 'positive'
    : runway.weeksRemaining > 12
    ? 'positive'
    : runway.weeksRemaining > 8
    ? 'warning'
    : 'negative';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard
        title="Cash Balance"
        value={formatCurrency(position.totalCash)}
        subtitle={`${position.accounts.filter(a => a.accountType === 'BANK').length} accounts`}
        icon={<Wallet className="h-4 w-4" />}
        isLoading={isLoading}
        highlight={cashHighlight}
      />

      <KPICard
        title="Credit Used"
        value={formatCurrency(position.totalCredit)}
        subtitle={`${position.accounts.filter(a => a.accountType === 'CREDITCARD').length} cards`}
        icon={<CreditCard className="h-4 w-4" />}
        isLoading={isLoading}
        highlight={position.totalCredit > 5000 ? 'warning' : 'neutral'}
      />

      <KPICard
        title="Burn Rate"
        value={burnRateValue}
        trend={burnTrend}
        trendLabel={burnLabel}
        icon={<TrendingDown className="h-4 w-4" />}
        isLoading={isLoading}
        highlight={burnMetrics.isAccumulating ? 'positive' : burnMetrics.burnRateMonthly > 5000 ? 'warning' : 'neutral'}
      />

      <KPICard
        title="Runway"
        value={runwayValue}
        subtitle={runway.weeksRemaining !== null && runway.weeksRemaining <= 52 ? `~${runway.daysRemaining} days` : undefined}
        icon={<Clock className="h-4 w-4" />}
        isLoading={isLoading}
        highlight={runwayHighlight}
      />
    </div>
  );
}
