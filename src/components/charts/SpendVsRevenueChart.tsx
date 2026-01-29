'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/pnl/targets';
import type { AggregatedPnLWithYoY } from '@/lib/pnl/aggregations';
import { format, parseISO } from 'date-fns';

interface SpendVsRevenueChartProps {
  data: AggregatedPnLWithYoY[];
  showYoY?: boolean;
  isLoading?: boolean;
}

// Colors matching the plan
const COLORS = {
  revenue: '#3b82f6',   // Blue
  adSpend: '#ef4444',   // Red
  mer: '#14b8a6',       // Teal
  yoyRevenue: '#94a3b8', // Slate gray
  trendLine: '#f43f5e', // Rose
};

// Calculate linear regression for trend line
function calculateTrendLine(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };

  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumXX = data.reduce((sum, d) => sum + d.x * d.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload?: {
      yoyTotalRevenue?: number;
      revenueChangePercent?: number;
    };
  }>;
  label?: string;
  showYoY?: boolean;
  currentYear?: number;
  previousYear?: number;
}

function CustomTooltip({ active, payload, label, showYoY, currentYear, previousYear }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find(p => p.dataKey === 'totalRevenue')?.value || 0;
  const adSpend = payload.find(p => p.dataKey === 'totalAdSpend')?.value || 0;
  const mer = adSpend > 0 ? revenue / adSpend : 0;

  // Get YoY data
  const dataPoint = payload[0]?.payload;
  const yoyRevenue = dataPoint?.yoyTotalRevenue;
  const changePercent = dataPoint?.revenueChangePercent;

  // Format the period label
  let formattedLabel = label || '';
  if (label && label.includes('-W')) {
    const week = label.split('-W')[1];
    formattedLabel = `Week ${parseInt(week)}`;
  } else if (label && label.match(/^\d{4}-\d{2}$/)) {
    formattedLabel = format(parseISO(`${label}-01`), 'MMMM');
  } else if (label && label.match(/^\d{4}-\d{2}-\d{2}$/)) {
    formattedLabel = format(parseISO(label), 'MMM d');
  }

  // Format change percent
  const formatChange = (pct: number | undefined) => {
    if (pct === undefined) return null;
    const sign = pct >= 0 ? '+' : '';
    const color = pct >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{sign}{pct.toFixed(1)}%</span>;
  };

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
      <p className="font-medium mb-2 text-center border-b pb-2">{formattedLabel}</p>

      {/* Revenue */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.revenue }} />
            <span className="text-muted-foreground">{currentYear || 'Current'} Revenue:</span>
          </div>
          <span className="font-medium">{formatCurrency(revenue)}</span>
        </div>

        {showYoY && yoyRevenue !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.yoyRevenue }} />
              <span className="text-muted-foreground">{previousYear || 'Last Year'} Revenue:</span>
            </div>
            <span className="font-medium">{formatCurrency(yoyRevenue)}</span>
          </div>
        )}

        {showYoY && changePercent !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">YoY Change:</span>
            <span className="font-bold">{formatChange(changePercent)}</span>
          </div>
        )}

        <div className="border-t my-1.5 pt-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.adSpend }} />
              <span className="text-muted-foreground">Ad Spend:</span>
            </div>
            <span className="font-medium">{formatCurrency(adSpend)}</span>
          </div>
        </div>

        <div className="border-t mt-1.5 pt-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.mer }} />
              <span className="text-muted-foreground">MER:</span>
            </div>
            <span className="font-medium">{mer.toFixed(2)}x</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {adSpend > 0 && `Every £1 spent returns £${mer.toFixed(2)} in revenue`}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatXAxisTick(value: string): string {
  if (value.includes('-W')) {
    const week = value.split('-W')[1];
    return `W${parseInt(week)}`;
  } else if (value.match(/^\d{4}-\d{2}$/)) {
    return format(parseISO(`${value}-01`), 'MMM');
  } else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return format(parseISO(value), 'd');
  } else if (value.match(/^\d{4}-Q\d$/)) {
    return value.split('-')[1];
  }
  return value;
}

