'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/pnl/targets';
import type { PnLTrendPoint } from '@/types';
import { format } from 'date-fns';

// Hook to detect mobile screen size
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

interface RevenueTrendChartProps {
  data: PnLTrendPoint[];
  showYoY?: boolean;
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">
        {label ? format(new Date(label), 'MMM d, yyyy') : label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueTrendChart({
  data,
  showYoY = false,
  isLoading = false,
}: RevenueTrendChartProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 220 : 300;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 md:pb-6">
          <CardTitle className="text-base md:text-lg">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[220px] md:h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 md:pb-6">
          <CardTitle className="text-base md:text-lg">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[220px] md:h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-6">
        <CardTitle className="text-base md:text-lg">Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2 md:px-6">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: isMobile ? -15 : 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), isMobile ? 'd/M' : 'MMM d')}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, 'GBP', true)}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 45 : 60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
              iconSize={isMobile ? 8 : 14}
            />
            <Area
              type="monotone"
              dataKey="totalRevenue"
              name="Revenue"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            {showYoY && (
              <Line
                type="monotone"
                dataKey="previousYearRevenue"
                name="Last Year"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface MultiMetricTrendChartProps {
  data: PnLTrendPoint[];
  isLoading?: boolean;
}

export function MultiMetricTrendChart({
  data,
  isLoading = false,
}: MultiMetricTrendChartProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 220 : 300;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2 md:pb-6">
          <CardTitle className="text-base md:text-lg">Profit Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[220px] md:h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-6">
        <CardTitle className="text-base md:text-lg">Profit Trend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2 md:px-6">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: isMobile ? -15 : 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), isMobile ? 'd/M' : 'MMM d')}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, 'GBP', true)}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 45 : 60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: isMobile ? 11 : 14 }}
              iconSize={isMobile ? 8 : 14}
            />
            <Area
              type="monotone"
              dataKey="grossProfit"
              name="Gross Profit"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="netProfit"
              name="Net Profit"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
