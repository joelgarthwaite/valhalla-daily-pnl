'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowDownRight,
  Truck,
  Building,
  Megaphone,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashFlowSummary } from '@/lib/cashflow/calculations';
import type { CashEvent } from '@/lib/cashflow/events';

interface OutflowsCardProps {
  total: number;
  byCategory: CashFlowSummary['outflowsByCategory'];
  events: CashEvent[];
  forecastDays: number;
  isLoading?: boolean;
}

export function OutflowsCard({
  total,
  byCategory,
  events,
  forecastDays,
  isLoading,
}: OutflowsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const categories = [
    {
      name: 'Supplier Payments',
      value: byCategory.supplierPayments,
      icon: Truck,
      color: 'text-orange-500',
    },
    {
      name: 'Operating Expenses',
      value: byCategory.opex,
      icon: Building,
      color: 'text-purple-500',
    },
    {
      name: 'Ad Platforms',
      value: byCategory.adPlatforms,
      icon: Megaphone,
      color: 'text-blue-500',
    },
    {
      name: 'VAT',
      value: byCategory.vat,
      icon: Receipt,
      color: 'text-red-500',
    },
    {
      name: 'Other',
      value: byCategory.other,
      icon: MoreHorizontal,
      color: 'text-gray-500',
    },
  ].filter(c => c.value > 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
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
            <ArrowDownRight className="h-5 w-5 text-red-500" />
            Outflows
          </CardTitle>
          <span className="text-xs text-muted-foreground">Next {forecastDays} days</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total */}
        <div className="pb-4 border-b mb-4">
          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
            -{formatCurrency(total)}
          </span>
        </div>

        {/* By Category */}
        <div className="space-y-3">
          {categories.map((category) => {
            const percentage = total > 0 ? (category.value / total) * 100 : 0;
            const Icon = category.icon;
            return (
              <div key={category.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', category.color)} />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(category.value)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No projected outflows
          </p>
        )}
      </CardContent>
    </Card>
  );
}
