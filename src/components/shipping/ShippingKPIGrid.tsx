'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, DollarSign, Package, Truck, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ShippingKPIData } from '@/lib/shipping';

interface ShippingKPIGridProps {
  data: ShippingKPIData;
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  isPositiveGood = true,
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  isPositiveGood?: boolean;
}) {
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.1;
  const isGood = isPositiveGood ? isPositive : !isPositive;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="text-lg sm:text-2xl font-bold truncate">{value}</div>
        <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
          {isNeutral ? (
            <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          ) : isGood ? (
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          )}
          <span
            className={`text-[10px] sm:text-xs ${
              isNeutral
                ? 'text-muted-foreground'
                : isGood
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : ''}{change.toFixed(1)}%
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">vs previous</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ShippingKPIGrid({ data }: ShippingKPIGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
      <KPICard
        title="Shipping Revenue"
        value={formatCurrency(data.shippingRevenue)}
        change={data.shippingRevenueChange}
        icon={DollarSign}
        isPositiveGood={true}
      />
      <KPICard
        title="Shipping Expenditure"
        value={formatCurrency(data.shippingExpenditure)}
        change={data.shippingExpenditureChange}
        icon={Package}
        isPositiveGood={false}
      />
      <KPICard
        title="Shipping Margin"
        value={formatCurrency(data.shippingMargin)}
        change={data.shippingMarginChange}
        icon={Truck}
        isPositiveGood={true}
      />
      <KPICard
        title="Total Orders"
        value={data.orderCount.toLocaleString()}
        change={data.orderCountChange}
        icon={ShoppingCart}
        isPositiveGood={true}
      />
    </div>
  );
}
