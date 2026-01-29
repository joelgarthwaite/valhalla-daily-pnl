'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/pnl/targets';
import type { AggregatedPnLWithYoY } from '@/lib/pnl/aggregations';
import { format, parseISO } from 'date-fns';

type ChartView = 'stacked-area' | 'lines' | 'stacked-bars';

interface ChannelRevenueChartProps {
  data: AggregatedPnLWithYoY[];
  showYoY?: boolean;
  isLoading?: boolean;
}

// Channel colors
const COLORS = {
  total: '#3b82f6',      // Blue - 2026
  shopify: '#22c55e',    // Green
  etsy: '#f97316',       // Orange
  b2b: '#8b5cf6',        // Purple
  yoyTotal: '#94a3b8',   // Slate gray - 2025
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
      yoyTotalRevenue?: number;
      revenueChangePercent?: number;
      periodLabel?: string;
      yoyPeriodLabel?: string;
    };
  }>;
  label?: string;
  showYoY?: boolean;
  currentYear?: number;
  previousYear?: number;
}

function CustomTooltip({ active, payload, label, showYoY, currentYear, previousYear }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Calculate total from Shopify + Etsy + B2B
  const shopifyValue = payload.find(p => p.dataKey === 'shopifyRevenue')?.value || 0;
  const etsyValue = payload.find(p => p.dataKey === 'etsyRevenue')?.value || 0;
  const b2bValue = payload.find(p => p.dataKey === 'b2bRevenue')?.value || 0;
  const total = shopifyValue + etsyValue + b2bValue;

  // Get YoY data from payload
  const dataPoint = payload[0]?.payload;
  const yoyTotal = dataPoint?.yoyTotalRevenue;
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

      {/* Current Year */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.total }} />
            <span className="font-medium">{currentYear || 'Current'}:</span>
          </div>
          <span className="font-bold">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Previous Year */}
      {showYoY && yoyTotal !== undefined && (
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.yoyTotal }} />
              <span className="font-medium">{previousYear || 'Last Year'}:</span>
            </div>
            <span className="font-bold">{formatCurrency(yoyTotal)}</span>
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
        {payload.filter(p =>
          !p.dataKey.startsWith('yoy') &&
          !p.dataKey.startsWith('trend') &&
          p.dataKey !== 'totalRevenue'
        ).map((entry, index) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span>{formatCurrency(entry.value)} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatXAxisTick(value: string, showYoY: boolean): string {
  if (value.includes('-W')) {
    // Weekly: "2025-W04" -> "W4" (no year needed when comparing)
    const week = value.split('-W')[1];
    return `W${parseInt(week)}`;
  } else if (value.match(/^\d{4}-\d{2}$/)) {
    // Monthly: "2025-01" -> "Jan"
    return format(parseISO(`${value}-01`), 'MMM');
  } else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Daily: show just day
    return format(parseISO(value), 'd');
  } else if (value.match(/^\d{4}-Q\d$/)) {
    // Quarterly: "2025-Q1" -> "Q1"
    return value.split('-')[1];
  }
  return value;
}

export function ChannelRevenueChart({
  data,
  showYoY = false,
  isLoading = false,
}: ChannelRevenueChartProps) {
  const [chartView, setChartView] = useState<ChartView>('lines');
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

  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map((d, index) => ({
      period: d.period,
      periodLabel: d.periodLabel,
      totalRevenue: d.totalRevenue,
      shopifyRevenue: d.shopifyRevenue,
      etsyRevenue: d.etsyRevenue,
      b2bRevenue: d.b2bRevenue,
      yoyTotalRevenue: d.yoyTotalRevenue,
      revenueChangePercent: d.revenueChangePercent,
      index, // for trend line calculation
    }));
  }, [data]);

  // Calculate trend line data
  const trendData = useMemo(() => {
    if (!showTrendLine || chartData.length < 2) return [];

    const points = chartData.map((d, i) => ({ x: i, y: d.totalRevenue }));
    const { slope, intercept } = calculateTrendLine(points);

    return chartData.map((d, i) => ({
      ...d,
      trendValue: slope * i + intercept,
    }));
  }, [chartData, showTrendLine]);

  const finalChartData = showTrendLine ? trendData : chartData;

  // Check if we have any YoY data
  const hasYoYData = showYoY && chartData.some(d => d.yoyTotalRevenue !== undefined);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Revenue by Channel</CardTitle>
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Revenue by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data: finalChartData,
      margin: { top: 5, right: 5, left: 5, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: 'period',
      tickFormatter: (value: string) => formatXAxisTick(value, showYoY),
      tick: { fontSize: 11 },
      tickLine: false,
      axisLine: false,
    };

    const yAxisProps = {
      tickFormatter: (value: number) => formatCurrency(value, 'GBP', true),
      tick: { fontSize: 11 },
      tickLine: false,
      axisLine: false,
      width: 60,
    };

    // Use ComposedChart for all views when we have YoY or trend lines
    const needsComposedChart = hasYoYData || showTrendLine;

    switch (chartView) {
      case 'stacked-area':
        if (needsComposedChart) {
          return (
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip content={<CustomTooltip showYoY={hasYoYData} currentYear={currentYear} previousYear={previousYear} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="shopifyRevenue"
                name="Shopify"
                stackId="1"
                stroke={COLORS.shopify}
                fill={COLORS.shopify}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="etsyRevenue"
                name="Etsy"
                stackId="1"
                stroke={COLORS.etsy}
                fill={COLORS.etsy}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="b2bRevenue"
                name="B2B"
                stackId="1"
                stroke={COLORS.b2b}
                fill={COLORS.b2b}
                fillOpacity={0.6}
              />
              {hasYoYData && (
                <Line
                  type="monotone"
                  dataKey="yoyTotalRevenue"
                  name={`${previousYear} Total`}
                  stroke={COLORS.yoyTotal}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              {showTrendLine && (
                <Line
                  type="monotone"
                  dataKey="trendValue"
                  name="Trend"
                  stroke={COLORS.trendLine}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          );
        }
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip showYoY={false} currentYear={currentYear} previousYear={previousYear} />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="shopifyRevenue" name="Shopify" stackId="1" stroke={COLORS.shopify} fill={COLORS.shopify} fillOpacity={0.6} />
            <Area type="monotone" dataKey="etsyRevenue" name="Etsy" stackId="1" stroke={COLORS.etsy} fill={COLORS.etsy} fillOpacity={0.6} />
            <Area type="monotone" dataKey="b2bRevenue" name="B2B" stackId="1" stroke={COLORS.b2b} fill={COLORS.b2b} fillOpacity={0.6} />
          </AreaChart>
        );

      case 'lines':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip showYoY={hasYoYData} currentYear={currentYear} previousYear={previousYear} />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="totalRevenue"
              name={`${currentYear} Total`}
              stroke={COLORS.total}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            {hasYoYData && (
              <Line
                type="monotone"
                dataKey="yoyTotalRevenue"
                name={`${previousYear} Total`}
                stroke={COLORS.yoyTotal}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
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
          </LineChart>
        );

      case 'stacked-bars':
        if (needsComposedChart) {
          return (
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip content={<CustomTooltip showYoY={hasYoYData} currentYear={currentYear} previousYear={previousYear} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="shopifyRevenue" name="Shopify" stackId="1" fill={COLORS.shopify} radius={[0, 0, 0, 0]} />
              <Bar dataKey="etsyRevenue" name="Etsy" stackId="1" fill={COLORS.etsy} radius={[0, 0, 0, 0]} />
              <Bar dataKey="b2bRevenue" name="B2B" stackId="1" fill={COLORS.b2b} radius={[4, 4, 0, 0]} />
              {hasYoYData && (
                <Line
                  type="monotone"
                  dataKey="yoyTotalRevenue"
                  name={`${previousYear} Total`}
                  stroke={COLORS.yoyTotal}
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
            </ComposedChart>
          );
        }
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip showYoY={false} currentYear={currentYear} previousYear={previousYear} />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="shopifyRevenue" name="Shopify" stackId="1" fill={COLORS.shopify} radius={[0, 0, 0, 0]} />
            <Bar dataKey="etsyRevenue" name="Etsy" stackId="1" fill={COLORS.etsy} radius={[0, 0, 0, 0]} />
            <Bar dataKey="b2bRevenue" name="B2B" stackId="1" fill={COLORS.b2b} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Revenue by Channel</CardTitle>
          {hasYoYData && (
            <p className="text-xs text-muted-foreground mt-1">
              Comparing {currentYear} (solid) vs {previousYear} (dashed)
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-trend"
              checked={showTrendLine}
              onCheckedChange={(checked) => setShowTrendLine(checked === true)}
            />
            <Label htmlFor="show-trend" className="text-xs text-muted-foreground cursor-pointer">
              Trend Line
            </Label>
          </div>
          <Select value={chartView} onValueChange={(v) => setChartView(v as ChartView)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lines">Lines</SelectItem>
              <SelectItem value="stacked-area">Stacked Area</SelectItem>
              <SelectItem value="stacked-bars">Stacked Bars</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
