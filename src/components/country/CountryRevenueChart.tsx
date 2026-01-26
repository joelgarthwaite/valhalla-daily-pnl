'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/pnl/targets';
import type { CountryPnL } from '@/lib/pnl/country-calculations';

interface CountryRevenueChartProps {
  data: CountryPnL[];
  isLoading?: boolean;
  maxCountries?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: CountryPnL;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">
        {data.countryFlag} {data.countryName}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Revenue:</span>
          <span className="font-medium">{formatCurrency(data.revenue)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Orders:</span>
          <span>{data.orders.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">AOV:</span>
          <span>{formatCurrency(data.aov)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">GP2:</span>
          <span className={data.gp2 >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {formatCurrency(data.gp2)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">GP2 Margin:</span>
          <span className={data.gp2Margin >= 50 ? 'text-green-600 font-medium' : data.gp2Margin >= 40 ? 'text-yellow-600 font-medium' : 'text-red-600 font-medium'}>
            {formatPercentage(data.gp2Margin)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Share:</span>
          <span>{formatPercentage(data.revenueShare, 1)}</span>
        </div>
      </div>
    </div>
  );
}

// Color palette for bars
const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export function CountryRevenueChart({
  data,
  isLoading = false,
  maxCountries = 10,
}: CountryRevenueChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No country data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top N countries for display
  const displayData = data.slice(0, maxCountries);

  // Calculate "Others" if there are more countries
  const othersRevenue = data.slice(maxCountries).reduce((sum, c) => sum + c.revenue, 0);
  const othersOrders = data.slice(maxCountries).reduce((sum, c) => sum + c.orders, 0);
  const othersCount = data.length - maxCountries;

  const chartData = displayData.map((d) => ({
    ...d,
    name: d.countryCode,
    displayName: `${d.countryFlag} ${d.countryCode}`,
  }));

  // Add "Others" category if needed
  if (othersCount > 0 && othersRevenue > 0) {
    const totalRevenue = data.reduce((sum, c) => sum + c.revenue, 0);
    chartData.push({
      countryCode: 'OTHER',
      countryName: `Other (${othersCount} countries)`,
      countryFlag: '',
      revenue: othersRevenue,
      shopifyRevenue: 0,
      etsyRevenue: 0,
      orders: othersOrders,
      shopifyOrders: 0,
      etsyOrders: 0,
      aov: othersOrders > 0 ? othersRevenue / othersOrders : 0,
      cogs: 0,
      shopifyFees: 0,
      etsyFees: 0,
      totalPlatformFees: 0,
      pickPackCost: 0,
      logisticsCost: 0,
      gp1: 0,
      gp1Margin: 0,
      gp2: 0,
      gp2Margin: 0,
      revenueShare: (othersRevenue / totalRevenue) * 100,
      name: 'OTHER',
      displayName: 'Others',
    } as CountryPnL & { name: string; displayName: string });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Country</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value, 'GBP', true)}
              className="text-xs"
            />
            <YAxis
              type="category"
              dataKey="displayName"
              className="text-xs"
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.countryCode}
                  fill={entry.countryCode === 'OTHER' ? '#94a3b8' : COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary footer */}
        <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <span>Showing top {displayData.length} countries</span>
          {othersCount > 0 && (
            <span>+ {othersCount} others ({formatCurrency(othersRevenue)})</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
