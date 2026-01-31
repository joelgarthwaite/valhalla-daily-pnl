'use client';

import { cn } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import type { CashPosition, RunwayMetrics } from '@/lib/cashflow/calculations';
import { getPositionStatusColor, getRunwayText } from '@/lib/cashflow/calculations';

interface NetPositionHeroProps {
  position: CashPosition;
  runway: RunwayMetrics;
  isLoading?: boolean;
}

export function NetPositionHero({ position, runway, isLoading }: NetPositionHeroProps) {
  const statusColor = getPositionStatusColor(position.netPosition, runway);
  const runwayText = getRunwayText(runway);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isPositive = position.netPosition > 0;
  const isNegative = position.netPosition < 0;

  const statusConfig = {
    green: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-600 dark:text-green-400',
      label: 'Healthy',
      icon: CheckCircle,
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-600 dark:text-yellow-400',
      label: 'Caution',
      icon: AlertTriangle,
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-600 dark:text-red-400',
      label: 'Critical',
      icon: AlertTriangle,
    },
  };

  const config = statusConfig[statusColor];
  const StatusIcon = config.icon;

  if (isLoading) {
    return (
      <div className={cn(
        'rounded-lg border p-6 animate-pulse',
        'bg-muted/50'
      )}>
        <div className="h-8 bg-muted rounded w-32 mb-4" />
        <div className="h-12 bg-muted rounded w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-24" />
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg border p-4 md:p-6 transition-colors',
      config.bg,
      config.border
    )}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Main Position */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Net Cash Position</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className={cn(
              'text-3xl md:text-4xl font-bold tracking-tight',
              isNegative ? 'text-red-600 dark:text-red-400' : ''
            )}>
              {formatCurrency(position.netPosition)}
            </span>
            {isPositive && <TrendingUp className="h-6 w-6 text-green-500" />}
            {isNegative && <TrendingDown className="h-6 w-6 text-red-500" />}
            {!isPositive && !isNegative && <Minus className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Cash: {formatCurrency(position.totalCash)}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Credit: {formatCurrency(position.totalCredit)}</span>
          </div>
        </div>

        {/* Runway & Status */}
        <div className="flex items-center gap-6">
          {/* Runway */}
          <div className="text-center md:text-right">
            <div className="text-sm text-muted-foreground mb-1">Runway</div>
            <div className="text-xl md:text-2xl font-semibold">{runwayText}</div>
          </div>

          {/* Status Badge */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            config.bg,
            config.border,
            'border'
          )}>
            <StatusIcon className={cn('h-5 w-5', config.text)} />
            <span className={cn('font-medium', config.text)}>{config.label}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar - Visual representation of cash health */}
      <div className="mt-4 pt-4 border-t border-current/10">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Cash Position Health</span>
          <span>{config.label}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              statusColor === 'green' && 'bg-green-500',
              statusColor === 'yellow' && 'bg-yellow-500',
              statusColor === 'red' && 'bg-red-500'
            )}
            style={{
              width: statusColor === 'green' ? '100%' :
                     statusColor === 'yellow' ? '50%' : '20%'
            }}
          />
        </div>
      </div>
    </div>
  );
}