export function SpendVsRevenueChart({
  data,
  showYoY = false,
  isLoading = false,
}: SpendVsRevenueChartProps) {
  const [showMER, setShowMER] = useState(true);
  const [showTrendLine, setShowTrendLine] = useState(false);

  // Extract years from data for legend
  const { currentYear, previousYear } = useMemo(() => {
    if (data.length === 0) return { currentYear: new Date().getFullYear(), previousYear: new Date().getFullYear() - 1 };
    const firstPeriod = data[0]?.period || '';
    const year = parseInt(firstPeriod.split('-')[0], 10);
    return {
      currentYear: isNaN(year) ? new Date().getFullYear() : year,
      previousYear: isNaN(year) ? new Date().getFullYear() - 1 : year - 1
    };
  }, [data]);

  // Transform data for chart - must be in useMemo before any early returns
  const chartData = useMemo(() => {
    return data.map(d => ({
      period: d.period,
      periodLabel: d.periodLabel,
      totalRevenue: d.totalRevenue,
      totalAdSpend: d.totalAdSpend,
      mer: d.totalAdSpend > 0 ? d.totalRevenue / d.totalAdSpend : 0,
      // YoY data
      yoyTotalRevenue: d.yoyTotalRevenue,
      revenueChangePercent: d.revenueChangePercent,
    }));
  }, [data]);

  // Calculate trend line data - must be before early returns
  const trendData = useMemo(() => {
    if (!showTrendLine || chartData.length < 2) return chartData;

    const points = chartData.map((d, i) => ({ x: i, y: d.totalRevenue }));
    const { slope, intercept } = calculateTrendLine(points);

    return chartData.map((d, i) => ({
      ...d,
      trendValue: slope * i + intercept,
    }));
  }, [chartData, showTrendLine]);

  // Check if we have any YoY data
  const hasYoYData = showYoY && chartData.some(d => d.yoyTotalRevenue !== undefined);

  // Calculate max values for proper Y-axis scaling
  const maxMER = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => d.mer));
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Ad Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
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
          <CardTitle>Revenue vs Ad Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Revenue vs Ad Spend</CardTitle>
          {hasYoYData && (
            <p className="text-xs text-muted-foreground mt-1">
              Comparing {currentYear} (solid) vs {previousYear} (dashed)
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-spend-trend"
              checked={showTrendLine}
              onCheckedChange={(checked) => setShowTrendLine(checked === true)}
            />
            <Label htmlFor="show-spend-trend" className="text-xs text-muted-foreground cursor-pointer">
              Trend
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-mer"
              checked={showMER}
              onCheckedChange={(checked) => setShowMER(checked === true)}
            />
            <Label htmlFor="show-mer" className="text-xs text-muted-foreground cursor-pointer">
              MER
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={showTrendLine ? trendData : chartData}
            margin={{ top: 5, right: showMER ? 50 : 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={formatXAxisTick}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(value: number) => formatCurrency(value, 'GBP', true)}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            {showMER && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value: number) => `${value.toFixed(1)}x`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={[0, Math.ceil(maxMER * 1.2)]}
              />
            )}
            <Tooltip content={<CustomTooltip showYoY={hasYoYData} currentYear={currentYear} previousYear={previousYear} />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Bar
              yAxisId="left"
              dataKey="totalAdSpend"
              name="Ad Spend"
              fill={COLORS.adSpend}
              fillOpacity={0.7}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalRevenue"
              name={`${currentYear} Revenue`}
              stroke={COLORS.revenue}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            {hasYoYData && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="yoyTotalRevenue"
                name={`${previousYear} Revenue`}
                stroke={COLORS.yoyRevenue}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            )}
            {showTrendLine && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="trendValue"
                name={`${currentYear} Trend`}
                stroke={COLORS.trendLine}
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
            {showMER && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="mer"
                name="MER"
                stroke={COLORS.mer}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
