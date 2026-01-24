'use client';

import { AlertCircle, AlertTriangle, CheckCircle, TrendingDown, DollarSign, Package, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PnLSummaryWithComparison, ROASByChannel, DailyPnL } from '@/types';
import { formatPercentage, formatCurrency } from '@/lib/pnl/targets';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'success';
  icon: React.ReactNode;
  message: string;
  detail?: string;
}

interface AlertBannerProps {
  summary: PnLSummaryWithComparison | null;
  roasData: ROASByChannel[];
  dailyData: DailyPnL[];
  isLoading?: boolean;
}

// Alert thresholds
const THRESHOLDS = {
  refundRate: 5, // Alert if >5%
  roasMinimum: 1.5, // Alert if channel ROAS <1.5x
  ordersDropPercent: 20, // Alert if orders 20% below 7-day avg
  shippingCostPercent: 15, // Alert if shipping cost >15% of revenue
  marginMinimum: 20, // Alert if net margin <20%
};

function calculateAlerts(
  summary: PnLSummaryWithComparison | null,
  roasData: ROASByChannel[],
  dailyData: DailyPnL[]
): Alert[] {
  const alerts: Alert[] = [];

  if (!summary) return alerts;

  // 1. Refund Rate Alert
  const refundRate = summary.netRevenue > 0
    ? (summary.totalRefunds / (summary.netRevenue + summary.totalRefunds)) * 100
    : 0;

  if (refundRate > THRESHOLDS.refundRate) {
    alerts.push({
      id: 'refund-rate',
      type: 'error',
      icon: <AlertCircle className="h-4 w-4" />,
      message: `Refund rate ${formatPercentage(refundRate, 1)}`,
      detail: `Above ${THRESHOLDS.refundRate}% threshold - investigate order quality`,
    });
  }

  // 2. Low ROAS Channel Alert
  const lowRoasChannels = roasData.filter(
    (channel) => channel.spend > 0 && channel.roas < THRESHOLDS.roasMinimum
  );

  lowRoasChannels.forEach((channel) => {
    alerts.push({
      id: `low-roas-${channel.platform}`,
      type: 'warning',
      icon: <TrendingDown className="h-4 w-4" />,
      message: `${channel.platformName} ROAS ${channel.roas.toFixed(2)}x`,
      detail: `Below ${THRESHOLDS.roasMinimum}x threshold - consider reducing spend`,
    });
  });

  // 3. Orders Trend Alert (compare recent vs 7-day average)
  if (dailyData.length >= 7) {
    const last7Days = dailyData.slice(-7);
    const avgOrders = last7Days.reduce((sum, d) => sum + d.total_orders, 0) / 7;
    const recentOrders = dailyData.slice(-1)[0]?.total_orders || 0;
    const ordersDrop = avgOrders > 0 ? ((avgOrders - recentOrders) / avgOrders) * 100 : 0;

    if (ordersDrop > THRESHOLDS.ordersDropPercent) {
      alerts.push({
        id: 'orders-drop',
        type: 'warning',
        icon: <Package className="h-4 w-4" />,
        message: `Orders down ${formatPercentage(ordersDrop, 0)} vs 7-day avg`,
        detail: 'Check ad performance and inventory',
      });
    }
  }

  // 4. Shipping Cost Alert
  const shippingCostPercent = summary.netRevenue > 0
    ? (summary.shippingCost / summary.netRevenue) * 100
    : 0;

  if (shippingCostPercent > THRESHOLDS.shippingCostPercent) {
    alerts.push({
      id: 'shipping-cost',
      type: 'warning',
      icon: <DollarSign className="h-4 w-4" />,
      message: `Shipping costs ${formatPercentage(shippingCostPercent, 1)} of revenue`,
      detail: `Above ${THRESHOLDS.shippingCostPercent}% threshold - review carrier rates`,
    });
  }

  // 5. Net Margin Alert
  if (summary.netMarginPct < THRESHOLDS.marginMinimum) {
    alerts.push({
      id: 'low-margin',
      type: summary.netMarginPct < 15 ? 'error' : 'warning',
      icon: <Percent className="h-4 w-4" />,
      message: `Net margin ${formatPercentage(summary.netMarginPct, 1)}`,
      detail: `Below ${THRESHOLDS.marginMinimum}% target - review costs and pricing`,
    });
  }

  return alerts;
}

function AlertItem({ alert }: { alert: Alert }) {
  const bgColor = {
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    success: 'bg-green-50 border-green-200',
  }[alert.type];

  const textColor = {
    error: 'text-red-700',
    warning: 'text-yellow-700',
    success: 'text-green-700',
  }[alert.type];

  const iconColor = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    success: 'text-green-500',
  }[alert.type];

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      bgColor
    )}>
      <span className={iconColor}>{alert.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', textColor)}>
          {alert.message}
        </p>
        {alert.detail && (
          <p className={cn('text-xs mt-0.5 opacity-80', textColor)}>
            {alert.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export function AlertBanner({
  summary,
  roasData,
  dailyData,
  isLoading = false
}: AlertBannerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="h-12 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const alerts = calculateAlerts(summary, roasData, dailyData);

  // If no alerts, show a success message
  if (alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700">All indicators healthy</p>
              <p className="text-xs text-green-600">
                No alerts - metrics within expected ranges
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group alerts by severity
  const errorAlerts = alerts.filter((a) => a.type === 'error');
  const warningAlerts = alerts.filter((a) => a.type === 'warning');

  return (
    <Card className={cn(
      errorAlerts.length > 0
        ? 'border-red-200'
        : warningAlerts.length > 0
          ? 'border-yellow-200'
          : 'border-green-200'
    )}>
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          {errorAlerts.length > 0 ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          <span className="font-semibold text-sm">
            {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} Requiring Attention
          </span>
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {/* Show errors first, then warnings */}
          {errorAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
          {warningAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
