'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ShoppingBag, Users, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashFlowSummary } from '@/lib/cashflow/calculations';
import type { CashEvent } from '@/lib/cashflow/events';

interface InflowsCardProps {
  total: number;
  bySource: CashFlowSummary['inflowsBySource'];
  events: CashEvent[];
  forecastDays: number;
  isLoading?: boolean;
}

export function InflowsCard({
  total,
  bySource,
  events,
  forecastDays,
  isLoading,
}: InflowsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const sources = [
    {
      name: 'Platform Payouts',
      value: bySource.platformPayouts,
      icon: ShoppingBag,
      color: 'text-blue-500',
    },
    {
      name: 'B2B Receivables',
      value: bySource.b2bReceivables,
      icon: Users,
      color: 'text-green-500',
    },
    {
      name: 'Other',
      value: bySource.other,
      icon: MoreHorizontal,
      color: 'text-gray-500',
    },
  ].filter(s => s.value > 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-green-500" />
            Inflows
          </CardTitle>
          <span className="text-xs text-muted-foreground">Next {forecastDays} days</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total */}
        <div className="pb-4 border-b mb-4">
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            +{formatCurrency(total)}
          </span>
        </div>

        {/* By Source */}
        <div className="space-y-3">
          {sources.map((source) => {
            const percentage = total > 0 ? (source.value / total) * 100 : 0;
            const Icon = source.icon;
            return (
              <div key={source.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', source.color)} />
                    <span className="text-sm">{source.name}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(source.value)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {sources.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No projected inflows
          </p>
        )}
      </CardContent>
    </Card>
  );
}
