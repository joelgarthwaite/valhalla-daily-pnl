'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { CashHistory } from '@/lib/cashflow/calculations';

interface BalanceHistoryChartProps {
  history: CashHistory;
  historyDays: number;
  onHistoryDaysChange: (days: number) => void;
  isLoading?: boolean;
}

export function BalanceHistoryChart({
  history,
  historyDays,
  onHistoryDaysChange,
  isLoading,
}: BalanceHistoryChartProps) {
  // Transform data for chart
  const chartData = history.dates.map((date, idx) => ({
    date,
    balance: history.balances[idx],
    formattedDate: format(parseISO(date), 'dd MMM'),
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const TrendIcon = history.trend === 'up' ? TrendingUp :
                    history.trend === 'down' ? TrendingDown : Minus;

  const trendColor = history.trend === 'up' ? 'text-green-500' :
                     history.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  const areaColor = history.trend === 'up' ? '#22c55e' :
                    history.trend === 'down' ? '#ef4444' : '#6b7280';

  const areaFill = history.trend === 'up' ? 'url(#colorGreen)' :
                   history.trend === 'down' ? 'url(#colorRed)' : 'url(#colorGray)';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-40 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Handle empty data
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Balance History</CardTitle>
          <div className="flex items-center gap-1">
            {[30, 60, 90].map((days) => (
              <Button
                key={days}
                variant={historyDays === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => onHistoryDaysChange(days)}
              >
                {days}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No balance history available. Run a balance snapshot to start tracking.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-medium">Balance History</CardTitle>
          <div className="flex items-center gap-1">
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
            <span className={cn('text-sm font-medium', trendColor)}>
              {history.changePercent > 0 ? '+' : ''}{history.changePercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[30, 60, 90].map((days) => (
            <Button
              key={days}
              variant={historyDays === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => onHistoryDaysChange(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGray" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <p className="text-sm text-muted-foreground">{data.formattedDate}</p>
                        <p className="text-lg font-semibold">{formatCurrency(data.balance)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={areaColor}
                strokeWidth={2}
                fill={areaFill}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
