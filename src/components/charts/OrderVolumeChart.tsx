'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { AggregatedPnLWithYoY } from '@/lib/pnl/aggregations';
import { format, parseISO } from 'date-fns';

interface OrderVolumeChartProps {
  data: AggregatedPnLWithYoY[];
  showYoY?: boolean;
  isLoading?: boolean;
}

// Channel colors matching the plan
const COLORS = {
  shopify: '#22c55e',  // Green
  etsy: '#f97316',     // Orange
  b2b: '#8b5cf6',      // Purple
  yoyOrders: '#94a3b8', // Slate gray for last year
  trendLine: '#f43f5e',  // Rose for trend
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
      yoyTotalOrders?: number;
      ordersChangePercent?: number;
    };
  }>;
  label?: string;
  showYoY?: boolean;
  currentYear?: number;
  previousYear?: number;
}

function CustomTooltip({ active, payload, label, showYoY, currentYear, previousYear }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Calculate total orders (exclude YoY entries)
  const shopifyOrders = payload.find(p => p.dataKey === 'shopifyOrders')?.value || 0;
  const etsyOrders = payload.find(p => p.dataKey === 'etsyOrders')?.value || 0;
  const b2bOrders = payload.find(p => p.dataKey === 'b2bOrders')?.value || 0;
  const total = shopifyOrders + etsyOrders + b2bOrders;

  // Get YoY data
  const dataPoint = payload[0]?.payload;
  const yoyTotal = dataPoint?.yoyTotalOrders;
  const changePercent = dataPoint?.ordersChangePercent;

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
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-medium mb-2 text-center border-b pb-2">{formattedLabel}</p>

      {/* Current Year */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">{currentYear || 'Current'}:</span>
          <span className="font-bold">{total} orders</span>
        </div>
      </div>

      {/* Previous Year */}
      {showYoY && yoyTotal !== undefined && (
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">{previousYear || 'Last Year'}:</span>
            <span className="font-bold">{yoyTotal} orders</span>
          </div>
        </div>
      )}

      {/* Change */}
      {showYoY && changePercent !== undefined && (
        <div className="border-t pt-2 mt-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">YoY Change:</span>
            <span className="font-bold">{formatChange(changePercent)}</span>
          </div>
        </div>
      )}

      {/* Channel breakdown */}
      <div className="border-t mt-2 pt-2">
        <p className="text-xs text-muted-foreground mb-1">By Channel ({currentYear || 'Current'}):</p>
        {payload.filter(p => !p.dataKey.startsWith('yoy') && !p.dataKey.startsWith('trend')).map((entry, index) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span>{entry.value} ({pct}%)</span>
            </div>
          );
        })}
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

export function OrderVolumeChart({
  data,
  showYoY = false,
  isLoading = false,
}: OrderVolumeChartProps) {
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
      shopifyOrders: d.shopifyOrders,
      etsyOrders: d.etsyOrders,
      b2bOrders: d.b2bOrders,
      totalOrders: d.totalOrders,
      // YoY data
      yoyTotalOrders: d.yoyTotalOrders,
      ordersChangePercent: d.ordersChangePercent,
    }));
  }, [data]);

  // Calculate trend line data - must be before early returns
  const trendData = useMemo(() => {
    if (!showTrendLine || chartData.length < 2) return chartData;

    const points = chartData.map((d, i) => ({ x: i, y: d.totalOrders }));
    const { slope, intercept } = calculateTrendLine(points);

    return chartData.map((d, i) => ({
      ...d,
      trendValue: slope * i + intercept,
    }));
  }, [chartData, showTrendLine]);

  // Check if there's any B2B data
  const hasB2B = chartData.some(d => d.b2bOrders > 0);
  // Check if there's any Etsy data
  const hasEtsy = chartData.some(d => d.etsyOrders > 0);
  // Check if we have any YoY data
  const hasYoYData = showYoY && chartData.some(d => d.yoyTotalOrders !== undefined);

  // Use ComposedChart if YoY is enabled or trend line
  const needsComposedChart = hasYoYData || showTrendLine;
  const ChartComponent = needsComposedChart ? ComposedChart : BarChart;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders by Channel</CardTitle>
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
          <CardTitle>Orders by Channel</CardTitle>
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
          <CardTitle>Orders by Channel</CardTitle>
          {hasYoYData && (
            <p className="text-xs text-muted-foreground mt-1">
              Comparing {currentYear} (bars) vs {previousYear} (dashed line)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-orders-trend"
            checked={showTrendLine}
            onCheckedChange={(checked) => setShowTrendLine(checked === true)}
          />
          <Label htmlFor="show-orders-trend" className="text-xs text-muted-foreground cursor-pointer">
            Trend Line
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent
            data={showTrendLine ? trendData : chartData}
            margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
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
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip showYoY={hasYoYData} currentYear={currentYear} previousYear={previousYear} />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Bar
              dataKey="shopifyOrders"
              name="Shopify"
              stackId="1"
              fill={COLORS.shopify}
              radius={hasEtsy || hasB2B ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            />
            {hasEtsy && (
              <Bar
                dataKey="etsyOrders"
                name="Etsy"
                stackId="1"
                fill={COLORS.etsy}
                radius={hasB2B ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              />
            )}
            {hasB2B && (
              <Bar
                dataKey="b2bOrders"
                name="B2B"
                stackId="1"
                fill={COLORS.b2b}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="totalOrders"
                  position="top"
                  fill="#6b7280"
                  fontSize={10}
                  formatter={(value: unknown) => typeof value === 'number' && value > 0 ? value : ''}
                />
              </Bar>
            )}
            {!hasB2B && !hasEtsy && (
              <Bar
                dataKey="shopifyOrders"
                name="Shopify"
                stackId="1"
                fill={COLORS.shopify}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="totalOrders"
                  position="top"
                  fill="#6b7280"
                  fontSize={10}
                  formatter={(value: unknown) => typeof value === 'number' && value > 0 ? value : ''}
                />
              </Bar>
            )}
            {hasYoYData && (
              <Line
                type="monotone"
                dataKey="yoyTotalOrders"
                name={`${previousYear} Orders`}
                stroke={COLORS.yoyOrders}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            {showTrendLine && (
              <Line
                type="monotone"
                dataKey="trendValue"
                name={`${currentYear} Trend`}
                stroke={COLORS.trendLine}
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
